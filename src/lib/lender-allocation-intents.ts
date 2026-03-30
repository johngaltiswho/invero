import { supabaseAdmin } from '@/lib/supabase';
import {
  ensureLenderSleeve,
  normalizeLenderCapitalAllocations,
  type LenderCapitalAllocation,
  type LenderSleeve,
  type LenderSleeveModelType,
} from '@/lib/lender-sleeves';
import {
  createInvestorAgreement,
  issueAgreement,
  listInvestorAgreements,
  regenerateAgreementDraft,
  type AdminActor,
} from '@/lib/agreements/service';

export type LenderAllocationIntentStatus =
  | 'draft'
  | 'agreements_pending'
  | 'ready_for_funding'
  | 'funding_submitted'
  | 'completed'
  | 'cancelled'
  | 'superseded';

export type LenderAllocationIntent = {
  id: string;
  investor_id: string;
  status: LenderAllocationIntentStatus;
  total_amount: number;
  currency: string;
  allocation_payload: LenderCapitalAllocation[];
  pool_amount: number;
  fixed_debt_amount: number;
  required_models: LenderSleeveModelType[];
  agreements_ready_at?: string | null;
  funding_submitted_at?: string | null;
  completed_at?: string | null;
  superseded_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type AllocationIntentFundingSnapshot = {
  approvedAmount: number;
  pendingAmount: number;
  totalSubmittedAmount: number;
  remainingAmount: number;
  trancheCount: number;
  allocatedByModel: Record<LenderSleeveModelType, number>;
};

function getAllocationBreakdown(allocations: LenderCapitalAllocation[]) {
  return allocations.reduce(
    (acc, allocation) => {
      if (allocation.modelType === 'fixed_debt') {
        acc.fixedDebtAmount += allocation.amount;
      } else {
        acc.poolAmount += allocation.amount;
      }
      return acc;
    },
    { poolAmount: 0, fixedDebtAmount: 0 }
  );
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

export async function getAllocationIntentFundingSnapshot(intentId: string, totalAmount?: number): Promise<AllocationIntentFundingSnapshot> {
  const { data, error } = await supabaseAdmin
    .from('investor_payment_submissions')
    .select('amount, status, allocation_payload')
    .eq('allocation_intent_id', intentId)
    .in('status', ['pending', 'approved']);

  if (error) {
    throw new Error(error.message || 'Failed to load allocation intent funding snapshot');
  }

  const allocatedByModel: Record<LenderSleeveModelType, number> = {
    fixed_debt: 0,
    pool_participation: 0,
  };

  let approvedAmount = 0;
  let pendingAmount = 0;

  for (const submission of data || []) {
    const amount = Number(submission.amount || 0);
    if (submission.status === 'approved') {
      approvedAmount += amount;
    } else if (submission.status === 'pending') {
      pendingAmount += amount;
    }

    const payload = Array.isArray(submission.allocation_payload) ? submission.allocation_payload : [];
    for (const allocation of payload) {
      const modelType = allocation?.modelType as LenderSleeveModelType | undefined;
      if (!modelType || !(modelType in allocatedByModel)) continue;
      allocatedByModel[modelType] += Number(allocation.amount || 0);
    }
  }

  const totalSubmittedAmount = approvedAmount + pendingAmount;
  const remainingAmount = Math.max(roundCurrency((totalAmount ?? totalSubmittedAmount) - totalSubmittedAmount), 0);

  return {
    approvedAmount: roundCurrency(approvedAmount),
    pendingAmount: roundCurrency(pendingAmount),
    totalSubmittedAmount: roundCurrency(totalSubmittedAmount),
    remainingAmount,
    trancheCount: (data || []).length,
    allocatedByModel: {
      fixed_debt: roundCurrency(allocatedByModel.fixed_debt),
      pool_participation: roundCurrency(allocatedByModel.pool_participation),
    },
  };
}

export function calculateTrancheAllocations(input: {
  totalIntentAmount: number;
  trancheAmount: number;
  targetAllocations: LenderCapitalAllocation[];
  alreadyAllocatedByModel?: Partial<Record<LenderSleeveModelType, number>>;
}): LenderCapitalAllocation[] {
  const totalIntentAmount = roundCurrency(Number(input.totalIntentAmount || 0));
  const trancheAmount = roundCurrency(Number(input.trancheAmount || 0));

  if (totalIntentAmount <= 0 || trancheAmount <= 0) {
    throw new Error('Intent amount and tranche amount must both be positive');
  }

  const targetAllocations = normalizeLenderCapitalAllocations(totalIntentAmount, input.targetAllocations);
  const alreadyAllocatedByModel = input.alreadyAllocatedByModel || {};

  const remainingAllocations = targetAllocations
    .map((allocation) => ({
      modelType: allocation.modelType,
      remainingAmount: roundCurrency(allocation.amount - Number(alreadyAllocatedByModel[allocation.modelType] || 0)),
    }))
    .filter((allocation) => allocation.remainingAmount > 0.009);

  const remainingTotal = roundCurrency(
    remainingAllocations.reduce((sum, allocation) => sum + allocation.remainingAmount, 0)
  );

  if (trancheAmount - remainingTotal > 0.01) {
    throw new Error('Tranche amount exceeds the remaining approved allocation');
  }

  const totalPaise = Math.round(trancheAmount * 100);
  const remainingTotalPaise = Math.round(remainingTotal * 100);

  if (remainingTotalPaise <= 0) {
    throw new Error('No remaining allocation available for funding');
  }

  const provisional = remainingAllocations.map((allocation) => {
    const remainingPaise = Math.round(allocation.remainingAmount * 100);
    const rawShare = (totalPaise * remainingPaise) / remainingTotalPaise;
    const basePaise = Math.min(Math.floor(rawShare), remainingPaise);
    return {
      modelType: allocation.modelType,
      remainingPaise,
      paise: basePaise,
      remainder: rawShare - Math.floor(rawShare),
    };
  });

  let assignedPaise = provisional.reduce((sum, allocation) => sum + allocation.paise, 0);
  let leftoverPaise = totalPaise - assignedPaise;

  if (leftoverPaise > 0) {
    const candidates = [...provisional].sort((a, b) => b.remainder - a.remainder);
    while (leftoverPaise > 0) {
      let distributed = false;
      for (const candidate of candidates) {
        const matching = provisional.find((entry) => entry.modelType === candidate.modelType);
        if (!matching) continue;
        if (matching.paise >= matching.remainingPaise) continue;
        matching.paise += 1;
        leftoverPaise -= 1;
        distributed = true;
        if (leftoverPaise === 0) break;
      }
      if (!distributed) {
        throw new Error('Unable to distribute tranche allocation within approved model limits');
      }
    }
  }

  return provisional
    .filter((allocation) => allocation.paise > 0)
    .map((allocation) => ({
      modelType: allocation.modelType,
      amount: roundCurrency(allocation.paise / 100),
    }));
}

export async function listLenderAllocationIntentsForInvestor(investorId: string): Promise<LenderAllocationIntent[]> {
  const { data, error } = await supabaseAdmin
    .from('lender_allocation_intents')
    .select('*')
    .eq('investor_id', investorId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to load allocation intents');
  }

  return (data || []) as LenderAllocationIntent[];
}

export async function getLenderAllocationIntentById(intentId: string): Promise<LenderAllocationIntent | null> {
  const { data, error } = await supabaseAdmin
    .from('lender_allocation_intents')
    .select('*')
    .eq('id', intentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load allocation intent');
  }

  return (data || null) as LenderAllocationIntent | null;
}

async function getCurrentAgreementForSleeve(investorId: string, sleeveId: string) {
  const agreements = await listInvestorAgreements(investorId, sleeveId);
  return (
    agreements.find((agreement) => !agreement.superseded_at && !['voided', 'expired'].includes(String(agreement.status || ''))) ||
    null
  );
}

export async function supersedeOpenAllocationIntentsForInvestor(investorId: string, exceptIntentId?: string) {
  let query = supabaseAdmin
    .from('lender_allocation_intents')
    .update({
      status: 'superseded',
      superseded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('investor_id', investorId)
    .in('status', ['draft', 'agreements_pending', 'ready_for_funding']);

  if (exceptIntentId) {
    query = query.neq('id', exceptIntentId);
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to supersede prior allocation intents');
  }
}

export async function supersedeNonExecutedAgreementsForSleeve(
  investorId: string,
  sleeveId: string,
  reason: string
) {
  const { error } = await supabaseAdmin
    .from('investor_agreements')
    .update({
      superseded_at: new Date().toISOString(),
      superseded_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('investor_id', investorId)
    .eq('lender_sleeve_id', sleeveId)
    .is('superseded_at', null)
    .neq('status', 'executed');

  if (error) {
    throw new Error(error.message || 'Failed to supersede prior agreements');
  }
}

export async function ensureExecutableAgreementForSleeve(input: {
  investorId: string;
  sleeve: LenderSleeve;
  intentId: string;
  commitmentAmount: number;
  agreementDate?: string;
  actor: AdminActor;
}) {
  const currentAgreement = await getCurrentAgreementForSleeve(input.investorId, input.sleeve.id);
  if (
    currentAgreement?.status === 'executed' &&
    Math.abs((Number(currentAgreement.commitment_amount) || 0) - input.commitmentAmount) < 0.01
  ) {
    return currentAgreement;
  }

  await supersedeNonExecutedAgreementsForSleeve(
    input.investorId,
    input.sleeve.id,
    `Superseded by allocation intent ${input.intentId}`
  );

  const agreement = await createInvestorAgreement({
    investorId: input.investorId,
    lenderSleeveId: input.sleeve.id,
    agreementModelType: input.sleeve.model_type,
    commitmentAmount: input.commitmentAmount,
    agreementDate: input.agreementDate || new Date().toISOString().slice(0, 10),
    companySignatoryName: 'Authorized Signatory',
    companySignatoryTitle: 'Director',
    actor: input.actor,
    lenderAllocationIntentId: input.intentId,
  });

  const generated = await regenerateAgreementDraft(
    agreement.id,
    input.actor,
    {
      commitment_amount: input.commitmentAmount,
      agreement_date: input.agreementDate || new Date().toISOString().slice(0, 10),
    }
  );

  return issueAgreement(generated.id, input.actor);
}

export async function refreshAllocationIntentReadiness(intentId: string): Promise<LenderAllocationIntent> {
  const intent = await getLenderAllocationIntentById(intentId);
  if (!intent) {
    throw new Error('Allocation intent not found');
  }

  const models = (intent.required_models || []) as LenderSleeveModelType[];
  let ready = true;

  for (const modelType of models) {
    const sleeve = await ensureLenderSleeve({
      investorId: intent.investor_id,
      modelType,
      defaultStatus: 'draft',
    });

    const agreement = await getCurrentAgreementForSleeve(intent.investor_id, sleeve.id);
    if (!agreement || agreement.status !== 'executed') {
      ready = false;
      break;
    }
  }

  const nextStatus: LenderAllocationIntentStatus =
    intent.status === 'funding_submitted' || intent.status === 'completed'
      ? intent.status
      : ready
        ? 'ready_for_funding'
        : 'agreements_pending';

  const { data, error } = await supabaseAdmin
    .from('lender_allocation_intents')
    .update({
      status: nextStatus,
      agreements_ready_at: ready ? intent.agreements_ready_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', intentId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to refresh allocation intent readiness');
  }

  return data as LenderAllocationIntent;
}

export async function createAllocationIntent(input: {
  investorId: string;
  totalAmount: number;
  allocations: LenderCapitalAllocation[];
  notes?: string | null;
  actor: AdminActor;
}) {
  await supersedeOpenAllocationIntentsForInvestor(input.investorId);

  const allocationPayload = input.allocations;
  const { poolAmount, fixedDebtAmount } = getAllocationBreakdown(allocationPayload);
  const requiredModels = allocationPayload.map((allocation) => allocation.modelType);

  const { data: intent, error } = await supabaseAdmin
    .from('lender_allocation_intents')
    .insert({
      investor_id: input.investorId,
      status: 'draft',
      total_amount: input.totalAmount,
      currency: 'INR',
      allocation_payload: allocationPayload,
      pool_amount: poolAmount,
      fixed_debt_amount: fixedDebtAmount,
      required_models: requiredModels,
      notes: input.notes || null,
    })
    .select('*')
    .single();

  if (error || !intent) {
    throw new Error(error?.message || 'Failed to create allocation intent');
  }

  const sleeves: LenderSleeve[] = [];
  const sleeveAmounts = new Map<LenderSleeveModelType, number>();

  for (const allocation of allocationPayload) {
    sleeveAmounts.set(allocation.modelType, Number(allocation.amount || 0));
  }

  for (const modelType of requiredModels) {
    const sleeve = await ensureLenderSleeve({
      investorId: input.investorId,
      modelType,
      defaultStatus: 'draft',
    });
    sleeves.push(sleeve);
  }

  for (const sleeve of sleeves) {
    await ensureExecutableAgreementForSleeve({
      investorId: input.investorId,
      sleeve,
      intentId: intent.id,
      commitmentAmount: sleeveAmounts.get(sleeve.model_type) || 0,
      actor: input.actor,
    });
  }

  const refreshedIntent = await refreshAllocationIntentReadiness(intent.id);

  return {
    intent: refreshedIntent,
    sleeves,
  };
}

export async function markAllocationIntentFundingSubmitted(intentId: string): Promise<LenderAllocationIntent> {
  const { data, error } = await supabaseAdmin
    .from('lender_allocation_intents')
    .update({
      status: 'funding_submitted',
      funding_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', intentId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to mark funding submitted');
  }

  return data as LenderAllocationIntent;
}

export async function syncAllocationIntentFundingStatus(intentId: string): Promise<LenderAllocationIntent> {
  const intent = await getLenderAllocationIntentById(intentId);
  if (!intent) {
    throw new Error('Allocation intent not found');
  }

  if (intent.status === 'cancelled' || intent.status === 'superseded') {
    return intent;
  }

  const snapshot = await getAllocationIntentFundingSnapshot(intent.id, Number(intent.total_amount || 0));

  const nextStatus: LenderAllocationIntentStatus =
    snapshot.remainingAmount <= 0.009
      ? 'completed'
      : snapshot.pendingAmount > 0
        ? 'funding_submitted'
        : intent.status === 'agreements_pending' || intent.status === 'draft'
          ? intent.status
          : 'ready_for_funding';

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === 'funding_submitted') {
    updatePayload.funding_submitted_at = intent.funding_submitted_at || new Date().toISOString();
    updatePayload.completed_at = null;
  } else if (nextStatus === 'completed') {
    updatePayload.completed_at = intent.completed_at || new Date().toISOString();
  } else {
    updatePayload.funding_submitted_at = null;
    updatePayload.completed_at = null;
  }

  const { data, error } = await supabaseAdmin
    .from('lender_allocation_intents')
    .update(updatePayload)
    .eq('id', intentId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to sync funding status');
  }

  return data as LenderAllocationIntent;
}

export async function markAllocationIntentCompleted(intentId: string): Promise<LenderAllocationIntent> {
  const { data, error } = await supabaseAdmin
    .from('lender_allocation_intents')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', intentId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to complete allocation intent');
  }

  return data as LenderAllocationIntent;
}

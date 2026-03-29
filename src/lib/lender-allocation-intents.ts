import { supabaseAdmin } from '@/lib/supabase';
import {
  ensureLenderSleeve,
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

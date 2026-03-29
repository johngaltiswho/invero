import { supabaseAdmin } from '@/lib/supabase';

export type LenderSleeveModelType = 'fixed_debt' | 'pool_participation';
export type LenderSleeveStatus = 'draft' | 'active' | 'suspended' | 'closed';

export type LenderSleeve = {
  id: string;
  investor_id: string;
  model_type: LenderSleeveModelType;
  status: LenderSleeveStatus;
  name: string;
  agreement_status: 'not_started' | 'in_progress' | 'completed' | 'voided' | 'expired';
  commitment_amount: number;
  funded_amount: number;
  currency: string;
  start_date?: string | null;
  executed_at?: string | null;
  notes?: string | null;
  fixed_coupon_rate_annual?: number | null;
  principal_outstanding: number;
  coupon_accrued: number;
  coupon_paid: number;
  payout_priority_rank?: number | null;
  alm_bucket?: string | null;
  liquidity_notes?: string | null;
  units_held: number;
  entry_nav_per_unit?: number | null;
  ownership_percent_snapshot?: number | null;
  created_at: string;
  updated_at: string;
};

export type LenderCapitalAllocation = {
  modelType: LenderSleeveModelType;
  amount: number;
};

function getSleeveName(modelType: LenderSleeveModelType) {
  return modelType === 'fixed_debt' ? 'Fixed Debt Sleeve' : 'Pool Participation Sleeve';
}

export async function listLenderSleevesForInvestor(investorId: string): Promise<LenderSleeve[]> {
  const { data, error } = await supabaseAdmin
    .from('lender_sleeves')
    .select('*')
    .eq('investor_id', investorId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load lender sleeves');
  }

  return (data || []) as LenderSleeve[];
}

export async function getLenderSleeveById(sleeveId: string): Promise<LenderSleeve | null> {
  const { data, error } = await supabaseAdmin
    .from('lender_sleeves')
    .select('*')
    .eq('id', sleeveId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load lender sleeve');
  }

  return (data || null) as LenderSleeve | null;
}

export async function ensureLenderSleeve(input: {
  investorId: string;
  modelType: LenderSleeveModelType;
  defaultStatus?: LenderSleeveStatus;
  defaultCouponRateAnnual?: number | null;
}): Promise<LenderSleeve> {
  const existing = await supabaseAdmin
    .from('lender_sleeves')
    .select('*')
    .eq('investor_id', input.investorId)
    .eq('model_type', input.modelType)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message || 'Failed to load lender sleeve');
  }

  if (existing.data) {
    return existing.data as LenderSleeve;
  }

  const { data, error } = await supabaseAdmin
    .from('lender_sleeves')
    .insert({
      investor_id: input.investorId,
      model_type: input.modelType,
      status: input.defaultStatus || 'draft',
      name: getSleeveName(input.modelType),
      agreement_status: 'not_started',
      currency: 'INR',
      start_date: new Date().toISOString().slice(0, 10),
      fixed_coupon_rate_annual: input.modelType === 'fixed_debt' ? (input.defaultCouponRateAnnual ?? 0.14) : null,
      entry_nav_per_unit: input.modelType === 'pool_participation' ? 100 : null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to create lender sleeve');
  }

  return data as LenderSleeve;
}

export function normalizeLenderCapitalAllocations(
  totalAmount: number,
  allocations?: Array<{ modelType?: string; amount?: number }>
): LenderCapitalAllocation[] {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('Total amount must be a positive number');
  }

  const cleaned = (allocations || [])
    .map((allocation) => ({
      modelType: allocation.modelType as LenderSleeveModelType,
      amount: Number(allocation.amount || 0),
    }))
    .filter((allocation) => allocation.modelType && allocation.amount > 0);

  if (!cleaned.length) {
    return [{ modelType: 'pool_participation', amount: totalAmount }];
  }

  const validModelTypes = new Set<LenderSleeveModelType>(['fixed_debt', 'pool_participation']);
  const deduped = new Map<LenderSleeveModelType, number>();

  for (const allocation of cleaned) {
    if (!validModelTypes.has(allocation.modelType)) {
      throw new Error(`Unsupported lender model type: ${allocation.modelType}`);
    }
    deduped.set(allocation.modelType, (deduped.get(allocation.modelType) || 0) + allocation.amount);
  }

  const normalized = Array.from(deduped.entries()).map(([modelType, amount]) => ({
    modelType,
    amount,
  }));

  const sum = normalized.reduce((acc, allocation) => acc + allocation.amount, 0);
  if (Math.abs(sum - totalAmount) > 0.01) {
    throw new Error('Allocation split must equal the submitted amount');
  }

  return normalized;
}

export async function applyLenderCapitalAllocations(input: {
  investorId: string;
  totalAmount: number;
  capitalTransactionId?: string | null;
  paymentSubmissionId?: string | null;
  allocations: LenderCapitalAllocation[];
}): Promise<LenderSleeve[]> {
  const updatedSleeves: LenderSleeve[] = [];

  for (const allocation of input.allocations) {
    const sleeve = await ensureLenderSleeve({
      investorId: input.investorId,
      modelType: allocation.modelType,
      defaultStatus: 'draft',
      defaultCouponRateAnnual: allocation.modelType === 'fixed_debt' ? 0.14 : null,
    });

    const commitmentAmount = Number(sleeve.commitment_amount || 0) + allocation.amount;
    const fundedAmount = Number(sleeve.funded_amount || 0) + allocation.amount;

    const updatePayload: Record<string, unknown> = {
      commitment_amount: commitmentAmount,
      funded_amount: fundedAmount,
      start_date: sleeve.start_date || new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    if (allocation.modelType === 'fixed_debt') {
      updatePayload.principal_outstanding = Number(sleeve.principal_outstanding || 0) + allocation.amount;
      updatePayload.fixed_coupon_rate_annual = sleeve.fixed_coupon_rate_annual ?? 0.14;
    } else {
      const entryNav = Number(sleeve.entry_nav_per_unit || 100) || 100;
      updatePayload.entry_nav_per_unit = entryNav;
      updatePayload.units_held = Number(sleeve.units_held || 0) + allocation.amount / entryNav;
    }

    const { data: updatedSleeve, error: sleeveError } = await supabaseAdmin
      .from('lender_sleeves')
      .update(updatePayload)
      .eq('id', sleeve.id)
      .select('*')
      .single();

    if (sleeveError) {
      throw new Error(sleeveError.message || 'Failed to update lender sleeve');
    }

    const { error: allocationError } = await supabaseAdmin
      .from('lender_capital_allocations')
      .insert({
        investor_id: input.investorId,
        lender_sleeve_id: sleeve.id,
        capital_transaction_id: input.capitalTransactionId || null,
        payment_submission_id: input.paymentSubmissionId || null,
        allocation_amount: allocation.amount,
        allocation_percent: Number(((allocation.amount / input.totalAmount) * 100).toFixed(4)),
      });

    if (allocationError) {
      throw new Error(allocationError.message || 'Failed to create lender capital allocation');
    }

    updatedSleeves.push(updatedSleeve as LenderSleeve);
  }

  return updatedSleeves;
}

export async function syncLenderSleeveAgreementStatus(
  sleeveId: string,
  agreementStatus: LenderSleeve['agreement_status'],
  activatedAt?: string | null
) {
  const nextStatus: LenderSleeveStatus =
    agreementStatus === 'completed'
      ? 'active'
      : agreementStatus === 'voided' || agreementStatus === 'expired'
        ? 'suspended'
        : 'draft';

  const { error } = await supabaseAdmin
    .from('lender_sleeves')
    .update({
      agreement_status: agreementStatus,
      status: nextStatus,
      executed_at: agreementStatus === 'completed' ? activatedAt || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sleeveId);

  if (error) {
    throw new Error(error.message || 'Failed to sync lender sleeve agreement status');
  }
}

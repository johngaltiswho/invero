import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type FuelAccountRow = Database['public']['Tables']['fuel_accounts']['Row'];
type FuelLedgerEntryRow = Database['public']['Tables']['fuel_ledger_entries']['Row'];

const DEFAULT_PLATFORM_FEE_RATE = 0.0025;
const DEFAULT_DAILY_FEE_RATE = 0.001;
const DAY_MS = 1000 * 60 * 60 * 24;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function wholeDaysBetween(start: number, end: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

function asNumber(value: number | string | null | undefined, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getOrCreateFuelAccount(params: {
  ownerType: 'contractor' | 'fuel_pump';
  ownerId: string;
  accountKind: 'sme_fuel' | 'provider_settlement';
  mode: 'cash_carry' | 'credit' | 'settlement';
}): Promise<FuelAccountRow> {
  const { ownerType, ownerId, accountKind, mode } = params;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('fuel_accounts')
    .select('*')
    .eq('owner_type', ownerType)
    .eq('owner_id', ownerId)
    .eq('account_kind', accountKind)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    if (existing.mode !== mode) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('fuel_accounts')
        .update({ mode })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        throw updateError ?? new Error('Failed to update fuel account mode');
      }

      return updated;
    }

    return existing;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('fuel_accounts')
    .insert({
      owner_type: ownerType,
      owner_id: ownerId,
      account_kind: accountKind,
      mode,
      status: 'active',
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error('Failed to create fuel account');
  }

  return inserted;
}

async function getLedgerEntries(accountId: string): Promise<FuelLedgerEntryRow[]> {
  const { data, error } = await supabaseAdmin
    .from('fuel_ledger_entries')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getContractorFuelTerms(contractorId: string) {
  const [{ data: contractor, error: contractorError }, { data: settings, error: settingsError }] = await Promise.all([
    supabaseAdmin
      .from('contractors')
      .select('id, company_name, platform_fee_rate, participation_fee_rate_daily')
      .eq('id', contractorId)
      .single(),
    supabaseAdmin
      .from('contractor_fuel_settings')
      .select('*')
      .eq('contractor_id', contractorId)
      .maybeSingle(),
  ]);

  if (contractorError || !contractor) {
    throw contractorError ?? new Error('Contractor not found');
  }

  return {
    contractor,
    settings,
    platformFeeRate: asNumber(contractor.platform_fee_rate, DEFAULT_PLATFORM_FEE_RATE),
    dailyFeeRate: asNumber(contractor.participation_fee_rate_daily, DEFAULT_DAILY_FEE_RATE),
  };
}

type PrincipalTranche = {
  remaining: number;
  createdAt: number;
};

function applyCreditsToSmeDebits(entries: FuelLedgerEntryRow[]) {
  const principalCharges: PrincipalTranche[] = [];
  let fuelConsumed = 0;
  let platformFeeCharged = 0;
  let postedDailyFeeCharged = 0;
  let platformFeeOutstanding = 0;
  let postedDailyFeeOutstanding = 0;
  let totalCredits = 0;

  for (const entry of entries) {
    const amount = asNumber(entry.amount);

    if (entry.direction === 'debit') {
      if (entry.entry_type === 'fuel_fill_charge') {
        fuelConsumed += amount;
        principalCharges.push({
          remaining: amount,
          createdAt: new Date(entry.created_at).getTime(),
        });
      } else if (entry.entry_type === 'platform_fee_charge') {
        platformFeeCharged += amount;
        platformFeeOutstanding += amount;
      } else if (entry.entry_type === 'daily_fee_accrual') {
        postedDailyFeeCharged += amount;
        postedDailyFeeOutstanding += amount;
      }
      continue;
    }

    totalCredits += amount;
    let remainingCredit = amount;

    for (const tranche of principalCharges) {
      if (remainingCredit <= 0) break;
      if (tranche.remaining <= 0) continue;
      const applied = Math.min(tranche.remaining, remainingCredit);
      tranche.remaining -= applied;
      remainingCredit -= applied;
    }

    if (remainingCredit > 0 && platformFeeOutstanding > 0) {
      const applied = Math.min(platformFeeOutstanding, remainingCredit);
      platformFeeOutstanding -= applied;
      remainingCredit -= applied;
    }

    if (remainingCredit > 0 && postedDailyFeeOutstanding > 0) {
      const applied = Math.min(postedDailyFeeOutstanding, remainingCredit);
      postedDailyFeeOutstanding -= applied;
    }
  }

  return {
    principalCharges,
    fuelConsumed: roundCurrency(fuelConsumed),
    platformFeeCharged: roundCurrency(platformFeeCharged),
    postedDailyFeeCharged: roundCurrency(postedDailyFeeCharged),
    platformFeeOutstanding: roundCurrency(platformFeeOutstanding),
    postedDailyFeeOutstanding: roundCurrency(postedDailyFeeOutstanding),
    totalCredits: roundCurrency(totalCredits),
    outstandingPrincipal: roundCurrency(
      principalCharges.reduce((sum, tranche) => sum + tranche.remaining, 0)
    ),
  };
}

function calculateDynamicDailyFee(params: {
  principalCharges: PrincipalTranche[];
  dailyFeeRate: number;
  asOf: Date;
}): number {
  const asOfTime = params.asOf.getTime();

  const total = params.principalCharges.reduce((sum, tranche) => {
    if (tranche.remaining <= 0) return sum;
    const daysOutstanding = wholeDaysBetween(tranche.createdAt, asOfTime);
    if (daysOutstanding <= 0) return sum;
    return sum + tranche.remaining * params.dailyFeeRate * daysOutstanding;
  }, 0);

  return roundCurrency(total);
}

export type FuelAccountSummary = {
  overdraftAllowed: boolean;
  overdraftLimitAmount: number;
  warningThresholdAmount: number;
  availableBalance: number;
  outstandingAmount: number;
  grossOutstandingAmount: number;
  fuelConsumedAmount: number;
  platformFeeCharged: number;
  dailyFeeAccrued: number;
  pendingApprovalAmount: number;
  pendingApprovalCount: number;
  totalCredits: number;
  platformFeeRate: number;
  dailyFeeRate: number;
};

export async function getSmeFuelAccountSummary(
  contractorId: string,
  asOf = new Date()
): Promise<FuelAccountSummary | null> {
  const { contractor, settings, platformFeeRate, dailyFeeRate } = await getContractorFuelTerms(contractorId);

  if (!settings) {
    return null;
  }

  const overdraftAllowed = Boolean(settings.overdraft_allowed ?? ((settings.account_mode ?? 'credit') === 'credit'));
  const overdraftLimitAmount = asNumber(
    settings.overdraft_limit_amount,
    overdraftAllowed ? asNumber(settings.account_limit_amount, asNumber(settings.monthly_fuel_budget)) : 0
  );
  const warningThresholdAmount = asNumber(settings.warning_threshold_amount, 0);

  const account = await getOrCreateFuelAccount({
    ownerType: 'contractor',
    ownerId: contractor.id,
    accountKind: 'sme_fuel',
    mode: overdraftAllowed ? 'credit' : 'cash_carry',
  });

  const [entries, pendingApprovalsResult] = await Promise.all([
    getLedgerEntries(account.id),
    supabaseAdmin
      .from('fuel_approvals')
      .select('max_amount', { count: 'exact' })
      .eq('contractor_id', contractorId)
      .eq('status', 'pending'),
  ]);

  if (pendingApprovalsResult.error) {
    throw pendingApprovalsResult.error;
  }

  const settlement = applyCreditsToSmeDebits(entries);
  const dailyFeeAccrued = settlement.outstandingPrincipal > 0
    ? calculateDynamicDailyFee({
        principalCharges: settlement.principalCharges,
        dailyFeeRate,
        asOf,
      })
    : 0;

  const pendingApprovalAmount = roundCurrency(
    (pendingApprovalsResult.data || []).reduce(
      (sum, row) => sum + asNumber(row.max_amount),
      0
    )
  );
  const pendingApprovalCount = pendingApprovalsResult.count || 0;

  const grossOutstandingAmount = roundCurrency(
    settlement.outstandingPrincipal +
      settlement.platformFeeOutstanding +
      settlement.postedDailyFeeOutstanding +
      dailyFeeAccrued
  );

  const availableBalance = roundCurrency(
    settlement.totalCredits -
      settlement.fuelConsumed -
      settlement.platformFeeCharged -
      settlement.postedDailyFeeCharged -
      dailyFeeAccrued
  );

  return {
    overdraftAllowed,
    overdraftLimitAmount: roundCurrency(overdraftLimitAmount),
    warningThresholdAmount: roundCurrency(warningThresholdAmount),
    availableBalance,
    outstandingAmount: roundCurrency(Math.max(-availableBalance, 0)),
    grossOutstandingAmount,
    fuelConsumedAmount: settlement.fuelConsumed,
    platformFeeCharged: settlement.platformFeeCharged,
    dailyFeeAccrued,
    pendingApprovalAmount,
    pendingApprovalCount,
    totalCredits: settlement.totalCredits,
    platformFeeRate,
    dailyFeeRate,
  };
}

export type ProviderSettlementSummary = {
  totalFilledAmount: number;
  totalSettledAmount: number;
  outstandingPayableAmount: number;
};

export async function getProviderSettlementSummary(pumpId: string): Promise<ProviderSettlementSummary> {
  const account = await getOrCreateFuelAccount({
    ownerType: 'fuel_pump',
    ownerId: pumpId,
    accountKind: 'provider_settlement',
    mode: 'settlement',
  });

  const entries = await getLedgerEntries(account.id);

  const totals = entries.reduce(
    (acc, entry) => {
      const amount = asNumber(entry.amount);
      if (entry.direction === 'credit' && entry.entry_type === 'provider_payable') {
        acc.totalFilledAmount += amount;
      }
      if (entry.direction === 'debit' && entry.entry_type === 'provider_settlement') {
        acc.totalSettledAmount += amount;
      }
      return acc;
    },
    { totalFilledAmount: 0, totalSettledAmount: 0 }
  );

  return {
    totalFilledAmount: roundCurrency(totals.totalFilledAmount),
    totalSettledAmount: roundCurrency(totals.totalSettledAmount),
    outstandingPayableAmount: roundCurrency(
      Math.max(totals.totalFilledAmount - totals.totalSettledAmount, 0)
    ),
  };
}

export async function recordFuelFillLedgerEntries(params: {
  approvalId: string;
  contractorId: string;
  pumpId: string;
  filledAmount: number;
  filledAt?: string;
}) {
  const { approvalId, contractorId, pumpId, filledAmount, filledAt } = params;
  const { settings, platformFeeRate } = await getContractorFuelTerms(contractorId);

  if (!settings) {
    throw new Error('Fuel settings not configured for contractor');
  }

  const platformFeeAmount = roundCurrency(asNumber(filledAmount) * platformFeeRate);
  const timestamp = filledAt || new Date().toISOString();

  const [smeAccount, providerAccount] = await Promise.all([
    getOrCreateFuelAccount({
      ownerType: 'contractor',
      ownerId: contractorId,
      accountKind: 'sme_fuel',
      mode: (settings.overdraft_allowed ?? ((settings.account_mode ?? 'credit') === 'credit')) ? 'credit' : 'cash_carry',
    }),
    getOrCreateFuelAccount({
      ownerType: 'fuel_pump',
      ownerId: pumpId,
      accountKind: 'provider_settlement',
      mode: 'settlement',
    }),
  ]);

  const { data: existingEntries, error: existingError } = await supabaseAdmin
    .from('fuel_ledger_entries')
    .select('id')
    .eq('reference_type', 'fuel_approval')
    .eq('reference_id', approvalId);

  if (existingError) {
    throw existingError;
  }

  if ((existingEntries || []).length > 0) {
    throw new Error('Ledger already exists for this fuel approval');
  }

  const entries: Database['public']['Tables']['fuel_ledger_entries']['Insert'][] = [
    {
      account_id: smeAccount.id,
      entry_type: 'fuel_fill_charge',
      direction: 'debit',
      amount: roundCurrency(filledAmount),
      reference_type: 'fuel_approval',
      reference_id: approvalId,
      metadata: {
        filled_amount: roundCurrency(filledAmount),
      },
      created_at: timestamp,
    },
    {
      account_id: smeAccount.id,
      entry_type: 'platform_fee_charge',
      direction: 'debit',
      amount: platformFeeAmount,
      reference_type: 'fuel_approval',
      reference_id: approvalId,
      metadata: {
        base_amount: roundCurrency(filledAmount),
        platform_fee_rate: platformFeeRate,
      },
      created_at: timestamp,
    },
    {
      account_id: providerAccount.id,
      entry_type: 'provider_payable',
      direction: 'credit',
      amount: roundCurrency(filledAmount),
      reference_type: 'fuel_approval',
      reference_id: approvalId,
      metadata: {
        payable_amount: roundCurrency(filledAmount),
      },
      created_at: timestamp,
    },
  ];

  const { error: insertError } = await supabaseAdmin
    .from('fuel_ledger_entries')
    .insert(entries);

  if (insertError) {
    throw insertError;
  }

  return {
    platformFeeAmount,
    grossSmeCharge: roundCurrency(filledAmount + platformFeeAmount),
    providerPayableAmount: roundCurrency(filledAmount),
  };
}

export async function recordSmeFuelPayment(params: {
  contractorId: string;
  amount: number;
  notes?: string | null;
}) {
  const { settings } = await getContractorFuelTerms(params.contractorId);
  if (!settings) {
    throw new Error('Fuel settings not configured for contractor');
  }

  const account = await getOrCreateFuelAccount({
    ownerType: 'contractor',
    ownerId: params.contractorId,
    accountKind: 'sme_fuel',
    mode: (settings.overdraft_allowed ?? ((settings.account_mode ?? 'credit') === 'credit')) ? 'credit' : 'cash_carry',
  });

  const { data, error } = await supabaseAdmin
    .from('fuel_ledger_entries')
    .insert({
      account_id: account.id,
      entry_type: 'sme_payment',
      direction: 'credit',
      amount: roundCurrency(params.amount),
      reference_type: 'sme_payment',
      metadata: {},
      notes: params.notes || null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to record SME payment');
  }

  return data;
}

export async function recordProviderSettlement(params: {
  pumpId: string;
  amount: number;
  notes?: string | null;
}) {
  const account = await getOrCreateFuelAccount({
    ownerType: 'fuel_pump',
    ownerId: params.pumpId,
    accountKind: 'provider_settlement',
    mode: 'settlement',
  });

  const batchCode = `FS-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

  const { data: batch, error: batchError } = await supabaseAdmin
    .from('fuel_settlement_batches')
    .insert({
      pump_id: params.pumpId,
      batch_code: batchCode,
      total_amount: roundCurrency(params.amount),
      status: 'paid',
      settled_at: new Date().toISOString(),
      notes: params.notes || null,
    })
    .select('*')
    .single();

  if (batchError || !batch) {
    throw batchError ?? new Error('Failed to create settlement batch');
  }

  const { data: entry, error: entryError } = await supabaseAdmin
    .from('fuel_ledger_entries')
    .insert({
      account_id: account.id,
      entry_type: 'provider_settlement',
      direction: 'debit',
      amount: roundCurrency(params.amount),
      reference_type: 'provider_settlement_batch',
      reference_id: batch.id,
      metadata: {
        batch_code: batch.batch_code,
      },
      notes: params.notes || null,
    })
    .select('*')
    .single();

  if (entryError || !entry) {
    throw entryError ?? new Error('Failed to record provider settlement');
  }

  return { batch, entry };
}

export async function getFuelFinanceOverview() {
  const [{ data: settingsRows, error: settingsError }, { data: pumps, error: pumpsError }] = await Promise.all([
    supabaseAdmin
      .from('contractor_fuel_settings')
      .select('contractor_id'),
    supabaseAdmin
      .from('fuel_pumps')
      .select('id'),
  ]);

  if (settingsError) throw settingsError;
  if (pumpsError) throw pumpsError;

  const smeSummaries = await Promise.all(
    (settingsRows || []).map((row) => getSmeFuelAccountSummary(row.contractor_id))
  );
  const providerSummaries = await Promise.all(
    (pumps || []).map((pump) => getProviderSettlementSummary(pump.id))
  );

  const totals = {
    smeReceivables: 0,
    providerPayables: 0,
    platformFeeEarned: 0,
    dailyFeeAccrued: 0,
  };

  smeSummaries.forEach((summary) => {
    if (!summary) return;
    totals.smeReceivables += summary.outstandingAmount;
    totals.platformFeeEarned += summary.platformFeeCharged;
    totals.dailyFeeAccrued += summary.dailyFeeAccrued;
  });

  providerSummaries.forEach((summary) => {
    totals.providerPayables += summary.outstandingPayableAmount;
  });

  return {
    summary: {
      smeReceivables: roundCurrency(totals.smeReceivables),
      providerPayables: roundCurrency(totals.providerPayables),
      platformFeeEarned: roundCurrency(totals.platformFeeEarned),
      dailyFeeAccrued: roundCurrency(totals.dailyFeeAccrued),
      netExposure: roundCurrency(totals.smeReceivables - totals.providerPayables),
    },
  };
}

export type FuelLedgerViewRow = {
  id: string;
  created_at: string;
  ownerType: 'contractor' | 'fuel_pump';
  ownerId: string;
  ownerLabel: string;
  accountKind: 'sme_fuel' | 'provider_settlement';
  mode: 'cash_carry' | 'credit' | 'settlement';
  entryType: string;
  direction: 'debit' | 'credit';
  amount: number;
  referenceType: string;
  referenceId: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
};

export async function getFuelLedger(params?: {
  contractorId?: string;
  pumpId?: string;
  limit?: number;
}): Promise<FuelLedgerViewRow[]> {
  const limit = Math.max(1, Math.min(params?.limit ?? 50, 200));

  let accountsQuery = supabaseAdmin
    .from('fuel_accounts')
    .select('*');

  if (params?.contractorId) {
    accountsQuery = accountsQuery.eq('owner_type', 'contractor').eq('owner_id', params.contractorId);
  } else if (params?.pumpId) {
    accountsQuery = accountsQuery.eq('owner_type', 'fuel_pump').eq('owner_id', params.pumpId);
  }

  const { data: accounts, error: accountsError } = await accountsQuery;
  if (accountsError) throw accountsError;
  if (!accounts || accounts.length === 0) return [];

  const contractorIds = accounts.filter((a) => a.owner_type === 'contractor').map((a) => a.owner_id);
  const pumpIds = accounts.filter((a) => a.owner_type === 'fuel_pump').map((a) => a.owner_id);

  const [contractorsResult, pumpsResult, ledgerResult] = await Promise.all([
    contractorIds.length
      ? supabaseAdmin.from('contractors').select('id, company_name').in('id', contractorIds)
      : Promise.resolve({ data: [], error: null }),
    pumpIds.length
      ? supabaseAdmin.from('fuel_pumps').select('id, pump_name').in('id', pumpIds)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      .from('fuel_ledger_entries')
      .select('*')
      .in('account_id', accounts.map((a) => a.id))
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  if (contractorsResult.error) throw contractorsResult.error;
  if (pumpsResult.error) throw pumpsResult.error;
  if (ledgerResult.error) throw ledgerResult.error;

  const accountMap = new Map<string, FuelAccountRow>(accounts.map((account) => [account.id, account]));
  const contractorMap = new Map((contractorsResult.data || []).map((row) => [row.id, row.company_name]));
  const pumpMap = new Map((pumpsResult.data || []).map((row) => [row.id, row.pump_name]));

  return (ledgerResult.data || []).map((entry) => {
    const account = accountMap.get(entry.account_id) as FuelAccountRow | undefined;
    if (!account) {
      throw new Error('Fuel ledger account missing for entry');
    }

    const ownerLabel = account.owner_type === 'contractor'
      ? contractorMap.get(account.owner_id) || 'SME'
      : pumpMap.get(account.owner_id) || 'Fuel Provider';

    return {
      id: entry.id,
      created_at: entry.created_at,
      ownerType: account.owner_type,
      ownerId: account.owner_id,
      ownerLabel,
      accountKind: account.account_kind,
      mode: account.mode,
      entryType: entry.entry_type,
      direction: entry.direction,
      amount: roundCurrency(entry.amount),
      referenceType: entry.reference_type,
      referenceId: entry.reference_id,
      notes: entry.notes,
      metadata: entry.metadata as Record<string, unknown>,
    };
  });
}

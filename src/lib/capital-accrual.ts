type CapitalTransactionLike = {
  purchase_request_id?: string | null;
  transaction_type: 'deployment' | 'return' | string;
  amount?: number | string | null;
  created_at?: string | null;
};

type ContractorTermsLike = {
  platform_fee_rate?: number | null;
  platform_fee_cap?: number | null;
  participation_fee_rate_daily?: number | null;
};

type AccrualTranche = {
  remainingPrincipal: number;
  deployedAt: number;
  lastAccruedAt: number;
};

const DAY_MS = 1000 * 60 * 60 * 24;
const MONEY_EPSILON = 0.01;

function toAmount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function wholeDaysBetween(start: number, end: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

export type CapitalAccrualMetrics = {
  fundedAmount: number;
  returnedAmount: number;
  outstandingPrincipal: number;
  participationFee: number;
  outstandingParticipationFee: number;
  platformFee: number;
  outstandingPlatformFee: number;
  investorDue: number;
  remainingInvestorDue: number;
  totalDue: number;
  remainingDue: number;
  remainingAmount: number | null;
  fundingProgress: number | null;
  daysOutstanding: number;
};

export function calculateCapitalAccrualMetrics(params: {
  transactions: CapitalTransactionLike[];
  terms?: ContractorTermsLike | null;
  purchaseRequestTotal?: number | null;
  asOf?: Date;
}): CapitalAccrualMetrics {
  const terms = params.terms ?? {};
  const platformFeeRate = Number(terms.platform_fee_rate ?? 0.0025);
  const platformFeeCap = Number(terms.platform_fee_cap ?? 25000);
  const participationFeeRateDaily = Number(terms.participation_fee_rate_daily ?? 0.001);
  const asOfTime = (params.asOf ?? new Date()).getTime();

  const events = params.transactions
    .map((transaction, index) => ({
      type: transaction.transaction_type,
      amount: Math.max(0, toAmount(transaction.amount)),
      timestamp: toTimestamp(transaction.created_at) ?? asOfTime,
      order: index
    }))
    .filter((event) => event.amount > 0 && (event.type === 'deployment' || event.type === 'return'))
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      if (a.type !== b.type) return a.type === 'deployment' ? -1 : 1;
      return a.order - b.order;
    });

  const tranches: AccrualTranche[] = [];
  let fundedAmount = 0;
  let returnedAmount = 0;
  let participationFee = 0;
  let outstandingParticipationFee = 0;
  let platformFee = 0;
  let outstandingPlatformFee = 0;

  const accrueTo = (targetTime: number) => {
    tranches.forEach((tranche) => {
      if (tranche.remainingPrincipal <= 0) return;
      const days = wholeDaysBetween(tranche.lastAccruedAt, targetTime);
      if (days <= 0) return;
      const accrued = tranche.remainingPrincipal * participationFeeRateDaily * days;
      participationFee += accrued;
      outstandingParticipationFee += accrued;
      tranche.lastAccruedAt = targetTime;
    });
  };

  const applyReturnToPrincipal = (amount: number) => {
    let remaining = amount;

    for (const tranche of tranches) {
      if (remaining <= 0) break;
      if (tranche.remainingPrincipal <= 0) continue;

      const principalReduction = Math.min(tranche.remainingPrincipal, remaining);
      tranche.remainingPrincipal -= principalReduction;
      remaining -= principalReduction;
      tranche.lastAccruedAt = tranche.remainingPrincipal > 0 ? tranche.lastAccruedAt : Math.max(tranche.lastAccruedAt, tranche.deployedAt);
    }

    return remaining;
  };

  for (const event of events) {
    accrueTo(event.timestamp);

    if (event.type === 'deployment') {
      const nextFundedAmount = fundedAmount + event.amount;
      const nextPlatformFee = Math.min(nextFundedAmount * platformFeeRate, platformFeeCap);
      const platformFeeDelta = Math.max(0, nextPlatformFee - platformFee);
      fundedAmount += event.amount;
      platformFee = nextPlatformFee;
      outstandingPlatformFee += platformFeeDelta;
      tranches.push({
        remainingPrincipal: event.amount,
        deployedAt: event.timestamp,
        lastAccruedAt: event.timestamp
      });
      continue;
    }

    returnedAmount += event.amount;
    let remainingReturn = event.amount;

    if (outstandingParticipationFee > 0) {
      const appliedToFee = Math.min(outstandingParticipationFee, remainingReturn);
      outstandingParticipationFee -= appliedToFee;
      remainingReturn -= appliedToFee;
    }

    if (remainingReturn > 0) {
      remainingReturn = applyReturnToPrincipal(remainingReturn);
    }

    if (remainingReturn > 0 && outstandingPlatformFee > 0) {
      const appliedToPlatformFee = Math.min(outstandingPlatformFee, remainingReturn);
      outstandingPlatformFee -= appliedToPlatformFee;
      remainingReturn -= appliedToPlatformFee;
    }
  }

  accrueTo(asOfTime);

  const outstandingPrincipal = tranches.reduce((sum, tranche) => sum + tranche.remainingPrincipal, 0);
  const investorDue = fundedAmount + participationFee;
  const totalDue = investorDue + platformFee;

  // Legacy returns were sometimes recorded against fee + principal only.
  // If the contractor has already returned the full contractor-facing amount,
  // treat the platform fee bucket as settled during reconciliation.
  if (
    outstandingPrincipal <= MONEY_EPSILON &&
    outstandingParticipationFee <= MONEY_EPSILON &&
    outstandingPlatformFee > MONEY_EPSILON &&
    returnedAmount + MONEY_EPSILON >= totalDue
  ) {
    outstandingPlatformFee = 0;
  }

  const remainingInvestorDue = Math.max(0, outstandingPrincipal + outstandingParticipationFee);
  const remainingDue = Math.max(0, remainingInvestorDue + outstandingPlatformFee);
  const purchaseRequestTotal = params.purchaseRequestTotal;
  const remainingAmount = typeof purchaseRequestTotal === 'number'
    ? Math.max(purchaseRequestTotal - fundedAmount, 0)
    : null;
  const fundingProgress = typeof purchaseRequestTotal === 'number' && purchaseRequestTotal > 0
    ? Math.min(fundedAmount / purchaseRequestTotal, 1)
    : null;

  const oldestOutstandingTranche = tranches.find((tranche) => tranche.remainingPrincipal > 0);
  const daysOutstanding = oldestOutstandingTranche
    ? wholeDaysBetween(oldestOutstandingTranche.deployedAt, asOfTime)
    : 0;

  return {
    fundedAmount,
    returnedAmount,
    outstandingPrincipal,
    participationFee,
    outstandingParticipationFee,
    platformFee,
    outstandingPlatformFee,
    investorDue,
    remainingInvestorDue,
    totalDue,
    remainingDue,
    remainingAmount,
    fundingProgress,
    daysOutstanding
  };
}

export function groupTransactionsByPurchaseRequest<T extends CapitalTransactionLike>(transactions: T[]) {
  const grouped = new Map<string, T[]>();

  transactions.forEach((transaction) => {
    if (!transaction.purchase_request_id) return;
    const existing = grouped.get(transaction.purchase_request_id) || [];
    existing.push(transaction);
    grouped.set(transaction.purchase_request_id, existing);
  });

  return grouped;
}

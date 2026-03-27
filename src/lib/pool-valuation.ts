type InvestorCashflowLike = {
  investor_id?: string | null;
  amount?: number | string | null;
  created_at?: string | null;
  status?: string | null;
  transaction_type?: string | null;
};

type PoolTransactionLike = {
  purchase_request_id?: string | null;
  amount?: number | string | null;
  created_at?: string | null;
  status?: string | null;
  transaction_type?: string | null;
};

type PurchaseRequestLike = {
  id: string;
  project_id?: string | null;
  contractor_id?: string | null;
  status?: string | null;
};

type ContractorLike = {
  id: string;
  company_name?: string | null;
  participation_fee_rate_daily?: number | null;
};

type ProjectLike = {
  id: string;
  project_name?: string | null;
};

type PoolTranche = {
  purchaseRequestId: string;
  projectId: string | null;
  contractorId: string | null;
  remainingPrincipal: number;
  outstandingParticipationFee: number;
  deployedAt: number;
  lastAccruedAt: number;
  participationRateDaily: number;
};

type PoolExposure = {
  purchaseRequestId: string;
  projectId: string | null;
  projectName: string | null;
  contractorId: string | null;
  contractorName: string | null;
  outstandingPrincipal: number;
  outstandingParticipationFee: number;
  grossExposureValue: number;
  ownershipPercent: number;
  investorGrossExposure: number;
  investorNetExposure: number;
};

type PoolPosition = {
  investorId: string;
  contributedCapital: number;
  unitsHeld: number;
  ownershipPercent: number;
  entryNavPerUnit: number;
  grossValue: number;
  netValue: number;
  grossGain: number;
  netGain: number;
};

export type PoolValuationSummary = {
  valuationDate: string;
  totalCommittedCapital: number;
  totalPoolUnits: number;
  grossNavPerUnit: number;
  netNavPerUnit: number;
  poolCash: number;
  deployedPrincipal: number;
  accruedParticipationIncome: number;
  realizedParticipationIncome: number;
  preferredReturnAccrued: number;
  managementFeeAccrued: number;
  realizedCarryAccrued: number;
  potentialCarry: number;
  grossPoolValue: number;
  netPoolValue: number;
  realizedXirr: number;
  projectedGrossXirr: number;
  projectedNetXirr: number;
  positions: PoolPosition[];
  exposures: PoolExposure[];
};

const DAY_MS = 1000 * 60 * 60 * 24;
const INITIAL_NAV_PER_UNIT = 100;
const MANAGEMENT_FEE_RATE_ANNUAL = 0.02;
const PREFERRED_RETURN_RATE_ANNUAL = 0.12;
const PERFORMANCE_FEE_RATE = 0.2;

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

function computeXirr(cashflows: { date: Date; amount: number }[]): number {
  if (cashflows.length < 2) return 0;
  const sorted = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const hasPositive = sorted.some((cf) => cf.amount > 0);
  const hasNegative = sorted.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return 0;

  const startTime = sorted[0]?.date.getTime() ?? Date.now();
  let rate = 0.12;

  for (let i = 0; i < 100; i += 1) {
    let npv = 0;
    let derivative = 0;

    sorted.forEach((cashflow) => {
      const years = (cashflow.date.getTime() - startTime) / (1000 * 60 * 60 * 24 * 365);
      const denominator = Math.pow(1 + rate, years);
      npv += cashflow.amount / denominator;
      derivative += (-years * cashflow.amount) / (denominator * (1 + rate));
    });

    if (Math.abs(npv) < 1e-7 || Math.abs(derivative) < 1e-10) {
      break;
    }

    rate -= npv / derivative;
    if (rate <= -0.9999) {
      rate = -0.9999;
    }
  }

  return Number.isFinite(rate) ? rate * 100 : 0;
}

export function calculateSoftPoolValuation(params: {
  investorInflows: InvestorCashflowLike[];
  investorDistributions?: InvestorCashflowLike[];
  poolTransactions: PoolTransactionLike[];
  purchaseRequests: PurchaseRequestLike[];
  contractors: ContractorLike[];
  projects?: ProjectLike[];
  asOf?: Date;
}): PoolValuationSummary {
  const asOf = params.asOf ?? new Date();
  const asOfTime = asOf.getTime();
  const managementFeeRateDaily = MANAGEMENT_FEE_RATE_ANNUAL / 365;
  const preferredReturnRateDaily = PREFERRED_RETURN_RATE_ANNUAL / 365;

  const requestMap = new Map(params.purchaseRequests.map((request) => [request.id, request]));
  const contractorMap = new Map(params.contractors.map((contractor) => [contractor.id, contractor]));
  const projectMap = new Map((params.projects || []).map((project) => [project.id, project]));

  const investorInflows = params.investorInflows
    .filter((row) => {
      const status = String(row.status || 'completed').toLowerCase();
      return !!row.investor_id && status !== 'cancelled' && status !== 'failed' && status !== 'rejected' && toAmount(row.amount) > 0;
    })
    .map((row) => ({
      investorId: row.investor_id as string,
      amount: Math.abs(toAmount(row.amount)),
      timestamp: toTimestamp(row.created_at) ?? asOfTime
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const investorDistributions = (params.investorDistributions || [])
    .filter((row) => {
      const status = String(row.status || 'completed').toLowerCase();
      return status === 'completed' && !!row.investor_id && toAmount(row.amount) > 0;
    })
    .map((row) => ({
      investorId: row.investor_id as string,
      amount: Math.abs(toAmount(row.amount)),
      timestamp: toTimestamp(row.created_at) ?? asOfTime
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const poolTransactions = params.poolTransactions
    .filter((row) => {
      const status = String(row.status || 'completed').toLowerCase();
      return status === 'completed' && ['deployment', 'return'].includes(String(row.transaction_type || '').toLowerCase()) && toAmount(row.amount) > 0;
    })
    .map((row, index) => ({
      purchaseRequestId: row.purchase_request_id || null,
      amount: Math.abs(toAmount(row.amount)),
      type: String(row.transaction_type || '').toLowerCase() as 'deployment' | 'return',
      timestamp: toTimestamp(row.created_at) ?? asOfTime,
      order: index
    }))
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      if (a.type !== b.type) return a.type === 'deployment' ? -1 : 1;
      return a.order - b.order;
    });

  const tranches: PoolTranche[] = [];
  const positions = new Map<string, { contributedCapital: number; unitsHeld: number }>();
  let totalPoolUnits = 0;
  let poolCash = 0;
  let accruedParticipationIncome = 0;
  let realizedParticipationIncome = 0;
  let preferredReturnAccrued = 0;
  let managementFeeAccrued = 0;
  let realizedCarryAccrued = 0;

  const currentGrossPoolValue = () => {
    const deployedPrincipal = tranches.reduce((sum, tranche) => sum + tranche.remainingPrincipal, 0);
    return poolCash + deployedPrincipal + accruedParticipationIncome;
  };

  const currentNetPoolValue = () => currentGrossPoolValue() - managementFeeAccrued - realizedCarryAccrued;

  const accrueTo = (targetTime: number) => {
    tranches.forEach((tranche) => {
      if (tranche.remainingPrincipal <= 0) return;
      const days = wholeDaysBetween(tranche.lastAccruedAt, targetTime);
      if (days <= 0) return;

      const participationAccrued = tranche.remainingPrincipal * tranche.participationRateDaily * days;
      const preferredAccrued = tranche.remainingPrincipal * preferredReturnRateDaily * days;
      const managementAccrued = tranche.remainingPrincipal * managementFeeRateDaily * days;

      tranche.outstandingParticipationFee += participationAccrued;
      tranche.lastAccruedAt = targetTime;
      accruedParticipationIncome += participationAccrued;
      preferredReturnAccrued += preferredAccrued;
      managementFeeAccrued += managementAccrued;
    });
  };

  const crystallizeCarry = () => {
    const eligibleCarryBase = Math.max(realizedParticipationIncome - preferredReturnAccrued, 0);
    const carryTarget = eligibleCarryBase * PERFORMANCE_FEE_RATE;
    if (carryTarget > realizedCarryAccrued) {
      realizedCarryAccrued = carryTarget;
    }
  };

  let transactionIndex = 0;
  let distributionIndex = 0;

  for (const inflow of investorInflows) {
    while (transactionIndex < poolTransactions.length && poolTransactions[transactionIndex]!.timestamp <= inflow.timestamp) {
      const transaction = poolTransactions[transactionIndex]!;
      accrueTo(transaction.timestamp);

      if (transaction.type === 'deployment' && transaction.purchaseRequestId) {
        const request = requestMap.get(transaction.purchaseRequestId);
        const contractor = request?.contractor_id ? contractorMap.get(request.contractor_id) : null;
        poolCash -= transaction.amount;
        tranches.push({
          purchaseRequestId: transaction.purchaseRequestId,
          projectId: request?.project_id || null,
          contractorId: request?.contractor_id || null,
          remainingPrincipal: transaction.amount,
          outstandingParticipationFee: 0,
          deployedAt: transaction.timestamp,
          lastAccruedAt: transaction.timestamp,
          participationRateDaily: Number(contractor?.participation_fee_rate_daily ?? 0.001)
        });
      } else if (transaction.type === 'return') {
        poolCash += transaction.amount;
        let remainingReturn = transaction.amount;

        for (const tranche of tranches) {
          if (remainingReturn <= 0) break;
          if (tranche.outstandingParticipationFee <= 0) continue;
          const appliedToFee = Math.min(tranche.outstandingParticipationFee, remainingReturn);
          tranche.outstandingParticipationFee -= appliedToFee;
          accruedParticipationIncome -= appliedToFee;
          realizedParticipationIncome += appliedToFee;
          remainingReturn -= appliedToFee;
        }

        for (const tranche of tranches) {
          if (remainingReturn <= 0) break;
          if (tranche.remainingPrincipal <= 0) continue;
          const appliedToPrincipal = Math.min(tranche.remainingPrincipal, remainingReturn);
          tranche.remainingPrincipal -= appliedToPrincipal;
          remainingReturn -= appliedToPrincipal;
        }

        crystallizeCarry();
      }

      transactionIndex += 1;
    }

    while (distributionIndex < investorDistributions.length && investorDistributions[distributionIndex]!.timestamp <= inflow.timestamp) {
      const distribution = investorDistributions[distributionIndex]!;
      accrueTo(distribution.timestamp);
      const preDistributionNav = totalPoolUnits > 0 ? currentNetPoolValue() / totalPoolUnits : INITIAL_NAV_PER_UNIT;
      const unitsToBurn = preDistributionNav > 0 ? distribution.amount / preDistributionNav : 0;
      totalPoolUnits = Math.max(totalPoolUnits - unitsToBurn, 0);
      poolCash = Math.max(poolCash - distribution.amount, 0);
      const existing = positions.get(distribution.investorId);
      if (existing) {
        existing.unitsHeld = Math.max(existing.unitsHeld - unitsToBurn, 0);
      }
      distributionIndex += 1;
    }

    accrueTo(inflow.timestamp);
    const preMoneyNav = totalPoolUnits > 0 && currentNetPoolValue() > 0
      ? currentNetPoolValue() / totalPoolUnits
      : INITIAL_NAV_PER_UNIT;
    const unitsMinted = inflow.amount / preMoneyNav;
    totalPoolUnits += unitsMinted;
    poolCash += inflow.amount;
    const existing = positions.get(inflow.investorId) || { contributedCapital: 0, unitsHeld: 0 };
    existing.contributedCapital += inflow.amount;
    existing.unitsHeld += unitsMinted;
    positions.set(inflow.investorId, existing);
  }

  while (transactionIndex < poolTransactions.length) {
    const transaction = poolTransactions[transactionIndex]!;
    accrueTo(transaction.timestamp);

    if (transaction.type === 'deployment' && transaction.purchaseRequestId) {
      const request = requestMap.get(transaction.purchaseRequestId);
      const contractor = request?.contractor_id ? contractorMap.get(request.contractor_id) : null;
      poolCash -= transaction.amount;
      tranches.push({
        purchaseRequestId: transaction.purchaseRequestId,
        projectId: request?.project_id || null,
        contractorId: request?.contractor_id || null,
        remainingPrincipal: transaction.amount,
        outstandingParticipationFee: 0,
        deployedAt: transaction.timestamp,
        lastAccruedAt: transaction.timestamp,
        participationRateDaily: Number(contractor?.participation_fee_rate_daily ?? 0.001)
      });
    } else if (transaction.type === 'return') {
      poolCash += transaction.amount;
      let remainingReturn = transaction.amount;

      for (const tranche of tranches) {
        if (remainingReturn <= 0) break;
        if (tranche.outstandingParticipationFee <= 0) continue;
        const appliedToFee = Math.min(tranche.outstandingParticipationFee, remainingReturn);
        tranche.outstandingParticipationFee -= appliedToFee;
        accruedParticipationIncome -= appliedToFee;
        realizedParticipationIncome += appliedToFee;
        remainingReturn -= appliedToFee;
      }

      for (const tranche of tranches) {
        if (remainingReturn <= 0) break;
        if (tranche.remainingPrincipal <= 0) continue;
        const appliedToPrincipal = Math.min(tranche.remainingPrincipal, remainingReturn);
        tranche.remainingPrincipal -= appliedToPrincipal;
        remainingReturn -= appliedToPrincipal;
      }

      crystallizeCarry();
    }

    transactionIndex += 1;
  }

  while (distributionIndex < investorDistributions.length) {
    const distribution = investorDistributions[distributionIndex]!;
    accrueTo(distribution.timestamp);
    const preDistributionNav = totalPoolUnits > 0 ? currentNetPoolValue() / totalPoolUnits : INITIAL_NAV_PER_UNIT;
    const unitsToBurn = preDistributionNav > 0 ? distribution.amount / preDistributionNav : 0;
    totalPoolUnits = Math.max(totalPoolUnits - unitsToBurn, 0);
    poolCash = Math.max(poolCash - distribution.amount, 0);
    const existing = positions.get(distribution.investorId);
    if (existing) {
      existing.unitsHeld = Math.max(existing.unitsHeld - unitsToBurn, 0);
    }
    distributionIndex += 1;
  }

  accrueTo(asOfTime);

  const deployedPrincipal = tranches.reduce((sum, tranche) => sum + tranche.remainingPrincipal, 0);
  const grossPoolValue = currentGrossPoolValue();
  const totalEconomicProfit = realizedParticipationIncome + accruedParticipationIncome;
  const potentialCarryTotal = Math.max(totalEconomicProfit - preferredReturnAccrued, 0) * PERFORMANCE_FEE_RATE;
  const potentialCarry = Math.max(potentialCarryTotal - realizedCarryAccrued, 0);
  const netPoolValue = Math.max(currentNetPoolValue(), 0);
  const grossNavPerUnit = totalPoolUnits > 0 ? grossPoolValue / totalPoolUnits : INITIAL_NAV_PER_UNIT;
  const netNavPerUnit = totalPoolUnits > 0 ? netPoolValue / totalPoolUnits : INITIAL_NAV_PER_UNIT;

  const poolCashflows = [
    ...investorInflows.map((inflow) => ({ date: new Date(inflow.timestamp), amount: -Math.abs(inflow.amount) })),
    ...investorDistributions.map((distribution) => ({ date: new Date(distribution.timestamp), amount: Math.abs(distribution.amount) }))
  ];
  const realizedXirr = computeXirr(poolCashflows);
  const projectedGrossXirr = computeXirr([...poolCashflows, { date: asOf, amount: grossPoolValue }]);
  const projectedNetXirr = computeXirr([...poolCashflows, { date: asOf, amount: netPoolValue }]);

  const positionsList: PoolPosition[] = [...positions.entries()]
    .map(([investorId, position]) => {
      const ownershipPercent = totalPoolUnits > 0 ? (position.unitsHeld / totalPoolUnits) * 100 : 0;
      const grossValue = position.unitsHeld * grossNavPerUnit;
      const netValue = position.unitsHeld * netNavPerUnit;
      return {
        investorId,
        contributedCapital: position.contributedCapital,
        unitsHeld: position.unitsHeld,
        ownershipPercent,
        entryNavPerUnit: position.unitsHeld > 0 ? position.contributedCapital / position.unitsHeld : INITIAL_NAV_PER_UNIT,
        grossValue,
        netValue,
        grossGain: grossValue - position.contributedCapital,
        netGain: netValue - position.contributedCapital
      };
    })
    .sort((a, b) => b.contributedCapital - a.contributedCapital);

  const tranchesByRequest = new Map<string, PoolExposure>();
  tranches.forEach((tranche) => {
    const existing = tranchesByRequest.get(tranche.purchaseRequestId) || {
      purchaseRequestId: tranche.purchaseRequestId,
      projectId: tranche.projectId,
      projectName: tranche.projectId ? projectMap.get(tranche.projectId)?.project_name || null : null,
      contractorId: tranche.contractorId,
      contractorName: tranche.contractorId ? contractorMap.get(tranche.contractorId)?.company_name || null : null,
      outstandingPrincipal: 0,
      outstandingParticipationFee: 0,
      grossExposureValue: 0,
      ownershipPercent: 0,
      investorGrossExposure: 0,
      investorNetExposure: 0
    };
    existing.outstandingPrincipal += tranche.remainingPrincipal;
    existing.outstandingParticipationFee += tranche.outstandingParticipationFee;
    existing.grossExposureValue = existing.outstandingPrincipal + existing.outstandingParticipationFee;
    tranchesByRequest.set(tranche.purchaseRequestId, existing);
  });

  const exposures = [...tranchesByRequest.values()]
    .sort((a, b) => b.grossExposureValue - a.grossExposureValue);

  return {
    valuationDate: asOf.toISOString(),
    totalCommittedCapital: investorInflows.reduce((sum, inflow) => sum + inflow.amount, 0),
    totalPoolUnits,
    grossNavPerUnit,
    netNavPerUnit,
    poolCash,
    deployedPrincipal,
    accruedParticipationIncome,
    realizedParticipationIncome,
    preferredReturnAccrued,
    managementFeeAccrued,
    realizedCarryAccrued,
    potentialCarry,
    grossPoolValue,
    netPoolValue,
    realizedXirr,
    projectedGrossXirr,
    projectedNetXirr,
    positions: positionsList,
    exposures
  };
}

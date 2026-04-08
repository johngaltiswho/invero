import { scoreFinancialProfile } from './financial-score';
import { scorePOProfile } from './po-score';
import { structureCredit } from './credit-structuring';
import type { FinancialInputs, POInputs, UnderwritingDecision } from './types';

export const SME_RISK_ENGINE_VERSION = 'v1';

export function runSMERiskEngine(params: {
  financial: FinancialInputs;
  po: POInputs;
  policyCap: number;
}): UnderwritingDecision {
  const financial = scoreFinancialProfile(params.financial);
  const po = scorePOProfile(params.po);
  const structure = structureCredit({
    financial,
    po,
    policyCap: params.policyCap,
    expectedCollectionDays: params.po.expectedCollectionDays,
  });

  return {
    financialScore: financial.score,
    financialBand: financial.band,
    financialLimit: financial.limit,
    poScore: po.score,
    poBand: po.band,
    poLimit: po.limit,
    policyCap: structure.policyCap,
    recommendedLimit: structure.recommendedLimit,
    approvedLimit: null,
    recommendedTenorDays: structure.recommendedTenorDays,
    approvedTenorDays: null,
    maxDrawdownPerRequest: structure.maxDrawdownPerRequest,
    repaymentBasis: structure.repaymentBasis,
    conditions: structure.conditions,
    decision: structure.decision,
    engineVersion: SME_RISK_ENGINE_VERSION,
    debug: {
      financialBreakdown: financial.breakdown,
      poBreakdown: po.breakdown,
    },
  };
}

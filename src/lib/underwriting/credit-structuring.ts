import type { CreditStructuringInput, RepaymentBasis, UnderwritingDecision } from './types';

function toDecision(recommendedLimit: number, financialScore: number, poScore: number): UnderwritingDecision['decision'] {
  if (recommendedLimit <= 0 || financialScore < 50 || poScore < 50) return 'reject';
  if (financialScore < 65 || poScore < 65) return 'conditional';
  return 'approve';
}

function tenorFromScores(financialScore: number, poScore: number, expectedCollectionDays?: number) {
  const base = Math.max(30, Math.min(90, Number(expectedCollectionDays || 45) + 10));
  if (financialScore >= 80 && poScore >= 80) return Math.min(90, base + 10);
  if (financialScore < 65 || poScore < 65) return Math.max(30, base - 10);
  return base;
}

export function structureCredit(input: CreditStructuringInput & { expectedCollectionDays?: number | null }): Pick<
  UnderwritingDecision,
  'policyCap' | 'recommendedLimit' | 'recommendedTenorDays' | 'maxDrawdownPerRequest' | 'repaymentBasis' | 'conditions' | 'decision'
> {
  const policyCap = Math.max(0, Number(input.policyCap || 0));
  const recommendedLimit = Math.max(0, Math.min(input.financial.limit, input.po.limit, policyCap));
  const recommendedTenorDays = tenorFromScores(input.financial.score, input.po.score, input.expectedCollectionDays || undefined);
  const maxDrawdownPerRequest = recommendedLimit > 0 ? Math.min(recommendedLimit, recommendedLimit * 0.4) : 0;
  const repaymentBasis: RepaymentBasis = 'client_payment_to_escrow';

  const conditions: string[] = [];
  if (input.financial.score < 65) conditions.push('Financial profile below standard band; use tighter monitoring.');
  if (input.po.score < 65) conditions.push('PO quality requires additional haircut and milestone-level review.');
  if (recommendedLimit === input.po.limit) conditions.push('PO-backed limit is the binding cap for this case.');
  if (recommendedLimit === input.financial.limit) conditions.push('Financial capacity is the binding cap for this case.');
  if (recommendedLimit === policyCap) conditions.push('Internal policy cap is binding.');

  return {
    policyCap,
    recommendedLimit,
    recommendedTenorDays,
    maxDrawdownPerRequest,
    repaymentBasis,
    conditions,
    decision: toDecision(recommendedLimit, input.financial.score, input.po.score),
  };
}

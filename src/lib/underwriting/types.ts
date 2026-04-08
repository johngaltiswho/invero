export type FinancialBand = 'A' | 'B' | 'C' | 'D';
export type POBand = 'P1' | 'P2' | 'P3' | 'P4';
export type UnderwritingDecisionType = 'approve' | 'conditional' | 'reject';
export type RepaymentBasis = 'invoice_linked' | 'delivery_linked' | 'fixed_cycle' | 'client_payment_to_escrow';

export type FinancialInputs = {
  annualTurnover?: number | null;
  ebitda?: number | null;
  netOperatingSurplus?: number | null;
  currentRatio?: number | null;
  totalDebt?: number | null;
  gstFilingScore?: number | null;
  avgMonthlyBankCredits?: number | null;
  avgMonthEndBalance?: number | null;
  businessVintageYears?: number | null;
  bureauScore?: number | null;
  promoterRepaymentScore?: number | null;
};

export type POInputs = {
  projectId?: string | null;
  poNumber?: string | null;
  customerName?: string | null;
  customerCategory?: 'government' | 'psu' | 'listed' | 'mnc' | 'corporate' | 'private' | 'other' | null;
  poValue?: number | null;
  eligiblePOBase?: number | null;
  retentionPercent?: number | null;
  paymentTermsDays?: number | null;
  alreadyBilledAmount?: number | null;
  alreadyFinancedAmount?: number | null;
  expectedCollectionDays?: number | null;
  grossMarginPercent?: number | null;
  concentrationPercent?: number | null;
  documentStrengthScore?: number | null;
  executionRiskScore?: number | null;
};

export type FinancialScoreResult = {
  score: number;
  band: FinancialBand;
  turnoverCap: number;
  cashflowCap: number;
  bankingCap: number;
  limit: number;
  breakdown: Record<string, number>;
};

export type POScoreResult = {
  score: number;
  band: POBand;
  eligibleBase: number;
  haircutPercent: number;
  limit: number;
  breakdown: Record<string, number>;
};

export type CreditStructuringInput = {
  financial: FinancialScoreResult;
  po: POScoreResult;
  policyCap: number;
};

export type UnderwritingDecision = {
  financialScore: number;
  financialBand: FinancialBand;
  financialLimit: number;
  poScore: number;
  poBand: POBand;
  poLimit: number;
  policyCap: number;
  recommendedLimit: number;
  approvedLimit: number | null;
  recommendedTenorDays: number;
  approvedTenorDays: number | null;
  maxDrawdownPerRequest: number;
  repaymentBasis: RepaymentBasis;
  conditions: string[];
  decision: UnderwritingDecisionType;
  engineVersion: string;
  debug: {
    financialBreakdown: Record<string, number>;
    poBreakdown: Record<string, number>;
  };
};

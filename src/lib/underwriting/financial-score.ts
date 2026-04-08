import type { FinancialBand, FinancialInputs, FinancialScoreResult } from './types';

function clampScore(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function toAmount(value?: number | null) {
  return Math.max(0, Number(value || 0));
}

function financialBandForScore(score: number): FinancialBand {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function turnoverScore(annualTurnover: number) {
  if (annualTurnover >= 25_00_00_000) return 15;
  if (annualTurnover >= 10_00_00_000) return 12;
  if (annualTurnover >= 5_00_00_000) return 8;
  return annualTurnover > 0 ? 4 : 0;
}

function profitabilityScore(ebitda: number, turnover: number) {
  if (turnover <= 0) return 0;
  const margin = (ebitda / turnover) * 100;
  if (margin >= 12) return 10;
  if (margin >= 7) return 7;
  if (margin > 0) return 3;
  return 0;
}

function liquidityScore(currentRatio: number) {
  if (currentRatio >= 1.3) return 15;
  if (currentRatio >= 1.1) return 10;
  if (currentRatio > 0) return 5;
  return 0;
}

function leverageScore(totalDebt: number, turnover: number) {
  if (turnover <= 0) return 0;
  const leverageRatio = totalDebt / turnover;
  if (leverageRatio <= 0.2) return 15;
  if (leverageRatio <= 0.4) return 10;
  if (leverageRatio <= 0.75) return 4;
  return 0;
}

function gstScore(score: number) {
  if (score >= 90) return 10;
  if (score >= 70) return 6;
  if (score > 0) return 2;
  return 0;
}

function bankingHealthScore(avgBankCredits: number, avgMonthEndBalance: number) {
  if (avgBankCredits <= 0) return 0;
  const balanceRatio = avgMonthEndBalance / avgBankCredits;
  if (balanceRatio >= 0.12) return 15;
  if (balanceRatio >= 0.06) return 9;
  return 3;
}

function vintageScore(years: number) {
  if (years >= 5) return 10;
  if (years >= 3) return 7;
  if (years > 0) return 3;
  return 0;
}

function promoterScore(bureauScore: number, promoterRepaymentScore: number) {
  const combined = Math.max(bureauScore, promoterRepaymentScore);
  if (combined >= 80) return 10;
  if (combined >= 65) return 6;
  if (combined > 0) return 2;
  return 0;
}

function turnoverMultiplier(band: FinancialBand) {
  if (band === 'A') return 0.08;
  if (band === 'B') return 0.06;
  if (band === 'C') return 0.04;
  return 0.02;
}

function cashflowMultiple(band: FinancialBand) {
  if (band === 'A') return 4;
  if (band === 'B') return 3;
  if (band === 'C') return 2;
  return 1;
}

function bankingMultiplier(band: FinancialBand) {
  if (band === 'A') return 0.35;
  if (band === 'B') return 0.28;
  if (band === 'C') return 0.2;
  return 0.1;
}

export function scoreFinancialProfile(input: FinancialInputs): FinancialScoreResult {
  const annualTurnover = toAmount(input.annualTurnover);
  const ebitda = toAmount(input.ebitda ?? input.netOperatingSurplus);
  const currentRatio = Number(input.currentRatio || 0);
  const totalDebt = toAmount(input.totalDebt);
  const gstFilingScore = Number(input.gstFilingScore || 0);
  const avgMonthlyBankCredits = toAmount(input.avgMonthlyBankCredits);
  const avgMonthEndBalance = toAmount(input.avgMonthEndBalance);
  const businessVintageYears = Number(input.businessVintageYears || 0);
  const bureauScore = Number(input.bureauScore || 0);
  const promoterRepaymentScore = Number(input.promoterRepaymentScore || 0);

  const breakdown = {
    turnover: clampScore(turnoverScore(annualTurnover), 15),
    profitability: clampScore(profitabilityScore(ebitda, annualTurnover), 10),
    liquidity: clampScore(liquidityScore(currentRatio), 15),
    leverage: clampScore(leverageScore(totalDebt, annualTurnover), 15),
    gstCompliance: clampScore(gstScore(gstFilingScore), 10),
    bankingHealth: clampScore(bankingHealthScore(avgMonthlyBankCredits, avgMonthEndBalance), 15),
    vintage: clampScore(vintageScore(businessVintageYears), 10),
    promoter: clampScore(promoterScore(bureauScore, promoterRepaymentScore), 10),
  };

  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const band = financialBandForScore(score);

  const turnoverCap = annualTurnover * turnoverMultiplier(band);
  const cashflowCap = (ebitda / 12) * cashflowMultiple(band);
  const bankingCap = (avgMonthlyBankCredits / 12) * bankingMultiplier(band);
  const validCaps = [turnoverCap, cashflowCap, bankingCap].filter((value) => value > 0);
  const limit = validCaps.length ? Math.min(...validCaps) : 0;

  return {
    score,
    band,
    turnoverCap,
    cashflowCap,
    bankingCap,
    limit,
    breakdown,
  };
}

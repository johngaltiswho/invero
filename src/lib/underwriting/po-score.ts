import type { POInputs, POBand, POScoreResult } from './types';

function clampScore(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function toAmount(value?: number | null) {
  return Math.max(0, Number(value || 0));
}

function bandForPOScore(score: number): POBand {
  if (score >= 80) return 'P1';
  if (score >= 65) return 'P2';
  if (score >= 50) return 'P3';
  return 'P4';
}

function customerQualityScore(category?: POInputs['customerCategory']) {
  switch (category) {
    case 'government':
    case 'psu':
    case 'listed':
    case 'mnc':
      return 20;
    case 'corporate':
      return 14;
    case 'private':
      return 8;
    default:
      return 6;
  }
}

function documentStrengthScore(value: number) {
  if (value >= 85) return 15;
  if (value >= 65) return 8;
  if (value > 0) return 3;
  return 0;
}

function paymentTermsScore(days: number) {
  if (days <= 30) return 15;
  if (days <= 60) return 10;
  if (days > 0) return 5;
  return 0;
}

function marginScore(grossMarginPercent: number) {
  if (grossMarginPercent >= 18) return 10;
  if (grossMarginPercent >= 10) return 7;
  if (grossMarginPercent > 0) return 3;
  return 0;
}

function collectionVisibilityScore(days: number) {
  if (days <= 45) return 10;
  if (days <= 75) return 7;
  if (days > 0) return 3;
  return 0;
}

function executionStageScore(alreadyBilledAmount: number, poValue: number) {
  if (poValue <= 0) return 0;
  const billedRatio = alreadyBilledAmount / poValue;
  if (billedRatio >= 0.5) return 10;
  if (billedRatio >= 0.2) return 7;
  return 4;
}

function concentrationScore(concentrationPercent: number) {
  if (concentrationPercent <= 25) return 10;
  if (concentrationPercent <= 40) return 7;
  if (concentrationPercent > 0) return 3;
  return 0;
}

function executionRiskAdjustedScore(value: number) {
  if (value >= 80) return 10;
  if (value >= 60) return 7;
  if (value > 0) return 3;
  return 0;
}

function haircutForBand(band: POBand) {
  if (band === 'P1') return 0.15;
  if (band === 'P2') return 0.25;
  if (band === 'P3') return 0.4;
  return 1;
}

export function scorePOProfile(input: POInputs): POScoreResult {
  const poValue = toAmount(input.poValue);
  const retentionPercent = Math.max(0, Number(input.retentionPercent || 0));
  const alreadyBilledAmount = toAmount(input.alreadyBilledAmount);
  const alreadyFinancedAmount = toAmount(input.alreadyFinancedAmount);
  const paymentTermsDays = Number(input.paymentTermsDays || 0);
  const expectedCollectionDays = Number(input.expectedCollectionDays || 0);
  const grossMarginPercent = Number(input.grossMarginPercent || 0);
  const concentrationPercent = Number(input.concentrationPercent || 0);
  const docStrength = Number(input.documentStrengthScore || 0);
  const executionRisk = Number(input.executionRiskScore || 0);

  const retentionAmount = poValue * (retentionPercent / 100);
  const eligibleBase = Math.max(
    0,
    Number(input.eligiblePOBase ?? poValue - retentionAmount - alreadyBilledAmount - alreadyFinancedAmount)
  );

  const breakdown = {
    customerQuality: clampScore(customerQualityScore(input.customerCategory), 20),
    documentation: clampScore(documentStrengthScore(docStrength), 15),
    paymentTerms: clampScore(paymentTermsScore(paymentTermsDays), 15),
    margin: clampScore(marginScore(grossMarginPercent), 10),
    collectionVisibility: clampScore(collectionVisibilityScore(expectedCollectionDays), 10),
    executionStage: clampScore(executionStageScore(alreadyBilledAmount, poValue), 10),
    concentration: clampScore(concentrationScore(concentrationPercent), 10),
    executionRisk: clampScore(executionRiskAdjustedScore(executionRisk), 10),
  };

  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const band = bandForPOScore(score);
  const haircutPercent = haircutForBand(band);
  const limit = Math.max(0, eligibleBase * (1 - haircutPercent));

  return {
    score,
    band,
    eligibleBase,
    haircutPercent,
    limit,
    breakdown,
  };
}

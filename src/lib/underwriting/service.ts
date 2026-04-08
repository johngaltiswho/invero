import { supabaseAdmin } from '@/lib/supabase';
import { runSMERiskEngine, SME_RISK_ENGINE_VERSION } from './risk-engine';
import type { FinancialInputs, POInputs, UnderwritingDecision } from './types';

export async function createUnderwritingCase(params: {
  contractorId: string;
  caseType?: 'initial' | 'renewal' | 'enhancement' | 'po_review' | 'exception';
  createdBy?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await (supabaseAdmin as any)
    .from('sme_underwriting_cases')
    .insert({
      contractor_id: params.contractorId,
      case_type: params.caseType || 'initial',
      status: 'draft',
      engine_version: SME_RISK_ENGINE_VERSION,
      created_by: params.createdBy || null,
      notes: params.notes || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Failed to create underwriting case');
  return data;
}

export async function saveFinancialInputs(caseId: string, input: FinancialInputs) {
  const { data, error } = await (supabaseAdmin as any)
    .from('sme_underwriting_financial_inputs')
    .upsert({
      underwriting_case_id: caseId,
      annual_turnover: input.annualTurnover ?? null,
      ebitda: input.ebitda ?? null,
      net_operating_surplus: input.netOperatingSurplus ?? null,
      current_ratio: input.currentRatio ?? null,
      total_debt: input.totalDebt ?? null,
      gst_filing_score: input.gstFilingScore ?? null,
      avg_monthly_bank_credits: input.avgMonthlyBankCredits ?? null,
      avg_month_end_balance: input.avgMonthEndBalance ?? null,
      business_vintage_years: input.businessVintageYears ?? null,
      bureau_score: input.bureauScore ?? null,
      promoter_repayment_score: input.promoterRepaymentScore ?? null,
    }, { onConflict: 'underwriting_case_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Failed to save financial inputs');
  return data;
}

export async function addPOInput(caseId: string, input: POInputs) {
  const { data, error } = await (supabaseAdmin as any)
    .from('sme_underwriting_po_inputs')
    .insert({
      underwriting_case_id: caseId,
      project_id: input.projectId ?? null,
      po_number: input.poNumber ?? null,
      customer_name: input.customerName ?? null,
      customer_category: input.customerCategory ?? null,
      po_value: input.poValue ?? null,
      eligible_po_base: input.eligiblePOBase ?? null,
      retention_percent: input.retentionPercent ?? null,
      payment_terms_days: input.paymentTermsDays ?? null,
      already_billed_amount: input.alreadyBilledAmount ?? null,
      already_financed_amount: input.alreadyFinancedAmount ?? null,
      expected_collection_days: input.expectedCollectionDays ?? null,
      gross_margin_percent: input.grossMarginPercent ?? null,
      concentration_percent: input.concentrationPercent ?? null,
      document_strength_score: input.documentStrengthScore ?? null,
      execution_risk_score: input.executionRiskScore ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Failed to save PO inputs');
  return data;
}

export async function scoreUnderwritingCase(params: {
  caseId: string;
  financial: FinancialInputs;
  po: POInputs;
  policyCap: number;
}): Promise<UnderwritingDecision> {
  const decision = runSMERiskEngine({
    financial: params.financial,
    po: params.po,
    policyCap: params.policyCap,
  });

  const { error: scoreError } = await (supabaseAdmin as any)
    .from('sme_underwriting_scores')
    .upsert({
      underwriting_case_id: params.caseId,
      financial_score: decision.financialScore,
      financial_band: decision.financialBand,
      financial_limit: decision.financialLimit,
      po_score: decision.poScore,
      po_band: decision.poBand,
      po_limit: decision.poLimit,
      policy_cap: decision.policyCap,
      recommended_limit: decision.recommendedLimit,
      recommended_tenor_days: decision.recommendedTenorDays,
      max_drawdown_per_request: decision.maxDrawdownPerRequest,
      repayment_basis: decision.repaymentBasis,
      decision: decision.decision,
      conditions: decision.conditions,
    }, { onConflict: 'underwriting_case_id' });

  if (scoreError) throw new Error(scoreError.message || 'Failed to save underwriting score');

  const { error: caseError } = await (supabaseAdmin as any)
    .from('sme_underwriting_cases')
    .update({ status: 'scored' })
    .eq('id', params.caseId);

  if (caseError) throw new Error(caseError.message || 'Failed to update underwriting case status');

  return decision;
}

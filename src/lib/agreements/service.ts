import crypto from 'crypto';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { investorAgreementExecutedEmail, investorAgreementReadyEmail } from '@/lib/notifications/email-templates';
import { buildInvestorAgreementPayload, renderAgreementHTML } from '@/lib/agreements/renderer';
import { generateInvestorAgreementPDF } from '@/lib/agreements/pdf';
import {
  ensureLenderSleeve,
  getLenderSleeveById,
  syncLenderSleeveAgreementStatus,
  type LenderSleeve,
  type LenderSleeveModelType,
} from '@/lib/lender-sleeves';
import type {
  AgreementDeliveryLog,
  AgreementTemplatePayload,
  InvestorAgreement,
  InvestorAgreementStatus,
} from '@/lib/agreements/types';

const AGREEMENT_BUCKET = 'investor-documents';

type InvestorRow = {
  id: string;
  email: string;
  name: string;
  investor_type: string;
  phone?: string | null;
  pan_number?: string | null;
  address?: string | null;
  agreement_status?: string | null;
  activation_status?: string | null;
};

export type AdminActor = {
  id: string;
  email?: string | null;
  name?: string | null;
};

type InvestorAcceptance = {
  own_funds: boolean;
  private_investment: boolean;
  risk_disclosure: boolean;
};

type AgreementRenderContext = {
  sleeve: LenderSleeve | null;
  agreementModelType: LenderSleeveModelType;
};

class AgreementWorkflowError extends Error {}

function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function uploadAgreementPdf(params: {
  investor: InvestorRow;
  payload: AgreementTemplatePayload;
  prefix: 'agreement-draft' | 'agreement-signed' | 'agreement-executed';
  templateVersion: string;
}) {
  await ensureBucket();
  const sanitizedInvestorName = params.investor.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
  const filePath = `${params.investor.id}/${params.prefix}__${Date.now()}__${randomToken()}__${sanitizedInvestorName}.pdf`;
  const pdfBuffer = generateInvestorAgreementPDF(params.payload, { templateVersion: params.templateVersion });

  const { error: uploadError } = await (supabaseAdmin as any).storage
    .from(AGREEMENT_BUCKET)
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload agreement PDF');
  }

  return filePath;
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((bucket: { name: string }) => bucket.name === AGREEMENT_BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(AGREEMENT_BUCKET, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024,
    });
  }
}

export async function getInvestorById(investorId: string): Promise<InvestorRow | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from('investors')
    .select('id, email, name, investor_type, phone, pan_number, address, agreement_status, activation_status')
    .eq('id', investorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load investor');
  }
  return data || null;
}

async function getAgreementRenderContext(agreement: InvestorAgreement): Promise<AgreementRenderContext> {
  let sleeve = agreement.lender_sleeve_id ? await getLenderSleeveById(agreement.lender_sleeve_id) : null;
  if (!sleeve) {
    sleeve = await ensureLenderSleeve({
      investorId: agreement.investor_id,
      modelType: (agreement.agreement_model_type || 'pool_participation') as LenderSleeveModelType,
      defaultStatus: 'draft',
    });
  }

  return {
    sleeve,
    agreementModelType: sleeve.model_type,
  };
}

async function supersedePriorCurrentAgreementsForSleeve(input: {
  investorId: string;
  lenderSleeveId: string;
  exceptAgreementId: string;
  reason: string;
}) {
  const { data: priorAgreements, error: priorAgreementsError } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .select('id, lender_allocation_intent_id')
    .eq('investor_id', input.investorId)
    .eq('lender_sleeve_id', input.lenderSleeveId)
    .is('superseded_at', null)
    .neq('id', input.exceptAgreementId)
    .not('status', 'in', '("voided","expired")');

  if (priorAgreementsError) {
    throw new Error(priorAgreementsError.message || 'Failed to validate prior current agreements');
  }

  for (const priorAgreement of priorAgreements || []) {
    if (!priorAgreement.lender_allocation_intent_id) continue;

    const { data: allocationIntent, error: allocationIntentError } = await (supabaseAdmin as any)
      .from('lender_allocation_intents')
      .select('id, status')
      .eq('id', priorAgreement.lender_allocation_intent_id)
      .maybeSingle();

    if (allocationIntentError) {
      throw new Error(allocationIntentError.message || 'Failed to validate prior allocation intent');
    }

    if (allocationIntent?.status === 'funding_submitted' || allocationIntent?.status === 'completed') {
      throw new AgreementWorkflowError('Cannot replace the current agreement after funding activity has started. Use amendment or remediation workflow instead');
    }

    const { data: submissions, error: submissionsError } = await (supabaseAdmin as any)
      .from('investor_payment_submissions')
      .select('id')
      .eq('allocation_intent_id', priorAgreement.lender_allocation_intent_id)
      .in('status', ['pending', 'approved'])
      .limit(1);

    if (submissionsError) {
      throw new Error(submissionsError.message || 'Failed to validate prior payment submissions');
    }

    if ((submissions || []).length > 0) {
      throw new AgreementWorkflowError('Cannot replace the current agreement while a payment submission exists for it. Resolve the submission first');
    }
  }

  const { error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update({
      superseded_at: new Date().toISOString(),
      superseded_reason: input.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('investor_id', input.investorId)
    .eq('lender_sleeve_id', input.lenderSleeveId)
    .is('superseded_at', null)
    .neq('id', input.exceptAgreementId)
    .not('status', 'in', '("voided","expired")');

  if (error) {
    throw new Error(error.message || 'Failed to supersede prior current agreements');
  }
}

async function resolveRegenerationEconomics(existing: InvestorAgreement, renderContext: AgreementRenderContext) {
  let commitmentAmount = Number(existing.commitment_amount) || 0;
  let fixedCouponRateAnnual = renderContext.sleeve?.fixed_coupon_rate_annual ?? null;

  if (existing.lender_allocation_intent_id && renderContext.sleeve?.model_type) {
    const { data: allocationIntent, error } = await (supabaseAdmin as any)
      .from('lender_allocation_intents')
      .select('allocation_payload, status')
      .eq('id', existing.lender_allocation_intent_id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to load linked allocation intent');
    }

    const payload = Array.isArray(allocationIntent?.allocation_payload)
      ? allocationIntent.allocation_payload
      : [];

    const matchingAllocation = payload.find(
      (entry: { modelType?: string; amount?: number }) => entry.modelType === renderContext.sleeve?.model_type
    );

    if (matchingAllocation && Number(matchingAllocation.amount || 0) > 0) {
      commitmentAmount = Number(matchingAllocation.amount || 0);
    }
  }

  if (renderContext.sleeve?.model_type === 'fixed_debt' && (fixedCouponRateAnnual == null || Math.abs(fixedCouponRateAnnual - 0.12) < 0.0001)) {
    fixedCouponRateAnnual = 0.14;

    if (renderContext.sleeve?.id) {
      const { error } = await (supabaseAdmin as any)
        .from('lender_sleeves')
        .update({
          fixed_coupon_rate_annual: fixedCouponRateAnnual,
          updated_at: new Date().toISOString(),
        })
        .eq('id', renderContext.sleeve.id);

      if (error) {
        throw new Error(error.message || 'Failed to update fixed debt sleeve coupon rate');
      }
    }
  }

  return {
    commitmentAmount,
    fixedCouponRateAnnual,
  };
}

export async function listInvestorAgreements(investorId?: string, lenderSleeveId?: string): Promise<InvestorAgreement[]> {
  let query = (supabaseAdmin as any)
    .from('investor_agreements')
    .select('*')
    .order('created_at', { ascending: false });

  if (investorId) {
    query = query.eq('investor_id', investorId);
  }
  if (lenderSleeveId) {
    query = query.eq('lender_sleeve_id', lenderSleeveId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to load agreements');
  }
  return (data || []) as InvestorAgreement[];
}

export function selectCurrentInvestorAgreements<T extends { lender_sleeve_id?: string | null; agreement_model_type?: string | null; id: string; status?: string | null; superseded_at?: string | null }>(agreements: T[]) {
  const grouped = new Map<string, T[]>();

  for (const agreement of agreements || []) {
    const key = agreement.lender_sleeve_id || agreement.agreement_model_type || agreement.id;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(agreement);
  }

  return Array.from(grouped.values())
    .map((group) => {
      const current =
        group.find((agreement) => !agreement.superseded_at && !['voided', 'expired'].includes(String(agreement.status || '')));
      return current;
    })
    .filter(Boolean) as T[];
}

export async function getInvestorAgreement(agreementId: string): Promise<InvestorAgreement | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .select('*')
    .eq('id', agreementId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load agreement');
  }
  return (data || null) as InvestorAgreement | null;
}

export async function getLatestInvestorAgreementForEmail(email: string): Promise<InvestorAgreement | null> {
  const { data: investor, error: investorError } = await (supabaseAdmin as any)
    .from('investors')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('status', 'active')
    .maybeSingle();

  if (investorError) {
    throw new Error(investorError.message || 'Failed to load investor');
  }
  if (!investor?.id) return null;

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .select('*')
    .eq('investor_id', investor.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load agreement');
  }
  return (data || null) as InvestorAgreement | null;
}

export async function listAgreementDeliveryLogs(agreementId: string): Promise<AgreementDeliveryLog[]> {
  const { data, error } = await (supabaseAdmin as any)
    .from('agreement_delivery_logs')
    .select('*')
    .eq('investor_agreement_id', agreementId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to load delivery logs');
  }
  return (data || []) as AgreementDeliveryLog[];
}

export async function createInvestorAgreement(input: {
  investorId: string;
  lenderSleeveId?: string | null;
  lenderAllocationIntentId?: string | null;
  agreementModelType?: LenderSleeveModelType | null;
  commitmentAmount: number;
  agreementDate: string;
  investorPan?: string | null;
  investorAddress?: string | null;
  companySignatoryName: string;
  companySignatoryTitle: string;
  notes?: string | null;
  actor: AdminActor;
}): Promise<InvestorAgreement> {
  const investor = await getInvestorById(input.investorId);
  if (!investor) {
    throw new Error('Investor not found');
  }

  const sleeve = input.lenderSleeveId
    ? await getLenderSleeveById(input.lenderSleeveId)
    : await ensureLenderSleeve({
        investorId: input.investorId,
        modelType: input.agreementModelType || 'pool_participation',
        defaultStatus: 'draft',
      });

  if (!sleeve) {
    throw new Error('Lender sleeve not found');
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .insert({
      investor_id: input.investorId,
      lender_sleeve_id: sleeve.id,
      lender_allocation_intent_id: input.lenderAllocationIntentId || null,
      agreement_model_type: sleeve.model_type,
      commitment_amount: input.commitmentAmount,
      agreement_date: input.agreementDate,
      investor_pan: input.investorPan ?? investor.pan_number ?? null,
      investor_address: input.investorAddress ?? investor.address ?? null,
      company_signatory_name: input.companySignatoryName,
      company_signatory_title: input.companySignatoryTitle,
      notes: input.notes || null,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to create agreement');
  }

  await supersedePriorCurrentAgreementsForSleeve({
    investorId: input.investorId,
    lenderSleeveId: sleeve.id,
    exceptAgreementId: data.id,
    reason: input.lenderAllocationIntentId
      ? `Superseded by allocation intent ${input.lenderAllocationIntentId}`
      : 'Superseded by newer agreement draft',
  });

  await syncInvestorAgreementStatus(input.investorId, 'in_progress', 'agreement_pending');
  await syncLenderSleeveAgreementStatus(sleeve.id, 'in_progress');

  return data as InvestorAgreement;
}

export async function ensureDraftAgreementForSleeve(input: {
  investorId: string;
  lenderSleeveId: string;
  commitmentAmount: number;
  agreementDate?: string;
  actor: AdminActor;
}): Promise<InvestorAgreement> {
  const sleeve = await getLenderSleeveById(input.lenderSleeveId);
  if (!sleeve) {
    throw new Error('Lender sleeve not found');
  }

  const existing = await listInvestorAgreements(input.investorId, input.lenderSleeveId);
  const activeAgreement = existing.find((agreement) => agreement.status !== 'voided' && agreement.status !== 'expired');
  if (activeAgreement) {
    return activeAgreement;
  }

  return createInvestorAgreement({
    investorId: input.investorId,
    lenderSleeveId: sleeve.id,
    agreementModelType: sleeve.model_type,
    commitmentAmount: input.commitmentAmount,
    agreementDate: input.agreementDate || new Date().toISOString().slice(0, 10),
    companySignatoryName: 'Authorized Signatory',
    companySignatoryTitle: 'Director',
    actor: input.actor,
  });
}

export async function regenerateAgreementDraft(
  agreementId: string,
  actor: AdminActor,
  updates?: Partial<{
    commitment_amount: number;
    agreement_date: string;
    investor_pan: string | null;
    investor_address: string | null;
    company_signatory_name: string;
    company_signatory_title: string;
    notes: string | null;
  }>
): Promise<InvestorAgreement> {
  const existing = await getInvestorAgreement(agreementId);
  if (!existing) {
    throw new Error('Agreement not found');
  }
  if (!['draft', 'generated', 'issued'].includes(existing.status)) {
    throw new Error('Only unsigned draft, generated, or issued agreements can be regenerated');
  }

  const investor = await getInvestorById(existing.investor_id);
  if (!investor) {
    throw new Error('Investor not found');
  }
  const renderContext = await getAgreementRenderContext(existing);
  const resolvedEconomics = await resolveRegenerationEconomics(existing, renderContext);

  const commitmentAmount = Number(updates?.commitment_amount ?? resolvedEconomics.commitmentAmount) || 0;
  const agreementDate = updates?.agreement_date ?? existing.agreement_date;
  const investorPan = updates?.investor_pan ?? existing.investor_pan ?? investor.pan_number ?? null;
  const investorAddress = updates?.investor_address ?? existing.investor_address ?? investor.address ?? null;
  const companySignatoryName = updates?.company_signatory_name ?? existing.company_signatory_name ?? '';
  const companySignatoryTitle = updates?.company_signatory_title ?? existing.company_signatory_title ?? '';
  const notes = updates?.notes ?? existing.notes ?? null;

  const payload = buildInvestorAgreementPayload({
    agreementModelType: renderContext.agreementModelType,
    sleeveName: renderContext.sleeve?.name || null,
    investor,
    commitmentAmount,
    agreementDate,
    investorPan,
    investorAddress,
    companySignatoryName,
    companySignatoryTitle,
    notes,
    fixedCouponRateAnnual: resolvedEconomics.fixedCouponRateAnnual,
    payoutPriorityRank: renderContext.sleeve?.payout_priority_rank ?? null,
    almBucket: renderContext.sleeve?.alm_bucket ?? null,
    liquidityNotes: renderContext.sleeve?.liquidity_notes ?? null,
  });
  const rendered = renderAgreementHTML(payload);
  const filePath = await uploadAgreementPdf({
    investor,
    payload,
    prefix: 'agreement-draft',
    templateVersion: rendered.templateVersion,
  });

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update({
      status: 'generated',
      issued_at: existing.status === 'issued' ? null : existing.issued_at,
      commitment_amount: commitmentAmount,
      agreement_date: agreementDate,
      investor_pan: investorPan,
      investor_address: investorAddress,
      company_signatory_name: companySignatoryName,
      company_signatory_title: companySignatoryTitle,
      notes,
      template_key: rendered.templateKey,
      template_version: rendered.templateVersion,
      payload_snapshot: payload,
      rendered_html: rendered.html,
      draft_pdf_path: filePath,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to update agreement draft');
  }

  return data as InvestorAgreement;
}

export async function issueAgreement(agreementId: string, actor: AdminActor): Promise<InvestorAgreement> {
  const existing = await getInvestorAgreement(agreementId);
  if (!existing) throw new Error('Agreement not found');
  if (!['generated', 'issued'].includes(existing.status)) {
    throw new Error('Agreement must be generated before issue');
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update({
      status: 'issued',
      issued_at: existing.issued_at || new Date().toISOString(),
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Failed to issue agreement');
  if (existing.lender_sleeve_id) {
    await syncLenderSleeveAgreementStatus(existing.lender_sleeve_id, 'in_progress');
  }
  return data as InvestorAgreement;
}

export async function signInvestorAgreement(input: {
  agreementId: string;
  typedName: string;
  acceptance: InvestorAcceptance;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<InvestorAgreement> {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const typedName = input.typedName.trim();
  if (!typedName) {
    throw new Error('Typed signature name is required');
  }
  if (!input.acceptance.own_funds || !input.acceptance.private_investment || !input.acceptance.risk_disclosure) {
    throw new Error('All investor confirmations are required');
  }

  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) {
    throw new Error('Missing investor email');
  }

  const agreement = await getInvestorAgreement(input.agreementId);
  if (!agreement) {
    throw new Error('Agreement not found');
  }
  if (agreement.status !== 'issued') {
    throw new Error('Agreement is not available for signing');
  }

  const investor = await getInvestorById(agreement.investor_id);
  if (!investor) {
    throw new Error('Investor not found');
  }
  if (investor.email.toLowerCase() !== email) {
    throw new Error('Agreement does not belong to the current investor');
  }

  const signedAt = new Date().toISOString();
  const renderContext = await getAgreementRenderContext(agreement);
  const payload = buildInvestorAgreementPayload({
    agreementModelType: renderContext.agreementModelType,
    sleeveName: renderContext.sleeve?.name || null,
    investor,
    commitmentAmount: Number(agreement.commitment_amount) || 0,
    agreementDate: agreement.agreement_date,
    investorPan: agreement.investor_pan ?? investor.pan_number ?? null,
    investorAddress: agreement.investor_address ?? investor.address ?? null,
    companySignatoryName: agreement.company_signatory_name || '',
    companySignatoryTitle: agreement.company_signatory_title || '',
    notes: agreement.notes || null,
    investorSignedName: typedName,
    investorSignedAt: signedAt,
    fixedCouponRateAnnual: renderContext.sleeve?.fixed_coupon_rate_annual ?? null,
    payoutPriorityRank: renderContext.sleeve?.payout_priority_rank ?? null,
    almBucket: renderContext.sleeve?.alm_bucket ?? null,
    liquidityNotes: renderContext.sleeve?.liquidity_notes ?? null,
  });
  const rendered = renderAgreementHTML(payload);
  const signedPdfPath = await uploadAgreementPdf({
    investor,
    payload,
    prefix: 'agreement-signed',
    templateVersion: rendered.templateVersion,
  });

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update({
      status: 'investor_signed',
      signed_pdf_path: signedPdfPath,
      investor_signed_name: typedName,
      investor_signed_email: email,
      investor_signed_at: signedAt,
      investor_signed_ip: input.ipAddress || null,
      investor_signed_user_agent: input.userAgent || null,
      investor_acceptance: input.acceptance,
      signed_copy_received_at: signedAt,
      payload_snapshot: payload,
      rendered_html: rendered.html,
      updated_by: user.id,
      updated_at: signedAt,
    })
    .eq('id', input.agreementId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to sign agreement');
  }

  await syncInvestorAgreementStatus(agreement.investor_id, 'in_progress', 'agreement_pending');
  if (agreement.lender_sleeve_id) {
    await syncLenderSleeveAgreementStatus(agreement.lender_sleeve_id, 'in_progress');
  }

  return data as InvestorAgreement;
}

export async function sendAgreementEmail(
  agreementId: string,
  actor: AdminActor
): Promise<AgreementDeliveryLog> {
  const agreement = await getInvestorAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (!agreement.draft_pdf_path) throw new Error('Agreement draft PDF missing');

  const investor = await getInvestorById(agreement.investor_id);
  if (!investor) throw new Error('Investor not found');

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';
  const agreementPath = '/dashboard/investor/agreement';
  const portalUrl = `${appUrl.replace(/\/$/, '')}/sign-in?redirect_url=${encodeURIComponent(agreementPath)}`;

  const emailTemplate = investorAgreementReadyEmail({
    investorName: investor.name,
    commitmentAmount: Number(agreement.commitment_amount) || 0,
    portalUrl,
  });

  await sendEmail({
    to: investor.email,
    ...emailTemplate,
  });

  const { data, error } = await (supabaseAdmin as any)
    .from('agreement_delivery_logs')
    .insert({
      investor_agreement_id: agreementId,
      delivery_channel: 'email',
      recipient_email: investor.email,
      delivery_status: 'sent',
      subject: emailTemplate.subject,
      sent_at: new Date().toISOString(),
      metadata: {
        portal_url: portalUrl,
      },
      created_by: actor.id,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to log agreement delivery');
  }

  return data as AgreementDeliveryLog;
}

export async function uploadAgreementFile(input: {
  agreementId: string;
  file: File;
  kind: 'signed' | 'executed';
  actor: AdminActor;
}): Promise<InvestorAgreement> {
  const agreement = await getInvestorAgreement(input.agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status === 'executed') throw new Error('Executed agreements are immutable');

  const investor = await getInvestorById(agreement.investor_id);
  if (!investor) throw new Error('Investor not found');

  await ensureBucket();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
  const prefix = input.kind === 'signed' ? 'agreement-signed' : 'agreement-executed';
  const path = `${investor.id}/${prefix}__${Date.now()}__${safeName}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error: uploadError } = await (supabaseAdmin as any).storage
    .from(AGREEMENT_BUCKET)
    .upload(path, buffer, {
      contentType: input.file.type || 'application/pdf',
      upsert: false,
    });
  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload agreement file');
  }

  const updatePayload: Record<string, unknown> = {
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if (input.kind === 'signed') {
    updatePayload.status = 'signed_copy_received';
    updatePayload.signed_pdf_path = path;
    updatePayload.signed_copy_received_at = new Date().toISOString();
  } else {
    updatePayload.executed_pdf_path = path;
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update(updatePayload)
    .eq('id', input.agreementId)
    .select('*')
    .single();
  if (error) {
    throw new Error(error.message || 'Failed to update agreement');
  }
  return data as InvestorAgreement;
}

export async function markAgreementExecuted(agreementId: string, actor: AdminActor): Promise<InvestorAgreement> {
  const agreement = await getInvestorAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (!['investor_signed', 'signed_copy_received'].includes(agreement.status)) {
    throw new Error('Agreement must be investor-signed before countersigning');
  }
  if (!agreement.signed_pdf_path && !agreement.draft_pdf_path) {
    throw new Error('Investor-signed agreement file is required before countersigning');
  }

  const investor = await getInvestorById(agreement.investor_id);
  if (!investor) {
    throw new Error('Investor not found');
  }

  const executedAt = new Date().toISOString();
  const renderContext = await getAgreementRenderContext(agreement);
  const payload = buildInvestorAgreementPayload({
    agreementModelType: renderContext.agreementModelType,
    sleeveName: renderContext.sleeve?.name || null,
    investor,
    commitmentAmount: Number(agreement.commitment_amount) || 0,
    agreementDate: agreement.agreement_date,
    investorPan: agreement.investor_pan ?? investor.pan_number ?? null,
    investorAddress: agreement.investor_address ?? investor.address ?? null,
    companySignatoryName: agreement.company_signatory_name || '',
    companySignatoryTitle: agreement.company_signatory_title || '',
    notes: agreement.notes || null,
    investorSignedName: agreement.investor_signed_name || null,
    investorSignedAt: agreement.investor_signed_at || null,
    companyCountersignedAt: executedAt,
    fixedCouponRateAnnual: renderContext.sleeve?.fixed_coupon_rate_annual ?? null,
    payoutPriorityRank: renderContext.sleeve?.payout_priority_rank ?? null,
    almBucket: renderContext.sleeve?.alm_bucket ?? null,
    liquidityNotes: renderContext.sleeve?.liquidity_notes ?? null,
  });
  const rendered = renderAgreementHTML(payload);
  const executedPdfPath = await uploadAgreementPdf({
    investor,
    payload,
    prefix: 'agreement-executed',
    templateVersion: rendered.templateVersion,
  });

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update({
      status: 'executed',
      executed_pdf_path: executedPdfPath,
      executed_at: executedAt,
      payload_snapshot: payload,
      rendered_html: rendered.html,
      template_key: rendered.templateKey,
      template_version: rendered.templateVersion,
      updated_by: actor.id,
      updated_at: executedAt,
    })
    .eq('id', agreementId)
    .select('*')
    .single();
  if (error) {
    throw new Error(error.message || 'Failed to mark agreement executed');
  }

  await syncInvestorAgreementStatus(agreement.investor_id, 'completed', 'active', executedAt);
  if (agreement.lender_sleeve_id) {
    await syncLenderSleeveAgreementStatus(agreement.lender_sleeve_id, 'completed', executedAt);
  }
  if (investor?.email) {
    try {
      await sendEmail({
        to: investor.email,
        ...investorAgreementExecutedEmail({
          investorName: investor.name,
          commitmentAmount: Number(agreement.commitment_amount) || 0,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send executed agreement email:', emailError);
    }
  }
  return data as InvestorAgreement;
}

export async function regenerateExecutedInvestorAgreement(
  agreementId: string,
  actor: AdminActor
): Promise<InvestorAgreement> {
  const agreement = await getInvestorAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status !== 'executed') throw new Error('Only executed agreements can be regenerated');
  if (!agreement.investor_signed_at) throw new Error('Investor signature timestamp is required to regenerate the executed copy');

  const investor = await getInvestorById(agreement.investor_id);
  if (!investor) {
    throw new Error('Investor not found');
  }

  const renderContext = await getAgreementRenderContext(agreement);
  const resolvedEconomics = await resolveRegenerationEconomics(agreement, renderContext);
  const companyCountersignedAt = agreement.executed_at || agreement.updated_at || new Date().toISOString();
  const payload = buildInvestorAgreementPayload({
    agreementModelType: renderContext.agreementModelType,
    sleeveName: renderContext.sleeve?.name || null,
    investor,
    commitmentAmount: resolvedEconomics.commitmentAmount,
    agreementDate: agreement.agreement_date,
    investorPan: agreement.investor_pan ?? investor.pan_number ?? null,
    investorAddress: agreement.investor_address ?? investor.address ?? null,
    companySignatoryName: agreement.company_signatory_name || '',
    companySignatoryTitle: agreement.company_signatory_title || '',
    notes: agreement.notes || null,
    investorSignedName: agreement.investor_signed_name || null,
    investorSignedAt: agreement.investor_signed_at || null,
    companyCountersignedAt,
    fixedCouponRateAnnual: resolvedEconomics.fixedCouponRateAnnual,
    payoutPriorityRank: renderContext.sleeve?.payout_priority_rank ?? null,
    almBucket: renderContext.sleeve?.alm_bucket ?? null,
    liquidityNotes: renderContext.sleeve?.liquidity_notes ?? null,
  });
  const rendered = renderAgreementHTML(payload);
  const executedPdfPath = await uploadAgreementPdf({
    investor,
    payload,
    prefix: 'agreement-executed',
    templateVersion: rendered.templateVersion,
  });

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update({
      executed_pdf_path: executedPdfPath,
      commitment_amount: resolvedEconomics.commitmentAmount,
      payload_snapshot: payload,
      rendered_html: rendered.html,
      template_key: rendered.templateKey,
      template_version: rendered.templateVersion,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select('*')
    .single();
  if (error) {
    throw new Error(error.message || 'Failed to regenerate executed agreement');
  }

  return data as InvestorAgreement;
}

export async function bulkRegenerateExecutedInvestorAgreements(
  actor: AdminActor,
  filters?: {
    investorId?: string;
    agreementModelType?: LenderSleeveModelType;
  }
): Promise<{
  total: number;
  regenerated: number;
  failed: Array<{ agreementId: string; error: string }>;
}> {
  let query = (supabaseAdmin as any)
    .from('investor_agreements')
    .select('*')
    .eq('status', 'executed')
    .order('created_at', { ascending: false });

  if (filters?.investorId) {
    query = query.eq('investor_id', filters.investorId);
  }
  if (filters?.agreementModelType) {
    query = query.eq('agreement_model_type', filters.agreementModelType);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to load executed investor agreements');
  }

  const agreements = (data || []) as InvestorAgreement[];
  const failed: Array<{ agreementId: string; error: string }> = [];
  let regenerated = 0;

  for (const agreement of agreements) {
    try {
      await regenerateExecutedInvestorAgreement(agreement.id, actor);
      regenerated += 1;
    } catch (regenerationError) {
      failed.push({
        agreementId: agreement.id,
        error: regenerationError instanceof Error ? regenerationError.message : 'Failed to regenerate executed copy',
      });
    }
  }

  return {
    total: agreements.length,
    regenerated,
    failed,
  };
}

export async function voidAgreement(agreementId: string, actor: AdminActor, reason?: string): Promise<InvestorAgreement> {
  const agreement = await getInvestorAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (!['draft', 'generated', 'issued'].includes(agreement.status)) {
    throw new AgreementWorkflowError('Only draft, generated, or issued agreements can be voided');
  }

  if (agreement.lender_allocation_intent_id) {
    const { data: allocationIntent, error: intentError } = await (supabaseAdmin as any)
      .from('lender_allocation_intents')
      .select('id, status, funding_submitted_at, completed_at')
      .eq('id', agreement.lender_allocation_intent_id)
      .maybeSingle();

    if (intentError) {
      throw new Error(intentError.message || 'Failed to validate linked allocation intent');
    }

    if (allocationIntent?.status === 'funding_submitted') {
      throw new AgreementWorkflowError('Funding has already been submitted for this allocation. Reject the payment submission instead of voiding the agreement');
    }

    if (allocationIntent?.status === 'completed') {
      throw new AgreementWorkflowError('Capital has already been approved for this allocation. Do not void the agreement after transfer; use a reversal or remediation workflow');
    }

    const { data: submissions, error: submissionsError } = await (supabaseAdmin as any)
      .from('investor_payment_submissions')
      .select('id, status')
      .eq('allocation_intent_id', agreement.lender_allocation_intent_id)
      .in('status', ['pending', 'approved'])
      .limit(1);

    if (submissionsError) {
      throw new Error(submissionsError.message || 'Failed to validate linked payment submissions');
    }

    if ((submissions || []).length > 0) {
      throw new AgreementWorkflowError('A payment submission already exists for this allocation. Review that submission instead of voiding the agreement');
    }
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update({
      status: 'voided',
      notes: [agreement.notes, reason].filter(Boolean).join('\n').trim() || null,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Failed to void agreement');
  await syncInvestorAgreementStatus(agreement.investor_id, 'voided', 'agreement_pending');
  if (agreement.lender_sleeve_id) {
    await syncLenderSleeveAgreementStatus(agreement.lender_sleeve_id, 'voided');
  }
  return data as InvestorAgreement;
}

export async function syncInvestorAgreementStatus(
  investorId: string,
  agreementStatus: 'in_progress' | 'completed' | 'voided' | 'expired',
  activationStatus: 'agreement_pending' | 'active' | 'inactive' | 'suspended',
  completedAt?: string | null
) {
  await (supabaseAdmin as any)
    .from('investors')
    .update({
      agreement_status: agreementStatus,
      activation_status: activationStatus,
      agreement_completed_at: agreementStatus === 'completed' ? completedAt || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', investorId);
}

export async function createAgreementSignedUrl(path: string | null, expiresInSeconds = 60 * 60): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await (supabaseAdmin as any).storage
    .from(AGREEMENT_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    throw new Error(error.message || 'Failed to create signed URL');
  }
  return data?.signedUrl || null;
}

export async function getInvestorAgreementsForCurrentUser(): Promise<{
  investor: InvestorRow | null;
  agreements: InvestorAgreement[];
}> {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) throw new Error('Missing email');

  const agreement = await getLatestInvestorAgreementForEmail(email);
  if (!agreement) {
    const { data, error } = await (supabaseAdmin as any)
      .from('investors')
      .select('id, email, name, investor_type, phone, pan_number, address, agreement_status, activation_status')
      .eq('email', email)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Failed to load investor');
    return { investor: (data || null) as InvestorRow | null, agreements: [] };
  }

  const investor = await getInvestorById(agreement.investor_id);
  const agreements = await listInvestorAgreements(agreement.investor_id);
  return { investor, agreements };
}

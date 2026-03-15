import crypto from 'crypto';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { investorAgreementExecutedEmail, investorAgreementReadyEmail } from '@/lib/notifications/email-templates';
import { buildInvestorAgreementPayload, renderAgreementHTML } from '@/lib/agreements/renderer';
import { generateInvestorAgreementPDF } from '@/lib/agreements/pdf';
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

type AdminActor = {
  id: string;
  email?: string | null;
  name?: string | null;
};

type InvestorAcceptance = {
  own_funds: boolean;
  private_investment: boolean;
  risk_disclosure: boolean;
};

function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function uploadAgreementPdf(params: {
  investor: InvestorRow;
  payload: AgreementTemplatePayload;
  prefix: 'agreement-draft' | 'agreement-signed';
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

export async function listInvestorAgreements(investorId?: string): Promise<InvestorAgreement[]> {
  let query = (supabaseAdmin as any)
    .from('investor_agreements')
    .select('*')
    .order('created_at', { ascending: false });

  if (investorId) {
    query = query.eq('investor_id', investorId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to load agreements');
  }
  return (data || []) as InvestorAgreement[];
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

  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .insert({
      investor_id: input.investorId,
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

  await syncInvestorAgreementStatus(input.investorId, 'in_progress', 'agreement_pending');

  return data as InvestorAgreement;
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
  if (!['draft', 'generated'].includes(existing.status)) {
    throw new Error('Only draft or generated agreements can be regenerated');
  }

  const investor = await getInvestorById(existing.investor_id);
  if (!investor) {
    throw new Error('Investor not found');
  }

  const commitmentAmount = Number(updates?.commitment_amount ?? existing.commitment_amount) || 0;
  const agreementDate = updates?.agreement_date ?? existing.agreement_date;
  const investorPan = updates?.investor_pan ?? existing.investor_pan ?? investor.pan_number ?? null;
  const investorAddress = updates?.investor_address ?? existing.investor_address ?? investor.address ?? null;
  const companySignatoryName = updates?.company_signatory_name ?? existing.company_signatory_name ?? '';
  const companySignatoryTitle = updates?.company_signatory_title ?? existing.company_signatory_title ?? '';
  const notes = updates?.notes ?? existing.notes ?? null;

  const payload = buildInvestorAgreementPayload({
    investor,
    commitmentAmount,
    agreementDate,
    investorPan,
    investorAddress,
    companySignatoryName,
    companySignatoryTitle,
    notes,
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
  const payload = buildInvestorAgreementPayload({
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
      status: 'executed',
      signed_pdf_path: signedPdfPath,
      executed_pdf_path: signedPdfPath,
      investor_signed_name: typedName,
      investor_signed_email: email,
      investor_signed_at: signedAt,
      investor_signed_ip: input.ipAddress || null,
      investor_signed_user_agent: input.userAgent || null,
      investor_acceptance: input.acceptance,
      signed_copy_received_at: signedAt,
      executed_at: signedAt,
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

  await syncInvestorAgreementStatus(agreement.investor_id, 'completed', 'active', signedAt);

  try {
    await sendEmail({
      to: investor.email,
      ...investorAgreementExecutedEmail({
        investorName: investor.name,
        commitmentAmount: Number(agreement.commitment_amount) || 0,
      }),
    });
  } catch (emailError) {
    console.error('Failed to send executed agreement email after portal signing:', emailError);
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
  const portalUrl = `${appUrl.replace(/\/$/, '')}/dashboard/investor/agreement`;

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
  if (!agreement.executed_pdf_path) {
    throw new Error('Executed agreement file is required');
  }

  const executedAt = new Date().toISOString();
  const { data, error } = await (supabaseAdmin as any)
    .from('investor_agreements')
    .update({
      status: 'executed',
      executed_at: executedAt,
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
  const investor = await getInvestorById(agreement.investor_id);
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

export async function voidAgreement(agreementId: string, actor: AdminActor, reason?: string): Promise<InvestorAgreement> {
  const agreement = await getInvestorAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status === 'executed') {
    throw new Error('Executed agreements cannot be voided');
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

export async function getInvestorAgreementForCurrentUser(): Promise<{
  investor: InvestorRow | null;
  agreement: InvestorAgreement | null;
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
    return { investor: (data || null) as InvestorRow | null, agreement: null };
  }

  const investor = await getInvestorById(agreement.investor_id);
  return { investor, agreement };
}

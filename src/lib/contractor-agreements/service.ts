import { sendEmail } from '@/lib/email';
import { contractorAgreementExecutedEmail, contractorAgreementReadyEmail } from '@/lib/notifications/email-templates';
import { buildContractorAgreementPayload, renderContractorAgreementHTML } from '@/lib/contractor-agreements/renderer';
import { generateContractorAgreementPDF } from '@/lib/contractor-agreements/pdf';
import type {
  ContractorAgreement,
  ContractorAgreementDeliveryLog,
  ContractorAgreementType,
} from '@/lib/contractor-agreements/types';
import { supabaseAdmin } from '@/lib/supabase';
import { ContractorService } from '@/lib/contractor-service';
import { getContractorUnderwritingSummary, syncContractorOnboarding } from '@/lib/contractor-onboarding';

const AGREEMENT_BUCKET = 'contractor-documents';

export type AdminActor = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function randomToken(length = 6) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function sanitizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'contractor';
}

async function uploadAgreementPdf(params: {
  contractor: Awaited<ReturnType<typeof ContractorService.getContractorById>>;
  payload: ReturnType<typeof buildContractorAgreementPayload>;
  prefix: string;
  templateVersion: string;
}) {
  if (!params.contractor) {
    throw new Error('Contractor not found');
  }

  await ensureBucket();

  const filePath = `${params.contractor.id}/agreements/${params.prefix}__${Date.now()}__${randomToken()}__${sanitizeName(params.contractor.company_name)}.pdf`;
  const pdfBuffer = generateContractorAgreementPDF(params.payload, { templateVersion: params.templateVersion });
  const { error: uploadError } = await supabaseAdmin.storage.from(AGREEMENT_BUCKET).upload(filePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload contractor agreement PDF');
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

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
}

export async function listContractorAgreements(contractorId?: string, agreementType?: ContractorAgreementType): Promise<ContractorAgreement[]> {
  let query = (supabaseAdmin as any)
    .from('contractor_agreements')
    .select('*')
    .order('created_at', { ascending: false });

  if (contractorId) query = query.eq('contractor_id', contractorId);
  if (agreementType) query = query.eq('agreement_type', agreementType);

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Failed to load contractor agreements');
  return (data || []) as ContractorAgreement[];
}

export async function getContractorAgreement(agreementId: string): Promise<ContractorAgreement | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreements')
    .select('*')
    .eq('id', agreementId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load contractor agreement');
  return (data || null) as ContractorAgreement | null;
}

export async function listContractorAgreementDeliveryLogs(agreementId: string): Promise<ContractorAgreementDeliveryLog[]> {
  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreement_delivery_logs')
    .select('*')
    .eq('contractor_agreement_id', agreementId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Failed to load contractor agreement delivery logs');
  return (data || []) as ContractorAgreementDeliveryLog[];
}

export async function createContractorAgreement(input: {
  contractorId: string;
  agreementType: ContractorAgreementType;
  agreementDate: string;
  companySignatoryName: string;
  companySignatoryTitle: string;
  notes?: string | null;
  actor: AdminActor;
}): Promise<ContractorAgreement> {
  const contractor = await ContractorService.getContractorById(input.contractorId);
  if (!contractor) throw new Error('Contractor not found');

  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreements')
    .insert({
      contractor_id: input.contractorId,
      agreement_type: input.agreementType,
      agreement_date: input.agreementDate,
      template_key: 'pending',
      template_version: 'pending',
      company_signatory_name: input.companySignatoryName,
      company_signatory_title: input.companySignatoryTitle,
      notes: input.notes || null,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Failed to create contractor agreement');
  await syncContractorOnboarding(input.contractorId);
  return data as ContractorAgreement;
}

async function buildAgreementArtifacts(existing: ContractorAgreement, updates: {
  agreement_date?: string;
  company_signatory_name?: string;
  company_signatory_title?: string;
  notes?: string | null;
}) {
  const contractor = await ContractorService.getContractorById(existing.contractor_id);
  if (!contractor) throw new Error('Contractor not found');
  const underwriting = await getContractorUnderwritingSummary(existing.contractor_id);
  const agreementDate = updates.agreement_date ?? existing.agreement_date;
  const companySignatoryName = updates.company_signatory_name ?? existing.company_signatory_name ?? '';
  const companySignatoryTitle = updates.company_signatory_title ?? existing.company_signatory_title ?? '';
  const notes = updates.notes ?? existing.notes ?? null;

  const payload = buildContractorAgreementPayload({
    agreementType: existing.agreement_type,
    contractor,
    agreementDate,
    companySignatoryName,
    companySignatoryTitle,
    financingLimit: underwriting.financing_limit,
    repaymentBasis: underwriting.repayment_basis,
    paymentWindowDays: underwriting.payment_window_days,
    lateDefaultTerms: underwriting.late_default_terms,
    notes,
  });
  const rendered = renderContractorAgreementHTML(payload);
  const filePath = await uploadAgreementPdf({
    contractor,
    payload,
    prefix: `${existing.agreement_type}-draft`,
    templateVersion: rendered.templateVersion,
  });

  return { contractor, payload, rendered, filePath, agreementDate, companySignatoryName, companySignatoryTitle, notes };
}

export async function regenerateContractorAgreementDraft(
  agreementId: string,
  actor: AdminActor,
  updates?: Partial<{ agreement_date: string; company_signatory_name: string; company_signatory_title: string; notes: string | null }>
): Promise<ContractorAgreement> {
  const existing = await getContractorAgreement(agreementId);
  if (!existing) throw new Error('Agreement not found');
  if (!['draft', 'generated', 'issued'].includes(existing.status)) {
    throw new Error('Only unsigned draft, generated, or issued agreements can be regenerated');
  }

  const { rendered, payload, filePath, agreementDate, companySignatoryName, companySignatoryTitle, notes } =
    await buildAgreementArtifacts(existing, updates || {});

  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreements')
    .update({
      status: 'generated',
      issued_at: existing.status === 'issued' ? null : existing.issued_at,
      agreement_date: agreementDate,
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

  if (error) throw new Error(error.message || 'Failed to update contractor agreement draft');
  await syncContractorOnboarding(existing.contractor_id);
  return data as ContractorAgreement;
}

export async function issueContractorAgreement(agreementId: string, actor: AdminActor): Promise<ContractorAgreement> {
  const existing = await getContractorAgreement(agreementId);
  if (!existing) throw new Error('Agreement not found');
  if (!['generated', 'issued'].includes(existing.status)) throw new Error('Agreement must be generated before issue');

  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreements')
    .update({
      status: 'issued',
      issued_at: existing.issued_at || new Date().toISOString(),
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Failed to issue contractor agreement');
  await syncContractorOnboarding(existing.contractor_id);
  return data as ContractorAgreement;
}

export async function createContractorAgreementSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  await ensureBucket();
  const { data, error } = await supabaseAdmin.storage.from(AGREEMENT_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message || 'Failed to create agreement URL');
  return data?.signedUrl || null;
}

export async function sendContractorAgreementEmail(agreementId: string, actor: AdminActor): Promise<ContractorAgreementDeliveryLog> {
  const agreement = await getContractorAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (!agreement.draft_pdf_path) throw new Error('Agreement draft PDF missing');
  const contractor = await ContractorService.getContractorById(agreement.contractor_id);
  if (!contractor) throw new Error('Contractor not found');

  const draftUrl = await createContractorAgreementSignedUrl(agreement.draft_pdf_path);
  const appUrl = getAppUrl();
  const emailPayload = contractorAgreementReadyEmail({
    contractorName: contractor.company_name,
    agreementType: agreement.agreement_type,
    draftUrl: draftUrl || `${appUrl.replace(/\/$/, '')}/admin/verification`,
  });

  await sendEmail({
    to: contractor.email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
  });

  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreement_delivery_logs')
    .insert({
      contractor_agreement_id: agreementId,
      delivery_channel: 'email',
      recipient_email: contractor.email,
      delivery_status: 'sent',
      subject: emailPayload.subject,
      sent_at: new Date().toISOString(),
      metadata: { agreement_type: agreement.agreement_type, draft_url: draftUrl },
      created_by: actor.id,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Failed to log agreement delivery');
  return data as ContractorAgreementDeliveryLog;
}

export async function uploadContractorAgreementFile(input: {
  agreementId: string;
  actor: AdminActor;
  kind: 'signed' | 'executed';
  file: File;
  signerName?: string | null;
  signerEmail?: string | null;
}): Promise<ContractorAgreement> {
  const agreement = await getContractorAgreement(input.agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status === 'executed') throw new Error('Executed agreements are immutable');
  const contractor = await ContractorService.getContractorById(agreement.contractor_id);
  if (!contractor) throw new Error('Contractor not found');

  const prefix = input.kind === 'signed' ? `${agreement.agreement_type}-signed` : `${agreement.agreement_type}-executed`;
  const path = `${contractor.id}/agreements/${prefix}__${Date.now()}__${randomToken()}__${sanitizeName(contractor.company_name)}.pdf`;

  await ensureBucket();
  const { error: uploadError } = await supabaseAdmin.storage.from(AGREEMENT_BUCKET).upload(path, input.file, {
    contentType: input.file.type || 'application/pdf',
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message || 'Failed to upload agreement file');

  const updatePayload: Record<string, unknown> = {
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if (input.kind === 'signed') {
    updatePayload.status = 'contractor_signed';
    updatePayload.signed_pdf_path = path;
    updatePayload.contractor_signed_name = input.signerName || agreement.contractor_signed_name || contractor.contact_person;
    updatePayload.contractor_signed_email = input.signerEmail || agreement.contractor_signed_email || contractor.email;
    updatePayload.contractor_signed_at = new Date().toISOString();
  } else {
    updatePayload.executed_pdf_path = path;
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreements')
    .update(updatePayload)
    .eq('id', input.agreementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Failed to update agreement');
  await syncContractorOnboarding(agreement.contractor_id);
  return data as ContractorAgreement;
}

export async function markContractorAgreementExecuted(agreementId: string, actor: AdminActor): Promise<ContractorAgreement> {
  const agreement = await getContractorAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status !== 'contractor_signed') throw new Error('Contractor-signed agreement is required before execution');
  const executedPdfPath = agreement.executed_pdf_path || agreement.signed_pdf_path;
  if (!executedPdfPath) throw new Error('Signed agreement file is required before countersigning');

  const executedAt = new Date().toISOString();
  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreements')
    .update({
      status: 'executed',
      executed_pdf_path: executedPdfPath,
      executed_at: executedAt,
      updated_by: actor.id,
      updated_at: executedAt,
    })
    .eq('id', agreementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Failed to mark agreement executed');

  await syncContractorOnboarding(agreement.contractor_id);

  const contractor = await ContractorService.getContractorById(agreement.contractor_id);
  if (contractor) {
    try {
      const emailPayload = contractorAgreementExecutedEmail({
        contractorName: contractor.company_name,
        agreementType: agreement.agreement_type,
      });
      await sendEmail({
        to: contractor.email,
        subject: emailPayload.subject,
        text: emailPayload.text,
        html: emailPayload.html,
      });
    } catch (emailError) {
      console.error('Failed to send contractor executed agreement email:', emailError);
    }
  }

  return data as ContractorAgreement;
}

export async function voidContractorAgreement(agreementId: string, actor: AdminActor, reason?: string): Promise<ContractorAgreement> {
  const agreement = await getContractorAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status === 'executed') throw new Error('Executed agreements cannot be voided');

  const { data, error } = await (supabaseAdmin as any)
    .from('contractor_agreements')
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
  await syncContractorOnboarding(agreement.contractor_id);
  return data as ContractorAgreement;
}

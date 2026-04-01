import { sendEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';
import {
  buildFuelProviderAgreementPayload,
  renderFuelProviderAgreementHTML,
} from '@/lib/fuel-provider-agreements/renderer';
import { generateFuelProviderAgreementPDF } from '@/lib/fuel-provider-agreements/pdf';
import type {
  FuelProviderAgreement,
  FuelProviderAgreementDeliveryLog,
} from '@/lib/fuel-provider-agreements/types';

const AGREEMENT_BUCKET = 'fuel-provider-documents';

export type AdminActor = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function randomToken(length = 6) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function sanitizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'fuel-provider';
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

async function getPumpById(pumpId: string) {
  const { data, error } = await supabaseAdmin
    .from('fuel_pumps')
    .select('*')
    .eq('id', pumpId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load fuel pump');
  return data;
}

async function uploadAgreementPdf(params: {
  pump: Awaited<ReturnType<typeof getPumpById>>;
  payload: ReturnType<typeof buildFuelProviderAgreementPayload>;
  prefix: string;
  templateVersion: string;
}) {
  if (!params.pump) throw new Error('Fuel pump not found');

  await ensureBucket();
  const filePath = `${params.pump.id}/agreements/${params.prefix}__${Date.now()}__${randomToken()}__${sanitizeName(params.pump.pump_name)}.pdf`;
  const pdfBuffer = generateFuelProviderAgreementPDF(params.payload, { templateVersion: params.templateVersion });
  const { error: uploadError } = await supabaseAdmin.storage.from(AGREEMENT_BUCKET).upload(filePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message || 'Failed to upload fuel provider agreement PDF');
  return filePath;
}

export async function listFuelProviderAgreements(pumpId?: string): Promise<FuelProviderAgreement[]> {
  let query = supabaseAdmin
    .from('fuel_provider_agreements')
    .select('*')
    .order('created_at', { ascending: false });
  if (pumpId) query = query.eq('pump_id', pumpId);
  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Failed to load fuel provider agreements');
  return (data || []) as FuelProviderAgreement[];
}

export async function getFuelProviderAgreement(agreementId: string): Promise<FuelProviderAgreement | null> {
  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreements')
    .select('*')
    .eq('id', agreementId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load fuel provider agreement');
  return (data || null) as FuelProviderAgreement | null;
}

export async function listFuelProviderAgreementDeliveryLogs(agreementId: string): Promise<FuelProviderAgreementDeliveryLog[]> {
  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreement_delivery_logs')
    .select('*')
    .eq('fuel_provider_agreement_id', agreementId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Failed to load fuel provider agreement delivery logs');
  return (data || []) as FuelProviderAgreementDeliveryLog[];
}

export async function createFuelProviderAgreement(input: {
  pumpId: string;
  agreementDate: string;
  companySignatoryName: string;
  companySignatoryTitle: string;
  notes?: string | null;
  actor: AdminActor;
}): Promise<FuelProviderAgreement> {
  const pump = await getPumpById(input.pumpId);
  if (!pump) throw new Error('Fuel pump not found');

  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreements')
    .insert({
      pump_id: input.pumpId,
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
  if (error) throw new Error(error.message || 'Failed to create fuel provider agreement');
  return data as FuelProviderAgreement;
}

async function buildAgreementArtifacts(existing: FuelProviderAgreement, updates: {
  agreement_date?: string;
  company_signatory_name?: string;
  company_signatory_title?: string;
  notes?: string | null;
  provider_signed_name?: string | null;
  provider_signed_at?: string | null;
}) {
  const pump = await getPumpById(existing.pump_id);
  if (!pump) throw new Error('Fuel pump not found');

  const agreementDate = updates.agreement_date ?? existing.agreement_date;
  const companySignatoryName = updates.company_signatory_name ?? existing.company_signatory_name ?? '';
  const companySignatoryTitle = updates.company_signatory_title ?? existing.company_signatory_title ?? '';
  const notes = updates.notes ?? existing.notes ?? null;

  const payload = buildFuelProviderAgreementPayload({
    pump,
    agreementDate,
    companySignatoryName,
    companySignatoryTitle,
    notes,
    providerSignedName: updates.provider_signed_name ?? existing.provider_signed_name ?? null,
    providerSignedAt: updates.provider_signed_at ?? existing.provider_signed_at ?? null,
  });
  const rendered = renderFuelProviderAgreementHTML(payload);
  const filePath = await uploadAgreementPdf({
    pump,
    payload,
    prefix: 'fuel-provider-draft',
    templateVersion: rendered.templateVersion,
  });

  return { pump, payload, rendered, filePath, agreementDate, companySignatoryName, companySignatoryTitle, notes };
}

async function buildExecutedAgreementArtifacts(agreement: FuelProviderAgreement, companyCountersignedAt: string) {
  const pump = await getPumpById(agreement.pump_id);
  if (!pump) throw new Error('Fuel pump not found');
  const payload = buildFuelProviderAgreementPayload({
    pump,
    agreementDate: agreement.agreement_date,
    companySignatoryName: agreement.company_signatory_name || '',
    companySignatoryTitle: agreement.company_signatory_title || '',
    notes: agreement.notes || null,
    providerSignedName: agreement.provider_signed_name || pump.contact_person || pump.pump_name,
    providerSignedAt: agreement.provider_signed_at,
    companyCountersignedAt,
  });
  const rendered = renderFuelProviderAgreementHTML(payload);
  const executedPdfPath = await uploadAgreementPdf({
    pump,
    payload,
    prefix: 'fuel-provider-executed',
    templateVersion: rendered.templateVersion,
  });
  return { pump, payload, rendered, executedPdfPath };
}

export async function regenerateFuelProviderAgreementDraft(
  agreementId: string,
  actor: AdminActor,
  updates?: Partial<{ agreement_date: string; company_signatory_name: string; company_signatory_title: string; notes: string | null }>
): Promise<FuelProviderAgreement> {
  const existing = await getFuelProviderAgreement(agreementId);
  if (!existing) throw new Error('Agreement not found');
  if (!['draft', 'generated', 'issued'].includes(existing.status)) {
    throw new Error('Only unsigned draft, generated, or issued agreements can be regenerated');
  }

  const { rendered, payload, filePath, agreementDate, companySignatoryName, companySignatoryTitle, notes } =
    await buildAgreementArtifacts(existing, updates || {});

  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreements')
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
  if (error) throw new Error(error.message || 'Failed to update fuel provider agreement draft');
  return data as FuelProviderAgreement;
}

export async function issueFuelProviderAgreement(agreementId: string, actor: AdminActor): Promise<FuelProviderAgreement> {
  const existing = await getFuelProviderAgreement(agreementId);
  if (!existing) throw new Error('Agreement not found');
  if (!['generated', 'issued'].includes(existing.status)) throw new Error('Agreement must be generated before issue');

  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreements')
    .update({
      status: 'issued',
      issued_at: existing.issued_at || new Date().toISOString(),
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Failed to issue fuel provider agreement');
  return data as FuelProviderAgreement;
}

export async function createFuelProviderAgreementSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  await ensureBucket();
  const { data, error } = await supabaseAdmin.storage.from(AGREEMENT_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message || 'Failed to create agreement URL');
  return data?.signedUrl || null;
}

export async function sendFuelProviderAgreementEmail(agreementId: string, actor: AdminActor): Promise<FuelProviderAgreementDeliveryLog> {
  const agreement = await getFuelProviderAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (!agreement.draft_pdf_path) throw new Error('Agreement draft PDF missing');
  const pump = await getPumpById(agreement.pump_id);
  if (!pump) throw new Error('Fuel pump not found');
  if (!pump.contact_email) throw new Error('Fuel provider email is missing on this pump');

  const draftUrl = await createFuelProviderAgreementSignedUrl(agreement.draft_pdf_path);
  const subject = `Fuel provider agreement ready · ${pump.pump_name}`;
  const html = `
    <p>Dear ${pump.contact_person || pump.pump_name},</p>
    <p>Your fuel provider agreement with Finverno is ready for review.</p>
    <p><a href="${draftUrl}">Open the draft PDF</a> and return the signed copy to Finverno for countersign and activation.</p>
    <p>Regards,<br/>Finverno Private Limited</p>
  `.trim();

  await sendEmail({
    to: pump.contact_email,
    subject,
    text: `Dear ${pump.contact_person || pump.pump_name},\n\nYour fuel provider agreement with Finverno is ready for review.\nDraft copy: ${draftUrl}\n\nPlease return the signed PDF to Finverno for countersign and activation.\n\nRegards,\nFinverno Private Limited`,
    html,
  });

  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreement_delivery_logs')
    .insert({
      fuel_provider_agreement_id: agreementId,
      delivery_channel: 'email',
      recipient_email: pump.contact_email,
      delivery_status: 'sent',
      subject,
      sent_at: new Date().toISOString(),
      metadata: { draft_url: draftUrl, pump_id: pump.id },
      created_by: actor.id,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Failed to log fuel provider agreement delivery');
  return data as FuelProviderAgreementDeliveryLog;
}

export async function uploadFuelProviderAgreementFile(input: {
  agreementId: string;
  actor: AdminActor;
  kind: 'signed' | 'executed';
  file: File;
  signerName?: string | null;
  signerEmail?: string | null;
}): Promise<FuelProviderAgreement> {
  const agreement = await getFuelProviderAgreement(input.agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status === 'executed') throw new Error('Executed agreements are immutable');
  const pump = await getPumpById(agreement.pump_id);
  if (!pump) throw new Error('Fuel pump not found');

  await ensureBucket();
  const prefix = input.kind === 'signed' ? 'fuel-provider-signed' : 'fuel-provider-executed';
  const path = `${pump.id}/agreements/${prefix}__${Date.now()}__${randomToken()}__${sanitizeName(pump.pump_name)}.pdf`;
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
    updatePayload.status = 'provider_signed';
    updatePayload.signed_pdf_path = path;
    updatePayload.provider_signed_name = input.signerName || agreement.provider_signed_name || pump.contact_person || pump.pump_name;
    updatePayload.provider_signed_email = input.signerEmail || agreement.provider_signed_email || pump.contact_email || null;
    updatePayload.provider_signed_at = new Date().toISOString();
  } else {
    updatePayload.executed_pdf_path = path;
  }

  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreements')
    .update(updatePayload)
    .eq('id', input.agreementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Failed to update agreement');
  return data as FuelProviderAgreement;
}

export async function markFuelProviderAgreementExecuted(agreementId: string, actor: AdminActor): Promise<FuelProviderAgreement> {
  const agreement = await getFuelProviderAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (!['provider_signed', 'executed'].includes(agreement.status)) {
    throw new Error('Agreement must be provider-signed before execution');
  }

  const executedAt = agreement.executed_at || new Date().toISOString();
  const { payload, rendered, executedPdfPath } = await buildExecutedAgreementArtifacts(agreement, executedAt);
  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreements')
    .update({
      status: 'executed',
      executed_at: executedAt,
      executed_pdf_path: executedPdfPath,
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
  if (error) throw new Error(error.message || 'Failed to execute fuel provider agreement');
  return data as FuelProviderAgreement;
}

export async function voidFuelProviderAgreement(agreementId: string, actor: AdminActor, reason?: string | null): Promise<FuelProviderAgreement> {
  const agreement = await getFuelProviderAgreement(agreementId);
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status === 'executed') throw new Error('Executed agreement cannot be voided');
  const notes = [agreement.notes, reason].filter(Boolean).join('\n');
  const { data, error } = await supabaseAdmin
    .from('fuel_provider_agreements')
    .update({
      status: 'voided',
      notes: notes || agreement.notes,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Failed to void fuel provider agreement');
  return data as FuelProviderAgreement;
}

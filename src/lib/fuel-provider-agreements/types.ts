export const FUEL_PROVIDER_AGREEMENT_STATUSES = [
  'draft',
  'generated',
  'issued',
  'provider_signed',
  'executed',
  'voided',
  'expired',
] as const;

export type FuelProviderAgreementStatus = (typeof FUEL_PROVIDER_AGREEMENT_STATUSES)[number];

export type FuelProviderAgreement = {
  id: string;
  pump_id: string;
  status: FuelProviderAgreementStatus;
  agreement_date: string;
  template_key: string;
  template_version: string;
  payload_snapshot: FuelProviderAgreementTemplatePayload | null;
  rendered_html?: string | null;
  draft_pdf_path?: string | null;
  signed_pdf_path?: string | null;
  executed_pdf_path?: string | null;
  provider_signed_name?: string | null;
  provider_signed_email?: string | null;
  provider_signed_at?: string | null;
  company_signatory_name?: string | null;
  company_signatory_title?: string | null;
  issued_at?: string | null;
  executed_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type FuelProviderAgreementDeliveryLog = {
  id: string;
  fuel_provider_agreement_id: string;
  delivery_channel: 'email';
  recipient_email: string;
  delivery_status: 'pending' | 'sent' | 'failed';
  subject?: string | null;
  sent_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type FuelProviderAgreementTemplatePayload = {
  agreementDateLabel: string;
  providerName: string;
  providerAddress?: string | null;
  providerCityState?: string | null;
  providerContactPerson?: string | null;
  providerContactPhone?: string | null;
  providerContactEmail?: string | null;
  oemName?: string | null;
  companyName: string;
  companyAddress: string;
  companySignatoryName: string;
  companySignatoryTitle: string;
  providerSignedName?: string | null;
  providerSignedAtLabel?: string | null;
  companyCountersignedAtLabel?: string | null;
  note?: string | null;
  jurisdiction: string;
};

export const FUEL_PROVIDER_TEMPLATE_KEY = 'fuel-provider-service-agreement';
export const FUEL_PROVIDER_TEMPLATE_VERSION = 'v1';

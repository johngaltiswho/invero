export const CONTRACTOR_AGREEMENT_STATUSES = [
  'draft',
  'generated',
  'issued',
  'contractor_signed',
  'executed',
  'voided',
  'expired',
] as const;

export const CONTRACTOR_AGREEMENT_TYPES = ['master_platform', 'financing_addendum', 'procurement_declaration'] as const;

export type ContractorAgreementStatus = (typeof CONTRACTOR_AGREEMENT_STATUSES)[number];
export type ContractorAgreementType = (typeof CONTRACTOR_AGREEMENT_TYPES)[number];

export type ContractorAgreement = {
  id: string;
  contractor_id: string;
  agreement_type: ContractorAgreementType;
  status: ContractorAgreementStatus;
  agreement_date: string;
  template_key: string;
  template_version: string;
  payload_snapshot: ContractorAgreementTemplatePayload | null;
  rendered_html?: string | null;
  draft_pdf_path?: string | null;
  signed_pdf_path?: string | null;
  executed_pdf_path?: string | null;
  contractor_signed_name?: string | null;
  contractor_signed_email?: string | null;
  contractor_signed_at?: string | null;
  contractor_signed_ip?: string | null;
  contractor_signed_user_agent?: string | null;
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

export type ContractorAgreementDeliveryLog = {
  id: string;
  contractor_agreement_id: string;
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

export type ContractorAgreementTemplatePayload = {
  agreementType: ContractorAgreementType;
  agreementDateLabel: string;
  contractorName: string;
  contractorEmail: string;
  contractorSignedName?: string | null;
  contractorSignedAtLabel?: string | null;
  companyCountersignedAtLabel?: string | null;
  contractorAddress?: string | null;
  contactPerson?: string | null;
  contactDesignation?: string | null;
  registrationNumber?: string | null;
  registrationLabel?: string | null;
  panNumber?: string | null;
  gstin?: string | null;
  incorporationDateLabel?: string | null;
  companyTypeLabel?: string | null;
  phone?: string | null;
  companyName: string;
  companyAddress: string;
  companyCIN?: string | null;
  companyPAN?: string | null;
  companySignatoryName: string;
  companySignatoryTitle: string;
  platformFeeRateLabel?: string | null;
  platformFeeCapLabel?: string | null;
  participationFeeRateDailyLabel?: string | null;
  financingLimitLabel?: string | null;
  repaymentBasisLabel?: string | null;
  paymentWindowDays?: number | null;
  lateDefaultTerms?: string | null;
  note?: string | null;
  jurisdiction: string;
};

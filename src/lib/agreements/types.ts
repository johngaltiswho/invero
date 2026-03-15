export const INVESTOR_AGREEMENT_STATUSES = [
  'draft',
  'generated',
  'issued',
  'investor_signed',
  'signed_copy_received',
  'executed',
  'voided',
  'expired',
] as const;

export type InvestorAgreementStatus = (typeof INVESTOR_AGREEMENT_STATUSES)[number];

export type InvestorAgreement = {
  id: string;
  investor_id: string;
  agreement_type: string;
  status: InvestorAgreementStatus;
  commitment_amount: number;
  agreement_date: string;
  investor_pan?: string | null;
  investor_address?: string | null;
  template_key: string;
  template_version: string;
  payload_snapshot: AgreementTemplatePayload | null;
  rendered_html?: string | null;
  draft_pdf_path?: string | null;
  signed_pdf_path?: string | null;
  executed_pdf_path?: string | null;
  investor_signed_name?: string | null;
  investor_signed_email?: string | null;
  investor_signed_at?: string | null;
  investor_signed_ip?: string | null;
  investor_signed_user_agent?: string | null;
  investor_acceptance?: {
    own_funds?: boolean;
    private_investment?: boolean;
    risk_disclosure?: boolean;
  } | null;
  company_signatory_name?: string | null;
  company_signatory_title?: string | null;
  issued_at?: string | null;
  signed_copy_received_at?: string | null;
  executed_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type AgreementDeliveryLog = {
  id: string;
  investor_agreement_id: string;
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

export type AgreementTemplatePayload = {
  agreementDateLabel: string;
  investorName: string;
  investorEmail: string;
  investorType: string;
  investorPhone?: string | null;
  investorPan?: string | null;
  investorAddress?: string | null;
  investorSignedName?: string | null;
  investorSignedAtLabel?: string | null;
  commitmentAmount: number;
  commitmentAmountLabel: string;
  companyName: string;
  companyAddress: string;
  companySignatoryName: string;
  companySignatoryTitle: string;
  companyCIN?: string | null;
  companyPAN?: string | null;
  jurisdiction: string;
  note?: string | null;
};

export type AgreementSendPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

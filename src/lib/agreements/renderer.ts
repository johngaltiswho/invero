import { formatCurrency } from '@/lib/email';
import {
  INVESTOR_PARTICIPATION_TEMPLATE_KEY,
  INVESTOR_PARTICIPATION_TEMPLATE_VERSION,
  renderInvestorParticipationHTML,
} from '@/lib/agreements/templates/investor-participation-poc';
import type { AgreementTemplatePayload } from '@/lib/agreements/types';

type BuildPayloadInput = {
  investor: {
    name: string;
    email: string;
    investor_type: string;
    phone?: string | null;
  };
  commitmentAmount: number;
  agreementDate: string;
  companySignatoryName: string;
  companySignatoryTitle: string;
  notes?: string | null;
};

const FINVERNO_COMPANY_NAME = 'Finverno Private Limited';
const FINVERNO_COMPANY_ADDRESS = '403, 3rd Floor, 22nd Cross, 2nd Sector, HSR Layout, Bengaluru - 560102, Karnataka, India';
const FINVERNO_COMPANY_CIN = 'U74999KA2024PTC000000';
const FINVERNO_COMPANY_PAN = 'AAGCF7643D';
const FINVERNO_JURISDICTION = 'Bengaluru, Karnataka';

export function buildInvestorAgreementPayload(input: BuildPayloadInput): AgreementTemplatePayload {
  const agreementDate = new Date(input.agreementDate);
  const agreementDateLabel = Number.isNaN(agreementDate.getTime())
    ? input.agreementDate
    : agreementDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

  return {
    agreementDateLabel,
    investorName: input.investor.name,
    investorEmail: input.investor.email,
    investorType: input.investor.investor_type,
    investorPhone: input.investor.phone || null,
    commitmentAmount: input.commitmentAmount,
    commitmentAmountLabel: formatCurrency(input.commitmentAmount),
    companyName: FINVERNO_COMPANY_NAME,
    companyAddress: FINVERNO_COMPANY_ADDRESS,
    companySignatoryName: input.companySignatoryName,
    companySignatoryTitle: input.companySignatoryTitle,
    companyCIN: FINVERNO_COMPANY_CIN,
    companyPAN: FINVERNO_COMPANY_PAN,
    jurisdiction: FINVERNO_JURISDICTION,
    note: input.notes || null,
  };
}

export function renderAgreementHTML(payload: AgreementTemplatePayload): { templateKey: string; templateVersion: string; html: string } {
  return {
    templateKey: INVESTOR_PARTICIPATION_TEMPLATE_KEY,
    templateVersion: INVESTOR_PARTICIPATION_TEMPLATE_VERSION,
    html: renderInvestorParticipationHTML(payload),
  };
}

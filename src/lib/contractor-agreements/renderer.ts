import { formatCurrency } from '@/lib/email';
import {
  CONTRACTOR_FINANCING_TEMPLATE_KEY,
  CONTRACTOR_FINANCING_TEMPLATE_VERSION,
  renderContractorFinancingHTML,
} from '@/lib/contractor-agreements/templates/financing-addendum';
import {
  CONTRACTOR_MASTER_TEMPLATE_KEY,
  CONTRACTOR_MASTER_TEMPLATE_VERSION,
  renderContractorMasterHTML,
} from '@/lib/contractor-agreements/templates/master-platform';
import {
  CONTRACTOR_PROCUREMENT_DECLARATION_TEMPLATE_KEY,
  CONTRACTOR_PROCUREMENT_DECLARATION_TEMPLATE_VERSION,
  renderContractorProcurementDeclarationHTML,
} from '@/lib/contractor-agreements/templates/procurement-declaration';
import type {
  ContractorAgreementTemplatePayload,
  ContractorAgreementType,
} from '@/lib/contractor-agreements/types';

type BuildPayloadInput = {
  agreementType: ContractorAgreementType;
  contractor: {
    company_name: string;
    email: string;
    business_address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    contact_person?: string | null;
    registration_number?: string | null;
    pan_number?: string | null;
    gstin?: string | null;
    platform_fee_rate?: number | null;
    platform_fee_cap?: number | null;
    participation_fee_rate_daily?: number | null;
  };
  agreementDate: string;
  companySignatoryName: string;
  companySignatoryTitle: string;
  financingLimit?: number | null;
  repaymentBasis?: 'client_payment_to_escrow' | null;
  paymentWindowDays?: number | null;
  lateDefaultTerms?: string | null;
  notes?: string | null;
};

const FINVERNO_COMPANY_NAME = 'Finverno Private Limited';
const FINVERNO_COMPANY_ADDRESS = '403, 3rd Floor, 22nd Cross Road, 2nd Sector, HSR Layout, Bengaluru - 560102, Karnataka';
const FINVERNO_COMPANY_CIN = 'U70200KA2025PTC212659';
const FINVERNO_COMPANY_PAN = null;
const FINVERNO_JURISDICTION = 'Bengaluru, Karnataka';

function buildContractorAddress(input: BuildPayloadInput['contractor']) {
  return [
    input.business_address,
    [input.city, input.state].filter(Boolean).join(', '),
    input.pincode,
  ]
    .filter(Boolean)
    .join(', ') || null;
}

function formatPercent(value?: number | null, multiplier = 100) {
  if (value === null || value === undefined) return null;
  return `${(value * multiplier).toFixed(2)}%`;
}

function formatRepaymentBasis(value?: 'client_payment_to_escrow' | null) {
  if (!value) return null;
  return 'On client payment to escrow / controlled collection account';
}

export function buildContractorAgreementPayload(input: BuildPayloadInput): ContractorAgreementTemplatePayload {
  const agreementDate = new Date(input.agreementDate);
  const agreementDateLabel = Number.isNaN(agreementDate.getTime())
    ? input.agreementDate
    : agreementDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

  return {
    agreementType: input.agreementType,
    agreementDateLabel,
    contractorName: input.contractor.company_name,
    contractorEmail: input.contractor.email,
    contractorAddress: buildContractorAddress(input.contractor),
    contactPerson: input.contractor.contact_person || null,
    registrationNumber: input.contractor.registration_number || null,
    panNumber: input.contractor.pan_number || null,
    gstin: input.contractor.gstin || null,
    companyName: FINVERNO_COMPANY_NAME,
    companyAddress: FINVERNO_COMPANY_ADDRESS,
    companyCIN: FINVERNO_COMPANY_CIN,
    companyPAN: FINVERNO_COMPANY_PAN,
    companySignatoryName: input.companySignatoryName,
    companySignatoryTitle: input.companySignatoryTitle,
    platformFeeRateLabel: formatPercent(input.contractor.platform_fee_rate),
    platformFeeCapLabel:
      input.contractor.platform_fee_cap !== null && input.contractor.platform_fee_cap !== undefined
        ? formatCurrency(input.contractor.platform_fee_cap)
        : null,
    participationFeeRateDailyLabel: formatPercent(input.contractor.participation_fee_rate_daily),
    financingLimitLabel:
      input.financingLimit !== null && input.financingLimit !== undefined
        ? formatCurrency(input.financingLimit)
        : null,
    repaymentBasisLabel: formatRepaymentBasis(input.repaymentBasis),
    paymentWindowDays: input.paymentWindowDays ?? null,
    lateDefaultTerms: input.lateDefaultTerms ?? null,
    note: input.notes || null,
    jurisdiction: FINVERNO_JURISDICTION,
  };
}

export function renderContractorAgreementHTML(payload: ContractorAgreementTemplatePayload): { templateKey: string; templateVersion: string; html: string } {
  if (payload.agreementType === 'financing_addendum') {
    return {
      templateKey: CONTRACTOR_FINANCING_TEMPLATE_KEY,
      templateVersion: CONTRACTOR_FINANCING_TEMPLATE_VERSION,
      html: renderContractorFinancingHTML(payload),
    };
  }

  if (payload.agreementType === 'procurement_declaration') {
    return {
      templateKey: CONTRACTOR_PROCUREMENT_DECLARATION_TEMPLATE_KEY,
      templateVersion: CONTRACTOR_PROCUREMENT_DECLARATION_TEMPLATE_VERSION,
      html: renderContractorProcurementDeclarationHTML(payload),
    };
  }

  return {
    templateKey: CONTRACTOR_MASTER_TEMPLATE_KEY,
    templateVersion: CONTRACTOR_MASTER_TEMPLATE_VERSION,
    html: renderContractorMasterHTML(payload),
  };
}

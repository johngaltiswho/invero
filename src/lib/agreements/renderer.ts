import { formatCurrency } from '@/lib/email';
import {
  FIXED_DEBT_LENDER_TEMPLATE_KEY,
  FIXED_DEBT_LENDER_TEMPLATE_VERSION,
  renderFixedDebtLenderHTML,
} from '@/lib/agreements/templates/fixed-debt-lender';
import {
  INVESTOR_PARTICIPATION_TEMPLATE_KEY,
  INVESTOR_PARTICIPATION_TEMPLATE_VERSION,
  renderInvestorParticipationHTML,
} from '@/lib/agreements/templates/investor-participation-poc';
import type { AgreementTemplatePayload } from '@/lib/agreements/types';

type BuildPayloadInput = {
  agreementModelType?: 'fixed_debt' | 'pool_participation';
  sleeveName?: string | null;
  investor: {
    name: string;
    email: string;
    investor_type: string;
    phone?: string | null;
    pan_number?: string | null;
    address?: string | null;
  };
  commitmentAmount: number;
  agreementDate: string;
  investorPan?: string | null;
  investorAddress?: string | null;
  companySignatoryName: string;
  companySignatoryTitle: string;
  notes?: string | null;
  investorSignedName?: string | null;
  investorSignedAt?: string | null;
  fixedCouponRateAnnual?: number | null;
  payoutPriorityRank?: number | null;
  almBucket?: string | null;
  liquidityNotes?: string | null;
};

const FINVERNO_COMPANY_NAME = 'Finverno Private Limited';
const FINVERNO_COMPANY_ADDRESS = '403, 3rd Floor, 22nd Cross Road, 2nd Sector, HSR Layout, Bengaluru - 560102, Karnataka';
const FINVERNO_COMPANY_CIN = 'U70200KA2025PTC212659';
const FINVERNO_COMPANY_PAN = null;
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

  const investorSignedAt = input.investorSignedAt ? new Date(input.investorSignedAt) : null;
  const investorSignedAtLabel =
    investorSignedAt && !Number.isNaN(investorSignedAt.getTime())
      ? investorSignedAt.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : input.investorSignedAt || null;

  return {
    agreementModelType: input.agreementModelType || 'pool_participation',
    sleeveName: input.sleeveName || null,
    agreementDateLabel,
    investorName: input.investor.name,
    investorEmail: input.investor.email,
    investorType: input.investor.investor_type,
    investorPhone: input.investor.phone || null,
    investorPan: input.investorPan ?? input.investor.pan_number ?? null,
    investorAddress: input.investorAddress ?? input.investor.address ?? null,
    investorSignedName: input.investorSignedName || null,
    investorSignedAtLabel,
    commitmentAmount: input.commitmentAmount,
    commitmentAmountLabel: formatCurrency(input.commitmentAmount),
    companyName: FINVERNO_COMPANY_NAME,
    companyAddress: FINVERNO_COMPANY_ADDRESS,
    companySignatoryName: input.companySignatoryName,
    companySignatoryTitle: input.companySignatoryTitle,
    companyCIN: FINVERNO_COMPANY_CIN,
    companyPAN: FINVERNO_COMPANY_PAN,
    jurisdiction: FINVERNO_JURISDICTION,
    fixedCouponRateAnnual: input.fixedCouponRateAnnual ?? null,
    payoutPriorityRank: input.payoutPriorityRank ?? null,
    almBucket: input.almBucket ?? null,
    liquidityNotes: input.liquidityNotes ?? null,
    note: input.notes || null,
  };
}

export function renderAgreementHTML(payload: AgreementTemplatePayload): { templateKey: string; templateVersion: string; html: string } {
  if (payload.agreementModelType === 'fixed_debt') {
    return {
      templateKey: FIXED_DEBT_LENDER_TEMPLATE_KEY,
      templateVersion: FIXED_DEBT_LENDER_TEMPLATE_VERSION,
      html: renderFixedDebtLenderHTML(payload),
    };
  }

  return {
    templateKey: INVESTOR_PARTICIPATION_TEMPLATE_KEY,
    templateVersion: INVESTOR_PARTICIPATION_TEMPLATE_VERSION,
    html: renderInvestorParticipationHTML(payload),
  };
}

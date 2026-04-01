import { formatCurrency, type EmailPayload } from '@/lib/email';

export type EmailTemplateResult = Pick<EmailPayload, 'subject' | 'text' | 'html'>;

export function purchaseRequestSubmittedEmail(input: {
  recipientName: string;
  projectName: string;
  itemCount: number;
  estimatedValue: number;
}): EmailTemplateResult {
  return {
    subject: `Purchase request submitted · ${input.projectName}`,
    text: `Hi ${input.recipientName},\n\nYour purchase request has been submitted successfully.\nProject: ${input.projectName}\nItems: ${input.itemCount}\nEstimated value: ${formatCurrency(input.estimatedValue)}\n\nWe will notify you once it is approved.`,
    html: `
      <p>Hi ${input.recipientName},</p>
      <p>Your purchase request has been submitted successfully.</p>
      <p><strong>Project:</strong> ${input.projectName}<br/>
      <strong>Items:</strong> ${input.itemCount}<br/>
      <strong>Estimated value:</strong> ${formatCurrency(input.estimatedValue)}</p>
      <p>We will notify you once it is approved.</p>
    `.trim(),
  };
}

export function purchaseRequestStatusEmail(input: {
  recipientName: string;
  projectName: string;
  statusLabel: string;
  estimatedValue: number;
  purchaseRequestId: string;
}): EmailTemplateResult {
  return {
    subject: `Purchase request ${input.statusLabel} · ${input.projectName}`,
    text: `Hi ${input.recipientName},\n\nYour purchase request has been ${input.statusLabel}.\nProject: ${input.projectName}\nEstimated value: ${formatCurrency(input.estimatedValue)}\n\nPR ID: ${input.purchaseRequestId}`,
    html: `
      <p>Hi ${input.recipientName},</p>
      <p>Your purchase request has been <strong>${input.statusLabel}</strong>.</p>
      <p><strong>Project:</strong> ${input.projectName}<br/>
      <strong>Estimated value:</strong> ${formatCurrency(input.estimatedValue)}</p>
      <p><strong>PR ID:</strong> ${input.purchaseRequestId}</p>
    `.trim(),
  };
}

export function investorAgreementReadyEmail(input: {
  investorName: string;
  commitmentAmount: number;
  portalUrl: string;
}): EmailTemplateResult {
  return {
    subject: `Finverno Lender Agreement - ${input.investorName}`,
    text: `Dear ${input.investorName},\n\nYour Finverno lender participation agreement is ready for review.\nCommitment amount: Rs ${input.commitmentAmount.toLocaleString('en-IN')}\n\nOpen the Finverno lending portal to review and sign your agreement: ${input.portalUrl}\n\nYou will be asked to sign in before completing the agreement.\n\nRegards,\nFinverno Private Limited`,
    html: `
      <p>Dear ${input.investorName},</p>
      <p>Your Finverno lender participation agreement is ready for review.</p>
      <p>Commitment amount: <strong>Rs ${input.commitmentAmount.toLocaleString('en-IN')}</strong></p>
      <p><a href="${input.portalUrl}">Open Finverno Lending Portal</a> to review and sign your agreement.</p>
      <p>You will be asked to sign in before completing the agreement.</p>
      <p>Regards,<br />Finverno Private Limited</p>
    `.trim(),
  };
}

export function investorAgreementExecutedEmail(input: {
  investorName: string;
  commitmentAmount: number;
}): EmailTemplateResult {
  return {
    subject: 'Lender agreement fully executed · Finverno',
    text: `Dear ${input.investorName},\n\nYour Finverno lender participation agreement for Rs ${input.commitmentAmount.toLocaleString('en-IN')} has been fully executed.\n\nYour lender profile is now active for the current workflow.\n\nRegards,\nFinverno Private Limited`,
    html: `
      <p>Dear ${input.investorName},</p>
      <p>Your Finverno lender participation agreement for <strong>Rs ${input.commitmentAmount.toLocaleString('en-IN')}</strong> has been fully executed.</p>
      <p>Your lender profile is now active for the current workflow.</p>
      <p>Regards,<br />Finverno Private Limited</p>
    `.trim(),
  };
}

export function capitalUpdateInvestorEmail(input: {
  recipientName: string;
  projectName: string;
  description: string;
  amount: number;
  transactionType: string;
}): EmailTemplateResult {
  const subjectMap: Record<string, string> = {
    inflow: `Capital received · ${input.projectName}`,
    deployment: `Capital deployed · ${input.projectName}`,
    return: `Capital return processed · ${input.projectName}`,
    withdrawal: `Capital withdrawal processed · ${input.projectName}`,
  };

  return {
    subject: subjectMap[input.transactionType] || `Capital update · ${input.projectName}`,
    text: `Hi ${input.recipientName},\n\n${input.description.trim()}\nAmount: ${formatCurrency(input.amount)}\nProject: ${input.projectName}`,
    html: `
      <p>Hi ${input.recipientName},</p>
      <p>${input.description.trim()}</p>
      <p><strong>Amount:</strong> ${formatCurrency(input.amount)}<br/>
      <strong>Project:</strong> ${input.projectName}</p>
    `.trim(),
  };
}

export function capitalReturnProcessedEmail(input: {
  recipientName: string;
  projectName: string;
  amount: number;
  referenceNumber?: string | null;
}): EmailTemplateResult {
  return {
    subject: `Capital return processed · ${input.projectName}`,
    text: `Hi ${input.recipientName},\n\nWe have processed a capital return of ${formatCurrency(input.amount)} for ${input.projectName}.\nReference: ${input.referenceNumber || '—'}`,
    html: `
      <p>Hi ${input.recipientName},</p>
      <p>We have processed a capital return of <strong>${formatCurrency(input.amount)}</strong> for <strong>${input.projectName}</strong>.</p>
      <p>Reference: ${input.referenceNumber || '—'}</p>
    `.trim(),
  };
}

export function contractorFundsDeployedEmail(input: {
  recipientName: string;
  projectName: string;
  amount: number;
  purchaseRequestId?: string | null;
}): EmailTemplateResult {
  return {
    subject: `Funds deployed · ${input.projectName}`,
    text: `Hi ${input.recipientName},\n\nFunds have been deployed for ${input.projectName}.\nAmount: ${formatCurrency(input.amount)}\n${input.purchaseRequestId ? `PR ID: ${input.purchaseRequestId}` : ''}`,
    html: `
      <p>Hi ${input.recipientName},</p>
      <p>Funds have been deployed for <strong>${input.projectName}</strong>.</p>
      <p><strong>Amount:</strong> ${formatCurrency(input.amount)}${input.purchaseRequestId ? `<br/><strong>PR ID:</strong> ${input.purchaseRequestId}` : ''}</p>
    `.trim(),
  };
}

export function contractorAgreementReadyEmail(input: {
  contractorName: string;
  agreementType: 'master_platform' | 'financing_addendum' | 'procurement_declaration' | 'fuel_procurement_declaration';
  draftUrl: string;
  portalUrl: string;
}): EmailTemplateResult {
  const agreementLabel =
    input.agreementType === 'master_platform'
      ? 'Master SME Platform Agreement'
      : input.agreementType === 'financing_addendum'
        ? 'Financing / Working Capital Addendum'
        : input.agreementType === 'fuel_procurement_declaration'
          ? 'Fuel Procurement & Settlement Declaration'
        : 'Procurement / Booking Declaration';

  return {
    subject: `${agreementLabel} ready for review · Finverno`,
    text: `Dear ${input.contractorName},\n\nYour ${agreementLabel} is ready for review.\n\nOpen the Finverno contractor portal to review and sign the agreement: ${input.portalUrl}\n\nDraft copy: ${input.draftUrl}\n\nYou will be asked to sign in before completing the agreement.\n\nRegards,\nFinverno Private Limited`,
    html: `
      <p>Dear ${input.contractorName},</p>
      <p>Your <strong>${agreementLabel}</strong> is ready for review.</p>
      <p><a href="${input.portalUrl}">Open the Finverno contractor portal</a> to review and sign the agreement.</p>
      <p>If you need the current draft copy separately, you can also <a href="${input.draftUrl}">view the draft PDF</a>.</p>
      <p>You will be asked to sign in before completing the agreement.</p>
      <p>Regards,<br />Finverno Private Limited</p>
    `.trim(),
  };
}

export function contractorAgreementExecutedEmail(input: {
  contractorName: string;
  agreementType: 'master_platform' | 'financing_addendum' | 'procurement_declaration' | 'fuel_procurement_declaration';
}): EmailTemplateResult {
  const agreementLabel =
    input.agreementType === 'master_platform'
      ? 'Master SME Platform Agreement'
      : input.agreementType === 'financing_addendum'
        ? 'Financing / Working Capital Addendum'
        : input.agreementType === 'fuel_procurement_declaration'
          ? 'Fuel Procurement & Settlement Declaration'
        : 'Procurement / Booking Declaration';

  return {
    subject: `${agreementLabel} executed · Finverno`,
    text: `Dear ${input.contractorName},\n\nYour ${agreementLabel} has been fully executed.\n\nIf this is your master agreement, portal procurement access is now controlled by your onboarding status in Finverno. If this is your financing addendum, financing access will be enabled once the approved commercial terms are active.\n\nRegards,\nFinverno Private Limited`,
    html: `
      <p>Dear ${input.contractorName},</p>
      <p>Your <strong>${agreementLabel}</strong> has been fully executed.</p>
      <p>If this is your master agreement, portal procurement access is now controlled by your onboarding status in Finverno. If this is your financing addendum, financing access will be enabled once the approved commercial terms are active.</p>
      <p>Regards,<br />Finverno Private Limited</p>
    `.trim(),
  };
}

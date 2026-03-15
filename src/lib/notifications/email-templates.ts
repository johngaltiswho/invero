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
  agreementUrl: string;
}): EmailTemplateResult {
  return {
    subject: `Finverno Investor Agreement - ${input.investorName}`,
    text: `Dear ${input.investorName},\n\nYour Finverno investor participation agreement is ready for review.\nCommitment amount: Rs ${input.commitmentAmount.toLocaleString('en-IN')}\n\nDownload agreement: ${input.agreementUrl}\n\nPlease review, sign, and return the signed agreement to Finverno.\n\nRegards,\nFinverno Private Limited`,
    html: `
      <p>Dear ${input.investorName},</p>
      <p>Your Finverno investor participation agreement is ready for review.</p>
      <p>Commitment amount: <strong>Rs ${input.commitmentAmount.toLocaleString('en-IN')}</strong></p>
      <p>Download agreement: <a href="${input.agreementUrl}">View Agreement</a></p>
      <p>Please review, sign, and return the signed agreement to Finverno.</p>
      <p>Regards,<br />Finverno Private Limited</p>
    `.trim(),
  };
}

export function investorAgreementExecutedEmail(input: {
  investorName: string;
  commitmentAmount: number;
}): EmailTemplateResult {
  return {
    subject: 'Investor agreement fully executed · Finverno',
    text: `Dear ${input.investorName},\n\nYour Finverno investor participation agreement for Rs ${input.commitmentAmount.toLocaleString('en-IN')} has been fully executed.\n\nYour investor profile is now active for the current workflow.\n\nRegards,\nFinverno Private Limited`,
    html: `
      <p>Dear ${input.investorName},</p>
      <p>Your Finverno investor participation agreement for <strong>Rs ${input.commitmentAmount.toLocaleString('en-IN')}</strong> has been fully executed.</p>
      <p>Your investor profile is now active for the current workflow.</p>
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

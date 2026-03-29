import { jsPDF } from 'jspdf';
import type { ContractorAgreementTemplatePayload } from '@/lib/contractor-agreements/types';

export function generateContractorAgreementPDF(
  payload: ContractorAgreementTemplatePayload,
  meta: { templateVersion: string }
): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const sanitizePdfText = (value: string) =>
    value
      .replace(/₹/g, 'INR ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/•/g, '-')
      .replace(/\u00a0/g, ' ');

  const addTextBlock = (text: string, options?: { bold?: boolean; size?: number; spacing?: number }) => {
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(options?.size ?? 11);
    const lines = doc.splitTextToSize(sanitizePdfText(text), contentWidth) as string[];
    doc.text(lines, margin, y);
    y += lines.length * ((options?.size ?? 11) * 0.42) + (options?.spacing ?? 3);
  };

  const addSection = (title: string, body: string | string[]) => {
    if (y > 265) {
      doc.addPage();
      y = 18;
    }
    addTextBlock(title, { bold: true, spacing: 2 });
    const blocks = Array.isArray(body) ? body : [body];
    blocks.forEach((block) => addTextBlock(block, { size: 10, spacing: 4 }));
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FINVERNO PRIVATE LIMITED', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text(
    payload.agreementType === 'financing_addendum'
      ? 'FINANCING / WORKING CAPITAL ADDENDUM'
      : payload.agreementType === 'procurement_declaration'
        ? 'PROCUREMENT / BOOKING DECLARATION'
        : 'MASTER SME PLATFORM AGREEMENT',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Template Version: ${meta.templateVersion}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  addTextBlock(
    `${payload.companyName} and ${payload.contractorName} entered into this agreement on ${payload.agreementDateLabel}.`,
    { size: 10, spacing: 4 }
  );
  addTextBlock(
    [
      `SME: ${payload.contractorName}`,
      payload.contractorAddress || 'Address as recorded on the Finverno platform',
      payload.companyTypeLabel || null,
      payload.registrationNumber ? `${payload.registrationLabel || 'Registration Number'}: ${payload.registrationNumber}` : null,
      payload.panNumber ? `PAN: ${payload.panNumber}` : null,
      payload.gstin ? `GSTIN: ${payload.gstin}` : null,
      payload.incorporationDateLabel ? `Incorporated on: ${payload.incorporationDateLabel}` : null,
      payload.contactPerson
        ? `Authorized signatory: ${payload.contactPerson}${payload.contactDesignation ? `, ${payload.contactDesignation}` : ''}`
        : null,
      `Email: ${payload.contractorEmail}${payload.phone ? ` | Phone: ${payload.phone}` : ''}`,
    ]
      .filter(Boolean)
      .join('\n'),
    { size: 10, spacing: 5 }
  );

  if (payload.agreementType === 'financing_addendum') {
    addSection('1. Financing Assistance Structure', 'Finverno may facilitate working capital support for approved procurement and project-linked obligations, subject to approved limits and internal underwriting.');
    addSection('2. Approved Commercial Terms', [
      `Financing limit: ${payload.financingLimitLabel || 'As approved by Finverno'}`,
      `Platform fee rate: ${payload.platformFeeRateLabel || 'As approved by Finverno'}`,
      `Platform fee cap: ${payload.platformFeeCapLabel || 'As approved by Finverno'}`,
      `Participation fee (daily): ${payload.participationFeeRateDailyLabel || 'As approved by Finverno'}`,
      `Repayment basis: ${payload.repaymentBasisLabel || 'As approved by Finverno'}`,
      `Payment window (days): ${payload.paymentWindowDays ?? 'As approved by Finverno'}`,
    ]);
    addSection('3. Repayment, Set-Off, and Default', [
      'The SME shall repay funded amounts, fees, and charges in accordance with the approved repayment basis and timing communicated by Finverno.',
      'Finverno may suspend financing access or apply recovery rights where default, delay, or material risk events arise.',
      payload.lateDefaultTerms || 'Late payment and default consequences apply in accordance with the approved commercial terms.',
    ]);
  } else if (payload.agreementType === 'procurement_declaration') {
    addSection('1. Commercial Acceptance', [
      'The SME accepts that the booking rate may include the basic rate, GST, freight, and applicable statutory charges as communicated at the time of booking.',
      'Any subsequent increase, revision, levy, or charge passed through by the relevant intermediary, producer, manufacturer, or supplier shall be payable by the SME on a back-to-back basis.',
    ]);
    addSection('2. Dispatch, Interchangeability, and Non-Lifting', [
      'The SME accepts interchangeability of sizes or related material specifications based on availability and dispatch conditions.',
      'If the SME does not lift or take delivery of the booked material within the applicable timeline, advances may be forfeited and credits may be adjusted against penalties or other charges on a back-to-back basis.',
    ]);
    addSection('3. Credit / Debit Notes and Transit Risk', [
      'Credit and debit notes passed through by the relevant intermediary, including NSIC where applicable, are acceptable only on a back-to-back receipt basis from the upstream producer, manufacturer, or supplier.',
      'The SME shall arrange movement, loading, unloading, freight, transit insurance, and related incidentals at its own cost and risk, and accepts that delay, shortage, or transit loss shall not automatically create liability on Finverno.',
    ]);
    addSection('4. Quantity, Quality, and Intended Use', [
      'The SME accepts the quantity, quality, dispatch pricing, applicable taxes, and subsequent debit or credit adjustments communicated through the procurement channel on a back-to-back basis.',
      'The SME confirms that materials procured through the booking will be used for declared project or manufacturing purposes and not unlawfully diverted or traded contrary to declared use.',
    ]);
  } else {
    addSection('1. Purpose and Scope', 'This agreement governs the SME\'s use of the Finverno platform for procurement enablement, onboarding, document workflows, audit support, and related operational services.');
    addSection('2. Representations and Platform Use', [
      'The SME represents that it is duly organized, properly authorized, and that all KYC, project, invoice, banking, tax, and commercial records submitted are accurate, complete, and not misleading.',
      'The SME remains responsible for all activity conducted through its accounts and shall not misuse the platform, submit manipulated records, or interfere with workflows, counterparties, or platform security.',
    ]);
    addSection('3. Data Usage, Audit, and Privacy Notice', [
      'Finverno may process documents, records, business information, and related contact or personal data for onboarding, compliance, procurement, financing review, collections support, fraud prevention, dispute handling, audit, support, and lawful recordkeeping.',
      'The SME confirms it has the right to share submitted records and any required notices or authorizations have been provided where such records include personal or contact data.',
      'Finverno may retain records and share them with service providers on a need-to-know basis subject to confidentiality and security controls.',
    ]);
    addSection('4. Suspension, Indemnity, and Limitation of Liability', [
      'Finverno may suspend or restrict access where compliance, misuse, fraud, legal, or risk concerns reasonably require such action.',
      'The SME indemnifies Finverno against losses arising from false submissions, misuse, unlawful data sharing, third-party claims, or breach of the agreement.',
      'Finverno provides the platform on a best-efforts basis and does not guarantee project success, vendor performance, financing availability, or uninterrupted service.',
    ]);
    addSection('5. No Automatic Financing Commitment', 'Execution of the master agreement does not by itself obligate Finverno to provide financing support. Financing remains subject to separate approval, limit setting, and financing addendum execution.');
  }

  addSection('General Terms', [
    'The Parties agree that portal records, electronic notices, workflow logs, digital acknowledgements, and execution records may be relied upon as valid business records.',
    'This agreement may be signed electronically through the Finverno contractor portal. Electronic signatures shall have the same legal validity as physical signatures under the Information Technology Act, 2000.',
    `This agreement is governed by Indian law and subject to the courts at ${payload.jurisdiction}.`,
  ]);

  if (payload.note) {
    addSection('Schedule / Notes', payload.note);
  }

  if (y > 245) {
    doc.addPage();
    y = 18;
  }
  y += 6;
  addTextBlock(`For ${payload.companyName}`, { bold: true, spacing: 2 });
  addTextBlock(
    `${payload.companySignatoryName}\n${payload.companySignatoryTitle}${
      payload.companyCountersignedAtLabel ? `\nCountersigned on ${payload.companyCountersignedAtLabel}` : ''
    }`,
    { size: 10, spacing: 6 }
  );
  addTextBlock(`For ${payload.contractorName}`, { bold: true, spacing: 2 });
  addTextBlock(
    `${payload.contractorSignedName || payload.contactPerson || payload.contractorName}\nEmail: ${payload.contractorEmail}${
      payload.contractorSignedAtLabel ? `\nElectronically signed on ${payload.contractorSignedAtLabel}` : ''
    }`,
    { size: 10, spacing: 4 }
  );

  return Buffer.from(doc.output('arraybuffer'));
}

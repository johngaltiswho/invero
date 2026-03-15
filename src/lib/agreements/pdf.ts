import { jsPDF } from 'jspdf';
import type { AgreementTemplatePayload } from '@/lib/agreements/types';

export function generateInvestorAgreementPDF(
  payload: AgreementTemplatePayload,
  meta: { templateVersion: string }
): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

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
      .replace(/☐/g, '[ ]')
      .replace(/\u00a0/g, ' ');

  const addTextBlock = (
    text: string,
    options?: { bold?: boolean; size?: number; spacing?: number }
  ) => {
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
  doc.text('INVESTOR PARTICIPATION AGREEMENT', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('(Proof of Concept Capital Pool)', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9);
  doc.text(`Template Version: ${meta.templateVersion}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  addTextBlock(
    `This Investor Participation Agreement is entered into on the date of electronic execution between ${payload.companyName} and the Investor identified on the Finverno portal.`,
    { size: 10, spacing: 4 }
  );
  addTextBlock(
    `${payload.companyName}\n${payload.companyAddress}${payload.companyCIN ? `\nCIN: ${payload.companyCIN}` : ''}`,
    { size: 10, spacing: 5 }
  );

  addSection('1. Purpose', [
    'Finverno is conducting a limited Proof of Concept capital pool to validate a working capital financing model for SME contractors.',
    'The purpose of this Agreement is to document the terms under which the Investor provides capital to Finverno for deployment within this POC structure.',
  ]);
  addSection('2. Nature of Investment', [
    `The capital provided under this Agreement shall be treated as a loan from the Investor to ${payload.companyName}.`,
    'Finverno shall deploy the capital towards short-duration financing of material purchases linked to approved contractor BOQs and supplier invoices. Finverno retains full discretion regarding deployment decisions.',
  ]);
  addSection('3. Investment Amount', [
    `The Investor agrees to contribute ${payload.commitmentAmountLabel}.`,
    'The capital shall be transferred via bank transfer to the designated Finverno account.',
  ]);
  addSection('4. Deployment Duration', 'Capital deployments typically occur in cycles of approximately 30 to 90 days, though the exact duration may vary depending on the underlying project cycle.');
  addSection('5. Return Framework', [
    'Hurdle Return: 12% annualised return, calculated on a pro-rated basis for the duration capital remains deployed.',
    'Profit Sharing: after the hurdle return has been satisfied, additional profits generated from deployment may be distributed 80% to the Investor and 20% retained by Finverno as performance compensation.',
    'Expected Returns: indicative expected net annualised return to investors is approximately 14% to 18%. These returns are not guaranteed.',
  ]);
  addSection('6. Management and Platform Fees', 'Finverno may earn management compensation and platform or enablement fees charged to contractors. Such revenues belong to Finverno and are separate from investor capital returns.');
  addSection('7. Repayment', 'Upon completion of a deployment cycle, Finverno shall return the Investor principal capital and applicable returns calculated in accordance with Section 5. Investors may elect to withdraw capital or redeploy into subsequent cycles.');
  addSection('8. Transparency and Reporting', 'Finverno will provide periodic updates to investors including deployment summaries, repayment confirmations, and return calculations. Operational details may be summarised for confidentiality purposes.');
  addSection('9. Risk Disclosure', [
    'This POC involves financing operational business activities.',
    'Contractor payment timelines may vary.',
    'Returns are dependent on successful collection from financed transactions.',
    'Finverno shall exercise reasonable diligence in deployment but does not guarantee investment returns.',
  ]);
  addSection('10. Taxation', 'All returns distributed to investors may be treated as interest income under applicable tax laws. Finverno may deduct Tax Deducted at Source where required under Indian law. Investors are responsible for their own tax reporting obligations.');
  addSection('11. Transfer Restrictions', 'This participation is private and non-transferable without written consent from Finverno.');
  addSection('12. Governing Law', `This Agreement shall be governed by the laws of India. Any disputes shall fall under the jurisdiction of courts located in ${payload.jurisdiction}.`);
  addSection('13. Electronic Execution', 'This Agreement is executed electronically through the Finverno investor portal. Electronic signatures shall have the same legal validity as physical signatures under the Information Technology Act, 2000.');
  addSection('14. Acceptance', [
    'By electronically signing this Agreement, the Investor confirms that they have read and understood the terms, agree to participate under the stated structure, and acknowledge the associated risks.',
    'Pre-signing confirmations: investing from own funds, understands this is a private investment opportunity, has read the risk disclosure.',
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
  addTextBlock(`${payload.companySignatoryName}\n${payload.companySignatoryTitle}`, { size: 10, spacing: 6 });

  addTextBlock('Investor', { bold: true, spacing: 2 });
  addTextBlock(
    `${payload.investorName}\nEmail: ${payload.investorEmail}\nType: ${payload.investorType}${payload.investorPhone ? `\nPhone: ${payload.investorPhone}` : ''}\nPAN: ${payload.investorPan || '__________________________'}\nAddress: ${payload.investorAddress || '__________________________'}`,
    { size: 10, spacing: 4 }
  );
  addTextBlock(
    payload.investorSignedName
      ? `Electronically signed by ${payload.investorSignedName}${payload.investorSignedAtLabel ? ` on ${payload.investorSignedAtLabel}` : ''}.`
      : 'Electronic Signature via Finverno Investor Portal',
    { size: 10, spacing: 4 }
  );

  return Buffer.from(doc.output('arraybuffer'));
}

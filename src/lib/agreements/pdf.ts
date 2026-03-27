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
    `This Investor Participation Agreement is entered into on the date of electronic execution between ${payload.companyName} and ${payload.investorName}, the investor identified on the Finverno portal.`,
    { size: 10, spacing: 4 }
  );
  addTextBlock(
    `${payload.companyName}\n${payload.companyAddress}${payload.companyCIN ? `\nCIN: ${payload.companyCIN}` : ''}`,
    { size: 10, spacing: 5 }
  );

  addSection('1. Purpose', [
    'Finverno is conducting a limited proof-of-concept pooled capital program for short-duration working capital finance provided to SME contractors and related supplier payment cycles.',
    'This Agreement records the terms on which the Investor makes capital available to Finverno for deployment within such pooled capital strategy and the basis on which distributions, fees, reporting, and execution are handled.',
  ]);
  addSection('2. Nature of Investment', [
    `The capital provided under this Agreement shall be treated as a loan from the Investor to ${payload.companyName}.`,
    'The Investor participates in the Finverno pool as a whole and not in any single purchase request, contractor, supplier, invoice, or project.',
    'Finverno retains sole deployment discretion, subject to its internal underwriting and monitoring processes. This Agreement is a private contractual arrangement and not an issuance of units of a SEBI-registered AIF unless separately stated.',
  ]);
  addSection('3. Investment Amount', [
    `The Investor agrees to contribute ${payload.commitmentAmountLabel}.`,
    'The capital shall be transferred via bank transfer to the designated Finverno account and treated as deployable only upon receipt of cleared funds.',
  ]);
  addSection('4. Deployment Basis and Duration', 'Capital may be deployed across short-duration working capital transactions, usually in cycles of approximately 30 to 90 days, though actual timing depends on project execution and collections.');
  addSection('5. Key Commercial Terms', [
    'Preferred Return / Hurdle: 12% per annum, accrued on a daily pro-rated basis.',
    'Management Fee: 2% per annum, accrued only on capital actually deployed in active transactions. No 2% fee is charged on idle or undeployed cash.',
    'Carry / Performance Fee: 20% of realized profits above the 12% preferred return hurdle.',
    'NAV Treatment: accrued management fee reduces net NAV as it accrues; carry is recognized only upon realization in cash.',
    'Investor Exposure: economic participation is in the pool as a whole. Look-through exposure reports are informational only.',
  ]);
  addSection('6. Valuation and Unit Transparency', [
    'Finverno may maintain internal notional pool units and NAV calculations for transparency, fair entry pricing, and internal accounting consistency.',
    'Pool NAV may reflect pool cash, outstanding deployed principal, accrued income, realized collections, accrued management fee, and realized carry.',
  ]);
  addSection('7. Distribution Waterfall', [
    'First, the Investor is entitled to the 12% preferred return accrued on deployed capital for the relevant deployment period.',
    'Second, the 2% annual management fee accrues only on deployed capital and may be reflected as an accrued deduction in net NAV.',
    'Third, only realized profits above the hurdle are eligible for the 80/20 split, with 80% to Investors and 20% to Finverno as carry.',
    'Indicative expected net annualized return to investors is approximately 14% to 18%, but this is illustrative and not guaranteed.',
  ]);
  addSection('8. Examples for Transparency', [
    'Later entry at higher NAV: a later investor may receive fewer notional units if the pool NAV has increased before entry.',
    'Preferred return and carry: realized profit up to the hurdle is allocated to investors; only realized profit above the hurdle becomes subject to the 80/20 split.',
    '2% management fee: the fee applies only to capital actively deployed in live transactions, not to cash temporarily awaiting deployment.',
  ]);
  addSection('9. Reporting and Separate Finverno Revenues', [
    'Finverno will provide periodic reporting including NAV, notional unit allocation, deployed capital, pool cash, collections, fee accruals, and return calculations.',
    'Contractor-side platform, enablement, and service revenues belong to Finverno unless expressly included in the investor waterfall.',
  ]);
  addSection('10. Repayment and Liquidity', 'Repayment of principal and applicable distributions remains subject to pool liquidity, realization of collections, and the waterfall mechanics set out in this Agreement. Immediate liquidity on demand is not guaranteed.');
  addSection('11. Investor Acknowledgements', [
    'The Investor is participating using lawful funds beneficially owned or controlled by the Investor.',
    'The Investor understands the 2% management fee, 12% preferred return, and 20% carry framework.',
    'The Investor understands that look-through exposure reporting does not create direct rights against any underlying contractor, supplier, or project.',
  ]);
  addSection('12. Risk Disclosure', [
    'The pool is subject to contractor, project, collection, operational, and timing risk.',
    'Diversification may reduce but does not eliminate concentration risk.',
    'Returns depend on successful collection from financed transactions.',
    'Finverno exercises reasonable diligence but does not guarantee investment returns.',
  ]);
  addSection('13. Taxes, Transfer Restrictions, and Relationship', [
    'Returns may be treated as interest income or such other category as may be required by law. Finverno may deduct tax at source where legally required.',
    'This participation is private and non-transferable without Finverno consent and does not create a partnership, agency, or co-ownership relationship in any underlying financed asset.',
  ]);
  addSection('14. Governing Law', `This Agreement shall be governed by the laws of India. Any disputes shall fall under the jurisdiction of courts located in ${payload.jurisdiction}.`);
  addSection('15. Electronic Execution', 'This Agreement is executed electronically through the Finverno investor portal. Electronic signatures shall have the same legal validity as physical signatures under the Information Technology Act, 2000.');
  addSection('16. Acceptance', [
    'By electronically signing, the Investor confirms that they have read and understood the Agreement in full, accept the pooled capital model and fee mechanics, and consent to electronic records and execution.',
    'Pre-signing confirmations: investing from own funds, understands this is a private and illiquid investment opportunity, and has reviewed the risk disclosure.',
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

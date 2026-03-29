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
  doc.text(
    payload.agreementModelType === 'fixed_debt' ? 'FIXED INCOME LENDER AGREEMENT' : 'LENDER PARTICIPATION AGREEMENT',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (payload.agreementModelType === 'pool_participation') {
    doc.text('(Proof of Concept Capital Pool)', pageWidth / 2, y, { align: 'center' });
    y += 6;
  }
  doc.setFontSize(9);
  doc.text(`Template Version: ${meta.templateVersion}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  addTextBlock(
    payload.agreementModelType === 'fixed_debt'
      ? `This Agreement records the terms on which ${payload.investorName} lends money to ${payload.companyName} through the ${payload.sleeveName || 'Fixed Income Sleeve'} on the Finverno platform.`
      : `This Lender Participation Agreement is entered into on the date of electronic execution between ${payload.companyName} and ${payload.investorName}, the lender identified on the Finverno portal.`,
    { size: 10, spacing: 4 }
  );
  addTextBlock(
    `${payload.companyName}\n${payload.companyAddress}${payload.companyCIN ? `\nCIN: ${payload.companyCIN}` : ''}`,
    { size: 10, spacing: 5 }
  );

  if (payload.agreementModelType === 'fixed_debt') {
    const annualRate = payload.fixedCouponRateAnnual ?? 0.14;
    const annualRateLabel = `${(annualRate * 100).toFixed(2)}% per annum`;

    addSection('1. Background and Purpose', [
      'Finverno offers a fixed income lending product for investors who want a fixed return structure with flexible timing rather than a pool or NAV-based participation model.',
      'Under this Agreement, the Lender makes capital available to Finverno for deployment into short-duration receivable-backed transactions. This document records the key commercial terms, expected liquidity pattern, reporting approach, and legal basis of that lending arrangement.',
    ]);
    addSection('2. Nature of Participation and Legal Character', [
      `The capital committed under this Agreement shall be treated as a loan from the Lender to ${payload.companyName}.`,
      'This is not a fund, NAV product, unitized vehicle, bank deposit, or on-demand withdrawal product.',
      'The Lender does not receive direct ownership rights in any specific invoice, contractor, supplier, or transaction unless separately documented in writing.',
    ]);
    addSection('3. Commitment and Funding', [
      `The Lender agrees to contribute ${payload.commitmentAmountLabel}.`,
      'Funding shall be remitted by bank transfer to the designated Finverno account and treated as deployable only upon receipt of cleared funds.',
    ]);
    addSection('4. Investment Snapshot', [
      'Product: Fixed income lending arrangement with Finverno.',
      'Legal nature: private loan by the Lender to Finverno.',
      `Amount: ${payload.commitmentAmountLabel}.`,
      `Return: ${annualRateLabel}.`,
      'Accrual: daily on deployed capital.',
      'Use of funds: short-duration receivable-backed transactions.',
      'Expected capital cycle: typically 90 to 120 days, based on experience.',
      'Liquidity: withdrawal requests may be made at any time, subject to available liquidity and collections.',
      'Repayment style: partial or full payouts may happen as liquidity becomes available.',
      'There is no fixed maturity date, no guaranteed repayment timeline, and no assured liquidity on demand.',
    ]);
    addSection('5. How the Product Works', [
      'Once funds are received, Finverno deploys capital into short-duration receivable-backed transactions.',
      'Return accrues daily on capital that is actually deployed.',
      'As collections come in from those transactions, liquidity is created within the system and used to process repayments, payouts, and withdrawal requests as feasible.',
    ]);
    addSection('6. Investment Terms', [
      `The return under this arrangement is ${annualRateLabel}. This return accrues daily on capital that is deployed by Finverno.`,
      'Capital that has not yet been deployed may not accrue the same return until deployment begins.',
      'This is a fixed income product, but it does not have a fixed maturity date. Timing of payout depends on how collections come in from the underlying deployed transactions.',
    ]);
    addSection('7. Duration and Liquidity', [
      'Based on practical experience, capital in this product typically rotates in about 90 to 120 days.',
      'In most cases, investors can expect to be in a position to request withdrawal within this period.',
      'However, this is an expected operating pattern, not a guaranteed timeline. Some capital may remain deployed into another cycle, which may extend for around an additional 90 days depending on collections, transaction timing, and operating conditions.',
      'Because capital is deployed across multiple transactions, cash can come back at different times from different deployments. This creates ongoing liquidity in the system and can allow staggered payouts instead of waiting for one single transaction to close.',
    ]);
    addSection('8. Repayment and Payouts', [
      'Repayments are made from ongoing collections and liquidity generated across deployed transactions.',
      'Payouts may therefore be partial, full, or staggered over time as liquidity becomes available.',
      'There is no fixed repayment date under this product.',
    ]);
    addSection('9. Early Withdrawal', [
      'The Lender may request withdrawal at any time.',
      'Finverno will review the request and try to process it based on available liquidity, current collections, ongoing deployment commitments, and overall operating position.',
      'Early withdrawal is therefore flexible, but not instant and not guaranteed on demand.',
    ]);
    addSection('10. Reporting and Transparency', [
      'Finverno will provide periodic reporting on the fixed income position.',
      'This may include committed amount, deployed amount, accrued return, payouts made, outstanding balance, and repayment or liquidity status.',
    ]);
    addSection('11. Lender Representations and Acknowledgements', [
      'The Lender is investing from lawful funds beneficially owned or controlled by the Lender.',
      'The Lender understands this is a private fixed income lending arrangement.',
      'The Lender understands repayment timing depends on collections and liquidity.',
      'The Lender has read and understood the product terms in this Agreement.',
    ]);
    addSection('12. Risk Factors', [
      'This is intended to be a transparent fixed income lending product, but it still carries risk.',
      'Key risks include delays in collections, longer-than-expected capital cycles, counterparty and execution risk, timing mismatch between inflows and payout requests, and the possibility that withdrawals or repayments may take longer than expected.',
      'Finverno aims to manage these risks prudently, but cannot promise immediate liquidity or a fixed payout date.',
    ]);
    addSection('13. Taxes, Transfer Restrictions, and Relationship', [
      'This Agreement is a private contractual lending arrangement between the Lender and Finverno.',
      'Returns may be treated as interest income or such other category as required under applicable law. Finverno may deduct tax at source where legally required. The Lender remains responsible for their own tax filings and disclosures.',
      'This participation is private and non-transferable without Finverno consent and does not create a partnership, agency, fiduciary relationship, or co-ownership in any underlying receivable-backed transaction.',
    ]);
    addSection('14. Governing Law and Electronic Execution', [
      `This Agreement is governed by Indian law and subject to the courts located in ${payload.jurisdiction}.`,
      'This Agreement may be signed electronically through the Finverno lending portal.',
    ]);
    addSection('15. Acceptance', [
      'By electronically signing, the Lender confirms that they are lending from their own lawful funds, understand this is a private fixed income lending arrangement, and understand that repayment and withdrawals depend on liquidity and collections.',
    ]);
  } else {
    addSection('1. Purpose', [
      'Finverno is conducting a limited proof-of-concept pooled capital program for short-duration working capital finance provided to SME contractors and related supplier payment cycles.',
      'This Agreement records the terms on which the Lender makes capital available to Finverno for deployment within such pooled capital strategy and the basis on which distributions, fees, reporting, and execution are handled.',
    ]);
    addSection('2. Nature of Participation', [
      `The capital provided under this Agreement shall be treated as a loan from the Lender to ${payload.companyName}.`,
      'The Lender participates in the Finverno pool as a whole and not in any single purchase request, contractor, supplier, invoice, or project.',
      'Finverno retains sole deployment discretion, subject to its internal underwriting and monitoring processes. This Agreement is a private lending arrangement and does not constitute units, partnership interests, or other regulated fund interests in an AIF or similar pooled investment vehicle.',
    ]);
    addSection('3. Lending Amount', [
      `The Lender agrees to contribute ${payload.commitmentAmountLabel}.`,
      'The capital shall be transferred via bank transfer to the designated Finverno account and treated as deployable only upon receipt of cleared funds.',
    ]);
    addSection('4. Deployment Basis and Duration', 'Capital may be deployed across short-duration working capital transactions, usually in cycles of approximately 30 to 90 days, though actual timing depends on project execution and collections.');
    addSection('5. Key Commercial Terms', [
      'Preferred Return / Hurdle: 12% per annum, accrued on a daily pro-rated basis.',
      'Management Fee: 2% per annum, accrued only on capital actually deployed in active transactions. No 2% fee is charged on idle or undeployed cash.',
      'Carry / Performance Fee: 20% of realized profits above the 12% preferred return hurdle.',
      'NAV Treatment: accrued management fee reduces net NAV as it accrues; carry is recognized only upon realization in cash.',
      'Lender Exposure: economic participation is in the pool as a whole. Look-through exposure reports are informational only.',
    ]);
    addSection('6. Valuation and Unit Transparency', [
      'Finverno may maintain internal notional pool units and NAV calculations for transparency, fair entry pricing, and internal accounting consistency.',
      'Pool NAV may reflect pool cash, outstanding deployed principal, accrued income, realized collections, accrued management fee, and realized carry.',
    ]);
    addSection('7. Distribution Waterfall', [
      'First, the Lender is entitled to the 12% preferred return accrued on deployed capital for the relevant deployment period.',
      'Second, the 2% annual management fee accrues only on deployed capital and may be reflected as an accrued deduction in net NAV.',
      'Third, only realized profits above the hurdle are eligible for the 80/20 split, with 80% to Lenders and 20% to Finverno as carry.',
      'Indicative expected net annualized return to lenders is approximately 14% to 18%, but this is illustrative and not guaranteed.',
    ]);
    addSection('8. Examples for Transparency', [
      'Later entry at higher NAV: a later lender may receive fewer notional units if the pool NAV has increased before entry.',
      'Preferred return and carry: realized profit up to the hurdle is allocated to lenders; only realized profit above the hurdle becomes subject to the 80/20 split.',
      '2% management fee: the fee applies only to capital actively deployed in live transactions, not to cash temporarily awaiting deployment.',
    ]);
    addSection('9. Reporting and Separate Finverno Revenues', [
      'Finverno will provide periodic reporting including NAV, notional unit allocation, deployed capital, pool cash, collections, fee accruals, and return calculations.',
      'Contractor-side platform, enablement, and service revenues belong to Finverno unless expressly included in the lender waterfall.',
    ]);
    addSection('10. Repayment and Liquidity', 'Repayment of principal and applicable distributions remains subject to pool liquidity, realization of collections, and the waterfall mechanics set out in this Agreement. Immediate liquidity on demand is not guaranteed.');
    addSection('11. Lender Acknowledgements', [
      'The Lender is participating using lawful funds beneficially owned or controlled by the Lender.',
      'The Lender understands the 2% management fee, 12% preferred return, and 20% carry framework.',
      'The Lender understands that look-through exposure reporting does not create direct rights against any underlying contractor, supplier, or project.',
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
    addSection('15. Electronic Execution', 'This Agreement is executed electronically through the Finverno lending portal. Electronic signatures shall have the same legal validity as physical signatures under the Information Technology Act, 2000.');
    addSection('16. Acceptance', [
      'By electronically signing, the Lender confirms that they have read and understood the Agreement in full, accept the pooled capital model and fee mechanics, and consent to electronic records and execution.',
      'Pre-signing confirmations: lending from own funds, understands this is a private and illiquid lending opportunity, and has reviewed the risk disclosure.',
    ]);
  }

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

  addTextBlock('Lender', { bold: true, spacing: 2 });
  addTextBlock(
    `${payload.investorName}\nEmail: ${payload.investorEmail}\nType: ${payload.investorType}${payload.investorPhone ? `\nPhone: ${payload.investorPhone}` : ''}\nPAN: ${payload.investorPan || '__________________________'}\nAddress: ${payload.investorAddress || '__________________________'}`,
    { size: 10, spacing: 4 }
  );
  addTextBlock(
    payload.investorSignedName
      ? `Electronically signed by ${payload.investorSignedName}${payload.investorSignedAtLabel ? ` on ${payload.investorSignedAtLabel}` : ''}.`
      : 'Electronic Signature via Finverno Lending Portal',
    { size: 10, spacing: 4 }
  );

  return Buffer.from(doc.output('arraybuffer'));
}

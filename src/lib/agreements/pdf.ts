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

  const addTextBlock = (
    text: string,
    options?: { bold?: boolean; size?: number; spacing?: number }
  ) => {
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(options?.size ?? 11);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    doc.text(lines, margin, y);
    y += lines.length * ((options?.size ?? 11) * 0.42) + (options?.spacing ?? 3);
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Investor Participation Agreement', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Template Version: ${meta.templateVersion}`, margin, y);
  y += 8;

  addTextBlock(`This Agreement is made on ${payload.agreementDateLabel}.`, { size: 11, spacing: 5 });

  addTextBlock('Between', { bold: true, spacing: 2 });
  addTextBlock(
    `${payload.companyName}\n${payload.companyAddress}\n${payload.companyCIN ? `CIN: ${payload.companyCIN}` : ''}${payload.companyPAN ? `${payload.companyCIN ? '\n' : ''}PAN: ${payload.companyPAN}` : ''}`,
    { size: 10, spacing: 5 }
  );

  addTextBlock('And', { bold: true, spacing: 2 });
  addTextBlock(
    `${payload.investorName}\nEmail: ${payload.investorEmail}\nType: ${payload.investorType}${payload.investorPhone ? `\nPhone: ${payload.investorPhone}` : ''}`,
    { size: 10, spacing: 5 }
  );

  addTextBlock('1. Contribution', { bold: true, spacing: 2 });
  addTextBlock(
    `The Investor agrees to contribute ${payload.commitmentAmountLabel} to ${payload.companyName} as part of its private proof-of-concept capital pool.`,
    { size: 10, spacing: 4 }
  );

  addTextBlock('2. Use of Funds', { bold: true, spacing: 2 });
  addTextBlock(
    `Finverno will deploy the contributed capital into short-duration working capital and material financing cycles for SME contractors in accordance with internal underwriting and deployment policies.`,
    { size: 10, spacing: 4 }
  );

  addTextBlock('3. Nature of Participation', { bold: true, spacing: 2 });
  addTextBlock(
    'This is a private participation arrangement and does not constitute a public offering, solicitation, or invitation to the public. The Investor acknowledges participation in Finverno’s private pool on a confidential basis.',
    { size: 10, spacing: 4 }
  );

  addTextBlock('4. Returns and Risk', { bold: true, spacing: 2 });
  addTextBlock(
    'Returns, if any, will depend on realized collections and deployment performance. Capital deployment involves risk, including delays, counterparty default, and partial or total loss of expected returns.',
    { size: 10, spacing: 4 }
  );

  addTextBlock('5. Governance', { bold: true, spacing: 2 });
  addTextBlock(
    `The Investor acknowledges that investment selection, deployment, monitoring, and recovery decisions remain with ${payload.companyName}.`,
    { size: 10, spacing: 4 }
  );

  addTextBlock('6. Governing Law', { bold: true, spacing: 2 });
  addTextBlock(
    `This Agreement shall be governed by the laws of India and subject to the jurisdiction of ${payload.jurisdiction}.`,
    { size: 10, spacing: 4 }
  );

  if (payload.note) {
    addTextBlock('7. Notes', { bold: true, spacing: 2 });
    addTextBlock(payload.note, { size: 10, spacing: 4 });
  }

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`For ${payload.companyName}`, margin, y);
  doc.text('Investor', pageWidth / 2 + 10, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('__________________________', margin, y);
  doc.text('__________________________', pageWidth / 2 + 10, y);
  y += 6;
  doc.text(payload.companySignatoryName, margin, y);
  doc.text(payload.investorName, pageWidth / 2 + 10, y);
  y += 5;
  doc.text(payload.companySignatoryTitle, margin, y);
  doc.text(payload.investorEmail, pageWidth / 2 + 10, y);

  return Buffer.from(doc.output('arraybuffer'));
}

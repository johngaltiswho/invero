import { jsPDF } from 'jspdf';
import type { FuelProviderAgreementTemplatePayload } from '@/lib/fuel-provider-agreements/types';

export function generateFuelProviderAgreementPDF(
  payload: FuelProviderAgreementTemplatePayload,
  meta: { templateVersion: string }
): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const sanitize = (value: string) =>
    value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/–|—/g, '-').replace(/\u00a0/g, ' ');

  const addText = (text: string, options?: { bold?: boolean; size?: number; spacing?: number }) => {
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(options?.size ?? 11);
    const lines = doc.splitTextToSize(sanitize(text), contentWidth) as string[];
    doc.text(lines, margin, y);
    y += lines.length * ((options?.size ?? 11) * 0.42) + (options?.spacing ?? 3);
  };

  const addSection = (title: string, body: string | string[]) => {
    if (y > 265) {
      doc.addPage();
      y = 18;
    }
    addText(title, { bold: true, spacing: 2 });
    (Array.isArray(body) ? body : [body]).forEach((block) => addText(block, { size: 10, spacing: 4 }));
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FINVERNO PRIVATE LIMITED', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text('FUEL PROVIDER SERVICE AGREEMENT', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Template Version: ${meta.templateVersion}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  addText(`${payload.companyName} and ${payload.providerName} entered into this agreement on ${payload.agreementDateLabel}.`, {
    size: 10,
    spacing: 4,
  });

  addText(
    [
      `Fuel Provider: ${payload.providerName}`,
      payload.oemName ? `OEM / Network: ${payload.oemName}` : null,
      payload.providerAddress || null,
      payload.providerCityState || null,
      payload.providerContactPerson ? `Contact person: ${payload.providerContactPerson}` : null,
      payload.providerContactPhone ? `Phone: ${payload.providerContactPhone}` : null,
      payload.providerContactEmail ? `Email: ${payload.providerContactEmail}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    { size: 10, spacing: 5 }
  );

  addSection('1. Scope', 'The Fuel Provider will honour Finverno-issued fuel approvals for approved SME vehicles and record actual dispensed quantity and value through the Finverno workflow.');
  addSection('2. Fulfilment and Validation', 'The Fuel Provider shall only fulfil requests routed to its approved pump location, verify the vehicle and approval reference, and record actual litres and amount dispensed accurately.');
  addSection('3. Settlement', 'Finverno will track provider-side payables based on fulfilled transactions recorded in the platform. Settlement timing, batch reconciliation, and exceptions will be handled as per Finverno operational process and any written commercial understanding between the parties.');
  addSection('4. Compliance and Conduct', 'The Fuel Provider shall not misuse approvals, duplicate fills, inflate quantities, or process non-approved transactions through the Finverno channel. Finverno may suspend the provider from the network if misuse, fraud, or disputes arise.');
  addSection('5. Records and Audit', 'Platform logs, approval records, fill confirmations, and settlement records will be treated as operative business records for reconciliation and audit.');
  addSection('6. General Terms', `This agreement is governed by Indian law and subject to the courts at ${payload.jurisdiction}.`);

  if (payload.note) {
    addSection('Schedule / Notes', payload.note);
  }

  if (y > 245) {
    doc.addPage();
    y = 18;
  }
  y += 6;
  addText(`For ${payload.companyName}`, { bold: true, spacing: 2 });
  addText(
    `${payload.companySignatoryName}\n${payload.companySignatoryTitle}${
      payload.companyCountersignedAtLabel ? `\nCountersigned on ${payload.companyCountersignedAtLabel}` : ''
    }`,
    { size: 10, spacing: 6 }
  );
  addText(`For ${payload.providerName}`, { bold: true, spacing: 2 });
  addText(
    `${payload.providerSignedName || payload.providerContactPerson || payload.providerName}${
      payload.providerContactEmail ? `\nEmail: ${payload.providerContactEmail}` : ''
    }${payload.providerSignedAtLabel ? `\nSigned on ${payload.providerSignedAtLabel}` : ''}`,
    { size: 10, spacing: 4 }
  );

  return Buffer.from(doc.output('arraybuffer'));
}

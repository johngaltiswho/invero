/**
 * Server-side invoice PDF generator using jsPDF.
 * Runs in Node.js context (API routes / cron).
 * Generates a tax invoice from Finverno to the contractor based on a purchase request.
 */

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

export interface InvoiceLineItem {
  material_name: string;
  item_description?: string | null;
  hsn_code?: string | null;
  unit: string;
  quantity: number;
  unit_rate: number;
  tax_percent: number;
  amount: number;
  tax_amount: number;
  total: number;
}

export interface InvoiceGenerationParams {
  invoiceNumber: string;
  invoiceDate: Date;
  purchaseRequestId: string;
  contractorId: string;
  projectId: string;
  projectName: string;
  contractorName: string;
  contractorGSTIN?: string;
  contractorAddress?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
}

/**
 * Generate invoice PDF and return as Buffer.
 * Compatible with Node.js (no browser DOM needed).
 */
export function generateInvoicePDF(params: InvoiceGenerationParams): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const CURRENCY = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatMoney = (value: number) => `Rs ${CURRENCY.format(Number(value) || 0)}`;
  const formatMoneyCompact = (value: number) => CURRENCY.format(Number(value) || 0);
  const formatQty = (value: number) => {
    const num = Number(value) || 0;
    return Number.isInteger(num) ? String(num) : num.toFixed(3).replace(/\.?0+$/, '');
  };

  // Header
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, MARGIN, CONTENT_W, 22, 'F');
  doc.setDrawColor(190, 190, 190);
  doc.rect(MARGIN, MARGIN, CONTENT_W, 22);

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FINVERNO PRIVATE LIMITED', MARGIN + 3, MARGIN + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Project Supply Enablement Platform', MARGIN + 3, MARGIN + 14);
  doc.text('www.finverno.com', MARGIN + 3, MARGIN + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('TAX INVOICE', PAGE_W - MARGIN - 2, MARGIN + 10, { align: 'right' });

  // Invoice meta
  doc.setTextColor(40, 40, 40);
  doc.setCharSpace(0);
  let y = MARGIN + 29;

  const dateStr = params.invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const metaRows = [
    ['Invoice No:', params.invoiceNumber],
    ['Invoice Date:', dateStr],
    ['Purchase Request:', `PR-${params.purchaseRequestId.slice(0, 8).toUpperCase()}`],
    ['Project:', params.projectName],
  ];

  doc.setDrawColor(200, 200, 200);
  doc.rect(MARGIN, y, CONTENT_W, 24);
  y += 5;

  metaRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, MARGIN + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN + 42, y);
    y += 5;
  });

  // From / To
  y += 3;
  const partyBoxHeight = 30;
  doc.rect(MARGIN, y, CONTENT_W, partyBoxHeight);
  doc.line(MARGIN + CONTENT_W / 2, y, MARGIN + CONTENT_W / 2, y + partyBoxHeight);

  // FROM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('From:', MARGIN + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Finverno Private Limited', MARGIN + 3, y + 10);
  doc.text('403, 3rd Floor, 22nd Cross, 2nd Sector,', MARGIN + 3, y + 14);
  doc.text('HSR Layout, Bengaluru - 560102, Karnataka', MARGIN + 3, y + 18);
  doc.text('GSTIN: 29AAGCF7643D1ZI | PAN: AAGCF7643D', MARGIN + 3, y + 22);
  doc.text('Place of Supply: Karnataka (29)', MARGIN + 3, y + 26);

  // TO
  const toX = MARGIN + CONTENT_W / 2 + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Bill To:', toX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(params.contractorName, toX, y + 10);
  if (params.contractorAddress) {
    const wrappedAddress = doc.splitTextToSize(params.contractorAddress, CONTENT_W / 2 - 8) as string[];
    wrappedAddress.slice(0, 2).forEach((line, idx) => {
      doc.text(line, toX, y + 14 + idx * 4);
    });
  }
  if (params.contractorGSTIN) {
    doc.text(`GSTIN: ${params.contractorGSTIN}`, toX, y + 24);
  }

  y += partyBoxHeight + 5;

  // Line items table
  doc.rect(MARGIN, y, CONTENT_W, 8);
  const cols = {
    no: MARGIN + 1,
    item: MARGIN + 8,
    hsn: MARGIN + 92,
    unit: MARGIN + 116,
    qty: MARGIN + 133,
    rate: MARGIN + 154,
    amount: MARGIN + 178,
  };

  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('#', cols.no + 1, y + 5);
  doc.text('Item', cols.item, y + 5);
  doc.text('HSN/SAC', cols.hsn, y + 5);
  doc.text('Unit', cols.unit, y + 5, { align: 'center' });
  doc.text('Qty', cols.qty, y + 5, { align: 'center' });
  doc.text('Rate', cols.rate, y + 5, { align: 'right' });
  doc.text('Amount', cols.amount, y + 5, { align: 'right' });

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);

  params.lineItems.forEach((item, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
      doc.setFillColor(240, 240, 240);
      doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
      doc.rect(MARGIN, y, CONTENT_W, 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('#', cols.no + 1, y + 5);
      doc.text('Item', cols.item, y + 5);
      doc.text('HSN/SAC', cols.hsn, y + 5);
      doc.text('Unit', cols.unit, y + 5, { align: 'center' });
      doc.text('Qty', cols.qty, y + 5, { align: 'center' });
      doc.text('Rate', cols.rate, y + 5, { align: 'right' });
      doc.text('Amount', cols.amount, y + 5, { align: 'right' });
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    const itemMaxWidth = cols.hsn - cols.item - 3;
    const itemNameLines = doc.splitTextToSize(item.material_name || '-', itemMaxWidth) as string[];
    const itemDescriptionLines = item.item_description
      ? (doc.splitTextToSize(`Specs: ${item.item_description}`, itemMaxWidth) as string[])
      : [];
    const itemLines = [...itemNameLines, ...itemDescriptionLines];
    const rowHeight = Math.max(8, itemLines.length * 3.8 + 3);
    doc.rect(MARGIN, y, CONTENT_W, rowHeight);
    const rowTextY = y + 5;
    doc.text(String(idx + 1), cols.no + 1, rowTextY);
    doc.text(itemLines, cols.item, rowTextY);
    doc.text(item.hsn_code?.trim() || '-', cols.hsn, rowTextY);
    doc.text(item.unit, cols.unit, rowTextY, { align: 'center' });
    doc.text(formatQty(item.quantity), cols.qty, rowTextY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(formatMoneyCompact(item.unit_rate), cols.rate, rowTextY, { align: 'right' });
    doc.text(formatMoneyCompact(item.total), cols.amount, rowTextY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    y += rowHeight;
  });

  // Totals
  y += 2;
  const totalBoxW = 70;
  const totalBoxX = PAGE_W - MARGIN - totalBoxW;
  doc.rect(totalBoxX, y, totalBoxW, 23);

  const effectiveTaxPercent = params.subtotal > 0 ? (params.totalTax / params.subtotal) * 100 : 0;
  const totals = [
    ['Subtotal', formatMoney(params.subtotal)],
    [`GST @ ${effectiveTaxPercent.toFixed(2)}%`, formatMoney(params.totalTax)],
    ['GRAND TOTAL', formatMoney(params.grandTotal)],
  ];

  totals.forEach(([label, value], i) => {
    const isBold = i === totals.length - 1;
    const rowY = y + 6 + i * 6.5;
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 10 : 8.5);
    doc.text(`${label}:`, totalBoxX + 3, rowY);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(value, PAGE_W - MARGIN - 2, rowY, { align: 'right' });
  });

  y += 30;

  // Deemed delivery note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    'This invoice was auto-generated under the Deemed Delivery policy. Goods are considered delivered if no dispute',
    MARGIN,
    y
  );
  y += 4;
  doc.text(
    'was raised within the dispute window. For queries, contact support@finverno.com.',
    MARGIN,
    y
  );

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Finverno Pvt. Ltd. | This is a computer-generated invoice and does not require a signature.', PAGE_W / 2, PAGE_H - 10, { align: 'center' });

  // Return as Buffer (Node.js compatible)
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

/**
 * Upload generated invoice PDF to Supabase storage and return the public URL.
 */
export async function uploadInvoicePDF(
  pdfBuffer: Buffer,
  contractorId: string,
  invoiceId: string
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const storagePath = `${contractorId}/invoices/${invoiceId}.pdf`;

  const { error } = await supabase.storage
    .from('contractor-documents')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload invoice PDF: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('contractor-documents')
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

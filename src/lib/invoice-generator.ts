/**
 * Server-side invoice PDF generator using jsPDF.
 * Runs in Node.js context (API routes / cron).
 * Generates a tax invoice from Finverno to the contractor based on a purchase request.
 */

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

export interface InvoiceLineItem {
  material_name: string;
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
  const MARGIN = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ─── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 30, 35);
  doc.rect(0, 0, PAGE_W, 35, 'F');

  doc.setTextColor(255, 190, 50);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', PAGE_W / 2, 15, { align: 'center' });

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Finverno Supply Enablement Platform', PAGE_W / 2, 22, { align: 'center' });
  doc.text('www.finverno.com', PAGE_W / 2, 28, { align: 'center' });

  // ─── Invoice Meta ────────────────────────────────────────────────────────────
  doc.setTextColor(40, 40, 40);
  let y = 45;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS', MARGIN, y);
  doc.setFont('helvetica', 'normal');

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

  y += 5;
  metaRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN + 40, y);
    y += 5;
  });

  // ─── From / To ───────────────────────────────────────────────────────────────
  y += 5;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  const halfW = (CONTENT_W - 10) / 2;

  // FROM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FROM', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Finverno Pvt. Ltd.', MARGIN, y + 5);
  doc.text('Supply Enablement Platform', MARGIN, y + 10);
  doc.text('GSTIN: 27AABCF1234A1Z5', MARGIN, y + 15);

  // TO
  const toX = MARGIN + halfW + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('TO', toX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(params.contractorName, toX, y + 5);
  if (params.contractorAddress) {
    doc.text(params.contractorAddress.slice(0, 40), toX, y + 10);
  }
  if (params.contractorGSTIN) {
    doc.text(`GSTIN: ${params.contractorGSTIN}`, toX, y + 15);
  }

  y += 25;

  // ─── Line Items Table ─────────────────────────────────────────────────────────
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  const cols = {
    no: MARGIN,
    material: MARGIN + 8,
    unit: MARGIN + 75,
    qty: MARGIN + 90,
    rate: MARGIN + 105,
    tax: MARGIN + 125,
    amount: MARGIN + 138,
    total: MARGIN + 155,
  };

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
  doc.setTextColor(60, 60, 60);

  doc.text('#', cols.no + 1, y + 4.5);
  doc.text('Material', cols.material, y + 4.5);
  doc.text('Unit', cols.unit, y + 4.5);
  doc.text('Qty', cols.qty, y + 4.5);
  doc.text('Rate', cols.rate, y + 4.5);
  doc.text('Tax%', cols.tax, y + 4.5);
  doc.text('Amount', cols.amount, y + 4.5);
  doc.text('Total', cols.total, y + 4.5);

  y += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);

  params.lineItems.forEach((item, idx) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [250, 250, 250];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.rect(MARGIN, y - 1, CONTENT_W, 7, 'F');

    doc.text(String(idx + 1), cols.no + 1, y + 4);
    doc.text(item.material_name.slice(0, 30), cols.material, y + 4);
    doc.text(item.unit, cols.unit, y + 4);
    doc.text(item.quantity.toString(), cols.qty, y + 4);
    doc.text(`₹${item.unit_rate.toLocaleString('en-IN')}`, cols.rate, y + 4);
    doc.text(`${item.tax_percent}%`, cols.tax, y + 4);
    doc.text(`₹${item.amount.toLocaleString('en-IN')}`, cols.amount, y + 4);
    doc.text(`₹${item.total.toLocaleString('en-IN')}`, cols.total, y + 4);

    y += 7;
  });

  // ─── Totals ───────────────────────────────────────────────────────────────────
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  const totalX = MARGIN + 120;

  const totals = [
    ['Subtotal:', `₹${params.subtotal.toLocaleString('en-IN')}`],
    ['Total Tax:', `₹${params.totalTax.toLocaleString('en-IN')}`],
    ['GRAND TOTAL:', `₹${params.grandTotal.toLocaleString('en-IN')}`],
  ];

  totals.forEach(([label, value], i) => {
    const isBold = i === totals.length - 1;
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 9 : 8);
    doc.text(label, totalX, y);
    doc.text(value, PAGE_W - MARGIN, y, { align: 'right' });
    y += 6;
  });

  // ─── Deemed Delivery Notice ──────────────────────────────────────────────────
  y += 4;
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

  // ─── Footer ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Finverno Pvt. Ltd. | This is a computer-generated invoice and does not require a signature.', PAGE_W / 2, 285, { align: 'center' });

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

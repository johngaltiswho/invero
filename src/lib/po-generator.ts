/**
 * Server-side Purchase Order PDF generator using jsPDF.
 * Runs in Node.js context (API routes).
 * Generates a Purchase Order from Finverno to the assigned vendor.
 */

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

export interface POLineItem {
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

export interface POGenerationParams {
  poNumber: string;
  poDate: Date;
  purchaseRequestId: string;
  projectId: string;
  projectName: string;
  vendorName: string;
  vendorGSTIN?: string;
  vendorAddress?: string;
  vendorContact?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  contractorName: string;
  shippingAddress?: string;
  lineItems: POLineItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  remarks?: string;
}

/**
 * Generate Purchase Order PDF and return as Buffer.
 * Compatible with Node.js (no browser DOM needed).
 */
export function generatePOPDF(params: POGenerationParams): Buffer {
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
  doc.text('PURCHASE ORDER', PAGE_W - MARGIN - 2, MARGIN + 10, { align: 'right' });

  // PO meta
  doc.setTextColor(40, 40, 40);
  doc.setCharSpace(0);
  let y = MARGIN + 29;

  const dateStr = params.poDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const metaRows = [
    ['PO Number:', params.poNumber],
    ['PO Date:', dateStr],
    ['Purchase Request:', `PR-${params.purchaseRequestId.slice(0, 8).toUpperCase()}`],
    ['Project:', params.projectName],
    ['Contractor:', params.contractorName],
  ];

  doc.setDrawColor(200, 200, 200);
  doc.rect(MARGIN, y, CONTENT_W, 29);
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
  const shipToLines = params.shippingAddress
    ? (doc.splitTextToSize(params.shippingAddress, CONTENT_W - 22) as string[])
    : [];
  const shipToLineHeight = 4;
  const shipToContentHeight = shipToLines.length > 0
    ? Math.max(16, shipToLines.length * shipToLineHeight + 4)
    : 0;
  const partyBoxHeight = 32;
  doc.rect(MARGIN, y, CONTENT_W, partyBoxHeight);
  doc.line(MARGIN + CONTENT_W / 2, y, MARGIN + CONTENT_W / 2, y + partyBoxHeight);

  // FROM (Buyer - Finverno)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Buyer:', MARGIN + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Finverno Private Limited', MARGIN + 3, y + 10);
  doc.text('403, 3rd Floor, 22nd Cross, 2nd Sector,', MARGIN + 3, y + 14);
  doc.text('HSR Layout, Bengaluru - 560102, Karnataka', MARGIN + 3, y + 18);
  doc.text('GSTIN: 29AAGCF7643D1ZI | PAN: AAGCF7643D', MARGIN + 3, y + 22);
  doc.text('Place of Supply: Karnataka (29)', MARGIN + 3, y + 26);

  // TO (Vendor - Supplier)
  const toX = MARGIN + CONTENT_W / 2 + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Vendor (Supplier):', toX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(params.vendorName, toX, y + 10);

  let vendorY = y + 14;
  if (params.vendorAddress) {
    const wrappedAddress = doc.splitTextToSize(params.vendorAddress, CONTENT_W / 2 - 8) as string[];
    wrappedAddress.slice(0, 2).forEach((line, idx) => {
      doc.text(line, toX, vendorY + idx * 4);
    });
    vendorY += wrappedAddress.slice(0, 2).length * 4;
  }
  if (params.vendorGSTIN) {
    doc.text(`GSTIN: ${params.vendorGSTIN}`, toX, vendorY);
    vendorY += 4;
  }
  if (params.vendorContact && params.vendorPhone) {
    doc.text(`Contact: ${params.vendorContact} (${params.vendorPhone})`, toX, vendorY);
  }

  if (shipToLines.length > 0) {
    const shipToY = y + partyBoxHeight + 4;
    doc.rect(MARGIN, shipToY, CONTENT_W, shipToContentHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Ship To:', MARGIN + 3, shipToY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(shipToLines, MARGIN + 20, shipToY + 5);
    y = shipToY + shipToContentHeight + 5;
  } else {
    y += partyBoxHeight + 5;
  }

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
    if (y > 240) {
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

  // Calculate effective tax rate
  const taxableBase = params.lineItems.reduce((sum, item) => {
    const taxPct = Number(item.tax_percent) || 0;
    return taxPct > 0 ? sum + (Number(item.amount) || 0) : sum;
  }, 0);
  const effectiveTaxPercent = taxableBase > 0 ? (params.totalTax / taxableBase) * 100 : 0;
  const totals = [
    ['Subtotal', formatMoney(params.subtotal)],
    [`GST @ ${effectiveTaxPercent.toFixed(2)}%`, formatMoney(params.totalTax)],
    ['GRAND TOTAL', formatMoney(params.grandTotal)],
  ];

  totals.forEach(([label, value], i) => {
    const isBold = i === totals.length - 1;
    const rowY = y + 6 + i * 6.5;
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 9 : 8);
    doc.text(label, totalBoxX + 3, rowY);
    doc.text(value, totalBoxX + totalBoxW - 3, rowY, { align: 'right' });
  });

  y += 28;

  // Remarks
  if (params.remarks && params.remarks.trim()) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Remarks:', MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const remarksLines = doc.splitTextToSize(params.remarks, CONTENT_W - 6) as string[];
    doc.text(remarksLines, MARGIN, y);
    y += remarksLines.length * 4 + 5;
  }

  // Terms & Conditions
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Terms & Conditions:', MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const terms = [
    '1. Please supply materials as per specifications mentioned above.',
    '2. Payment terms: As per agreed payment schedule.',
    '3. Delivery timeline: As per project requirements.',
    '4. Quality standards must be maintained for all supplied materials.',
    '5. This PO is valid for 30 days from the date of issue.',
  ];
  terms.forEach((term) => {
    doc.text(term, MARGIN, y);
    y += 4.5;
  });

  // Footer
  y += 8;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('For Finverno Private Limited', MARGIN, y);
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('________________________________', MARGIN, y);
  y += 4;
  doc.text('Authorized Signatory', MARGIN, y);

  // Return as Buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Upload PO PDF to Supabase storage
 * @param pdfBuffer - The generated PDF buffer
 * @param purchaseRequestId - ID of the purchase request
 * @param poId - Unique ID for the PO
 * @returns Public URL of the uploaded PDF
 */
export async function uploadPOPDF(
  pdfBuffer: Buffer,
  purchaseRequestId: string,
  poId: string
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const storagePath = `purchase-orders/${purchaseRequestId}/${poId}.pdf`;

  const { error } = await supabase.storage
    .from('contractor-documents')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload PO PDF: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('contractor-documents')
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import {
  generateInvoicePDF,
  uploadInvoicePDF,
  type InvoiceLineItem,
} from '@/lib/invoice-generator';
import { auditInvoice } from '@/lib/audit';

const PLATFORM_FEE_GST_PERCENT = 18;

type PurchaseRequestMaterial = {
  name?: string | null;
  unit?: string | null;
  hsn_code?: string | null;
};

type PurchaseRequestItem = {
  hsn_code?: string | null;
  item_description?: string | null;
  requested_qty?: number | string | null;
  purchase_qty?: number | string | null;
  purchase_unit?: string | null;
  unit_rate?: number | string | null;
  tax_percent?: number | string | null;
  project_materials?: {
    materials?: PurchaseRequestMaterial | null;
  } | null;
};

type PurchaseRequestRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  dispatched_at?: string | null;
  purchase_request_items?: PurchaseRequestItem[] | null;
};

type ExistingInvoiceRow = {
  id: string;
  invoice_number?: string | null;
};

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getFinancialYearLabel(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const fyStartYear = month >= 4 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;
  return `${String(fyStartYear % 100).padStart(2, '0')}${String(fyEndYear % 100).padStart(2, '0')}`;
}

async function generateInvoiceNumberFallback(
  supabase: ReturnType<typeof supabaseAdmin>,
  invoiceDate: Date
): Promise<string> {
  const fyLabel = getFinancialYearLabel(invoiceDate);
  const prefix = `INV-FY${fyLabel}-`;

  const { data: rows, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`);

  if (error) {
    throw new Error(error.message || 'Failed to determine invoice number sequence');
  }

  const nextSequence =
    (rows || []).reduce((max, row) => {
      const invoiceNumber = String((row as { invoice_number?: string | null }).invoice_number || '');
      const suffix = Number(invoiceNumber.slice(-4));
      return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
    }, 0) + 1;

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

export async function generateInvoiceForPurchaseRequest(input: {
  purchaseRequestId: string;
  forceRegenerate?: boolean;
  renumberExisting?: boolean;
  request?: NextRequest;
}) {
  const supabase = supabaseAdmin();
  const shouldForceRegenerate = input.forceRegenerate === true;
  const shouldRenumberExisting = shouldForceRegenerate && input.renumberExisting === true;

  const { data: existing } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('purchase_request_id', input.purchaseRequestId)
    .single();

  if (existing && !shouldForceRegenerate) {
    return {
      success: true as const,
      invoiceId: existing.id,
      invoiceNumber: existing.invoice_number || null,
      regenerated: false,
      alreadyExisted: true,
    };
  }

  let pr: PurchaseRequestRow | null = null;
  let prError: { message?: string } | null = null;

  const withHsnQuery = await supabase
    .from('purchase_requests')
    .select(`
      id,
      project_id,
      contractor_id,
      dispatched_at,
      remarks,
      purchase_request_items (
        id,
        hsn_code,
        item_description,
        requested_qty,
        purchase_qty,
        purchase_unit,
        unit_rate,
        tax_percent,
        project_materials (
          id,
          materials ( name, unit, hsn_code )
        )
      )
    `)
    .eq('id', input.purchaseRequestId)
    .single();

  pr = withHsnQuery.data as PurchaseRequestRow | null;
  prError = withHsnQuery.error;

  if (
    prError &&
    (
      String(prError.message || '').includes('hsn_code') ||
      String(prError.message || '').includes('item_description') ||
      String(prError.message || '').includes('purchase_qty') ||
      String(prError.message || '').includes('purchase_unit')
    )
  ) {
    const fallbackQuery = await supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        contractor_id,
        dispatched_at,
        remarks,
        purchase_request_items (
          id,
          hsn_code,
          requested_qty,
          purchase_qty,
          purchase_unit,
          unit_rate,
          tax_percent,
          project_materials (
            id,
            materials ( name, unit )
          )
        )
      `)
      .eq('id', input.purchaseRequestId)
      .single();
    pr = fallbackQuery.data as PurchaseRequestRow | null;
    prError = fallbackQuery.error;
  }

  if (prError || !pr) {
    throw new Error('Purchase request not found');
  }

  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, company_name, gstin, email, platform_fee_rate, platform_fee_cap, business_address, city, state, pincode')
    .eq('id', pr.contractor_id)
    .single();

  if (!contractor) {
    throw new Error('Contractor not found');
  }

  const contractorAddress = [
    contractor.business_address,
    contractor.city,
    contractor.state,
    contractor.pincode
  ]
    .filter((part) => part && String(part).trim().length > 0)
    .map((part) => String(part).trim())
    .join(', ');

  const { data: project } = await supabase
    .from('projects')
    .select('id, project_name, client_name, project_address')
    .eq('id', pr.project_id)
    .single();

  const shipToAddress = project?.project_address?.trim() || undefined;

  const lineItems: InvoiceLineItem[] = (pr.purchase_request_items || []).map((item: PurchaseRequestItem) => {
    const material = item.project_materials?.materials;
    const qty = Number(item.purchase_qty ?? item.requested_qty) || 0;
    const rate = Number(item.unit_rate) || 0;
    const taxPct = Number(item.tax_percent) || 0;
    const amount = qty * rate;
    const taxAmount = amount * (taxPct / 100);
    return {
      material_name: material?.name || 'Unknown Material',
      hsn_code: item.hsn_code || material?.hsn_code || null,
      item_description: item.item_description || null,
      unit: item.purchase_unit || material?.unit || 'nos',
      quantity: qty,
      unit_rate: rate,
      tax_percent: taxPct,
      amount,
      tax_amount: taxAmount,
      total: amount + taxAmount,
    };
  });

  const platformFeeRate = Number(contractor.platform_fee_rate ?? 0.0025);
  const platformFeeCap = Number(contractor.platform_fee_cap ?? 25000);
  const materialSubtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const platformFeeAmount = Math.min(materialSubtotal * platformFeeRate, platformFeeCap);

  if (platformFeeAmount > 0) {
    const platformFeeTaxAmount = platformFeeAmount * (PLATFORM_FEE_GST_PERCENT / 100);
    lineItems.push({
      material_name: 'Platform Fee',
      hsn_code: '996111',
      item_description: `As per contractor terms (${(platformFeeRate * 100).toFixed(2)}%, cap Rs ${platformFeeCap.toFixed(2)})`,
      unit: 'service',
      quantity: 1,
      unit_rate: platformFeeAmount,
      tax_percent: PLATFORM_FEE_GST_PERCENT,
      amount: platformFeeAmount,
      tax_amount: platformFeeTaxAmount,
      total: platformFeeAmount + platformFeeTaxAmount,
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const totalTax = lineItems.reduce((s, i) => s + i.tax_amount, 0);
  const grandTotal = subtotal + totalTax;

  const invoiceDate = pr.dispatched_at ? new Date(pr.dispatched_at) : new Date();
  const { data: invNumData, error: invNumError } = await supabase.rpc('next_invoice_number', {
    p_invoice_date: invoiceDate.toISOString()
  });
  if (invNumError) {
    console.warn('next_invoice_number RPC failed, using application fallback:', invNumError);
  }

  const invoiceNumber =
    existing && !shouldRenumberExisting
      ? existing.invoice_number
      : invNumData || await generateInvoiceNumberFallback(supabase, invoiceDate);
  const invoiceId = existing?.id || crypto.randomUUID();

  const pdfBuffer = generateInvoicePDF({
    invoiceNumber,
    invoiceDate,
    purchaseRequestId: pr.id,
    contractorId: contractor.id,
    projectId: pr.project_id,
    projectName: project?.project_name || pr.project_id,
    clientName: project?.client_name || undefined,
    contractorName: contractor.company_name,
    contractorGSTIN: contractor.gstin,
    contractorAddress: contractorAddress || undefined,
    shipToAddress,
    lineItems,
    subtotal,
    totalTax,
    grandTotal,
  });

  const invoiceUrl = await uploadInvoicePDF(pdfBuffer, contractor.id, invoiceId);

  let invoiceRecord: { id: string } | null = null;
  if (existing) {
    const { data: updatedRecord, error: updateError } = await supabase
      .from('invoices')
      .update({
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate.toISOString(),
        total_amount: grandTotal,
        line_items: lineItems,
        invoice_url: invoiceUrl,
        status: 'generated',
        generated_by: 'system',
        updated_at: invoiceDate.toISOString(),
      })
      .eq('id', invoiceId)
      .select('id')
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update invoice record');
    }
    invoiceRecord = updatedRecord;
  } else {
    const { data: insertedRecord, error: insertError } = await supabase
      .from('invoices')
      .insert({
        id: invoiceId,
        purchase_request_id: pr.id,
        contractor_id: contractor.id,
        project_id: pr.project_id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate.toISOString(),
        total_amount: grandTotal,
        line_items: lineItems,
        invoice_url: invoiceUrl,
        status: 'generated',
        generated_by: 'system',
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'Failed to create invoice record');
    }
    invoiceRecord = insertedRecord;
  }

  await supabase
    .from('purchase_requests')
    .update({
      invoice_generated_at: invoiceDate.toISOString(),
      invoice_url: invoiceUrl,
      delivery_status: 'delivered',
      delivered_at: invoiceDate.toISOString(),
    })
    .eq('id', input.purchaseRequestId);

  await auditInvoice({
    action: existing ? 'update' : 'generate',
    invoiceId: invoiceRecord?.id || invoiceId,
    invoiceNumber: invoiceNumber || undefined,
    userId: 'system',
    userEmail: 'system@invero.app',
    userName: 'System',
    userRole: 'system',
    description: existing ? `Regenerated invoice ${invoiceNumber}` : `Generated invoice ${invoiceNumber}`,
    metadata: {
      purchase_request_id: pr.id,
      contractor_id: contractor.id,
      project_id: pr.project_id,
      project_name: project?.project_name,
      total_amount: grandTotal,
      force_regenerate: !!existing
    },
    request: input.request,
  });

  return {
    success: true as const,
    invoiceId: invoiceRecord?.id || invoiceId,
    invoiceNumber,
    invoiceUrl,
    regenerated: !!existing,
    alreadyExisted: false,
  };
}

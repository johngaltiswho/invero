import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateInvoicePDF,
  uploadInvoicePDF,
  type InvoiceLineItem,
} from '@/lib/invoice-generator';
import { createSignedUrlWithFallback } from '@/lib/storage-url';

type InvoiceRow = {
  id: string;
  invoice_url?: string | null;
  [key: string]: unknown;
};

type PurchaseRequestMaterial = {
  name?: string | null;
  unit?: string | null;
  hsn_code?: string | null;
};

type PurchaseRequestItem = {
  hsn_code?: string | null;
  item_description?: string | null;
  requested_qty?: number | string | null;
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
  purchase_request_items?: PurchaseRequestItem[] | null;
};

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/invoices
 * Returns all invoices for the authenticated contractor.
 * Query params: status, project_id
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabase = supabaseAdmin();

    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('project_id');

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    const invoiceBucket = process.env.INVOICE_STORAGE_BUCKET || 'contractor-documents';
    const enrichedInvoices = await Promise.all(
      ((data || []) as InvoiceRow[]).map(async (invoice) => {
        const fallbackPath = `${contractor.id}/invoices/${invoice.id}.pdf`;
        const signedUrl = await createSignedUrlWithFallback(supabase, {
          sourceUrl: invoice.invoice_url,
          defaultBucket: invoiceBucket,
          fallbackPath
        });

        return {
          ...invoice,
          invoice_download_url: signedUrl || invoice.invoice_url || null
        };
      })
    );

    return NextResponse.json({ success: true, data: enrichedInvoices });
  } catch (err) {
    console.error('Invoices GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/invoices
 * Generate an invoice for a delivered purchase request.
 * Protected by x-internal-secret header (called by cron or delivery confirmation).
 * Body: { purchase_request_id: string }
 */
export async function POST(request: NextRequest) {
  // Verify this is an internal call.
  // In development, allow missing secret to keep local flows working.
  const secret = request.headers.get('x-internal-secret');
  const expectedSecret = process.env.CRON_SECRET;
  const isInternal = !!expectedSecret && secret === expectedSecret;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (!isInternal && !isDevelopment) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { purchase_request_id, force_regenerate } = await request.json();

    if (!purchase_request_id) {
      return NextResponse.json({ error: 'purchase_request_id is required' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Check if invoice already exists for this PR
    const { data: existing } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('purchase_request_id', purchase_request_id)
      .single();

    const shouldForceRegenerate = force_regenerate === true;

    if (existing && !shouldForceRegenerate) {
      return NextResponse.json({ success: true, message: 'Invoice already exists', invoiceId: existing.id });
    }

    // Fetch purchase request with items and contractor
    let pr: PurchaseRequestRow | null = null;
    let prError: { message?: string } | null = null;

    const withHsnQuery = await supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        contractor_id,
        remarks,
        purchase_request_items (
          id,
          hsn_code,
          item_description,
          requested_qty,
          unit_rate,
          tax_percent,
          project_materials (
            id,
            materials ( name, unit, hsn_code )
          )
        )
      `)
      .eq('id', purchase_request_id)
      .single();

    pr = withHsnQuery.data as PurchaseRequestRow | null;
    prError = withHsnQuery.error;

    // Backward compatibility if newer columns are not yet applied.
    if (
      prError &&
      (
        String(prError.message || '').includes('hsn_code') ||
        String(prError.message || '').includes('item_description')
      )
    ) {
      const fallbackQuery = await supabase
        .from('purchase_requests')
        .select(`
          id,
          project_id,
          contractor_id,
          remarks,
          purchase_request_items (
            id,
            hsn_code,
            requested_qty,
            unit_rate,
            tax_percent,
            project_materials (
              id,
              materials ( name, unit )
            )
          )
        `)
        .eq('id', purchase_request_id)
        .single();
      pr = fallbackQuery.data as PurchaseRequestRow | null;
      prError = fallbackQuery.error;
    }

    if (prError || !pr) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Fetch contractor details
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, company_name, gstin, email, platform_fee_rate, platform_fee_cap')
      .eq('id', pr.contractor_id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Fetch project name
    const { data: project } = await supabase
      .from('projects')
      .select('id, project_name, client_name')
      .eq('id', pr.project_id)
      .single();

    // Build line items
    const lineItems: InvoiceLineItem[] = (pr.purchase_request_items || []).map((item: PurchaseRequestItem) => {
      const material = item.project_materials?.materials;
      const qty = Number(item.requested_qty) || 0;
      const rate = Number(item.unit_rate) || 0;
      const taxPct = Number(item.tax_percent) || 0;
      const amount = qty * rate;
      const taxAmount = amount * (taxPct / 100);
      return {
        material_name: material?.name || 'Unknown Material',
        hsn_code: item.hsn_code || material?.hsn_code || null,
        item_description: item.item_description || null,
        unit: material?.unit || 'nos',
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
      lineItems.push({
        material_name: 'Platform Fee',
        hsn_code: '996111',
        item_description: `As per contractor terms (${(platformFeeRate * 100).toFixed(2)}%, cap Rs ${platformFeeCap.toFixed(2)})`,
        unit: 'service',
        quantity: 1,
        unit_rate: platformFeeAmount,
        tax_percent: 0,
        amount: platformFeeAmount,
        tax_amount: 0,
        total: platformFeeAmount,
      });
    }

    const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
    const totalTax = lineItems.reduce((s, i) => s + i.tax_amount, 0);
    const grandTotal = subtotal + totalTax;

    // Preserve invoice number/id when force-regenerating an existing invoice
    const { data: invNumData } = await supabase.rpc('next_invoice_number');
    const invoiceNumber = existing?.invoice_number || invNumData || `INV-${Date.now()}`;
    const invoiceDate = new Date();
    const invoiceId = existing?.id || crypto.randomUUID();

    // Generate PDF
    const pdfBuffer = generateInvoicePDF({
      invoiceNumber,
      invoiceDate,
      purchaseRequestId: pr.id,
      contractorId: contractor.id,
      projectId: pr.project_id,
      projectName: project?.project_name || pr.project_id,
      contractorName: contractor.company_name,
      contractorGSTIN: contractor.gstin,
      lineItems,
      subtotal,
      totalTax,
      grandTotal,
    });

    // Upload PDF to storage
    const invoiceUrl = await uploadInvoicePDF(pdfBuffer, contractor.id, invoiceId);

    let invoiceRecord: { id: string } | null = null;
    if (existing) {
      const { data: updatedRecord, error: updateError } = await supabase
        .from('invoices')
        .update({
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
        console.error('Error updating invoice:', updateError);
        return NextResponse.json({ error: 'Failed to update invoice record' }, { status: 500 });
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
        console.error('Error inserting invoice:', insertError);
        return NextResponse.json({ error: 'Failed to create invoice record' }, { status: 500 });
      }
      invoiceRecord = insertedRecord;
    }

    // Update purchase request with invoice reference
    await supabase
      .from('purchase_requests')
      .update({
        invoice_generated_at: invoiceDate.toISOString(),
        invoice_url: invoiceUrl,
        delivery_status: 'delivered',
        delivered_at: invoiceDate.toISOString(),
      })
      .eq('id', purchase_request_id);

    return NextResponse.json({
      success: true,
      invoiceId: invoiceRecord?.id || invoiceId,
      invoiceNumber,
      invoiceUrl,
      regenerated: !!existing,
    });
  } catch (err) {
    console.error('Invoices POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

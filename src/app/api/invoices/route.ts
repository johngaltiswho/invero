import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateInvoicePDF,
  uploadInvoicePDF,
  type InvoiceLineItem,
} from '@/lib/invoice-generator';

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

    return NextResponse.json({ success: true, data: data || [] });
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
  // Verify this is an internal call
  const secret = request.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { purchase_request_id } = await request.json();

    if (!purchase_request_id) {
      return NextResponse.json({ error: 'purchase_request_id is required' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Check if invoice already exists for this PR
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('purchase_request_id', purchase_request_id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Invoice already exists', invoiceId: existing.id });
    }

    // Fetch purchase request with items and contractor
    const { data: pr, error: prError } = await supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        contractor_id,
        remarks,
        purchase_request_items (
          id,
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

    if (prError || !pr) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Fetch contractor details
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, company_name, gstin, email')
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
    const lineItems: InvoiceLineItem[] = (pr.purchase_request_items || []).map((item: any) => {
      const material = item.project_materials?.materials;
      const qty = Number(item.requested_qty) || 0;
      const rate = Number(item.unit_rate) || 0;
      const taxPct = Number(item.tax_percent) || 0;
      const amount = qty * rate;
      const taxAmount = amount * (taxPct / 100);
      return {
        material_name: material?.name || 'Unknown Material',
        unit: material?.unit || 'nos',
        quantity: qty,
        unit_rate: rate,
        tax_percent: taxPct,
        amount,
        tax_amount: taxAmount,
        total: amount + taxAmount,
      };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
    const totalTax = lineItems.reduce((s, i) => s + i.tax_amount, 0);
    const grandTotal = subtotal + totalTax;

    // Get next invoice number using DB function
    const { data: invNumData } = await supabase.rpc('next_invoice_number');
    const invoiceNumber = invNumData || `INV-${Date.now()}`;

    const invoiceDate = new Date();
    const invoiceId = crypto.randomUUID();

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

    // Insert invoice record
    const { data: invoiceRecord, error: insertError } = await supabase
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
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting invoice:', insertError);
      return NextResponse.json({ error: 'Failed to create invoice record' }, { status: 500 });
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
      invoiceId: invoiceRecord.id,
      invoiceNumber,
      invoiceUrl,
    });
  } catch (err) {
    console.error('Invoices POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

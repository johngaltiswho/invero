import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import {
  generatePOPDF,
  uploadPOPDF,
  type POLineItem,
} from '@/lib/po-generator';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PurchaseRequestItem = {
  id: string;
  hsn_code?: string | null;
  item_description?: string | null;
  requested_qty?: number | string | null;
  purchase_qty?: number | string | null;
  normalized_qty?: number | string | null;
  unit_rate?: number | string | null;
  tax_percent?: number | string | null;
  purchase_unit?: string | null;
  project_materials?: {
    materials?: { name?: string | null; unit?: string | null; hsn_code?: string | null }[] | null;
  } | null;
};

type PurchaseRequestRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  vendor_id?: string | null;
  status: string;
  remarks?: string | null;
  purchase_request_items?: PurchaseRequestItem[] | null;
  projects?: {
    project_name?: string;
  } | null;
  contractors?: {
    company_name?: string;
    gstin?: string | null;
    email?: string | null;
  } | null;
  vendors?: {
    name?: string;
    gst_number?: string | null;
    address?: string | null;
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * POST /api/admin/purchase-orders/[id]
 * Generate Purchase Order PDF for a purchase request
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    // Verify admin access
    await requireAdmin();
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = supabaseAdmin();

    const { id: purchaseRequestId } = await context.params;
    if (!purchaseRequestId) {
      return NextResponse.json({ error: 'Purchase request ID required' }, { status: 400 });
    }

    console.log('[PO Generation] Fetching purchase request:', purchaseRequestId);

    // First, verify the purchase request exists
    const { data: prBasic, error: prBasicError } = await supabase
      .from('purchase_requests')
      .select('id, status, vendor_id, project_id, contractor_id')
      .eq('id', purchaseRequestId)
      .single();

    if (prBasicError || !prBasic) {
      console.error('[PO Generation] PR not found in basic query:', prBasicError);
      return NextResponse.json({
        error: 'Purchase request not found',
        details: prBasicError?.message || 'Purchase request does not exist'
      }, { status: 404 });
    }

    console.log('[PO Generation] Basic PR found:', prBasic);

    // Fetch purchase request with all details
    const { data: pr, error: prError } = await supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        contractor_id,
        vendor_id,
        status,
        remarks,
        purchase_request_items!inner (
          id,
          hsn_code,
          item_description,
          requested_qty,
          purchase_qty,
          normalized_qty,
          unit_rate,
          tax_percent,
          purchase_unit,
          project_materials!inner (
            materials (
              name,
              unit,
              hsn_code
            )
          )
        ),
        projects!inner (
          project_name
        ),
        contractors!inner (
          company_name,
          gstin,
          email
        ),
        vendors (
          name,
          gst_number,
          address,
          contact_person,
          email,
          phone
        )
      `)
      .eq('id', purchaseRequestId)
      .single();

    if (prError || !pr) {
      console.error('[PO Generation] Failed to fetch purchase request:', {
        id: purchaseRequestId,
        error: prError,
        message: prError?.message,
        details: prError?.details,
        hint: prError?.hint,
      });
      return NextResponse.json({
        error: 'Purchase request not found',
        details: prError?.message || 'No additional details'
      }, { status: 404 });
    }

    console.log('[PO Generation] Successfully fetched PR:', pr.id, 'Status:', pr.status);

    const typedPR = pr as unknown as PurchaseRequestRow;

    // Validate status - can only generate PO for approved or funded requests
    const validStatuses = ['approved', 'funded'];
    if (!validStatuses.includes(typedPR.status)) {
      return NextResponse.json(
        { error: `Cannot generate PO for purchase request in '${typedPR.status}' status. Must be 'approved' or 'funded'.` },
        { status: 400 }
      );
    }

    // Validate vendor assignment
    if (!typedPR.vendor_id || !typedPR.vendors) {
      return NextResponse.json(
        { error: 'Vendor must be assigned before generating PO' },
        { status: 400 }
      );
    }

    // Validate items
    const items = typedPR.purchase_request_items || [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Purchase request has no items' },
        { status: 400 }
      );
    }

    // Build line items for PO
    const lineItems: POLineItem[] = items.map((item) => {
      const material = Array.isArray(item.project_materials?.materials)
        ? item.project_materials.materials[0]
        : null;

      const qty = Number(item.normalized_qty || item.purchase_qty || item.requested_qty || 0);
      const rate = Number(item.unit_rate || 0);
      const taxPct = Number(item.tax_percent || 0);
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

    const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
    const totalTax = lineItems.reduce((s, i) => s + i.tax_amount, 0);
    const grandTotal = subtotal + totalTax;

    // Generate PO number
    const { data: poNumData } = await supabase.rpc('next_po_number');
    const poNumber = poNumData || `PO-${Date.now()}`;
    const poDate = new Date();
    const poId = crypto.randomUUID();

    // Generate PDF
    const pdfBuffer = generatePOPDF({
      poNumber,
      poDate,
      purchaseRequestId: typedPR.id,
      projectId: typedPR.project_id,
      projectName: typedPR.projects?.project_name || typedPR.project_id,
      vendorName: typedPR.vendors.name || 'Unknown Vendor',
      vendorGSTIN: typedPR.vendors.gst_number || undefined,
      vendorAddress: typedPR.vendors.address || undefined,
      vendorContact: typedPR.vendors.contact_person || undefined,
      vendorEmail: typedPR.vendors.email || undefined,
      vendorPhone: typedPR.vendors.phone || undefined,
      contractorName: typedPR.contractors?.company_name || 'Unknown Contractor',
      lineItems,
      subtotal,
      totalTax,
      grandTotal,
      remarks: typedPR.remarks || undefined,
    });

    // Upload PDF to storage
    const poUrl = await uploadPOPDF(pdfBuffer, purchaseRequestId, poId);

    // Store PO record in database
    const { data: poRecord, error: poInsertError } = await supabase
      .from('purchase_orders')
      .insert({
        id: poId,
        po_number: poNumber,
        purchase_request_id: purchaseRequestId,
        vendor_id: typedPR.vendor_id,
        po_date: poDate.toISOString(),
        total_amount: grandTotal,
        line_items: lineItems,
        po_url: poUrl,
        status: 'generated',
        generated_by: user.id,
        created_at: poDate.toISOString(),
        updated_at: poDate.toISOString(),
      })
      .select('id, po_number, po_url')
      .single();

    if (poInsertError) {
      console.error('Error inserting PO record:', poInsertError);
      return NextResponse.json(
        { error: 'Failed to save PO record' },
        { status: 500 }
      );
    }

    // Update purchase request status to 'po_generated'
    const { error: prUpdateError } = await supabase
      .from('purchase_requests')
      .update({
        status: 'po_generated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseRequestId);

    if (prUpdateError) {
      console.error('Error updating purchase request status:', prUpdateError);
      // Don't fail the request if status update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase Order generated successfully',
      data: poRecord,
    });
  } catch (error) {
    console.error('Error generating PO:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PO' },
      { status: 500 }
    );
  }
}

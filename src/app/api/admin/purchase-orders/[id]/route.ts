import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import {
  generatePOPDF,
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

    // Fetch purchase request with items, contractor, and vendor
    const { data: pr, error: prError } = await supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        contractor_id,
        vendor_id,
        status,
        remarks,
        purchase_request_items (
          id,
          hsn_code,
          item_description,
          requested_qty,
          purchase_qty,
          normalized_qty,
          unit_rate,
          tax_percent,
          purchase_unit,
          project_materials (
            materials (
              name,
              unit,
              hsn_code
            )
          )
        ),
        contractors (
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

    // Fetch project details separately (no FK relationship)
    const { data: project } = await supabase
      .from('projects')
      .select('project_name, id')
      .eq('id', pr.project_id)
      .single();

    const typedPR = {
      ...pr,
      projects: project ? { project_name: project.project_name } : null
    } as unknown as PurchaseRequestRow;

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
    const lineItems: POLineItem[] = items.map((item, index) => {
      console.log(`[PO Generation] Item ${index}:`, {
        id: item.id,
        project_materials: item.project_materials,
        has_materials: !!item.project_materials?.materials,
        materials_type: typeof item.project_materials?.materials,
        materials_is_array: Array.isArray(item.project_materials?.materials),
      });

      // Handle different possible structures
      let material = null;
      if (item.project_materials) {
        if (Array.isArray(item.project_materials.materials)) {
          material = item.project_materials.materials[0];
        } else if (item.project_materials.materials) {
          // materials might be an object instead of array
          material = item.project_materials.materials;
        }
      }

      console.log(`[PO Generation] Item ${index} material:`, material);

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

    console.log('[PO Generation] Successfully generated PO:', poNumber);

    // Return PDF as downloadable file
    const fileName = `${poNumber}_${typedPR.vendors.name?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PO:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PO' },
      { status: 500 }
    );
  }
}

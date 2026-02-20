import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const EDITABLE_STATUSES = new Set(['draft', 'submitted', 'rejected']);

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PurchaseRequestItemWithMaterial = {
  id: string;
  purchase_request_id: string;
  project_material_id: string;
  item_description: string | null;
  requested_qty: number;
  approved_qty: number | null;
  unit_rate: number | null;
  tax_percent: number | null;
  hsn_code: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  project_materials?: Array<{
    id: string;
    unit: string | null;
    material_id: string | null;
    materials?: Array<{
      name: string | null;
    }> | null;
  }> | null;
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getContractorIdForUser(userId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  return contractor?.id || null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: requestId } = await context.params;
    if (!requestId) {
      return NextResponse.json({ error: 'Purchase request ID required' }, { status: 400 });
    }

    const contractorId = await getContractorIdForUser(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const supabase = getSupabase();

    const { data: requestRow, error: requestError } = await supabase
      .from('purchase_requests')
      .select('id, project_id, contractor_id, status, remarks, created_at, updated_at, submitted_at, approved_at, funded_at')
      .eq('id', requestId)
      .eq('contractor_id', contractorId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('purchase_request_items')
      .select(`
        id,
        purchase_request_id,
        project_material_id,
        item_description,
        requested_qty,
        approved_qty,
        unit_rate,
        tax_percent,
        hsn_code,
        status,
        created_at,
        updated_at,
        project_materials(
          id,
          unit,
          material_id,
          materials(
            name
          )
        )
      `)
      .eq('purchase_request_id', requestId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Failed to load purchase request items:', itemsError);
      return NextResponse.json({ error: 'Failed to load purchase request items' }, { status: 500 });
    }

    const transformedItems = ((items || []) as PurchaseRequestItemWithMaterial[]).map((item) => {
      const projectMaterial = item.project_materials?.[0];
      const materialName = projectMaterial?.materials?.[0]?.name || 'Material';
      return {
        ...item,
        material_name: materialName,
        unit: projectMaterial?.unit || 'unit'
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...requestRow,
        items: transformedItems,
        editable: EDITABLE_STATUSES.has((requestRow.status || '').toLowerCase())
      }
    });
  } catch (error) {
    console.error('Error fetching purchase request details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase request details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: requestId } = await context.params;
    if (!requestId) {
      return NextResponse.json({ error: 'Purchase request ID required' }, { status: 400 });
    }

    const body = await request.json();
    const remarks = typeof body.remarks === 'string' ? body.remarks : null;
    const items = Array.isArray(body.items) ? body.items : [];

    const contractorId = await getContractorIdForUser(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const supabase = getSupabase();

    const { data: requestRow, error: requestError } = await supabase
      .from('purchase_requests')
      .select('id, status, contractor_id')
      .eq('id', requestId)
      .eq('contractor_id', contractorId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    const normalizedStatus = (requestRow.status || '').toLowerCase();
    if (!EDITABLE_STATUSES.has(normalizedStatus)) {
      return NextResponse.json(
        { error: `Purchase request cannot be edited in '${requestRow.status}' status` },
        { status: 400 }
      );
    }

    const { data: existingItems, error: existingItemsError } = await supabase
      .from('purchase_request_items')
      .select('id')
      .eq('purchase_request_id', requestId);

    if (existingItemsError) {
      console.error('Failed to fetch existing request items:', existingItemsError);
      return NextResponse.json({ error: 'Failed to validate purchase request items' }, { status: 500 });
    }

    const existingIds = new Set((existingItems || []).map((item) => item.id));

    for (const item of items) {
      if (!item?.id || !existingIds.has(item.id)) {
        return NextResponse.json({ error: 'Invalid purchase request item in payload' }, { status: 400 });
      }

      const requestedQty = Number(item.requested_qty);
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
        return NextResponse.json({ error: 'Requested quantity must be greater than zero' }, { status: 400 });
      }

      const updatePayload = {
        requested_qty: requestedQty,
        item_description: item.item_description?.toString().trim() || null,
        unit_rate: item.unit_rate === null || item.unit_rate === '' ? null : Number(item.unit_rate),
        tax_percent: item.tax_percent === null || item.tax_percent === '' ? 0 : Number(item.tax_percent),
        hsn_code: item.hsn_code?.toString().trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error: itemUpdateError } = await supabase
        .from('purchase_request_items')
        .update(updatePayload)
        .eq('id', item.id)
        .eq('purchase_request_id', requestId);

      if (itemUpdateError) {
        console.error('Failed to update purchase request item:', itemUpdateError);
        return NextResponse.json({ error: 'Failed to update purchase request items' }, { status: 500 });
      }
    }

    const { data: updatedRequest, error: requestUpdateError } = await supabase
      .from('purchase_requests')
      .update({
        remarks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('contractor_id', contractorId)
      .select('id, project_id, contractor_id, status, remarks, updated_at')
      .single();

    if (requestUpdateError || !updatedRequest) {
      console.error('Failed to update purchase request:', requestUpdateError);
      return NextResponse.json({ error: 'Failed to update purchase request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error updating purchase request:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase request' },
      { status: 500 }
    );
  }
}

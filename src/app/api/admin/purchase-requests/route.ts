import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type PurchaseSummary = {
  draft: number;
  submitted: number;
  approved: number;
  funded: number;
  po_generated: number;
  completed: number;
  rejected: number;
};

type PurchaseRequestItemRow = {
  id: string;
  purchase_request_id: string;
  project_material_id: string;
  requested_qty: number;
  approved_qty?: number | null;
  unit_rate?: number | null;
  tax_percent?: number | null;
  status: string;
  project_materials?: {
    unit?: string | null;
    notes?: string | null;
    materials?: {
      name?: string | null;
      description?: string | null;
    } | null;
  } | null;
};

type PurchaseRequestUpdate = {
  status?: string;
  approval_notes?: string | null;
  updated_at?: string;
  approved_at?: string | null;
  funded_at?: string | null;
};

type PurchaseRequestItemUpdate = {
  status?: string;
  approved_qty?: number | null;
  updated_at?: string;
};

const createEmptySummary = (): PurchaseSummary => ({
  draft: 0,
  submitted: 0,
  approved: 0,
  funded: 0,
  po_generated: 0,
  completed: 0,
  rejected: 0
});

interface FetchOptions {
  status?: string;
  limit?: number;
  offset?: number;
  ids?: string[];
}

async function fetchPurchaseSummary(): Promise<PurchaseSummary> {
  const summary = createEmptySummary();
  const { data, error } = await supabaseAdmin
    .from('purchase_requests')
    .select('status');

  if (error) {
    console.error('Failed to compute purchase summary:', error);
    return summary;
  }

  data?.forEach((row) => {
    const key = row.status as keyof PurchaseSummary;
    if (key in summary) {
      summary[key] += 1;
    }
  });

  return summary;
}

async function fetchPurchaseRequests(options: FetchOptions = {}) {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  let query = supabaseAdmin
    .from('purchase_requests')
    .select(
      `
        id,
        project_id,
        contractor_id,
        status,
        remarks,
        approval_notes,
        created_at,
        updated_at,
        submitted_at,
        approved_at,
        funded_at,
        contractors:contractor_id (
          company_name,
          contact_person,
          email
        )
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (options.ids && options.ids.length > 0) {
    query = query.in('id', options.ids);
  } else {
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    query = query.range(offset, offset + limit - 1);
  }

  const { data: requestRows, error, count } = await query;

  if (error) {
    throw error;
  }

  const requestIds = requestRows?.map((row) => row.id) ?? [];
  const itemsByRequest = new Map<string, PurchaseRequestItemRow[]>();

  if (requestIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .select(
        `
          id,
          purchase_request_id,
          project_material_id,
          requested_qty,
          approved_qty,
          unit_rate,
          tax_percent,
          status,
          created_at,
          project_materials:project_material_id (
            unit,
            notes,
            materials:material_id (
              name,
              description
            )
          )
        `
      )
      .in('purchase_request_id', requestIds)
      .order('created_at', { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    itemRows?.forEach((item) => {
      const list = itemsByRequest.get(item.purchase_request_id) || [];
      list.push(item);
      itemsByRequest.set(item.purchase_request_id, list);
    });
  }

  const projectIds = Array.from(new Set((requestRows || []).map(row => row.project_id).filter(Boolean)));
  const projectMap = new Map<string, { name?: string | null; location?: string | null }>();

  if (projectIds.length > 0) {
    const { data: projects, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, project_name, location')
      .in('id', projectIds);

    if (projectError) {
      console.error('Failed to fetch project metadata:', projectError);
    } else {
      projects?.forEach(project => {
        projectMap.set(project.id, {
          name: (project as { project_name?: string }).project_name,
          location: project.location
        });
      });
    }
  }

  const normalizedRequests = (requestRows || []).map((request) => {
    const items = (itemsByRequest.get(request.id) || []).map((item) => ({
      id: item.id,
      project_material_id: item.project_material_id,
      requested_qty: item.requested_qty,
      approved_qty: item.approved_qty,
      unit_rate: item.unit_rate,
      tax_percent: item.tax_percent,
      status: item.status,
      material_name: item.project_materials?.materials?.name || 'Unknown Material',
      material_description: item.project_materials?.materials?.description || item.project_materials?.notes || null,
      unit: item.project_materials?.unit || 'units'
    }));

    const totalRequestedQty = items.reduce((sum, item) => sum + (item.requested_qty || 0), 0);
    const estimatedTotal = items.reduce((sum, item) => sum + (item.requested_qty || 0) * (item.unit_rate || 0), 0);

    return {
      id: request.id,
      project_id: request.project_id,
      contractor_id: request.contractor_id,
      status: request.status,
      remarks: request.remarks,
      approval_notes: request.approval_notes,
      created_at: request.created_at,
      updated_at: request.updated_at,
      submitted_at: request.submitted_at,
      approved_at: request.approved_at,
      funded_at: request.funded_at,
      contractors: request.contractors,
      project: projectMap.get(request.project_id) || null,
      purchase_request_items: items,
      total_items: items.length,
      total_requested_qty: totalRequestedQty,
      estimated_total: estimatedTotal
    };
  });

  const fundingTotals = new Map<string, number>();
  if (requestIds.length > 0) {
    const { data: fundingRows, error: fundingError } = await supabaseAdmin
      .from('capital_transactions')
      .select('purchase_request_id, amount')
      .in('purchase_request_id', requestIds)
      .eq('transaction_type', 'deployment')
      .eq('status', 'completed');

    if (fundingError) {
      console.error('Failed to load funding totals for purchase requests:', fundingError);
    } else {
      fundingRows?.forEach((row) => {
        if (!row.purchase_request_id) return;
        const current = fundingTotals.get(row.purchase_request_id) || 0;
        fundingTotals.set(row.purchase_request_id, current + (Number(row.amount) || 0));
      });
    }
  }

  const enrichedRequests = normalizedRequests.map((request) => {
    const fundedAmount = fundingTotals.get(request.id) || 0;
    const estimatedTotal = request.estimated_total || 0;
    const remainingAmount = Math.max(estimatedTotal - fundedAmount, 0);
    const fundingProgress = estimatedTotal > 0 ? Math.min(fundedAmount / estimatedTotal, 1) : null;

    return {
      ...request,
      funded_amount: fundedAmount,
      remaining_amount: remainingAmount,
      funding_progress: fundingProgress
    };
  });

  return {
    requests: enrichedRequests,
    total: typeof count === 'number' ? count : enrichedRequests.length
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'submitted';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [{ requests, total }, summary] = await Promise.all([
      fetchPurchaseRequests({ status, limit, offset }),
      fetchPurchaseSummary()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requests,
        summary,
        pagination: {
          limit,
          offset,
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase requests' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      purchase_request_id,
      action,
      admin_notes
    } = body;

    if (!purchase_request_id) {
      return NextResponse.json(
        { error: 'purchase_request_id is required' },
        { status: 400 }
      );
    }

    const validActions = ['approve_for_purchase', 'approve_for_funding', 'reject'] as const;
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, approved_at')
      .eq('id', purchase_request_id)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updates: PurchaseRequestUpdate = {
      updated_at: now,
      approval_notes: admin_notes || null
    };

    let itemStatus: 'approved' | 'ordered' | 'rejected' = 'approved';

    switch (action) {
      case 'approve_for_purchase':
        updates.status = 'approved';
        updates.approved_at = now;
        itemStatus = 'approved';
        break;
      case 'approve_for_funding':
        updates.status = 'funded';
        updates.funded_at = now;
        updates.approved_at = existingRequest.approved_at || now;
        itemStatus = 'ordered';
        break;
      case 'reject':
        updates.status = 'rejected';
        itemStatus = 'rejected';
        break;
    }

    const { data: requestItems, error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .select('id, requested_qty')
      .eq('purchase_request_id', purchase_request_id);

    if (itemsError) {
      console.error('Failed to fetch purchase request items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to update purchase request items' },
        { status: 500 }
      );
    }

    if (requestItems && requestItems.length > 0) {
      await Promise.all(
        requestItems.map((item) => {
          const itemUpdate: PurchaseRequestItemUpdate = {
            status: itemStatus,
            updated_at: now
          };

          if (action === 'reject') {
            itemUpdate.approved_qty = null;
          } else {
            itemUpdate.approved_qty = item.requested_qty;
          }

          return supabaseAdmin
            .from('purchase_request_items')
            .update(itemUpdate)
            .eq('id', item.id);
        })
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('purchase_requests')
      .update(updates)
      .eq('id', purchase_request_id);

    if (updateError) {
      console.error('Failed to update purchase request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update purchase request' },
        { status: 500 }
      );
    }

    const { requests } = await fetchPurchaseRequests({ ids: [purchase_request_id] });

    return NextResponse.json({
      success: true,
      data: requests[0] || null,
      message: `Purchase request ${action.replace(/_/g, ' ')}d successfully`
    });
  } catch (error) {
    console.error('Error updating purchase request:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase request' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchPurchaseRequestAdditionalChargesByRequestIds } from '@/lib/purchase-request-additional-charges';
import { calculatePurchaseRequestTotals } from '@/lib/purchase-request-totals';
import { supabaseAdmin } from '@/lib/supabase';
import { createProjectPOReference, getDefaultPOReference, listProjectPOReferences } from '@/lib/project-po-references';

async function resolveOwnedProject(projectId: string, userId: string) {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, contractor_id, project_status, estimated_value, contractors!inner(clerk_user_id)')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    throw new Error('Project not found');
  }

  if ((project as any).contractors.clerk_user_id !== userId) {
    throw new Error('Access denied');
  }

  return project as any;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId } = await params;
    await resolveOwnedProject(projectId, userId);

    const poReferences = await listProjectPOReferences(projectId);

    const { data: requestRows, error: requestError } = await supabaseAdmin
      .from('purchase_requests')
      .select(`
        id,
        status,
        project_po_reference_id,
        purchase_request_items (
          purchase_qty,
          requested_qty,
          unit_rate,
          tax_percent
        )
      `)
      .eq('project_id', projectId);

    if (requestError) {
      console.error('Failed to fetch project purchase requests for PO summaries:', requestError);
      return NextResponse.json({ success: false, error: 'Failed to fetch PO summaries' }, { status: 500 });
    }

    const requestIds = (requestRows || []).map((row: any) => row.id);
    const { chargesByRequestId } = await fetchPurchaseRequestAdditionalChargesByRequestIds(supabaseAdmin, requestIds);
    const summaryMap = new Map<string, { request_count: number; linked_value: number }>();
    (requestRows || []).forEach((row: any) => {
      if (!row.project_po_reference_id) return;
      const current = summaryMap.get(row.project_po_reference_id) || { request_count: 0, linked_value: 0 };
      const lineValue = calculatePurchaseRequestTotals({
        items: row.purchase_request_items || [],
        additionalCharges: chargesByRequestId.get(row.id) || []
      }).grand_total;
      current.request_count += 1;
      current.linked_value += lineValue;
      summaryMap.set(row.project_po_reference_id, current);
    });

    return NextResponse.json({
      success: true,
      data: {
        po_references: poReferences.map((po) => ({
          ...po,
          request_count: summaryMap.get(po.id)?.request_count || 0,
          linked_value: summaryMap.get(po.id)?.linked_value || 0,
        })),
        active_po_reference: getDefaultPOReference(poReferences)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch project PO references';
    const status = message === 'Authentication required' ? 401 : message === 'Access denied' ? 403 : message === 'Project not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const project = await resolveOwnedProject(projectId, userId);

    if (!['awarded', 'finalized', 'completed'].includes(String(project.project_status || '').toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Client POs can only be added to awarded/finalized projects' }, { status: 400 });
    }

    const body = await request.json();
    const poNumber = String(body.po_number || '').trim();
    if (!poNumber) {
      return NextResponse.json({ success: false, error: 'po_number is required' }, { status: 400 });
    }

    const existing = await listProjectPOReferences(projectId);
    const nextPo = await createProjectPOReference({
      project_id: projectId,
      po_number: poNumber,
      po_date: typeof body.po_date === 'string' && body.po_date.trim() ? body.po_date.trim() : null,
      po_value: body.po_value === null || body.po_value === undefined || body.po_value === '' ? null : Number(body.po_value),
      po_type: body.po_type || (existing.length === 0 ? 'original' : 'supplemental'),
      status: body.status || 'active',
      is_default: body.is_default ?? existing.length === 0,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      previous_po_reference_id: typeof body.previous_po_reference_id === 'string' && body.previous_po_reference_id ? body.previous_po_reference_id : null,
    });

    return NextResponse.json({ success: true, data: nextPo });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project PO reference';
    const status = message === 'Authentication required' ? 401 : message === 'Access denied' ? 403 : message === 'Project not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

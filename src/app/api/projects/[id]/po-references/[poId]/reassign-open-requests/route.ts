import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

const OPEN_PR_STATUSES = ['draft', 'submitted', 'approved'];

async function resolveOwnedProject(projectId: string, userId: string) {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, contractors!inner(clerk_user_id)')
    .eq('id', projectId)
    .single();

  if (error || !project) throw new Error('Project not found');
  if ((project as any).contractors.clerk_user_id !== userId) throw new Error('Access denied');
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; poId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId, poId } = await params;
    await resolveOwnedProject(projectId, userId);

    const { data: targetPO, error: targetError } = await supabaseAdmin
      .from('project_po_references')
      .select('id, status')
      .eq('id', poId)
      .eq('project_id', projectId)
      .single();

    if (targetError || !targetPO) {
      return NextResponse.json({ success: false, error: 'Client PO not found' }, { status: 404 });
    }

    if (targetPO.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Only active client POs can receive reassigned PRs' }, { status: 400 });
    }

    const { data: openRequests, error: fetchError } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, project_po_reference_id')
      .eq('project_id', projectId)
      .in('status', OPEN_PR_STATUSES);

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    const requestIds = (openRequests || [])
      .filter((row: any) => row.project_po_reference_id !== poId)
      .map((row: any) => row.id);
    if (requestIds.length === 0) {
      return NextResponse.json({ success: true, data: { updated_count: 0 } });
    }

    const { error: updateError } = await supabaseAdmin
      .from('purchase_requests')
      .update({
        project_po_reference_id: poId,
        updated_at: new Date().toISOString(),
      })
      .in('id', requestIds);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { updated_count: requestIds.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reassign open purchase requests';
    const status = message === 'Authentication required' ? 401 : message === 'Access denied' ? 403 : message === 'Project not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { updateProjectPOReference } from '@/lib/project-po-references';

async function resolveOwnedProject(projectId: string, userId: string) {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, contractor_id, contractors!inner(clerk_user_id)')
    .eq('id', projectId)
    .single();

  if (error || !project) throw new Error('Project not found');
  if ((project as any).contractors.clerk_user_id !== userId) throw new Error('Access denied');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; poId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId, poId } = await params;
    await resolveOwnedProject(projectId, userId);

    const body = await request.json();
    const updated = await updateProjectPOReference(projectId, poId, {
      po_number: typeof body.po_number === 'string' ? body.po_number : undefined,
      po_date: typeof body.po_date === 'string' ? body.po_date : body.po_date === null ? null : undefined,
      po_value: body.po_value === '' ? null : body.po_value,
      po_type: body.po_type,
      status: body.status,
      is_default: typeof body.is_default === 'boolean' ? body.is_default : undefined,
      notes: typeof body.notes === 'string' ? body.notes : body.notes === null ? null : undefined,
      previous_po_reference_id:
        typeof body.previous_po_reference_id === 'string'
          ? body.previous_po_reference_id
          : body.previous_po_reference_id === null
            ? null
            : undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project PO reference';
    const status = message === 'Authentication required' ? 401 : message === 'Access denied' ? 403 : message === 'Project not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

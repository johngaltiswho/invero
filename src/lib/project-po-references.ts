import { supabaseAdmin } from '@/lib/supabase';

export type ProjectPOType = 'original' | 'amendment' | 'supplemental' | 'replacement';
export type ProjectPOStatus = 'active' | 'exhausted' | 'closed';

export type ProjectPOReference = {
  id: string;
  project_id: string;
  po_number: string;
  po_date: string | null;
  po_value: number | null;
  po_type: ProjectPOType;
  status: ProjectPOStatus;
  is_default: boolean;
  notes: string | null;
  previous_po_reference_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function listProjectPOReferences(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('project_po_references')
    .select('*')
    .eq('project_id', projectId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as ProjectPOReference[];
}

export async function createProjectPOReference(input: {
  project_id: string;
  po_number: string;
  po_date?: string | null;
  po_value?: number | null;
  po_type?: ProjectPOType;
  status?: ProjectPOStatus;
  is_default?: boolean;
  notes?: string | null;
  previous_po_reference_id?: string | null;
}) {
  const normalizedPoNumber = input.po_number.trim();
  if (!normalizedPoNumber) {
    throw new Error('PO number is required');
  }

  if (input.is_default) {
    await clearDefaultPOReference(input.project_id);
  }

  const { data, error } = await supabaseAdmin
    .from('project_po_references')
    .insert({
      project_id: input.project_id,
      po_number: normalizedPoNumber,
      po_date: input.po_date || null,
      po_value: input.po_value ?? null,
      po_type: input.po_type || 'original',
      status: input.status || 'active',
      is_default: input.is_default ?? false,
      notes: input.notes || null,
      previous_po_reference_id: input.previous_po_reference_id || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ProjectPOReference;
}

export async function updateProjectPOReference(
  projectId: string,
  poReferenceId: string,
  updates: Partial<Pick<ProjectPOReference, 'po_date' | 'po_value' | 'po_type' | 'status' | 'is_default' | 'notes' | 'previous_po_reference_id' | 'po_number'>>
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      updatePayload[key] = key === 'po_number' && typeof value === 'string' ? value.trim() : value;
    }
  });

  if (updates.is_default === true) {
    await clearDefaultPOReference(projectId);
  }

  if (updates.status && updates.status !== 'active' && updates.is_default === undefined) {
    updatePayload.is_default = false;
  }

  const { data, error } = await supabaseAdmin
    .from('project_po_references')
    .update(updatePayload)
    .eq('id', poReferenceId)
    .eq('project_id', projectId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ProjectPOReference;
}

export async function clearDefaultPOReference(projectId: string) {
  const { error } = await supabaseAdmin
    .from('project_po_references')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('is_default', true);

  if (error) throw new Error(error.message);
}

export function getDefaultPOReference(poReferences: ProjectPOReference[]) {
  return (
    poReferences.find((po) => po.is_default && po.status === 'active') ||
    poReferences.find((po) => po.status === 'active') ||
    poReferences.find((po) => po.is_default) ||
    poReferences[0] ||
    null
  );
}

export async function maybeCreateInitialProjectPOReference(input: {
  project_id: string;
  po_number?: string | null;
  po_date?: string | null;
  po_value?: number | null;
}) {
  const poNumber = input.po_number?.trim();
  if (!poNumber) return null;

  const existing = await listProjectPOReferences(input.project_id);
  const matched = existing.find((po) => po.po_number === poNumber);
  if (matched) return matched;

  return createProjectPOReference({
    project_id: input.project_id,
    po_number: poNumber,
    po_date: input.po_date || null,
    po_value: input.po_value ?? null,
    po_type: existing.length === 0 ? 'original' : 'supplemental',
    status: 'active',
    is_default: true,
  });
}

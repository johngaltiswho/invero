import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function getAuthenticatedContractorProject(projectId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }) };
  }

  const { data: contractor, error: contractorError } = await supabaseAdmin
    .from('contractors')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (contractorError || !contractor) {
    return { error: NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 }) };
  }

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, contractor_id, project_name')
    .eq('id', projectId)
    .eq('contractor_id', contractor.id)
    .single();

  if (projectError || !project) {
    return { error: NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 }) };
  }

  return { userId, contractorId: contractor.id, project };
}

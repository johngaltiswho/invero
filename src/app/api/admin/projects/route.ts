import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractor_id') || '';

    let query = supabase
      .from('projects')
      .select('id, project_name, contractor_id, client_name, estimated_value, funding_required')
      .order('project_name', { ascending: true });

    if (contractorId) {
      query = query.eq('contractor_id', contractorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      projects: data || []
    });

  } catch (error) {
    console.error('Error in GET /api/admin/projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
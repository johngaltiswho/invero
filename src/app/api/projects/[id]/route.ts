import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// GET /api/projects/[id] - Get specific project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Get contractor for the authenticated user
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({
        success: false,
        error: 'Contractor not found for authenticated user'
      }, { status: 404 });
    }

    // Fetch specific project for the contractor
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('contractor_id', contractor.id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: project
    });

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch project'
    }, { status: 500 });
  }
}
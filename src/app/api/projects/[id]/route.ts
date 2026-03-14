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

// PUT /api/projects/[id] - Update project by ID (contractor-scoped)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

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

    const allowedFields = new Set([
      'project_name',
      'client_id',
      'client_name',
      'project_address',
      'project_status',
      'status',
      'estimated_value',
      'po_number',
      'funding_status',
      'funding_required',
      'actual_end_date',
      'tender_submission_date'
    ]);

    const updateData: Record<string, unknown> = {};
    Object.entries(body || {}).forEach(([key, value]) => {
      if (allowedFields.has(key)) {
        updateData[key] = value;
      }
    });
    updateData.updated_at = new Date().toISOString();

    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('contractor_id', contractor.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update project'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedProject
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update project'
    }, { status: 500 });
  }
}

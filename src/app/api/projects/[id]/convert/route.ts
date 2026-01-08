import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// PUT - Convert project from draft to awarded
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { id } = await params;
    const projectId = id;
    const body = await request.json();
    
    const {
      estimated_value,
      po_number,
      funding_required,
      funding_status,
      project_status
    } = body;

    // Validate required fields
    if (!estimated_value || !project_status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: estimated_value, project_status'
      }, { status: 400 });
    }

    // First, verify the project exists and belongs to the authenticated user
    const { data: existingProject, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('*, contractors!inner(clerk_user_id)')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProject) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    // Check if user owns this project
    if (existingProject.contractors.clerk_user_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Update project with awarded project details
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        estimated_value,
        po_number: po_number || null,
        funding_required: funding_required || null,
        funding_status: funding_status || 'pending',
        project_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Project conversion error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to convert project'
      }, { status: 500 });
    }

    // Log activity
    try {
      await supabaseAdmin
        .from('activities')
        .insert({
          contractor_id: existingProject.contractor_id,
          project_id: projectId,
          type: 'project_converted',
          title: 'Project Converted to Awarded',
          description: `Converted project "${existingProject.project_name}" from draft to awarded status`,
          metadata: { 
            estimated_value,
            po_number: po_number || null,
            previous_status: existingProject.project_status || 'draft',
            new_status: project_status
          }
        });
    } catch (activityError) {
      console.warn('Activity logging failed:', activityError);
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({
      success: true,
      data: updatedProject
    });

  } catch (error) {
    console.error('Error converting project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to convert project'
    }, { status: 500 });
  }
}
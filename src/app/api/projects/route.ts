import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const formData = await request.formData();
    
    // Extract project data
    const projectData = {
      contractor_id: formData.get('contractor_id') as string,
      project_name: formData.get('project_name') as string,
      client_name: formData.get('client_name') as string,
      project_value: parseFloat(formData.get('project_value') as string),
      start_date: formData.get('start_date') as string,
      expected_end_date: formData.get('expected_end_date') as string,
      project_id_external: formData.get('project_id_external') as string || null,
      priority: formData.get('priority') as 'High' | 'Medium' | 'Low',
      team_size: formData.get('team_size') ? parseInt(formData.get('team_size') as string) : null,
      project_tenure: formData.get('project_tenure') ? parseInt(formData.get('project_tenure') as string) : null,
      funding_status: formData.get('funding_status') as string,
      risk_level: formData.get('risk_level') as string,
      current_progress: 0,
      status: 'Planning' as const,
      funding_required: null,
      expected_irr: null,
      esg_compliance: null,
      next_milestone: null,
      next_milestone_date: null,
      monthly_burn_rate: null
    };

    // Validate required fields
    if (!projectData.contractor_id || !projectData.project_name || !projectData.client_name || !projectData.project_value) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: contractor_id, project_name, client_name, project_value'
      }, { status: 400 });
    }

    // Handle PO file upload if provided
    const poFile = formData.get('po_file') as File;
    let poFileUrl: string | null = null;

    if (poFile && poFile.size > 0) {
      try {
        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (poFile.size > maxSize) {
          return NextResponse.json({
            success: false,
            error: 'PO file size must be less than 10MB'
          }, { status: 400 });
        }

        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/jpg',
          'image/png'
        ];
        
        if (!allowedTypes.includes(poFile.type)) {
          return NextResponse.json({
            success: false,
            error: 'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG files are allowed'
          }, { status: 400 });
        }

        // Upload to Supabase Storage
        const fileExtension = poFile.name.split('.').pop();
        const fileName = `${projectData.contractor_id}/po_${Date.now()}.${fileExtension}`;
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('contractor-documents')
          .upload(fileName, poFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('PO file upload error:', uploadError);
          return NextResponse.json({
            success: false,
            error: 'Failed to upload PO file'
          }, { status: 500 });
        }

        // Get file path for private bucket access
        poFileUrl = fileName;
      } catch (error) {
        console.error('PO file handling error:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to process PO file'
        }, { status: 500 });
      }
    }

    // Create project in database
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create project'
      }, { status: 500 });
    }

    // If PO was uploaded, store the reference (you could create a separate documents table)
    // For now, we'll just return success with the project data

    // Log activity
    try {
      await supabaseAdmin
        .from('activities')
        .insert({
          contractor_id: projectData.contractor_id,
          project_id: project.id,
          type: 'project_created',
          title: 'New Project Created',
          description: `Created project: ${projectData.project_name} for client: ${projectData.client_name}`,
          metadata: { 
            project_value: projectData.project_value,
            has_po_file: !!poFileUrl 
          }
        });
    } catch (activityError) {
      console.warn('Activity logging failed:', activityError);
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({
      success: true,
      data: {
        project,
        po_file_uploaded: !!poFileUrl
      }
    });

  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create project'
    }, { status: 500 });
  }
}

// GET - Fetch contractor's projects
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractor_id');

    if (!contractorId) {
      return NextResponse.json({
        success: false,
        error: 'contractor_id parameter is required'
      }, { status: 400 });
    }

    // Fetch projects for the contractor
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch projects'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { projects: projects || [] }
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch projects'
    }, { status: 500 });
  }
}
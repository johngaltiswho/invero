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
    
    // Extract project data - only fields that exist in the projects table
    const projectData = {
      contractor_id: formData.get('contractor_id') as string,
      project_name: formData.get('project_name') as string,
      client_name: formData.get('client_name') as string,
      estimated_value: parseFloat(formData.get('project_value') as string),
      po_number: formData.get('po_wo_number') as string || null,
      funding_status: formData.get('funding_status') as string || 'pending',
      funding_required: formData.get('funding_required') ? parseFloat(formData.get('funding_required') as string) : null
    };

    // Validate required fields
    if (!projectData.contractor_id || !projectData.project_name || !projectData.client_name || !projectData.estimated_value) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: contractor_id, project_name, client_name, estimated_value'
      }, { status: 400 });
    }

    // Handle PO file upload if provided
    const poFile = formData.get('po_file') as File;
    let poFileUrl: string | null = null;

    if (poFile && poFile.size > 0) {
      try {
        // Validate file
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (poFile.size > maxSize) {
          return NextResponse.json({
            success: false,
            error: 'PO file size must be less than 20MB'
          }, { status: 400 });
        }

        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'application/dwg',
          'image/vnd.dwg',
          'application/acad',
          'application/x-dwg',
          'application/x-autocad',
          'image/x-dwg',
          'application/octet-stream'
        ];

        const fileExtension = poFile.name.toLowerCase().split('.').pop();
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'dwg'];

        const isValidType = allowedTypes.includes(poFile.type) || 
                           (poFile.type === 'application/octet-stream' && allowedExtensions.includes(fileExtension || '')) ||
                           allowedExtensions.includes(fileExtension || '');
        
        if (!isValidType) {
          console.log('PO File rejected - Type:', poFile.type, 'Extension:', fileExtension, 'File:', poFile.name);
          return NextResponse.json({
            success: false,
            error: `Invalid file type. Received: ${poFile.type}. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, DWG files`
          }, { status: 400 });
        }

        // Upload to Supabase Storage
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

        // Store file path for database record
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

    // If PO was uploaded, save it to project_files table for Files section integration
    if (poFileUrl && project) {
      try {
        await supabaseAdmin
          .from('project_files')
          .insert({
            project_id: project.id,
            contractor_id: projectData.contractor_id,
            file_name: poFileUrl.split('/').pop() || 'po_file',
            original_name: poFile.name,
            description: 'Purchase Order uploaded during project creation',
            category: 'po',
            version: '1.0',
            file_path: poFileUrl,
            file_size: poFile.size,
            mime_type: poFile.type,
            uploaded_by: userId
          });
      } catch (fileRecordError) {
        console.warn('Failed to save PO file record to project_files:', fileRecordError);
        // Don't fail the project creation if file record creation fails
      }
    }

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
            po_value: projectData.estimated_value,
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
    let contractorId = searchParams.get('contractor_id');

    // If no contractor_id provided, get it from the authenticated user
    if (!contractorId) {
      const { data: contractor } = await supabaseAdmin
        .from('contractors')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!contractor) {
        return NextResponse.json({
          success: false,
          error: 'Contractor not found for authenticated user'
        }, { status: 404 });
      }

      contractorId = contractor.id;
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
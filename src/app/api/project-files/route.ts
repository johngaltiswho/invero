import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch project files
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const category = searchParams.get('category');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor to verify ownership
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false });

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data: projectFiles, error } = await query;

    if (error) {
      console.error('Failed to fetch project files:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch project files',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: projectFiles || []
    });

  } catch (error) {
    console.error('Error fetching project files:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch project files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Upload file
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const version = formData.get('version') as string || '1.0';

    if (!file || !projectId || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, project_id, category' 
      }, { status: 400 });
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size exceeds 20MB limit' 
      }, { status: 400 });
    }

    // Validate file type - check both MIME type and extension
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/dwg',
      'image/vnd.dwg',
      'application/acad',
      'application/x-dwg',
      'application/x-autocad',
      'image/x-dwg',
      'application/octet-stream' // Generic binary, check extension
    ];

    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'dwg'];

    const isValidType = allowedTypes.includes(file.type) || 
                       (file.type === 'application/octet-stream' && allowedExtensions.includes(fileExtension || '')) ||
                       allowedExtensions.includes(fileExtension || '');

    if (!isValidType) {
      console.log('File rejected - Type:', file.type, 'Extension:', fileExtension, 'File:', file.name);
      return NextResponse.json({ 
        error: `File type not allowed. Received: ${file.type}. Supported: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, DWG` 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
    
    // Create storage path: contractor_id/project_id/category/filename
    const storagePath = `${contractor.id}/${projectId}/${category}/${uniqueFileName}`;

    // Convert File to ArrayBuffer for Supabase upload
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage (using existing contractor-documents bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contractor-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Failed to upload file to storage:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get the public URL (optional, for direct access)
    const { data: urlData } = supabase.storage
      .from('contractor-documents')
      .getPublicUrl(storagePath);

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        contractor_id: contractor.id,
        file_name: uniqueFileName,
        original_name: file.name,
        description,
        category,
        version,
        file_path: storagePath,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (dbError) {
      // If database insert fails, try to clean up the uploaded file
      await supabase.storage.from('contractor-documents').remove([storagePath]);
      
      console.error('Failed to save file metadata:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save file metadata',
        details: dbError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: fileRecord,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove file
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Get file record to get storage path
    const { data: fileRecord, error: fetchError } = await supabase
      .from('project_files')
      .select('file_path')
      .eq('id', fileId)
      .eq('contractor_id', contractor.id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('contractor-documents')
      .remove([fileRecord.file_path]);

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId)
      .eq('contractor_id', contractor.id);

    if (dbError) {
      console.error('Failed to delete file record:', dbError);
      return NextResponse.json({ 
        error: 'Failed to delete file record',
        details: dbError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
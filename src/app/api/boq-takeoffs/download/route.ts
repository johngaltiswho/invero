import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Download BOQ takeoff file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const takeoffId = searchParams.get('id');

    if (!takeoffId) {
      return NextResponse.json({ error: 'Takeoff ID required' }, { status: 400 });
    }

    // Get takeoff record
    const { data: takeoff, error: fetchError } = await supabaseAdmin
      .from('boq_takeoffs')
      .select('file_url, file_name')
      .eq('id', takeoffId)
      .single();

    if (fetchError || !takeoff) {
      return NextResponse.json({ error: 'Takeoff not found' }, { status: 404 });
    }

    if (!takeoff.file_url) {
      return NextResponse.json({ error: 'No file URL found for this takeoff' }, { status: 404 });
    }

    // Extract file path from the stored URL (same logic as project files)
    let filePath: string;
    
    if (takeoff.file_url.includes('/storage/v1/object/public/contractor-documents/')) {
      const urlParts = takeoff.file_url.split('/storage/v1/object/public/contractor-documents/');
      filePath = urlParts[1];
    } else if (takeoff.file_url.includes('contractor-documents/')) {
      const urlParts = takeoff.file_url.split('contractor-documents/');
      filePath = urlParts[1];
    } else {
      // Assume it's already a file path
      filePath = takeoff.file_url;
    }

    // Generate fresh signed URL (expires in 1 hour, same as project files)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('contractor-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (urlError || !signedUrlData) {
      console.error('Failed to generate signed URL:', urlError);
      return NextResponse.json({ 
        error: 'Failed to generate download URL',
        details: urlError?.message 
      }, { status: 500 });
    }

    // Return the signed URL (same format as project files)
    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: signedUrlData.signedUrl,
        fileName: takeoff.file_name,
        mimeType: 'application/pdf'
      }
    });

  } catch (error) {
    console.error('Error generating takeoff download URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate download URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
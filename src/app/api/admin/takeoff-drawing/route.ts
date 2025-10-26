import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/takeoff-drawing - Get fresh signed URL for takeoff drawing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const takeoffId = searchParams.get('takeoff_id');

    if (!takeoffId) {
      return NextResponse.json(
        { error: 'takeoff_id is required' },
        { status: 400 }
      );
    }

    // Get the takeoff record to find the file path
    const { data: takeoff, error } = await supabaseAdmin
      .from('boq_takeoffs')
      .select('file_url, file_name')
      .eq('id', takeoffId)
      .single();

    if (error || !takeoff) {
      return NextResponse.json(
        { error: 'Takeoff not found' },
        { status: 404 }
      );
    }

    if (!takeoff.file_url) {
      return NextResponse.json(
        { error: 'No file URL found for this takeoff' },
        { status: 404 }
      );
    }

    // Try to extract file path from the stored URL
    let filePath: string;
    
    try {
      // If it's already a full URL, extract the path
      if (takeoff.file_url.includes('/storage/v1/object/')) {
        const urlParts = takeoff.file_url.split('/storage/v1/object/public/contractor-documents/');
        filePath = urlParts[1];
      } else if (takeoff.file_url.includes('contractor-documents/')) {
        // Extract path after bucket name
        const urlParts = takeoff.file_url.split('contractor-documents/');
        filePath = urlParts[1];
      } else {
        // Assume it's already a file path
        filePath = takeoff.file_url;
      }
    } catch (parseError) {
      console.error('Error parsing file URL:', parseError);
      return NextResponse.json(
        { error: 'Invalid file URL format' },
        { status: 400 }
      );
    }

    // Generate fresh signed URL (valid for 2 hours)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('contractor-documents')
      .createSignedUrl(filePath, 7200); // 2 hours

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: signedUrlData.signedUrl,
        fileName: takeoff.file_name,
        expiresAt: new Date(Date.now() + 7200 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating takeoff drawing URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate drawing URL' },
      { status: 500 }
    );
  }
}
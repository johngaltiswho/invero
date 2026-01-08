import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string; documentType: string }> }
) {
  try {
    // Check admin authentication
    await requireAdmin();

    const { contractorId, documentType } = await params;

    // Get contractor documents
    const { data: contractor, error } = await supabaseAdmin
      .from('contractors')
      .select('documents')
      .eq('id', contractorId)
      .single();

    if (error || !contractor) {
      return NextResponse.json({
        success: false,
        error: 'Contractor not found'
      }, { status: 404 });
    }

    const docInfo = contractor.documents[documentType];
    if (!docInfo || !docInfo.uploaded || !docInfo.file_url) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
    }

    // Extract file path from stored URL
    const urlParts = docInfo.file_url.split('/');
    const filePath = urlParts.slice(-2).join('/'); // Get last 2 parts: contractorId/filename

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('contractor-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate document access URL'
      }, { status: 500 });
    }

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);

  } catch (error) {
    console.error('Error serving document:', error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Authentication required' || error.message === 'Admin access required')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to serve document'
    }, { status: 500 });
  }
}
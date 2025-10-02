import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  try {
    // Check admin authentication
    await requireAdmin();

    // List all buckets
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to list buckets',
        details: bucketsError
      });
    }

    // Try to list files in contractor-documents bucket
    const { data: files, error: filesError } = await supabaseAdmin.storage
      .from('contractor-documents')
      .list();

    // Get bucket info specifically
    const contractorBucket = buckets?.find(b => b.name === 'contractor-documents');

    // Test creating a public URL
    const testUrl = supabaseAdmin.storage
      .from('contractor-documents')
      .getPublicUrl('test-file.txt');

    return NextResponse.json({
      success: true,
      data: {
        buckets: buckets?.map(b => ({
          name: b.name,
          id: b.id,
          public: b.public,
          created_at: b.created_at
        })),
        contractorBucket,
        filesInContractorBucket: files || [],
        filesError: filesError?.message,
        testPublicUrl: testUrl.data.publicUrl,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    });

  } catch (error) {
    console.error('Error in storage debug:', error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Authentication required' || error.message === 'Admin access required')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to debug storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
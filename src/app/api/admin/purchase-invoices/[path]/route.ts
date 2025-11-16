import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseInvoiceSignedUrl } from '@/lib/file-upload';
import { isAdmin } from '@/lib/admin-auth';

// GET /api/admin/purchase-invoices/[...path] - Get signed URL for PI file access from contractor-documents bucket
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Check admin authentication
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Reconstruct file path from route params
    const filePath = params.path.join('/');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Generate signed URL for file access
    const result = await getPurchaseInvoiceSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    // Return signed URL for file access
    return NextResponse.json({
      success: true,
      data: {
        signedUrl: result.url,
        expiresIn: 3600
      }
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
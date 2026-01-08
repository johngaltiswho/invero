import { NextRequest, NextResponse } from 'next/server';
import { uploadPurchaseInvoice } from '@/lib/file-upload';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/materials/[id]/upload-pi - Upload Purchase Invoice file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const materialId = id;
    
    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const contractorId = formData.get('contractorId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!contractorId) {
      return NextResponse.json(
        { error: 'Contractor ID is required' },
        { status: 400 }
      );
    }

    // Verify material exists and belongs to contractor
    const { data: material, error: materialError } = await supabaseAdmin
      .from('materials')
      .select('id, requested_by')
      .eq('id', materialId)
      .eq('requested_by', contractorId)
      .single();

    if (materialError || !material) {
      return NextResponse.json(
        { error: 'Material not found or access denied' },
        { status: 404 }
      );
    }

    // Upload file
    const uploadResult = await uploadPurchaseInvoice(file, contractorId, materialId);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 400 }
      );
    }

    // Update material with file URL
    const { data: updatedMaterial, error: updateError } = await supabaseAdmin
      .from('materials')
      .update({
        purchase_invoice_url: uploadResult.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', materialId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update material with file URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to update material with file information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        material: updatedMaterial,
        fileUrl: uploadResult.url,
        fileName: uploadResult.fileName
      },
      message: 'Purchase Invoice uploaded successfully'
    });

  } catch (error) {
    console.error('PI upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/materials/[id]/upload-pi - Get current PI file info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const materialId = id;

    const { data: material, error } = await supabaseAdmin
      .from('materials')
      .select('purchase_invoice_url')
      .eq('id', materialId)
      .single();

    if (error || !material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hasFile: !!material.purchase_invoice_url,
        fileUrl: material.purchase_invoice_url
      }
    });

  } catch (error) {
    console.error('Error fetching PI info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
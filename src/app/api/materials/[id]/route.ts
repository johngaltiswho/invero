import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadPurchaseInvoice } from '@/lib/file-upload';

// PUT /api/materials/[id] - Update material status and Finverno data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id: materialId } = await params;
    
    // Extract update data
    const {
      purchase_status,
      finverno_rate,
      finverno_tax_percentage,
      finverno_tax_amount,
      finverno_total_amount,
      purchase_invoice_url,
      finverno_submitted_at,
      contractor_notes
    } = body;

    // Validate required fields for purchase request submission
    if (purchase_status === 'purchase_request_raised') {
      if (!finverno_rate || finverno_rate <= 0) {
        return NextResponse.json(
          { error: 'Valid Finverno rate is required' },
          { status: 400 }
        );
      }
      
      if (!finverno_total_amount || finverno_total_amount <= 0) {
        return NextResponse.json(
          { error: 'Valid total amount is required' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Add fields that are provided
    if (purchase_status) updateData.purchase_status = purchase_status;
    if (finverno_rate !== undefined) updateData.finverno_rate = finverno_rate;
    if (finverno_tax_percentage !== undefined) updateData.finverno_tax_percentage = finverno_tax_percentage;
    if (finverno_tax_amount !== undefined) updateData.finverno_tax_amount = finverno_tax_amount;
    if (finverno_total_amount !== undefined) updateData.finverno_total_amount = finverno_total_amount;
    if (purchase_invoice_url) updateData.purchase_invoice_url = purchase_invoice_url;
    if (finverno_submitted_at) updateData.finverno_submitted_at = finverno_submitted_at;
    if (contractor_notes !== undefined) updateData.contractor_notes = contractor_notes;

    // Update material in database
    const { data: updatedMaterial, error } = await supabaseAdmin
      .from('materials')
      .update(updateData)
      .eq('id', materialId)
      .select(`
        *,
        contractors!materials_requested_by_fkey (
          company_name,
          contact_person,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update material' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMaterial,
      message: purchase_status === 'purchase_request_raised' 
        ? 'Purchase request submitted successfully'
        : 'Material updated successfully'
    });
  } catch (error) {
    console.error('Error updating material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/materials/[id] - Get single material details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;

    const { data: material, error } = await supabaseAdmin
      .from('materials')
      .select(`
        *,
        contractors!materials_requested_by_fkey (
          company_name,
          contact_person,
          email
        ),
        vendors!materials_vendor_id_fkey (
          company_name,
          contact_person,
          email,
          phone
        )
      `)
      .eq('id', materialId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/materials/[id] - Submit to Finverno with file upload
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    
    // Parse multipart form data
    const formData = await request.formData();
    
    // Extract purchase submission data
    const contractorId = formData.get('contractorId') as string;
    const vendorId = formData.get('vendorId') as string;
    const requestedQuantity = parseFloat(formData.get('requestedQuantity') as string);
    const quotedRate = parseFloat(formData.get('quotedRate') as string);
    const taxPercentage = parseFloat(formData.get('taxPercentage') as string) || 0;
    const taxAmount = parseFloat(formData.get('taxAmount') as string) || 0;
    const totalAmount = parseFloat(formData.get('totalAmount') as string);
    const contractorNotes = formData.get('contractorNotes') as string || '';
    const purchaseRequestId = formData.get('purchaseRequestId') as string;
    const file = formData.get('piFile') as File;

    // Validation
    if (!contractorId) {
      return NextResponse.json(
        { error: 'Contractor ID is required' },
        { status: 400 }
      );
    }

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    if (!quotedRate || quotedRate <= 0) {
      return NextResponse.json(
        { error: 'Valid quoted rate is required' },
        { status: 400 }
      );
    }

    if (!requestedQuantity || requestedQuantity <= 0) {
      return NextResponse.json(
        { error: 'Valid requested quantity is required' },
        { status: 400 }
      );
    }

    // Get current material to check available quantity
    const { data: currentMaterial, error: fetchError } = await supabaseAdmin
      .from('project_materials')
      .select('available_qty, quantity')
      .eq('id', materialId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    const availableQty = currentMaterial.available_qty || currentMaterial.quantity;
    
    if (requestedQuantity > availableQty) {
      return NextResponse.json(
        { error: `Cannot request ${requestedQuantity} units. Only ${availableQty} units available.` },
        { status: 400 }
      );
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid total amount is required' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Purchase Invoice file is required' },
        { status: 400 }
      );
    }

    if (!purchaseRequestId) {
      return NextResponse.json(
        { error: 'Purchase Request ID is required' },
        { status: 400 }
      );
    }

    // Verify project material exists and belongs to contractor
    const { data: material, error: materialError } = await supabaseAdmin
      .from('project_materials')
      .select('id, contractor_id, quantity')
      .eq('id', materialId)
      .eq('contractor_id', contractorId)
      .single();

    if (materialError || !material) {
      return NextResponse.json(
        { error: 'Material not found or access denied' },
        { status: 404 }
      );
    }

    // Upload PI file first
    const uploadResult = await uploadPurchaseInvoice(file, contractorId, materialId);
    
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: `File upload failed: ${uploadResult.error}` },
        { status: 400 }
      );
    }

    // Update material with purchase submission data
    const updateData = {
      purchase_status: 'purchase_request_raised',
      vendor_id: vendorId,
      requested_qty: requestedQuantity,
      quoted_rate: quotedRate,
      tax_percentage: taxPercentage,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      purchase_invoice_url: uploadResult.url,
      purchase_request_id: purchaseRequestId,
      submitted_at: new Date().toISOString(),
      contractor_notes: contractorNotes,
      updated_at: new Date().toISOString()
    };

    const { data: updatedMaterial, error: updateError } = await supabaseAdmin
      .from('project_materials')
      .update(updateData)
      .eq('id', materialId)
      .select(`
        *,
        contractors!materials_requested_by_fkey (
          company_name,
          contact_person,
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit to Finverno' },
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
      message: 'Purchase request submitted successfully'
    });

  } catch (error) {
    console.error('Finverno submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
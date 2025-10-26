import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/purchase-requests - Get all purchase requests for admin review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get materials with purchase requests using optimized schema
    const { data: purchaseRequests, error } = await supabaseAdmin
      .from('materials')
      .select(`
        id,
        name,
        description,
        category,
        unit,
        purchase_status,
        purchase_quantity,
        estimated_rate,
        quoted_rate,
        quoted_total,
        approved_amount,
        delivery_date,
        delivery_address,
        contractor_notes,
        admin_purchase_notes,
        vendor_pdf_url,
        quote_file_url,
        purchase_requested_at,
        purchase_approved_at,
        vendors!materials_vendor_id_fkey (
          name,
          contact_person,
          email,
          phone
        ),
        contractors!materials_requested_by_fkey (
          company_name,
          contact_person,
          email
        )
      `)
      .eq('purchase_status', status)
      .eq('approval_status', 'approved')
      .order('purchase_requested_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch purchase requests' },
        { status: 500 }
      );
    }

    // Get summary stats from materials table
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('materials')
      .select('purchase_status')
      .eq('approval_status', 'approved')
      .neq('purchase_status', 'none');

    let summary = {
      purchase_requested: 0,
      admin_review: 0,
      approved_for_purchase: 0,
      quote_received: 0,
      approved_for_funding: 0,
      purchase_completed: 0,
      rejected: 0
    };

    if (!statsError && stats) {
      summary = stats.reduce((acc, item) => {
        const status = item.purchase_status as keyof typeof acc;
        if (status in acc) {
          acc[status] = (acc[status] || 0) + 1;
        }
        return acc;
      }, summary);
    }

    return NextResponse.json({
      success: true,
      data: {
        requests: (purchaseRequests || []).map(material => ({
          id: material.id,
          project_id: material.project_context,
          contractor_id: material.requested_by,
          vendor_id: material.vendor_id,
          status: material.purchase_status,
          estimated_total: (material.purchase_quantity || 0) * (material.estimated_rate || 0),
          quoted_total: material.quoted_total,
          approved_amount: material.approved_amount,
          delivery_date: material.delivery_date,
          contractor_notes: material.contractor_notes,
          admin_notes: material.admin_purchase_notes,
          created_at: material.purchase_requested_at,
          contractors: material.contractors,
          vendors: material.vendors,
          purchase_request_items: [{
            id: material.id,
            item_name: material.name,
            item_description: material.description,
            unit: material.unit,
            quantity: material.purchase_quantity,
            estimated_rate: material.estimated_rate,
            quoted_rate: material.quoted_rate,
            selected_for_order: true
          }]
        })),
        summary,
        pagination: {
          limit,
          offset,
          total: purchaseRequests?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase requests' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/purchase-requests - Review a purchase request
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      material_id,
      action, // 'approve_for_purchase', 'reject', 'approve_for_funding'
      admin_notes,
      approved_amount
    } = body;

    if (!material_id || !action) {
      return NextResponse.json(
        { error: 'material_id and action are required' },
        { status: 400 }
      );
    }

    const validActions = ['approve_for_purchase', 'reject', 'approve_for_funding'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Update the material with purchase decision
    const updateData: any = {
      admin_purchase_notes: admin_notes,
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'approve_for_purchase':
        updateData.purchase_status = 'approved_for_purchase';
        updateData.purchase_approved_at = new Date().toISOString();
        break;
      case 'reject':
        updateData.purchase_status = 'rejected';
        break;
      case 'approve_for_funding':
        updateData.purchase_status = 'approved_for_funding';
        updateData.approved_amount = approved_amount;
        updateData.purchase_approved_at = new Date().toISOString();
        break;
    }

    const { data: updatedMaterial, error } = await supabaseAdmin
      .from('materials')
      .update(updateData)
      .eq('id', material_id)
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
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update purchase request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMaterial,
      message: `Purchase request ${action.replace('_', ' ')}d successfully`
    });
  } catch (error) {
    console.error('Error updating purchase request:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase request' },
      { status: 500 }
    );
  }
}
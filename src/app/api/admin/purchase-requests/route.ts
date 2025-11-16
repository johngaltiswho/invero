import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/purchase-requests - Get all purchase requests for admin review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get project materials with purchase requests
    const { data: purchaseRequests, error } = await supabaseAdmin
      .from('project_materials')
      .select(`
        id,
        project_id,
        contractor_id,
        vendor_id,
        purchase_request_id,
        quantity,
        requested_qty,
        unit,
        notes,
        purchase_status,
        quoted_rate,
        tax_percentage,
        tax_amount,
        total_amount,
        purchase_invoice_url,
        submitted_at,
        contractor_notes,
        created_at,
        materials:material_id (
          id,
          name,
          description,
          category,
          unit
        ),
        contractors!materials_requested_by_fkey (
          company_name,
          contact_person,
          email
        ),
        vendors:vendor_id (
          id,
          name,
          contact_person,
          email,
          phone
        )
      `)
      .eq('purchase_status', status)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch purchase requests' },
        { status: 500 }
      );
    }

    // Get summary stats from project_materials table
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('project_materials')
      .select('purchase_status')
      .neq('purchase_status', 'none');

    let summary = {
      purchase_requested: 0,
      quote_received: 0,
      purchase_request_raised: 0,
      approved_for_funding: 0,
      completed: 0,
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

    // Group materials by purchase_request_id to show as unified purchase requests
    const groupedRequests = new Map();
    
    (purchaseRequests || []).forEach(material => {
      const requestId = material.purchase_request_id;
      
      if (!requestId) {
        // Handle legacy materials without purchase_request_id (treat individually)
        const legacyId = `legacy_${material.id}`;
        groupedRequests.set(legacyId, {
          id: legacyId,
          project_id: material.project_id,
          contractor_id: material.contractor_id,
          vendor_id: material.vendor_id,
          status: material.purchase_status,
          contractor_notes: material.contractor_notes,
          created_at: material.submitted_at,
          submitted_at: material.submitted_at,
          purchase_invoice_url: material.purchase_invoice_url,
          contractors: material.contractors,
          vendors: material.vendors,
          purchase_request_items: [{
            id: material.id,
            item_name: material.materials?.name || 'Unknown Material',
            item_description: material.materials?.description || material.notes,
            unit: material.unit,
            quantity: material.requested_qty || material.quantity, // Show requested quantity
            quoted_rate: material.quoted_rate,
            tax_percentage: material.tax_percentage,
            selected_for_order: true
          }],
          estimated_total: (material.requested_qty || material.quantity || 0) * (material.quoted_rate || 0),
          quoted_total: material.total_amount || 0
        });
        return;
      }
      
      if (!groupedRequests.has(requestId)) {
        groupedRequests.set(requestId, {
          id: requestId,
          project_id: material.project_id,
          contractor_id: material.contractor_id,
          vendor_id: material.vendor_id,
          status: material.purchase_status,
          contractor_notes: material.contractor_notes,
          created_at: material.submitted_at,
          submitted_at: material.submitted_at,
          purchase_invoice_url: material.purchase_invoice_url,
          contractors: material.contractors,
          vendors: material.vendors,
          purchase_request_items: [],
          estimated_total: 0,
          quoted_total: 0
        });
      }
      
      const group = groupedRequests.get(requestId);
      
      // Add this material as an item to the group
      group.purchase_request_items.push({
        id: material.id,
        item_name: material.materials?.name || 'Unknown Material',
        item_description: material.materials?.description || material.notes,
        unit: material.unit,
        quantity: material.requested_qty || material.quantity, // Show requested quantity
        quoted_rate: material.quoted_rate,
        tax_percentage: material.tax_percentage,
        selected_for_order: true
      });
      
      // Update totals
      const itemTotal = (material.requested_qty || material.quantity || 0) * (material.quoted_rate || 0);
      group.estimated_total += itemTotal;
      group.quoted_total += material.total_amount || 0;
    });

    return NextResponse.json({
      success: true,
      data: {
        requests: Array.from(groupedRequests.values()),
        summary,
        pagination: {
          limit,
          offset,
          total: groupedRequests.size
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
      purchase_request_id,
      material_id, // For backward compatibility with legacy requests
      action, // 'approve_for_purchase', 'reject', 'approve_for_funding', 'approve_finverno_funding'
      admin_notes,
      approved_amount
    } = body;

    if (!purchase_request_id && !material_id) {
      return NextResponse.json(
        { error: 'purchase_request_id or material_id is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions = ['approve_for_purchase', 'reject', 'approve_for_funding', 'approve_finverno_funding'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Determine which materials to update based on purchase_request_id or material_id
    let whereClause: any;
    if (purchase_request_id) {
      whereClause = { purchase_request_id };
    } else {
      whereClause = { id: material_id };
    }

    // Get materials to update
    const { data: materialsToUpdate, error: fetchError } = await supabaseAdmin
      .from('project_materials')
      .select('id, available_qty, requested_qty')
      .match(whereClause);

    if (fetchError || !materialsToUpdate || materialsToUpdate.length === 0) {
      return NextResponse.json(
        { error: 'Purchase request or material not found' },
        { status: 404 }
      );
    }

    // Prepare update data for all materials in the purchase request
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
      case 'approve_finverno_funding':
        updateData.purchase_status = 'approved_for_funding';
        updateData.approved_amount = approved_amount;
        updateData.purchase_approved_at = new Date().toISOString();
        
        // For funding approval, we need to reduce available_qty and clear requested_qty for each material
        const materialUpdates = materialsToUpdate.map(material => ({
          id: material.id,
          available_qty: (material.available_qty || 0) - (material.requested_qty || 0),
          requested_qty: null
        }));
        
        // Update each material individually to handle quantity reductions
        for (const materialUpdate of materialUpdates) {
          await supabaseAdmin
            .from('project_materials')
            .update({
              ...updateData,
              available_qty: materialUpdate.available_qty,
              requested_qty: materialUpdate.requested_qty
            })
            .eq('id', materialUpdate.id);
        }
        break;
    }

    // If not funding approval, do bulk update
    if (action !== 'approve_for_funding' && action !== 'approve_finverno_funding') {
      const { error } = await supabaseAdmin
        .from('project_materials')
        .update(updateData)
        .match(whereClause);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Failed to update purchase request' },
          { status: 500 }
        );
      }
    }

    // Fetch updated materials for response
    const { data: updatedMaterials, error: selectError } = await supabaseAdmin
      .from('project_materials')
      .select(`
        *,
        materials:material_id (
          id,
          name,
          description,
          category,
          unit
        ),
        contractors!materials_requested_by_fkey (
          company_name,
          contact_person,
          email
        ),
        vendors:vendor_id (
          id,
          name,
          contact_person,
          email,
          phone
        )
      `)
      .match(whereClause);

    if (selectError) {
      console.error('Database error:', selectError);
      return NextResponse.json(
        { error: 'Failed to fetch updated purchase request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMaterials,
      message: `Purchase request ${action.replace('_', ' ')}d successfully`,
      materialsCount: updatedMaterials?.length || 0
    });
  } catch (error) {
    console.error('Error updating purchase request:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase request' },
      { status: 500 }
    );
  }
}
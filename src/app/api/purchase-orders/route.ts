import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Create or update vendor-grouped purchase order
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_material_id,
      vendor_id,
      purchase_quantity,
      delivery_date,
      delivery_address,
      contractor_notes,
      project_id
    } = body;

    if (!project_material_id || !vendor_id || !purchase_quantity || !project_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_material_id, vendor_id, purchase_quantity, project_id' 
      }, { status: 400 });
    }

    // Get contractor info
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Verify project material belongs to contractor and project
    const { data: projectMaterial, error: materialError } = await supabaseAdmin
      .from('project_materials')
      .select(`
        id, 
        quantity, 
        unit, 
        total_requested_qty, 
        remaining_qty,
        status,
        materials (
          name,
          category,
          unit,
          approval_status
        )
      `)
      .eq('id', project_material_id)
      .eq('project_id', project_id)
      .single();

    if (materialError || !projectMaterial) {
      return NextResponse.json({ error: 'Project material not found or not accessible' }, { status: 404 });
    }

    // Note: Project materials don't need approval_status check as they're already approved when added to project

    // Validate quantity
    const requestedQty = parseFloat(purchase_quantity.toString());
    const availableQty = projectMaterial.remaining_qty || projectMaterial.quantity || 0;
    
    if (requestedQty <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    if (requestedQty > availableQty) {
      return NextResponse.json({ 
        error: `Requested quantity (${requestedQty}) exceeds available quantity (${availableQty})` 
      }, { status: 400 });
    }

    // Check if there's already a draft purchase order for this vendor/project
    const { data: existingOrder, error: orderError } = await supabaseAdmin
      .from('purchase_orders')
      .select('id, order_number, status')
      .eq('project_id', project_id)
      .eq('vendor_id', vendor_id)
      .eq('contractor_id', contractor.id)
      .eq('status', 'draft')
      .maybeSingle();

    let purchaseOrder;

    if (existingOrder) {
      // Add to existing draft order
      purchaseOrder = existingOrder;
    } else {
      // Create new purchase order
      const { data: newOrder, error: createError } = await supabaseAdmin
        .from('purchase_orders')
        .insert({
          order_number: `PR-${Date.now().toString().slice(-6)}`, // Temporary order number
          project_id,
          vendor_id,
          contractor_id: contractor.id,
          status: 'draft',
          delivery_date,
          delivery_address,
          contractor_notes
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating purchase order:', createError);
        return NextResponse.json({ 
          error: 'Failed to create purchase order',
          details: createError.message 
        }, { status: 500 });
      }

      purchaseOrder = newOrder;
    }

    // Check if this material is already in the order
    const { data: existingItem } = await supabaseAdmin
      .from('purchase_order_items')
      .select('id, requested_quantity')
      .eq('purchase_order_id', purchaseOrder.id)
      .eq('project_material_id', project_material_id)
      .maybeSingle();

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.requested_quantity + requestedQty;
      
      if (newQuantity > availableQty) {
        return NextResponse.json({ 
          error: `Total requested quantity (${newQuantity}) would exceed available quantity (${availableQty})` 
        }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('purchase_order_items')
        .update({
          requested_quantity: newQuantity,
          line_total: newQuantity * 0 // Will be updated when rates are added
        })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Error updating purchase order item:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update purchase order item' 
        }, { status: 500 });
      }
    } else {
      // Add new item to purchase order
      const { error: itemError } = await supabaseAdmin
        .from('purchase_order_items')
        .insert({
          purchase_order_id: purchaseOrder.id,
          project_material_id: project_material_id,
          requested_quantity: requestedQty,
          estimated_rate: 0,
          line_total: requestedQty * 0
        });

      if (itemError) {
        console.error('Error adding purchase order item:', itemError);
        return NextResponse.json({ 
          error: 'Failed to add item to purchase order' 
        }, { status: 500 });
      }
    }

    // Update purchase order status to 'requested' if it was draft
    if (purchaseOrder.status === 'draft') {
      const { error: statusError } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: 'requested',
          requested_at: new Date().toISOString()
        })
        .eq('id', purchaseOrder.id);

      if (statusError) {
        console.error('Error updating purchase order status:', statusError);
      }
    }

    // Fetch the complete purchase order with items for response
    const { data: completePurchaseOrder, error: fetchError } = await supabaseAdmin
      .from('purchase_orders')
      .select(`
        *,
        vendors!purchase_orders_vendor_id_fkey (
          name,
          contact_person,
          email,
          phone
        ),
        purchase_order_items (
          *,
          project_materials (
            id,
            quantity,
            materials (
              name,
              unit,
              category
            )
          )
        )
      `)
      .eq('id', purchaseOrder.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete purchase order:', fetchError);
    }

    return NextResponse.json({
      success: true,
      data: completePurchaseOrder,
      message: `Material added to purchase order ${purchaseOrder.order_number}`
    });

  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create purchase order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Fetch purchase orders for contractor
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');

    // Get contractor info
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Build query
    let query = supabaseAdmin
      .from('purchase_orders')
      .select(`
        *,
        vendors!purchase_orders_vendor_id_fkey (
          name,
          contact_person,
          email,
          phone
        ),
        purchase_order_items (
          *,
          project_materials (
            id,
            quantity,
            materials (
              name,
              unit,
              category
            )
          )
        )
      `)
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: purchaseOrders, error } = await query;

    if (error) {
      console.error('Failed to fetch purchase orders:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch purchase orders',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: purchaseOrders || []
    });

  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchase orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
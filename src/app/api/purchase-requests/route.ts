import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch purchase requests for contractor
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('project_id');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('purchase_requests')
      .select(`
        *,
        vendors!purchase_requests_vendor_id_fkey (
          company_name,
          contact_person,
          email,
          phone
        ),
        purchase_request_items (
          id,
          item_name,
          item_description,
          unit,
          quantity,
          estimated_rate,
          quoted_rate,
          selected_for_order
        )
      `)
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: purchaseRequests, error } = await query;

    if (error) {
      console.error('Failed to fetch purchase requests:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch purchase requests',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: purchaseRequests || []
    });

  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchase requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new purchase request
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      vendor_id,
      items, // Array of items to include in purchase request
      delivery_date,
      delivery_address,
      priority = 'medium',
      contractor_notes
    } = body;

    if (!project_id || !vendor_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, vendor_id, items' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Calculate estimated total
    const estimated_total = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * (item.estimated_rate || 0));
    }, 0);

    // Create purchase request
    const { data: purchaseRequest, error: requestError } = await supabase
      .from('purchase_requests')
      .insert({
        project_id,
        contractor_id: contractor.id,
        vendor_id,
        delivery_date,
        delivery_address,
        priority,
        contractor_notes,
        estimated_total,
        status: 'pending'
      })
      .select()
      .single();

    if (requestError) {
      console.error('Failed to create purchase request:', requestError);
      return NextResponse.json({ 
        error: 'Failed to create purchase request',
        details: requestError.message 
      }, { status: 500 });
    }

    // Create purchase request items
    const requestItems = items.map((item: any) => ({
      purchase_request_id: purchaseRequest.id,
      material_request_id: item.material_request_id || null,
      item_name: item.item_name,
      item_description: item.item_description,
      item_category: item.item_category,
      unit: item.unit,
      quantity: item.quantity,
      estimated_rate: item.estimated_rate,
      selected_for_order: item.selected_for_order !== false // Default to true
    }));

    const { error: itemsError } = await supabase
      .from('purchase_request_items')
      .insert(requestItems);

    if (itemsError) {
      // Rollback purchase request if items creation failed
      await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', purchaseRequest.id);

      console.error('Failed to create purchase request items:', itemsError);
      return NextResponse.json({ 
        error: 'Failed to create purchase request items',
        details: itemsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: purchaseRequest,
      message: 'Purchase request created successfully'
    });

  } catch (error) {
    console.error('Error creating purchase request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create purchase request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update purchase request
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json({ error: 'Purchase request ID required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      selected_items, // Array of item IDs that contractor wants to include in final order
      delivery_date,
      delivery_address,
      contractor_notes,
      quote_file_url
    } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Update purchase request
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (delivery_date) updateData.delivery_date = delivery_date;
    if (delivery_address) updateData.delivery_address = delivery_address;
    if (contractor_notes !== undefined) updateData.contractor_notes = contractor_notes;
    if (quote_file_url) {
      updateData.quote_file_url = quote_file_url;
      updateData.status = 'quote_received';
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('purchase_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('contractor_id', contractor.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update purchase request:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update purchase request',
        details: updateError.message 
      }, { status: 500 });
    }

    // Update item selections if provided
    if (selected_items && Array.isArray(selected_items)) {
      // First, set all items to not selected
      await supabase
        .from('purchase_request_items')
        .update({ selected_for_order: false })
        .eq('purchase_request_id', requestId);

      // Then, set selected items to true
      if (selected_items.length > 0) {
        await supabase
          .from('purchase_request_items')
          .update({ selected_for_order: true })
          .eq('purchase_request_id', requestId)
          .in('id', selected_items);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Purchase request updated successfully'
    });

  } catch (error) {
    console.error('Error updating purchase request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update purchase request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
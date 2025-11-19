import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { CreatePurchaseRequestPayload } from '@/types/purchase-requests';

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

    // Build query for normalized purchase requests
    let query = supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        contractor_id,
        status,
        created_by,
        remarks,
        created_at,
        updated_at,
        submitted_at,
        approved_at,
        funded_at,
        approved_by,
        approval_notes,
        contractors:contractor_id (
          id,
          company_name,
          contact_person,
          email
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

    const body: CreatePurchaseRequestPayload = await request.json();
    const { project_id, contractor_id, remarks, items } = body;

    if (!project_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, items' 
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

    // Verify contractor matches request (if contractor_id is provided)
    if (contractor_id && contractor.id !== contractor_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('🚀 Creating purchase request for contractor:', contractor.id);
    console.log('📄 Request details:', { project_id, items: items.length, remarks });

    // Create purchase request with normalized schema
    const now = new Date().toISOString();
    const { data: purchaseRequest, error: requestError } = await supabase
      .from('purchase_requests')
      .insert({
        project_id,
        contractor_id: contractor.id,
        status: 'submitted',
        created_by: contractor.id,
        remarks: remarks || null,
        created_at: now,
        updated_at: now,
        submitted_at: now
      })
      .select()
      .single();

    if (requestError) {
      console.error('❌ Failed to create purchase request:', requestError);
      return NextResponse.json({ 
        error: 'Failed to create purchase request',
        details: requestError.message 
      }, { status: 500 });
    }

    console.log('✅ Purchase request created:', purchaseRequest.id);

    // Create purchase request items with normalized schema
    const requestItems = items.map((item) => ({
      purchase_request_id: purchaseRequest.id,
      project_material_id: item.project_material_id,
      requested_qty: item.requested_qty,
      unit_rate: item.unit_rate || null,
      tax_percent: item.tax_percent || 0,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('purchase_request_items')
      .insert(requestItems)
      .select();

    if (itemsError) {
      console.error('❌ Failed to create purchase request items:', itemsError);
      // Rollback: delete the purchase request
      await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', purchaseRequest.id);
      
      return NextResponse.json({ 
        error: 'Failed to create purchase request items',
        details: itemsError.message 
      }, { status: 500 });
    }

    console.log('✅ Purchase request items created:', createdItems.length);

    // Return the full purchase request with items
    return NextResponse.json({
      success: true,
      data: {
        ...purchaseRequest,
        items: createdItems,
        total_items: createdItems.length,
        total_requested_qty: createdItems.reduce((sum, item) => sum + item.requested_qty, 0)
      }
    });

  } catch (error) {
    console.error('💥 Error creating purchase request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create purchase request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Submit purchase request
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
    const { action, remarks } = body;

    if (action !== 'submit') {
      return NextResponse.json({ error: 'Only submit action is supported' }, { status: 400 });
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

    // Update purchase request to submitted status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('purchase_requests')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(remarks && { remarks })
      })
      .eq('id', requestId)
      .eq('contractor_id', contractor.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to submit purchase request:', updateError);
      return NextResponse.json({ 
        error: 'Failed to submit purchase request',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Purchase request submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting purchase request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit purchase request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

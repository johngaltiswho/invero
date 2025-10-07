import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor ID for the current user
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    let query = supabase
      .from('material_requests_detailed')
      .select('*')
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Failed to fetch material requests:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch material requests',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: requests,
      count: requests?.length || 0
    });

  } catch (error) {
    console.error('Error fetching material requests:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch material requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new material request
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      subcategory,
      unit,
      estimated_price,
      supplier_name,
      supplier_contact,
      specifications,
      brand,
      model_number,
      justification,
      project_context,
      urgency = 'normal'
    } = body;

    // Validate required fields
    if (!name || !category || !unit || !justification) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, category, unit, justification' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor ID
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, company_name, contact_person')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Check for potential duplicates
    const { data: duplicates } = await supabase
      .from('material_requests')
      .select('id, name, status')
      .eq('contractor_id', contractor.id)
      .eq('name', name)
      .eq('category', category)
      .in('status', ['pending', 'under_review', 'approved']);

    if (duplicates && duplicates.length > 0) {
      return NextResponse.json({ 
        error: 'A similar material request already exists',
        details: `Material "${name}" in category "${category}" is already requested with status: ${duplicates[0].status}`,
        duplicate_id: duplicates[0].id
      }, { status: 409 });
    }

    // Create the material request
    const requestData = {
      contractor_id: contractor.id,
      name,
      description,
      category,
      subcategory,
      unit,
      estimated_price: estimated_price ? parseFloat(estimated_price) : null,
      supplier_name,
      supplier_contact,
      specifications,
      brand,
      model_number,
      justification,
      project_context,
      urgency,
      status: 'pending'
    };

    const { data: newRequest, error: insertError } = await supabase
      .from('material_requests')
      .insert(requestData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create material request:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create material request',
        details: insertError.message 
      }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('material_request_activities')
      .insert({
        request_id: newRequest.id,
        activity_type: 'created',
        actor_id: user.id,
        actor_name: contractor.contact_person,
        message: `Material request created for "${name}"`,
        metadata: { category, urgency }
      });

    console.log(`✅ New material request created: ${name} by ${contractor.company_name}`);

    return NextResponse.json({
      success: true,
      data: newRequest,
      message: 'Material request submitted successfully. It will be reviewed by our admin team.'
    });

  } catch (error) {
    console.error('Error creating material request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create material request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update material request (only pending requests)
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor ID
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, contact_person')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Verify ownership and status
    const { data: existingRequest } = await supabase
      .from('material_requests')
      .select('id, status, name')
      .eq('id', id)
      .eq('contractor_id', contractor.id)
      .single();

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending requests can be updated',
        details: `Request status is: ${existingRequest.status}`
      }, { status: 400 });
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('material_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update material request',
        details: updateError.message 
      }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('material_request_activities')
      .insert({
        request_id: id,
        activity_type: 'updated',
        actor_id: user.id,
        actor_name: contractor.contact_person,
        message: `Material request updated`,
        metadata: updateData
      });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Material request updated successfully'
    });

  } catch (error) {
    console.error('Error updating material request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update material request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete material request (only pending requests)
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor ID
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Verify ownership and status
    const { data: existingRequest } = await supabase
      .from('material_requests')
      .select('id, status, name')
      .eq('id', id)
      .eq('contractor_id', contractor.id)
      .single();

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending requests can be deleted',
        details: `Request status is: ${existingRequest.status}`
      }, { status: 400 });
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('material_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to delete material request',
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Material request deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting material request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete material request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
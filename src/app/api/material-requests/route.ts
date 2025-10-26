import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch contractor's material requests (pending, approved, rejected)
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
      .from('materials')
      .select('*')
      .eq('requested_by', contractor.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('approval_status', status);
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
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
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
    const { data: existingMaterial } = await supabase
      .from('materials')
      .select('id, approval_status, name')
      .eq('id', id)
      .eq('requested_by', contractor.id)
      .single();

    if (!existingMaterial) {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }

    if (existingMaterial.approval_status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending requests can be updated',
        details: `Request status is: ${existingMaterial.approval_status}`
      }, { status: 400 });
    }

    // Update the request
    const { data: updatedMaterial, error: updateError } = await supabase
      .from('materials')
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

    return NextResponse.json({
      success: true,
      data: updatedMaterial,
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
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
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
    const { data: existingMaterial } = await supabase
      .from('materials')
      .select('id, approval_status, name')
      .eq('id', id)
      .eq('requested_by', contractor.id)
      .single();

    if (!existingMaterial) {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }

    if (existingMaterial.approval_status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending requests can be deleted',
        details: `Request status is: ${existingMaterial.approval_status}`
      }, { status: 400 });
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('materials')
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
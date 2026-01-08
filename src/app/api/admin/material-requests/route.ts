import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Admin-only endpoint for managing material requests
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // TODO: Add admin role check here
    // For now, assuming service role access
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const urgency = searchParams.get('urgency');
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('materials')
      .select(`
        *,
        contractors!materials_requested_by_fkey (
          company_name, contact_person, email
        )
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('approval_status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Failed to fetch material requests for admin:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch material requests',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('materials')
      .select('approval_status')
      .not('requested_by', 'is', null)
      .then(({ data }) => {
        if (!data) return { data: null };
        
        const summary = data.reduce((acc: any, req) => {
          acc[req.approval_status] = (acc[req.approval_status] || 0) + 1;
          acc.total = (acc.total || 0) + 1;
          return acc;
        }, {});

        return { data: summary };
      });

    return NextResponse.json({
      success: true,
      data: requests,
      stats: stats || {},
      count: requests?.length || 0
    });

  } catch (error) {
    console.error('Error fetching material requests for admin:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch material requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Review material request (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id, 
      action, // 'approve', 'reject', 'request_changes'
      review_notes,
      rejection_reason,
      create_material = false // Whether to create the material in master data
    } = body;

    if (!id || !action) {
      return NextResponse.json({ 
        error: 'Request ID and action are required' 
      }, { status: 400 });
    }

    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be: approve, reject, or request_changes' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the material request
    const { data: materialRequest, error: fetchError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !materialRequest) {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }

    if (materialRequest.approval_status !== 'pending') {
      return NextResponse.json({ 
        error: 'Request has already been processed',
        details: `Current status: ${materialRequest.approval_status}`
      }, { status: 400 });
    }

    let updateData: any = {
      approved_by: user.id,
      approval_date: new Date().toISOString()
    };

    let activityMessage = '';

    switch (action) {
      case 'approve':
        updateData.approval_status = 'approved';
        activityMessage = 'Material request approved and added to catalog';
        break;

      case 'reject':
        updateData.approval_status = 'rejected';
        updateData.rejection_reason = rejection_reason;
        activityMessage = `Material request rejected: ${rejection_reason}`;
        break;

      case 'request_changes':
        // Keep as pending, don't change approval_status
        activityMessage = `Changes requested: ${review_notes}`;
        // Don't update approval_status for this case
        delete updateData.approval_status;
        break;
    }

    // Update the material request
    const { data: updatedRequest, error: updateError } = await supabase
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

    console.log(`✅ Material request ${action}ed: ${materialRequest.name} by admin ${user.id}`);

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Material request ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error reviewing material request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to review material request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Not needed in simplified system
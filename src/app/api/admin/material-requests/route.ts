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
      .from('material_requests_detailed')
      .select(`
        *,
        material_request_activities (
          id, activity_type, actor_name, message, created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
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
        details: error.message 
      }, { status: 500 });
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('material_requests')
      .select('status')
      .then(({ data }) => {
        if (!data) return { data: null };
        
        const summary = data.reduce((acc: any, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
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
      .from('material_requests_detailed')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !materialRequest) {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }

    if (materialRequest.status !== 'pending' && materialRequest.status !== 'under_review') {
      return NextResponse.json({ 
        error: 'Request has already been processed',
        details: `Current status: ${materialRequest.status}`
      }, { status: 400 });
    }

    let updateData: any = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes
    };

    let activityMessage = '';
    let createdMaterialId = null;

    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        activityMessage = 'Material request approved';
        
        // Create material in master data if requested
        if (create_material) {
          const materialData = {
            name: materialRequest.name,
            description: materialRequest.description,
            category: materialRequest.category,
            subcategory: materialRequest.subcategory,
            unit: materialRequest.unit,
            current_price: materialRequest.estimated_price || 0,
            supplier_info: materialRequest.supplier_name ? {
              name: materialRequest.supplier_name,
              contact: materialRequest.supplier_contact
            } : null,
            specifications: materialRequest.specifications,
            is_active: true
          };

          const { data: newMaterial, error: materialError } = await supabase
            .from('materials')
            .insert(materialData)
            .select()
            .single();

          if (materialError) {
            console.error('Failed to create material:', materialError);
            return NextResponse.json({ 
              error: 'Failed to create material in master data',
              details: materialError.message 
            }, { status: 500 });
          }

          createdMaterialId = newMaterial.id;
          updateData.created_material_id = createdMaterialId;
          activityMessage += ` and added to material master data`;
        }
        break;

      case 'reject':
        updateData.status = 'rejected';
        updateData.rejection_reason = rejection_reason;
        activityMessage = `Material request rejected: ${rejection_reason}`;
        break;

      case 'request_changes':
        updateData.status = 'pending'; // Keep as pending but add review notes
        activityMessage = `Changes requested: ${review_notes}`;
        break;
    }

    // Update the material request
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
        activity_type: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'reviewed',
        actor_id: user.id,
        actor_name: user.firstName + ' ' + user.lastName || 'Admin',
        message: activityMessage,
        metadata: { 
          action, 
          review_notes, 
          rejection_reason, 
          created_material_id: createdMaterialId 
        }
      });

    console.log(`✅ Material request ${action}ed: ${materialRequest.name} by admin ${user.id}`);

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      created_material_id: createdMaterialId,
      message: `Material request ${action}ed successfully${createdMaterialId ? ' and added to material master' : ''}`
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

// POST - Add admin comment to request
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { request_id, comment } = body;

    if (!request_id || !comment) {
      return NextResponse.json({ 
        error: 'Request ID and comment are required' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Add comment as activity
    const { error: activityError } = await supabase
      .from('material_request_activities')
      .insert({
        request_id,
        activity_type: 'comment_added',
        actor_id: user.id,
        actor_name: user.firstName + ' ' + user.lastName || 'Admin',
        message: comment
      });

    if (activityError) {
      return NextResponse.json({ 
        error: 'Failed to add comment',
        details: activityError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add comment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
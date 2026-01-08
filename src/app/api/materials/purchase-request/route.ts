import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// POST - Request purchase for approved material
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      material_id, // Single material ID for individual requests
      material_ids, // Array of material IDs for batch requests
      vendor_id,
      purchase_quantity, // Single quantity for individual requests
      purchase_quantities, // Object mapping material_id to quantity for batch
      delivery_date,
      delivery_address,
      contractor_notes,
      project_context // Project ID to link the purchase request to
    } = body;

    // Support both single material and batch requests
    let materialIds: string[];
    if (material_id) {
      // Single material request
      materialIds = [material_id];
      if (!vendor_id || !purchase_quantity) {
        return NextResponse.json({ 
          error: 'Missing required fields: vendor_id and purchase_quantity' 
        }, { status: 400 });
      }
    } else if (material_ids && Array.isArray(material_ids) && material_ids.length > 0) {
      // Batch request
      materialIds = material_ids;
      if (!vendor_id) {
        return NextResponse.json({ 
          error: 'Missing required fields: vendor_id' 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Either material_id or material_ids array is required' 
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

    // Verify all materials belong to this contractor and are approved
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('id, name, approval_status, purchase_status, unit')
      .in('id', materialIds)
      .eq('requested_by', contractor.id);

    if (materialsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch materials',
        details: materialsError.message 
      }, { status: 500 });
    }

    if (!materials || materials.length !== materialIds.length) {
      return NextResponse.json({ 
        error: 'Some materials not found or not owned by this contractor' 
      }, { status: 404 });
    }

    // Check if all materials are approved and not already in purchase flow
    const invalidMaterials = materials.filter(m => 
      m.approval_status !== 'approved' || 
      (m.purchase_status !== 'none' && m.purchase_status !== 'rejected' && m.purchase_status !== 'cancelled')
    );

    if (invalidMaterials.length > 0) {
      return NextResponse.json({ 
        error: `Some materials are not eligible for purchase request: ${invalidMaterials.map(m => m.name).join(', ')}` 
      }, { status: 400 });
    }

    // Update materials with purchase request info
    const updatePromises = materialIds.map(async (materialId: string) => {
      let quantity: number;
      
      if (material_id) {
        // Single material request - use provided values
        quantity = purchase_quantity;
      } else {
        // Batch request - use mapping or defaults
        quantity = purchase_quantities?.[materialId] || 1;
      }

      return supabase
        .from('materials')
        .update({
          purchase_status: 'purchase_requested',
          vendor_id,
          purchase_quantity: quantity,
          delivery_date,
          delivery_address,
          contractor_notes,
          project_context, // Set the project context
          purchase_requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', materialId)
        .eq('requested_by', contractor.id);
    });

    const results = await Promise.all(updatePromises);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Failed to update some materials:', errors);
      return NextResponse.json({ 
        error: 'Failed to update some materials',
        details: errors.map(e => e.error?.message).join(', ')
      }, { status: 500 });
    }

    // Fetch updated materials with vendor info
    const { data: updatedMaterials, error: fetchError } = await supabase
      .from('materials')
      .select(`
        *,
        vendors!materials_vendor_id_fkey (
          name,
          contact_person,
          email,
          phone
        )
      `)
      .in('id', materialIds);

    if (fetchError) {
      console.error('Failed to fetch updated materials:', fetchError);
    }

    return NextResponse.json({
      success: true,
      data: updatedMaterials || [],
      message: `Purchase request created for ${materialIds.length} material${materialIds.length > 1 ? 's' : ''}`
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

// GET - Get materials eligible for purchase request
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
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

    // Build query for approved materials that haven't been requested for purchase yet
    let query = supabase
      .from('materials')
      .select('*')
      .eq('requested_by', contractor.id)
      .eq('approval_status', 'approved')
      .in('purchase_status', ['none', 'rejected', 'cancelled'])
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_context', projectId);
    }

    const { data: eligibleMaterials, error } = await query;

    if (error) {
      console.error('Failed to fetch eligible materials:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch eligible materials',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: eligibleMaterials || []
    });

  } catch (error) {
    console.error('Error fetching eligible materials:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch eligible materials',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch project materials
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const purchaseStatus = searchParams.get('purchase_status');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor to verify ownership
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Build query for project materials
    let query = supabase
      .from('project_materials')
      .select(`
        *,
        materials:material_id (
          id,
          name,
          category,
          unit
        )
      `)
      .eq('project_id', projectId)
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false });

    // Add purchase status filter if provided
    if (purchaseStatus) {
      query = query.eq('purchase_status', purchaseStatus);
    }

    const { data: projectMaterials, error } = await query;

    if (error) {
      console.error('Failed to fetch project materials:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch project materials',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: projectMaterials || []
    });

  } catch (error) {
    console.error('Error fetching project materials:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch project materials',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Add material to project
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      material_id,
      quantity,
      unit,
      notes,
      status = 'pending'
    } = body;

    if (!project_id || !material_id || !quantity || !unit) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, material_id, quantity, unit' 
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

    // Insert project material
    const { data: projectMaterial, error: insertError } = await supabase
      .from('project_materials')
      .insert({
        project_id,
        contractor_id: contractor.id,
        material_id,
        quantity: parseFloat(quantity),
        unit,
        notes,
        status
      })
      .select(`
        *,
        materials:material_id (
          id,
          name,
          category,
          unit
        )
      `)
      .single();

    if (insertError) {
      console.error('Failed to add project material:', insertError);
      return NextResponse.json({ 
        error: 'Failed to add project material',
        details: insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: projectMaterial
    });

  } catch (error) {
    console.error('Error adding project material:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add project material',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH - Update project material with purchase request info
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      purchase_status,
      vendor_id,
      requested_quantity,
      delivery_date,
      delivery_address,
      contractor_notes
    } = body;

    if (!id) {
      return NextResponse.json({ 
        error: 'Missing required field: id' 
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

    // Update project material with purchase request info
    const updateData: any = {};
    
    if (purchase_status) updateData.purchase_status = purchase_status;
    if (vendor_id) updateData.vendor_id = vendor_id;
    if (requested_quantity) {
      updateData.total_requested_qty = parseFloat(requested_quantity);
      // Update remaining quantity
      const { data: currentMaterial } = await supabase
        .from('project_materials')
        .select('quantity')
        .eq('id', id)
        .single();
      
      if (currentMaterial) {
        updateData.remaining_qty = currentMaterial.quantity - parseFloat(requested_quantity);
      }
    }
    // Note: vendor_id, delivery_date, delivery_address, contractor_notes are not in project_materials table
    // These will be stored at the purchase order level when created

    const { data: updatedMaterial, error: updateError } = await supabase
      .from('project_materials')
      .update(updateData)
      .eq('id', id)
      .eq('contractor_id', contractor.id)
      .select(`
        *,
        materials:material_id (
          id,
          name,
          category,
          unit
        )
      `)
      .single();

    if (updateError) {
      console.error('Failed to update project material:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update project material',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedMaterial
    });

  } catch (error) {
    console.error('Error updating project material:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update project material',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update material status
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, quantity, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
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

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (status !== undefined) updateData.status = status;
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
    if (notes !== undefined) updateData.notes = notes;

    // Update project material
    const { data: updatedMaterial, error: updateError } = await supabase
      .from('project_materials')
      .update(updateData)
      .eq('id', id)
      .eq('contractor_id', contractor.id)
      .select(`
        *,
        materials:material_id (
          id,
          name,
          category,
          unit
        )
      `)
      .single();

    if (updateError) {
      console.error('Failed to update project material:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update project material',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedMaterial
    });

  } catch (error) {
    console.error('Error updating project material:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update project material',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove material from project
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
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

    // Delete project material
    const { error: deleteError } = await supabase
      .from('project_materials')
      .delete()
      .eq('id', id)
      .eq('contractor_id', contractor.id);

    if (deleteError) {
      console.error('Failed to delete project material:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete project material',
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Project material removed successfully'
    });

  } catch (error) {
    console.error('Error deleting project material:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete project material',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
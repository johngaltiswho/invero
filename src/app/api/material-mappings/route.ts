import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🔍 Fetching material mappings for project:', projectId);

    // Fetch material mappings with material details
    const { data: mappings, error } = await supabase
      .from('boq_material_mappings')
      .select(`
        *,
        materials (
          id,
          name,
          description,
          category,
          unit,
          current_price
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch material mappings:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch material mappings',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    // Transform the data to include material details at the top level
    const transformedMappings = mappings?.map(mapping => ({
      ...mapping,
      material_name: mapping.materials?.name || 'Unknown Material',
      material_description: mapping.materials?.description,
      material_category: mapping.materials?.category,
      material_unit: mapping.materials?.unit,
      material_price: mapping.materials?.current_price
    })) || [];

    console.log('✅ Found', transformedMappings.length, 'material mappings');

    return NextResponse.json({
      success: true,
      data: transformedMappings,
      count: transformedMappings.length
    });

  } catch (error) {
    console.error('💥 Error fetching material mappings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch material mappings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new material mapping
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      project_id, 
      boq_item_id, 
      boq_item_description, 
      material_id, 
      suggested_quantity, 
      actual_quantity,
      unit_cost 
    } = body;

    if (!project_id || !material_id) {
      return NextResponse.json({ 
        error: 'Project ID and Material ID are required' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get material details for unit cost if not provided
    let materialUnitCost = unit_cost;
    if (!materialUnitCost) {
      const { data: material } = await supabase
        .from('materials')
        .select('current_price')
        .eq('id', material_id)
        .single();
      
      materialUnitCost = material?.current_price || 0;
    }

    const mappingData = {
      project_id,
      boq_item_id: boq_item_id || null,
      boq_item_description: boq_item_description || '',
      material_id,
      suggested_quantity: suggested_quantity || 0,
      actual_quantity: actual_quantity || null,
      unit_cost: materialUnitCost,
      status: 'user_modified',
      modified_by: user.id
    };

    const { data, error } = await supabase
      .from('boq_material_mappings')
      .insert(mappingData)
      .select(`
        *,
        materials (
          id, name, description, category, unit, current_price
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to create material mapping',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Material mapping created successfully'
    });

  } catch (error) {
    console.error('Error creating material mapping:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create material mapping',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update existing material mapping
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id,
      material_id, 
      suggested_quantity, 
      actual_quantity,
      unit_cost,
      status,
      modification_reason
    } = body;

    if (!id) {
      return NextResponse.json({ 
        error: 'Mapping ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updateData: any = {
      modified_by: user.id,
      status: status || 'user_modified'
    };

    if (material_id) updateData.material_id = material_id;
    if (suggested_quantity !== undefined) updateData.suggested_quantity = suggested_quantity;
    if (actual_quantity !== undefined) updateData.actual_quantity = actual_quantity;
    if (unit_cost !== undefined) updateData.unit_cost = unit_cost;
    if (modification_reason) updateData.modification_reason = modification_reason;

    const { data, error } = await supabase
      .from('boq_material_mappings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        materials (
          id, name, description, category, unit, current_price
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to update material mapping',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Material mapping updated successfully'
    });

  } catch (error) {
    console.error('Error updating material mapping:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update material mapping',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove material mapping
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Mapping ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('boq_material_mappings')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to delete material mapping',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Material mapping deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting material mapping:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete material mapping',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
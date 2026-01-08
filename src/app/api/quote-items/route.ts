import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch quote line items for a project
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get line items via project_boqs junction
    const { data: items, error } = await supabaseAdmin
      .from('boq_items')
      .select(`
        id,
        description,
        quantity_numeric as quantity,
        unit,
        rate,
        amount,
        line_order,
        notes,
        boq_id,
        project_boqs!inner(project_id)
      `)
      .eq('project_boqs.project_id', projectId)
      .order('line_order', { ascending: true });

    if (error) {
      console.error('Error fetching quote items:', error);
      return NextResponse.json({ error: 'Failed to fetch quote items' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      items: items || [] 
    });

  } catch (error) {
    console.error('Error in quote-items GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add new quote line item
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, description, quantity, unit, rate, notes, line_order } = body;

    if (!project_id || !description || quantity === undefined || rate === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, description, quantity, rate' 
      }, { status: 400 });
    }

    // First, find or create a BOQ record for this project
    let boqId = null;
    
    // Check if project has existing BOQ
    const { data: existingBoq } = await supabaseAdmin
      .from('project_boqs')
      .select('id')
      .eq('project_id', project_id)
      .single();

    if (existingBoq) {
      boqId = existingBoq.id;
    } else {
      // Get contractor_id from the project
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('contractor_id')
        .eq('id', project_id)
        .single();

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Create new BOQ record
      const { data: newBoq, error: boqError } = await supabaseAdmin
        .from('project_boqs')
        .insert({
          project_id,
          contractor_id: project.contractor_id,
          file_name: 'Manual Entry',
          total_amount: 0 // Will be updated
        })
        .select('id')
        .single();

      if (boqError) {
        console.error('Error creating BOQ:', boqError);
        return NextResponse.json({ error: 'Failed to create BOQ' }, { status: 500 });
      }
      
      boqId = newBoq.id;
    }

    // Add the line item
    const { data: item, error } = await supabaseAdmin
      .from('boq_items')
      .insert({
        boq_id: boqId,
        description,
        quantity_numeric: quantity,
        unit,
        rate,
        amount: quantity * rate,
        line_order: line_order || 0,
        notes,
        category: 'line_item'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quote item:', error);
      return NextResponse.json({ error: 'Failed to create quote item' }, { status: 500 });
    }

    // Update BOQ total
    await updateBOQTotal(boqId);

    return NextResponse.json({ 
      success: true, 
      item: {
        id: item.id,
        description: item.description,
        quantity: item.quantity_numeric,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount,
        line_order: item.line_order,
        notes: item.notes
      }
    });

  } catch (error) {
    console.error('Error in quote-items POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update quote line item
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id, description, quantity, unit, rate, notes, line_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (quantity !== undefined) {
      updateData.quantity_numeric = quantity;
      updateData.amount = quantity * (rate || 0); // Recalculate amount
    }
    if (unit !== undefined) updateData.unit = unit;
    if (rate !== undefined) {
      updateData.rate = rate;
      updateData.amount = (quantity || 0) * rate; // Recalculate amount
    }
    if (notes !== undefined) updateData.notes = notes;
    if (line_order !== undefined) updateData.line_order = line_order;

    const { data: item, error } = await supabaseAdmin
      .from('boq_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote item:', error);
      return NextResponse.json({ error: 'Failed to update quote item' }, { status: 500 });
    }

    // Update BOQ total
    await updateBOQTotal(item.boq_id);

    return NextResponse.json({ 
      success: true, 
      item: {
        id: item.id,
        description: item.description,
        quantity: item.quantity_numeric,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount,
        line_order: item.line_order,
        notes: item.notes
      }
    });

  } catch (error) {
    console.error('Error in quote-items PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete quote line item
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Get boq_id before deleting
    const { data: item } = await supabaseAdmin
      .from('boq_items')
      .select('boq_id')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('boq_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting quote item:', error);
      return NextResponse.json({ error: 'Failed to delete quote item' }, { status: 500 });
    }

    // Update BOQ total
    if (item?.boq_id) {
      await updateBOQTotal(item.boq_id);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in quote-items DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update BOQ total
async function updateBOQTotal(boqId: string) {
  try {
    // Calculate total from all line items
    const { data: items } = await supabaseAdmin
      .from('boq_items')
      .select('amount')
      .eq('boq_id', boqId);

    const total = items?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

    // Update project_boqs total
    await supabaseAdmin
      .from('project_boqs')
      .update({ total_amount: total })
      .eq('id', boqId);

  } catch (error) {
    console.error('Error updating BOQ total:', error);
  }
}
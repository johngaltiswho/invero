import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// PUT /api/project-materials/[id] - Update project material
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: materialId } = await params;
    const body = await request.json();

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
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

    // Update the project material (verify ownership)
    const { data: updatedMaterial, error: updateError } = await supabase
      .from('project_materials')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', materialId)
      .eq('contractor_id', contractor.id)
      .select()
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
      data: updatedMaterial,
      message: 'Material updated successfully'
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

// DELETE /api/project-materials/[id] - Remove material from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: materialId } = await params;

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
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

    // Delete the project material (verify ownership)
    const { error: deleteError } = await supabase
      .from('project_materials')
      .delete()
      .eq('id', materialId)
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
      message: 'Material deleted from project successfully'
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
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/contractor-pumps/[contractor_id]
 * Get approved pumps for a contractor
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contractor_id: string }> }
) {
  try {
    const params = await context.params;
    const contractorId = params.contractor_id;

    const { data: approvedPumps, error } = await supabaseAdmin
      .from('contractor_approved_pumps')
      .select(`
        id,
        pump_id,
        is_active,
        created_at,
        fuel_pumps (
          id,
          pump_name,
          address,
          city,
          state,
          pincode,
          contact_person,
          contact_phone
        )
      `)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch contractor pumps:', error);
      return NextResponse.json(
        { error: 'Failed to load approved pumps' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: approvedPumps || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/contractor-pumps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/contractor-pumps/[contractor_id]
 * Add a pump to contractor's approved list
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ contractor_id: string }> }
) {
  try {
    const params = await context.params;
    const contractorId = params.contractor_id;
    const body = await request.json();
    const { pump_id } = body;

    if (!pump_id) {
      return NextResponse.json(
        { error: 'pump_id is required' },
        { status: 400 }
      );
    }

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('contractor_approved_pumps')
      .select('id, is_active')
      .eq('contractor_id', contractorId)
      .eq('pump_id', pump_id)
      .maybeSingle();

    if (existing) {
      if (!existing.is_active) {
        // Reactivate
        const { data, error } = await supabaseAdmin
          .from('contractor_approved_pumps')
          .update({ is_active: true })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) throw error;

        return NextResponse.json({
          success: true,
          data,
          message: 'Pump reactivated successfully',
        });
      }

      return NextResponse.json(
        { error: 'Pump already approved for this contractor' },
        { status: 409 }
      );
    }

    // Create new approval
    const { data: newApproval, error } = await supabaseAdmin
      .from('contractor_approved_pumps')
      .insert({
        contractor_id: contractorId,
        pump_id,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to approve pump:', error);
      return NextResponse.json(
        { error: 'Failed to approve pump' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newApproval,
      message: 'Pump approved successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/contractor-pumps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/contractor-pumps/[contractor_id]?pump_id=xxx
 * Remove a pump from contractor's approved list
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ contractor_id: string }> }
) {
  try {
    const params = await context.params;
    const contractorId = params.contractor_id;
    const searchParams = request.nextUrl.searchParams;
    const pumpId = searchParams.get('pump_id');

    if (!pumpId) {
      return NextResponse.json(
        { error: 'pump_id query parameter is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabaseAdmin
      .from('contractor_approved_pumps')
      .update({ is_active: false })
      .eq('contractor_id', contractorId)
      .eq('pump_id', pumpId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to remove pump:', error);
      return NextResponse.json(
        { error: 'Failed to remove pump' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Pump removed successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/contractor-pumps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/pump/approvals?pump_id=xxx&status=pending
 * List all fuel approvals for a pump
 * Public endpoint - pump owners can view their assigned approvals
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pumpId = searchParams.get('pump_id');
    const status = searchParams.get('status') as 'pending' | 'filled' | 'expired' | 'cancelled' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!pumpId) {
      return NextResponse.json(
        { error: 'pump_id query parameter is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('fuel_approvals')
      .select(`
        id,
        approval_code,
        vehicle_id,
        contractor_id,
        max_amount,
        max_liters,
        valid_from,
        valid_until,
        status,
        auto_approved,
        requested_notes,
        filled_at,
        filled_quantity,
        filled_amount,
        pump_notes,
        created_at,
        vehicles (
          vehicle_number,
          vehicle_type
        ),
        contractors (
          company_name,
          contact_person,
          phone
        )
      `, { count: 'exact' })
      .eq('pump_id', pumpId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    const { data: approvals, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Failed to fetch pump approvals:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load approvals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: approvals || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/pump/approvals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

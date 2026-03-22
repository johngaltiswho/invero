import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/fuel-expenses
 * List all fuel expenses for admin review
 * Query params:
 *   - status: Filter by status (pending_review, approved, rejected, etc.)
 *   - contractor_id: Filter by contractor
 *   - limit: Max results (default 50)
 *   - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const contractorId = searchParams.get('contractor_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabaseAdmin
      .from('fuel_expenses')
      .select(`
        *,
        vehicle:vehicles(id, vehicle_number, vehicle_type),
        contractor:contractors(id, company_name, contact_person)
      `, { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (contractorId) {
      query = query.eq('contractor_id', contractorId);
    }

    const { data: expenses, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Failed to fetch fuel expenses:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load fuel expenses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expenses || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/fuel-expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

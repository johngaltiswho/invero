import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { PumpAuthError, requirePumpSession } from '@/lib/pump-auth';
import { getProviderSettlementSummary } from '@/lib/fuel/finance';

/**
 * GET /api/pump/approvals
 * List pump-scoped pending approvals and recent fills
 */
export async function GET(request: NextRequest) {
  try {
    const { pumpId } = await requirePumpSession(request);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'pending' | 'filled' | 'expired' | 'cancelled' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    const pendingApprovals = (approvals || []).filter((approval: any) => approval.status === 'pending');
    const recentFills = (approvals || []).filter((approval: any) => approval.status === 'filled');
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);
    const todayFills = recentFills.filter((approval: any) => String(approval.filled_at || '').startsWith(todayKey));
    const monthFills = recentFills.filter((approval: any) => String(approval.filled_at || '').startsWith(monthKey));

    const providerSummary = await getProviderSettlementSummary(pumpId);

    return NextResponse.json({
      success: true,
      data: approvals || [],
      pendingApprovals,
      recentFills,
      summary: {
        pendingCount: pendingApprovals.length,
        todayFilledCount: todayFills.length,
        todayLitersDispensed: todayFills.reduce((sum: number, row: any) => sum + Number(row.filled_quantity || 0), 0),
        todayAmountDispensed: todayFills.reduce((sum: number, row: any) => sum + Number(row.filled_amount || 0), 0),
        monthFilledCount: monthFills.length,
        monthLitersDispensed: monthFills.reduce((sum: number, row: any) => sum + Number(row.filled_quantity || 0), 0),
        monthAmountDispensed: monthFills.reduce((sum: number, row: any) => sum + Number(row.filled_amount || 0), 0),
        outstandingPayableAmount: providerSummary.outstandingPayableAmount,
        totalSettledAmount: providerSummary.totalSettledAmount,
      },
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    if (error instanceof PumpAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in GET /api/pump/approvals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/admin/delivery
 * Admin marks a purchase request as dispatched and sets the dispute window.
 * Body: {
 *   purchase_request_id: string,
 *   dispute_window_hours?: number  (default 48, max 72)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { purchase_request_id, dispute_window_hours = 48 } = body;

    if (!purchase_request_id) {
      return NextResponse.json({ error: 'purchase_request_id is required' }, { status: 400 });
    }

    const hours = Math.min(Math.max(Number(dispute_window_hours) || 48, 24), 72);

    const supabase = supabaseAdmin();

    // Verify the purchase request exists
    const { data: pr, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('id, delivery_status, contractor_id')
      .eq('id', purchase_request_id)
      .single();

    if (fetchError || !pr) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    if (pr.delivery_status !== 'not_dispatched') {
      return NextResponse.json(
        { error: `Cannot dispatch: current status is '${pr.delivery_status}'` },
        { status: 400 }
      );
    }

    const now = new Date();
    const disputeDeadline = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const { error: updateError } = await supabase
      .from('purchase_requests')
      .update({
        delivery_status: 'dispatched',
        dispatched_at: now.toISOString(),
        dispute_deadline: disputeDeadline.toISOString(),
      })
      .eq('id', purchase_request_id);

    if (updateError) {
      console.error('Error marking as dispatched:', updateError);
      return NextResponse.json({ error: 'Failed to update delivery status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Purchase request marked as dispatched. Dispute window: ${hours} hours (closes ${disputeDeadline.toISOString()}).`,
      dispute_deadline: disputeDeadline.toISOString(),
    });
  } catch (err) {
    console.error('Admin delivery POST error:', err);
    if (err instanceof Error) {
      if (err.message === 'Authentication required') {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      if (err.message === 'Admin access required') {
        return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/delivery
 * Admin view: all purchase requests with delivery status across all contractors.
 * Query params: status (dispatched|disputed|delivered), contractor_id
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const supabase = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const contractorId = searchParams.get('contractor_id');

    let query = supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        contractor_id,
        status,
        delivery_status,
        dispatched_at,
        dispute_deadline,
        dispute_raised_at,
        dispute_reason,
        delivered_at,
        invoice_generated_at,
        contractors ( id, company_name, email )
      `)
      .neq('delivery_status', 'not_dispatched')
      .order('dispatched_at', { ascending: false });

    if (status) query = query.eq('delivery_status', status);
    if (contractorId) query = query.eq('contractor_id', contractorId);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch delivery data' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Admin delivery GET error:', err);
    if (err instanceof Error) {
      if (err.message === 'Authentication required') {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      if (err.message === 'Admin access required') {
        return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

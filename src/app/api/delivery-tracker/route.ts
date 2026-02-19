import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { createSignedUrlWithFallback } from '@/lib/storage-url';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getContractor(userId: string) {
  const { data } = await supabaseAdmin()
    .from('contractors')
    .select('id, company_name, gstin, verification_status, status')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

/**
 * GET /api/delivery-tracker
 * Returns purchase requests that have been dispatched/disputed/delivered for this contractor.
 * Query params: project_id (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const contractor = await getContractor(userId);
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    const supabase = supabaseAdmin();

    let query = supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        status,
        delivery_status,
        dispatched_at,
        dispute_deadline,
        dispute_raised_at,
        dispute_reason,
        delivered_at,
        invoice_generated_at,
        invoice_url,
        created_at,
        remarks,
        purchase_request_items (
          id,
          hsn_code,
          requested_qty,
          unit_rate,
          tax_percent,
          project_materials (
            id,
            materials ( name, unit, hsn_code )
          )
        )
      `)
      .eq('contractor_id', contractor.id)
      .neq('delivery_status', 'not_dispatched')
      .order('dispatched_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching delivery tracker:', error);
      return NextResponse.json({ error: 'Failed to fetch delivery data' }, { status: 500 });
    }

    const invoiceBucket = process.env.INVOICE_STORAGE_BUCKET || 'contractor-documents';
    const enriched = await Promise.all(
      (data || []).map(async (requestRow: any) => {
        const fallbackPath = `${contractor.id}/invoices/${requestRow.id}.pdf`;
        const signedUrl = await createSignedUrlWithFallback(supabase, {
          sourceUrl: requestRow.invoice_url,
          defaultBucket: invoiceBucket,
          fallbackPath
        });

        return {
          ...requestRow,
          invoice_download_url: signedUrl || requestRow.invoice_url || null
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Delivery tracker GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/delivery-tracker
 * Contractor raises a dispute for a dispatched purchase request.
 * Body: { purchase_request_id: string, dispute_reason: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const contractor = await getContractor(userId);
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

    const body = await request.json();
    const { purchase_request_id, dispute_reason } = body;

    if (!purchase_request_id || !dispute_reason?.trim()) {
      return NextResponse.json(
        { error: 'purchase_request_id and dispute_reason are required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    // Fetch the purchase request and verify ownership + eligibility
    const { data: pr, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('id, contractor_id, delivery_status, dispute_deadline')
      .eq('id', purchase_request_id)
      .single();

    if (fetchError || !pr) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    if (pr.contractor_id !== contractor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (pr.delivery_status !== 'dispatched') {
      return NextResponse.json(
        { error: `Cannot raise dispute: delivery status is '${pr.delivery_status}'` },
        { status: 400 }
      );
    }

    if (pr.dispute_deadline && new Date(pr.dispute_deadline) < new Date()) {
      return NextResponse.json(
        { error: 'Dispute window has closed. Goods are deemed delivered.' },
        { status: 400 }
      );
    }

    // Record the dispute
    const { error: updateError } = await supabase
      .from('purchase_requests')
      .update({
        delivery_status: 'disputed',
        dispute_raised_at: new Date().toISOString(),
        dispute_reason: dispute_reason.trim(),
      })
      .eq('id', purchase_request_id);

    if (updateError) {
      console.error('Error raising dispute:', updateError);
      return NextResponse.json({ error: 'Failed to raise dispute' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Dispute raised successfully. Our team will review and contact you shortly.',
    });
  } catch (err) {
    console.error('Delivery tracker POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/delivery-tracker
 * Contractor manually confirms delivery.
 * Body: { purchase_request_id: string, action: 'confirm' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const contractor = await getContractor(userId);
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

    const body = await request.json();
    const { purchase_request_id, action } = body;

    if (!purchase_request_id || action !== 'confirm') {
      return NextResponse.json({ error: 'purchase_request_id and action=confirm are required' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data: pr, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('id, contractor_id, delivery_status, project_id')
      .eq('id', purchase_request_id)
      .single();

    if (fetchError || !pr) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    if (pr.contractor_id !== contractor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (pr.delivery_status !== 'dispatched') {
      return NextResponse.json(
        { error: `Cannot confirm: delivery status is '${pr.delivery_status}'` },
        { status: 400 }
      );
    }

    // Mark as delivered — the invoices API/cron will pick this up
    const { error: updateError } = await supabase
      .from('purchase_requests')
      .update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', purchase_request_id);

    if (updateError) {
      console.error('Error confirming delivery:', updateError);
      return NextResponse.json({ error: 'Failed to confirm delivery' }, { status: 500 });
    }

    // Trigger invoice generation inline
    try {
      const appOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      const internalSecret = process.env.CRON_SECRET;
      if (!internalSecret) {
        console.warn('CRON_SECRET is not configured. Invoice generation call may be rejected.');
      }

      const invoiceRes = await fetch(`${appOrigin}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
        },
        body: JSON.stringify({ purchase_request_id }),
      });
      if (!invoiceRes.ok) {
        const msg = await invoiceRes.text();
        console.error('Invoice generation request failed:', invoiceRes.status, msg);
      }
    } catch {
      // Non-blocking — cron will catch it if this fails
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery confirmed. Invoice is being generated.',
    });
  } catch (err) {
    console.error('Delivery tracker PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

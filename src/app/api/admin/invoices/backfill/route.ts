import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type DeliveredRequestRow = {
  id: string;
  invoice_generated_at?: string | null;
  invoice_url?: string | null;
};

type ExistingInvoiceRow = {
  id?: string;
  purchase_request_id: string;
};

async function authorizeBackfill(request: NextRequest) {
  const providedSecret = request.headers.get('x-internal-secret');
  const expectedSecret = process.env.BACKFILL_SECRET || process.env.CRON_SECRET;

  if (expectedSecret && providedSecret === expectedSecret) {
    return;
  }

  await requireAdmin();
}

export async function POST(request: NextRequest) {
  try {
    await authorizeBackfill(request);

    const supabase = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);
    const forceRegenerate = searchParams.get('force') === 'true';

    const { data: deliveredRequests, error: deliveredError } = await supabase
      .from('purchase_requests')
      .select('id, invoice_generated_at, invoice_url')
      .eq('delivery_status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(limit);

    if (deliveredError) {
      return NextResponse.json({ error: 'Failed to fetch delivered requests' }, { status: 500 });
    }

    const delivered = deliveredRequests || [];
    if (delivered.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No delivered purchase requests found',
        generated: 0,
        skipped: 0,
        errors: []
      });
    }

    const deliveredIds = (delivered as DeliveredRequestRow[]).map((row) => row.id);
    const { data: existingInvoices, error: existingInvoicesError } = await supabase
      .from('invoices')
      .select('id, purchase_request_id')
      .in('purchase_request_id', deliveredIds);

    if (existingInvoicesError) {
      return NextResponse.json({ error: 'Failed to fetch existing invoices' }, { status: 500 });
    }

    const existingInvoicePrIds = new Set((existingInvoices as ExistingInvoiceRow[] | null || []).map((row) => row.purchase_request_id));
    const candidateRequestIds = forceRegenerate
      ? (delivered as DeliveredRequestRow[]).map((row) => row.id)
      : (delivered as DeliveredRequestRow[])
          .filter((row) => !existingInvoicePrIds.has(row.id) || !row.invoice_generated_at || !row.invoice_url)
          .map((row) => row.id);

    if (candidateRequestIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All delivered purchase requests already have invoices',
        generated: 0,
        skipped: delivered.length,
        errors: []
      });
    }

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const internalSecret = process.env.CRON_SECRET;
    const results: { purchase_request_id: string; status: 'generated' | 'failed'; message?: string }[] = [];

    for (const purchaseRequestId of candidateRequestIds) {
      try {
        const response = await fetch(`${appOrigin}/api/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(internalSecret ? { 'x-internal-secret': internalSecret } : {})
          },
          body: JSON.stringify({
            purchase_request_id: purchaseRequestId,
            force_regenerate: forceRegenerate
          })
        });
        const payload = await response.json();
        if (response.ok && payload?.success) {
          results.push({ purchase_request_id: purchaseRequestId, status: 'generated' });
        } else {
          results.push({
            purchase_request_id: purchaseRequestId,
            status: 'failed',
            message: payload?.error || `HTTP ${response.status}`
          });
        }
      } catch (error) {
        results.push({
          purchase_request_id: purchaseRequestId,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const generated = results.filter((r) => r.status === 'generated').length;
    const errors = results.filter((r) => r.status === 'failed');

    return NextResponse.json({
      success: true,
      message: forceRegenerate ? 'Invoice regeneration completed' : 'Invoice backfill completed',
      scanned: delivered.length,
      attempted: candidateRequestIds.length,
      generated,
      skipped: delivered.length - candidateRequestIds.length,
      force: forceRegenerate,
      errors
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }
    }
    console.error('Admin invoice backfill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await authorizeBackfill(request);

    const supabase = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

    const { data: deliveredRequests, error: deliveredError } = await supabase
      .from('purchase_requests')
      .select('id, invoice_generated_at, invoice_url')
      .eq('delivery_status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(limit);

    if (deliveredError) {
      return NextResponse.json({ error: 'Failed to fetch delivered requests' }, { status: 500 });
    }

    const delivered = deliveredRequests || [];
    const deliveredIds = (delivered as DeliveredRequestRow[]).map((row) => row.id);

    const { data: existingInvoices, error: existingInvoicesError } = await supabase
      .from('invoices')
      .select('purchase_request_id')
      .in('purchase_request_id', deliveredIds.length > 0 ? deliveredIds : ['00000000-0000-0000-0000-000000000000']);

    if (existingInvoicesError) {
      return NextResponse.json({ error: 'Failed to fetch existing invoices' }, { status: 500 });
    }

    const existingInvoicePrIds = new Set((existingInvoices as ExistingInvoiceRow[] | null || []).map((row) => row.purchase_request_id));
    const missingInvoiceIds = (delivered as DeliveredRequestRow[])
      .filter((row) => !existingInvoicePrIds.has(row.id) || !row.invoice_generated_at || !row.invoice_url)
      .map((row) => row.id);

    return NextResponse.json({
      success: true,
      scanned: delivered.length,
      missing_count: missingInvoiceIds.length,
      missing_purchase_request_ids: missingInvoiceIds
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }
    }
    console.error('Admin invoice backfill dry-run error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Cron route: Check for purchase requests past their dispute deadline
 * and auto-generate invoices (deemed delivery).
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 * Schedule: Every hour (set up via Vercel Cron, GitHub Actions, or external cron service)
 *
 * Example Vercel cron config in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/check-deemed-delivery", "schedule": "0 * * * *" }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = supabaseAdmin();

    // Find dispatched purchase requests where dispute_deadline has passed
    // and invoice has not yet been generated
    const { data: overdueRequests, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('id, contractor_id, project_id')
      .eq('delivery_status', 'dispatched')
      .lt('dispute_deadline', new Date().toISOString())
      .is('invoice_generated_at', null);

    if (fetchError) {
      console.error('Cron: Failed to fetch overdue requests:', fetchError);
      return NextResponse.json({ error: 'Failed to query database' }, { status: 500 });
    }

    if (!overdueRequests || overdueRequests.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No overdue requests found' });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const results: { id: string; status: 'success' | 'error'; error?: string }[] = [];

    for (const pr of overdueRequests) {
      try {
        const response = await fetch(`${appUrl}/api/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.CRON_SECRET || '',
          },
          body: JSON.stringify({ purchase_request_id: pr.id }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown' }));
          results.push({ id: pr.id, status: 'error', error: err.error });
        } else {
          results.push({ id: pr.id, status: 'success' });
        }
      } catch (err) {
        results.push({
          id: pr.id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    console.log(`Cron deemed delivery: ${successCount} invoices generated, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      processed: overdueRequests.length,
      invoicesGenerated: successCount,
      errors: errorCount,
      details: results,
    });
  } catch (err) {
    console.error('Cron check-deemed-delivery error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

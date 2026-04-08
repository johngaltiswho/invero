import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSignedUrlWithFallback } from '@/lib/storage-url';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { generateInvoiceForPurchaseRequest } from '@/lib/invoice-service';
import { supabaseAdmin } from '@/lib/supabase';

type InvoiceRow = {
  id: string;
  invoice_url?: string | null;
  [key: string]: unknown;
};

/**
 * GET /api/invoices
 * Returns all invoices for the authenticated contractor.
 * Query params: status, project_id
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting for read operations
  const rateLimitResult = await rateLimit(request, RateLimitPresets.READ_ONLY);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabase = supabaseAdmin;

    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('project_id');

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    const invoiceBucket = process.env.INVOICE_STORAGE_BUCKET || 'contractor-documents';
    const enrichedInvoices = await Promise.all(
      ((data || []) as InvoiceRow[]).map(async (invoice) => {
        const fallbackPath = `${contractor.id}/invoices/${invoice.id}.pdf`;
        const signedUrl = await createSignedUrlWithFallback(supabase, {
          sourceUrl: invoice.invoice_url,
          defaultBucket: invoiceBucket,
          fallbackPath
        });

        return {
          ...invoice,
          invoice_download_url: signedUrl || invoice.invoice_url || null
        };
      })
    );

    return NextResponse.json({ success: true, data: enrichedInvoices });
  } catch (err) {
    console.error('Invoices GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/invoices
 * Generate an invoice for a delivered purchase request.
 * Protected by x-internal-secret header (called by cron or delivery confirmation).
 * Body: { purchase_request_id: string }
 */
export async function POST(request: NextRequest) {
  // Rate limit with skip for internal calls
  const rateLimitResult = await rateLimit(request, {
    ...RateLimitPresets.MUTATION,
    skip: (req) => {
      const secret = req.headers.get('x-internal-secret');
      const expectedSecret = process.env.CRON_SECRET;
      return !!expectedSecret && secret === expectedSecret; // Skip rate limiting for internal calls
    }
  });
  if (rateLimitResult) return rateLimitResult;

  // Verify this is an internal call.
  // In development, allow missing secret to keep local flows working.
  const secret = request.headers.get('x-internal-secret');
  const expectedSecret = process.env.CRON_SECRET;
  const isInternal = !!expectedSecret && secret === expectedSecret;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (!isInternal && !isDevelopment) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { purchase_request_id, force_regenerate, renumber_existing } = await request.json();

    if (!purchase_request_id) {
      return NextResponse.json({ error: 'purchase_request_id is required' }, { status: 400 });
    }

    const result = await generateInvoiceForPurchaseRequest({
      purchaseRequestId: purchase_request_id,
      forceRegenerate: force_regenerate === true,
      renumberExisting: renumber_existing === true,
      request,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Invoices POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * GET /api/admin/audit-logs
 * Returns audit logs with optional filters.
 * Query params:
 * - entity_type: filter by entity type (purchase_request, invoice, etc.)
 * - entity_id: filter by specific entity ID
 * - user_id: filter by user
 * - action: filter by action (approve, reject, generate, etc.)
 * - limit: number of records to return (default 100)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting for admin read operations
  const rateLimitResult = await rateLimit(request, RateLimitPresets.READ_ONLY);
  if (rateLimitResult) return rateLimitResult;

  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = supabaseAdmin();

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    });
  } catch (err) {
    console.error('Audit logs GET error:', err);
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

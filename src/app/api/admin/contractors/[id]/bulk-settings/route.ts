import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const multiplier = body?.bulk_order_multiplier;
    const monthsCap = body?.bulk_outstanding_months_cap;
    const creditLimit = body?.bulk_order_credit_limit;
    const supplyBlocked = body?.bulk_supply_blocked;

    const updates: Record<string, unknown> = {};

    if (multiplier !== undefined) {
      const numeric = Number(multiplier);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return NextResponse.json({ error: 'bulk_order_multiplier must be > 0' }, { status: 400 });
      }
      updates.bulk_order_multiplier = numeric;
    }

    if (monthsCap !== undefined) {
      const numeric = Number(monthsCap);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return NextResponse.json({ error: 'bulk_outstanding_months_cap must be > 0' }, { status: 400 });
      }
      updates.bulk_outstanding_months_cap = numeric;
    }

    if (creditLimit !== undefined) {
      if (creditLimit === null || creditLimit === '') {
        updates.bulk_order_credit_limit = null;
      } else {
        const numeric = Number(creditLimit);
        if (!Number.isFinite(numeric) || numeric < 0) {
          return NextResponse.json({ error: 'bulk_order_credit_limit must be >= 0' }, { status: 400 });
        }
        updates.bulk_order_credit_limit = numeric;
      }
    }

    if (supplyBlocked !== undefined) {
      updates.bulk_supply_blocked = Boolean(supplyBlocked);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('contractors')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        company_name,
        bulk_order_multiplier,
        bulk_outstanding_months_cap,
        bulk_order_credit_limit,
        bulk_supply_blocked
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update contractor bulk settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PATCH contractor bulk-settings error:', error);
    if (
      error instanceof Error &&
      (error.message === 'Authentication required' || error.message === 'Admin access required')
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update contractor bulk settings' }, { status: 500 });
  }
}


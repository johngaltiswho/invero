import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const investorId = searchParams.get('investor_id');

    let query = supabase
      .from('investor_accounts')
      .select(`
        *,
        investor:investors!investor_accounts_investor_id_fkey(
          id,
          name,
          email,
          investor_type,
          status
        )
      `);

    if (investorId) {
      query = query.eq('investor_id', investorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching investor accounts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch investor accounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      accounts: data || []
    });

  } catch (error) {
    console.error('Error in GET /api/admin/capital/accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
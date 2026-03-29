import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const investorId = String(searchParams.get('investor_id') || '').trim();

    if (!investorId) {
      return NextResponse.json({ error: 'investor_id is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('investor_interest_submissions')
      .select('*')
      .eq('investor_id', investorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to load investor interest submissions');
    }

    return NextResponse.json({ success: true, submissions: data || [] });
  } catch (error) {
    console.error('Error loading admin investor interest submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load investor interest submissions' },
      { status: 500 }
    );
  }
}

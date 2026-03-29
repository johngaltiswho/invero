import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

async function getActiveInvestor() {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!userEmail) {
    throw new Error('Missing email');
  }

  const { data: investor, error } = await supabaseAdmin
    .from('investors')
    .select('id, email, name, status')
    .eq('email', userEmail)
    .eq('status', 'active')
    .single();

  if (error || !investor) {
    throw new Error('Investor profile not found');
  }

  return investor;
}

export async function GET() {
  try {
    const investor = await getActiveInvestor();
    const { data, error } = await supabaseAdmin
      .from('investor_interest_submissions')
      .select('*')
      .eq('investor_id', investor.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to load interest submissions');
    }

    return NextResponse.json({ success: true, submissions: data || [] });
  } catch (error) {
    console.error('Error loading investor interest submissions:', error);
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load interest submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const investor = await getActiveInvestor();
    const body = await request.json();

    const preferredModel = String(body.preferred_model || '').trim() as
      | 'pool_participation'
      | 'fixed_debt'
      | 'open_to_both';
    const proposedAmount = Number(body.proposed_amount);
    const indicativePoolAmount = Number(body.indicative_pool_amount || 0);
    const indicativeFixedDebtAmount = Number(body.indicative_fixed_debt_amount || 0);
    const liquidityPreference = body.liquidity_preference ? String(body.liquidity_preference).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!['pool_participation', 'fixed_debt', 'open_to_both'].includes(preferredModel)) {
      return NextResponse.json({ error: 'Select a preferred model' }, { status: 400 });
    }

    if (!Number.isFinite(proposedAmount) || proposedAmount <= 0) {
      return NextResponse.json({ error: 'Enter a valid proposed amount' }, { status: 400 });
    }

    if (indicativePoolAmount < 0 || indicativeFixedDebtAmount < 0) {
      return NextResponse.json({ error: 'Indicative split cannot be negative' }, { status: 400 });
    }

    if (preferredModel === 'open_to_both') {
      const splitTotal = indicativePoolAmount + indicativeFixedDebtAmount;
      if (splitTotal > 0 && Math.abs(splitTotal - proposedAmount) > 0.01) {
        return NextResponse.json({ error: 'Indicative pool and fixed amounts must add up to the proposed amount' }, { status: 400 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('investor_interest_submissions')
      .insert({
        investor_id: investor.id,
        preferred_model: preferredModel,
        proposed_amount: proposedAmount,
        indicative_pool_amount: indicativePoolAmount,
        indicative_fixed_debt_amount: indicativeFixedDebtAmount,
        liquidity_preference: liquidityPreference,
        notes,
        status: 'new',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to save investor interest');
    }

    return NextResponse.json({ success: true, submission: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating investor interest submission:', error);
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit investor interest' },
      { status: 500 }
    );
  }
}

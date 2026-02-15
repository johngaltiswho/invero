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
    .select('*')
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
    return NextResponse.json({
      success: true,
      data: {
        bank_account_holder: investor.bank_account_holder || '',
        bank_name: investor.bank_name || '',
        bank_account_number: investor.bank_account_number || '',
        bank_ifsc: investor.bank_ifsc || '',
        bank_branch: investor.bank_branch || '',
        cancelled_cheque_path: investor.cancelled_cheque_path || '',
        cancelled_cheque_uploaded_at: investor.cancelled_cheque_uploaded_at || null
      }
    });
  } catch (error) {
    console.error('Error fetching investor bank details:', error);
    return NextResponse.json({ error: 'Failed to fetch bank details' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const investor = await getActiveInvestor();
    const body = await request.json();

    const updatePayload = {
      bank_account_holder: body.bank_account_holder || null,
      bank_name: body.bank_name || null,
      bank_account_number: body.bank_account_number || null,
      bank_ifsc: body.bank_ifsc || null,
      bank_branch: body.bank_branch || null,
      cancelled_cheque_path: body.cancelled_cheque_path || null,
      cancelled_cheque_uploaded_at: body.cancelled_cheque_path ? new Date().toISOString() : null
    };

    const { data, error } = await supabaseAdmin
      .from('investors')
      .update(updatePayload)
      .eq('id', investor.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update investor bank details:', error);
      return NextResponse.json({ error: 'Failed to update bank details' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating investor bank details:', error);
    return NextResponse.json({ error: 'Failed to update bank details' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

const FINVERNO_BANK_DETAILS = {
  account_holder_name: 'Finverno Private Limited',
  bank_name: 'State Bank of India',
  account_number: '44890495524',
  ifsc_code: 'SBIN0030495',
  account_type: 'Current Account',
  branch_name: '',
  upi_id: '',
} as const;

async function requireActiveInvestor() {
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
    .select('id')
    .eq('email', userEmail)
    .eq('status', 'active')
    .single();

  if (error || !investor) {
    throw new Error('Investor profile not found');
  }
}

export async function GET() {
  try {
    await requireActiveInvestor();

    return NextResponse.json({
      success: true,
      details: FINVERNO_BANK_DETAILS,
    });
  } catch (error) {
    console.error('Error fetching Finverno bank details:', error);
    return NextResponse.json({ error: 'Failed to fetch bank details' }, { status: 500 });
  }
}

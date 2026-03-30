import { NextResponse } from 'next/server';
import { getInvestorAuthErrorStatus, resolveActiveInvestor } from '@/lib/investor-auth';

const FINVERNO_BANK_DETAILS = {
  account_holder_name: 'Finverno Private Limited',
  bank_name: 'State Bank of India',
  account_number: '44890495524',
  ifsc_code: 'SBIN0030495',
  account_type: 'Current Account',
  branch_name: '',
  upi_id: 'finvernoprivatelimited@sbi',
} as const;

export async function GET() {
  try {
    await resolveActiveInvestor('id');

    return NextResponse.json({
      success: true,
      details: FINVERNO_BANK_DETAILS,
    });
  } catch (error) {
    console.error('Error fetching Finverno bank details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch bank details' },
      { status: getInvestorAuthErrorStatus(error) }
    );
  }
}

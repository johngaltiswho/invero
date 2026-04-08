import { NextResponse } from 'next/server';
import { getInvestorAuthErrorStatus, resolveActiveInvestor } from '@/lib/investor-auth';
import { FINVERNO_BANK_DETAILS } from '@/lib/finverno-bank-details';

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

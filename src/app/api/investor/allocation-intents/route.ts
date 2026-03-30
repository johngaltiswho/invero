import { NextResponse } from 'next/server';
import {
  getAllocationIntentFundingSnapshot,
  listLenderAllocationIntentsForInvestor,
  refreshAllocationIntentReadiness,
  syncAllocationIntentFundingStatus,
} from '@/lib/lender-allocation-intents';
import { listInvestorAgreements, selectCurrentInvestorAgreements } from '@/lib/agreements/service';
import { getInvestorAuthErrorStatus, resolveActiveInvestor } from '@/lib/investor-auth';

export async function GET() {
  try {
    const { investor } = await resolveActiveInvestor('id, email, name, status');
    const intents = await listLenderAllocationIntentsForInvestor(investor.id);

    const refreshed = await Promise.all(
      intents.map(async (intent) => {
        let nextIntent = intent;
        if (['draft', 'agreements_pending', 'ready_for_funding'].includes(intent.status)) {
          nextIntent = await refreshAllocationIntentReadiness(intent.id);
        }
        if (['funding_submitted', 'completed'].includes(nextIntent.status)) {
          nextIntent = await syncAllocationIntentFundingStatus(nextIntent.id);
        }
        const funding = await getAllocationIntentFundingSnapshot(
          nextIntent.id,
          Number(nextIntent.total_amount || 0)
        );
        return {
          ...nextIntent,
          funded_amount: funding.approvedAmount,
          pending_amount: funding.pendingAmount,
          remaining_amount: funding.remainingAmount,
          tranche_count: funding.trancheCount,
        };
      })
    );

    const agreements = selectCurrentInvestorAgreements(await listInvestorAgreements(investor.id));

    return NextResponse.json({
      success: true,
      intents: refreshed,
      agreements,
    });
  } catch (error) {
    console.error('Error loading lender allocation intents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load allocation intents' },
      { status: getInvestorAuthErrorStatus(error) }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Allocation proposals are admin-managed. Please contact Finverno to prepare or revise your allocation.' },
    { status: 403 }
  );
}

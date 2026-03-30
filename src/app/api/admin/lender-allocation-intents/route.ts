import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { normalizeLenderCapitalAllocations } from '@/lib/lender-sleeves';
import {
  createAllocationIntent,
  getAllocationIntentFundingSnapshot,
  listLenderAllocationIntentsForInvestor,
  refreshAllocationIntentReadiness,
  syncAllocationIntentFundingStatus,
} from '@/lib/lender-allocation-intents';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const investorId = String(searchParams.get('investor_id') || '').trim();

    if (!investorId) {
      return NextResponse.json({ error: 'investor_id is required' }, { status: 400 });
    }

    const intents = await listLenderAllocationIntentsForInvestor(investorId);
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

    return NextResponse.json({ success: true, intents: refreshed });
  } catch (error) {
    console.error('Error loading admin lender allocation intents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load allocation intents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const body = await request.json();

    const investorId = String(body.investor_id || '').trim();
    const totalAmount = Number(body.total_amount);

    if (!investorId) {
      return NextResponse.json({ error: 'investor_id is required' }, { status: 400 });
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: 'Total amount must be a positive number' }, { status: 400 });
    }

    const allocations = normalizeLenderCapitalAllocations(
      totalAmount,
      Array.isArray(body.allocations) ? body.allocations : []
    );

    const result = await createAllocationIntent({
      investorId,
      totalAmount,
      allocations,
      notes: typeof body.notes === 'string' ? body.notes.trim() : null,
      actor: {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name || 'Admin',
      },
    });

    return NextResponse.json({
      success: true,
      intent: result.intent,
      sleeves: result.sleeves,
      ready_for_funding: result.intent.status === 'ready_for_funding',
    });
  } catch (error) {
    console.error('Error creating admin lender allocation intent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create allocation intent' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  listLenderAllocationIntentsForInvestor,
  refreshAllocationIntentReadiness,
} from '@/lib/lender-allocation-intents';
import { listInvestorAgreements, selectCurrentInvestorAgreements } from '@/lib/agreements/service';

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

  return { investor, user };
}

export async function GET() {
  try {
    const { investor } = await getActiveInvestor();
    const intents = await listLenderAllocationIntentsForInvestor(investor.id);

    const refreshed = await Promise.all(
      intents.map(async (intent) => {
        if (['draft', 'agreements_pending', 'ready_for_funding'].includes(intent.status)) {
          return refreshAllocationIntentReadiness(intent.id);
        }
        return intent;
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
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Allocation proposals are admin-managed. Please contact Finverno to prepare or revise your allocation.' },
    { status: 403 }
  );
}

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { FINVERNO_BANK_DETAILS } from '@/lib/finverno-bank-details';

async function resolveContractor() {
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Not authenticated', status: 401 as const };
  }

  const { data: byClerkId } = await supabaseAdmin
    .from('contractors')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (byClerkId) {
    return { contractor: byClerkId };
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) {
    return { error: 'Contractor profile not found', status: 404 as const };
  }

  const { data: byEmail } = await supabaseAdmin
    .from('contractors')
    .select('id, clerk_user_id')
    .eq('email', email)
    .maybeSingle();

  if (!byEmail) {
    return { error: 'Contractor profile not found', status: 404 as const };
  }

  if (!byEmail.clerk_user_id) {
    await supabaseAdmin.from('contractors').update({ clerk_user_id: userId }).eq('id', byEmail.id);
  }

  return { contractor: byEmail };
}

export async function GET() {
  try {
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    return NextResponse.json({
      success: true,
      details: FINVERNO_BANK_DETAILS,
    });
  } catch (error) {
    console.error('Error fetching Finverno bank details for contractor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch bank details' },
      { status: 500 }
    );
  }
}

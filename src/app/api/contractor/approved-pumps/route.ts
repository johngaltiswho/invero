import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Helper to resolve contractor from Clerk auth
 */
async function resolveContractor() {
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Not authenticated', status: 401 as const };
  }

  const { data: byClerkId, error: byClerkIdError } = await supabaseAdmin
    .from('contractors')
    .select('*')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (byClerkIdError) {
    console.error('Error fetching contractor by clerk_user_id:', byClerkIdError);
    return { error: 'Failed to load contractor profile', status: 500 as const };
  }

  if (byClerkId) {
    return { contractor: byClerkId };
  }

  // Fallback for older contractor records
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) {
    return { error: 'Contractor profile not found', status: 404 as const };
  }

  const { data: byEmail, error: byEmailError } = await supabaseAdmin
    .from('contractors')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (byEmailError) {
    console.error('Error fetching contractor by email fallback:', byEmailError);
    return { error: 'Failed to load contractor profile', status: 500 as const };
  }

  if (!byEmail) {
    return { error: 'Contractor profile not found', status: 404 as const };
  }

  // Heal old records
  if (!byEmail.clerk_user_id) {
    await supabaseAdmin
      .from('contractors')
      .update({ clerk_user_id: userId })
      .eq('id', byEmail.id);
  }

  return { contractor: byEmail };
}

/**
 * GET /api/contractor/approved-pumps
 * List all approved fuel pumps for the authenticated contractor
 */
export async function GET() {
  try {
    // Authenticate contractor
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;

    // Fetch approved pumps with pump details
    const { data: approvedPumps, error: fetchError } = await supabaseAdmin
      .from('contractor_approved_pumps')
      .select(`
        id,
        pump_id,
        is_active,
        fuel_pumps (
          id,
          pump_name,
          address,
          city,
          state,
          pincode,
          contact_person,
          contact_phone,
          contact_email
        )
      `)
      .eq('contractor_id', contractor.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to fetch approved pumps:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load approved pumps' },
        { status: 500 }
      );
    }

    // Transform data to flatten pump details
    const pumps = (approvedPumps || []).map((ap) => ({
      approval_id: ap.id,
      pump_id: ap.pump_id,
      ...ap.fuel_pumps,
    }));

    return NextResponse.json({
      success: true,
      data: pumps,
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/approved-pumps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

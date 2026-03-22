import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { vehicleSchema } from '@/lib/validations/fuel';

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
 * POST /api/contractor/vehicles
 * Register a new vehicle
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate contractor
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = vehicleSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { vehicle_number, vehicle_type } = validationResult.data;

    // Check if vehicle with same number already exists for this contractor
    const { data: existingVehicle } = await supabaseAdmin
      .from('vehicles')
      .select('id, vehicle_number, is_active')
      .eq('contractor_id', contractor.id)
      .eq('vehicle_number', vehicle_number)
      .eq('is_active', true)
      .maybeSingle();

    if (existingVehicle) {
      return NextResponse.json(
        { error: `Vehicle ${vehicle_number} is already registered` },
        { status: 409 }
      );
    }

    // Insert new vehicle
    const { data: newVehicle, error: insertError } = await supabaseAdmin
      .from('vehicles')
      .insert({
        contractor_id: contractor.id,
        vehicle_number,
        vehicle_type,
      })
      .select('*')
      .single();

    if (insertError || !newVehicle) {
      console.error('Failed to insert vehicle:', insertError);
      return NextResponse.json(
        { error: 'Failed to register vehicle' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newVehicle.id,
        vehicle_number: newVehicle.vehicle_number,
        vehicle_type: newVehicle.vehicle_type,
        is_active: newVehicle.is_active,
        created_at: newVehicle.created_at,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/contractor/vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/contractor/vehicles
 * List all vehicles for the authenticated contractor
 */
export async function GET() {
  try {
    // Authenticate contractor
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;

    // Fetch all active vehicles
    const { data: vehicles, error: fetchError } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('contractor_id', contractor.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to fetch vehicles:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load vehicles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vehicles || [],
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

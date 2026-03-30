import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fuelRequestSchema } from '@/lib/validations/fuel';
import { validateFuelRequest } from '@/lib/fuel/auto-approval-service';

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
 * POST /api/contractor/fuel-requests
 * Submit a fuel request for auto-approval
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
    const validationResult = fuelRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { vehicle_id, pump_id, requested_liters, requested_notes } = validationResult.data;

    // Run auto-approval validation
    const approvalValidation = await validateFuelRequest({
      contractorId: contractor.id,
      vehicleId: vehicle_id,
      pumpId: pump_id,
      requestedLiters: requested_liters,
    });

    // If not approved, return rejection reason
    if (!approvalValidation.isApproved) {
      return NextResponse.json(
        {
          success: false,
          approved: false,
          reason: approvalValidation.reason,
        },
        { status: 200 } // 200 because validation succeeded, just not approved
      );
    }

    // AUTO-APPROVED - Create fuel approval record
    const { data: newApproval, error: insertError } = await supabaseAdmin
      .from('fuel_approvals')
      .insert({
        vehicle_id,
        contractor_id: contractor.id,
        pump_id,
        max_amount: approvalValidation.estimatedAmount!,
        max_liters: requested_liters,
        valid_until: approvalValidation.validUntil!,
        status: 'pending',
        request_type: 'contractor_requested',
        auto_approved: true,
        requested_notes: requested_notes || null,
      })
      .select(`
        id,
        approval_code,
        vehicle_id,
        pump_id,
        max_amount,
        max_liters,
        valid_from,
        valid_until,
        status,
        auto_approved,
        created_at
      `)
      .single();

    if (insertError || !newApproval) {
      console.error('Failed to create approval:', insertError);
      return NextResponse.json(
        { error: 'Failed to create approval. Please try again.' },
        { status: 500 }
      );
    }

    // Fetch vehicle and pump details for response
    const { data: vehicle } = await supabaseAdmin
      .from('vehicles')
      .select('vehicle_number, vehicle_type')
      .eq('id', vehicle_id)
      .single();

    const { data: pump } = await supabaseAdmin
      .from('fuel_pumps')
      .select('pump_name, oem_name, address, city, contact_person, contact_phone')
      .eq('id', pump_id)
      .single();

    return NextResponse.json({
      success: true,
      approved: true,
      approval: {
        id: newApproval.id,
        approval_code: newApproval.approval_code,
        max_amount: newApproval.max_amount,
        max_liters: newApproval.max_liters,
        valid_until: newApproval.valid_until,
        vehicle: {
          vehicle_number: vehicle?.vehicle_number,
          vehicle_type: vehicle?.vehicle_type,
        },
        pump: {
          pump_name: pump?.pump_name,
          address: pump?.address,
          city: pump?.city,
          contact_person: pump?.contact_person,
          contact_phone: pump?.contact_phone,
        },
      },
      message: 'Fuel request auto-approved. Share the approval code with your driver.',
    });
  } catch (error) {
    console.error('Error in POST /api/contractor/fuel-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/contractor/fuel-requests
 * List all fuel approvals for the authenticated contractor
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate contractor
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'pending' | 'filled' | 'expired' | 'cancelled' | null;
    const vehicleId = searchParams.get('vehicle_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabaseAdmin
      .from('fuel_approvals')
      .select(`
        id,
        approval_code,
        vehicle_id,
        pump_id,
        max_amount,
        max_liters,
        valid_from,
        valid_until,
        status,
        request_type,
        auto_approved,
        requested_notes,
        filled_at,
        filled_quantity,
        filled_amount,
        pump_notes,
        created_at,
        vehicles (
          vehicle_number,
          vehicle_type
        ),
        fuel_pumps (
          pump_name,
          city
        )
      `, { count: 'exact' })
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }

    const { data: approvals, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Failed to fetch fuel approvals:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load fuel requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: approvals || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/fuel-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

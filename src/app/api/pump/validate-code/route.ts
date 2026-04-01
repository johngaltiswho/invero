import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { PumpAuthError, requirePumpSession } from '@/lib/pump-auth';

/**
 * POST /api/pump/validate-code
 * Validate an approval code and return details if valid
 * Pump-scoped endpoint - requires pump dashboard session
 */
export async function POST(request: NextRequest) {
  try {
    const { pumpId } = await requirePumpSession(request);
    const body = await request.json();
    const { approval_code } = body;

    if (!approval_code || typeof approval_code !== 'string') {
      return NextResponse.json(
        { error: 'Approval code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = approval_code.trim().toUpperCase();
    const { data: approval, error } = await supabaseAdmin
      .from('fuel_approvals')
      .select(`
        id,
        approval_code,
        pump_id,
        max_amount,
        max_liters,
        valid_until,
        status,
        vehicles (
          vehicle_number
        ),
        contractors (
          company_name
        )
      `)
      .eq('approval_code', normalizedCode)
      .maybeSingle();

    if (error) {
      console.error('Error validating approval code:', error);
      return NextResponse.json({ error: 'Failed to validate approval code' }, { status: 500 });
    }

    if (!approval || approval.pump_id !== pumpId) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Invalid approval code',
        },
        { status: 200 }
      );
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        {
          valid: false,
          message: `Approval is ${approval.status}.`,
        },
        { status: 200 }
      );
    }

    if (new Date(approval.valid_until).getTime() < Date.now()) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Approval code has expired',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      approval: {
        approval_id: approval.id,
        vehicle_number: (approval.vehicles as any)?.vehicle_number || 'Unknown',
        max_amount: approval.max_amount,
        max_liters: approval.max_liters,
        contractor_name: (approval.contractors as any)?.company_name || 'Unknown contractor',
        valid_until: approval.valid_until,
      },
      message: 'Approval is valid',
    });
  } catch (error) {
    if (error instanceof PumpAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in POST /api/pump/validate-code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

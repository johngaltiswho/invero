import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/pump/validate-code
 * Validate an approval code and return details if valid
 * Public endpoint - pump owners don't need authentication for code validation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { approval_code } = body;

    if (!approval_code || typeof approval_code !== 'string') {
      return NextResponse.json(
        { error: 'Approval code is required' },
        { status: 400 }
      );
    }

    // Call the validation function from database
    const { data, error } = await supabaseAdmin
      .rpc('is_approval_code_valid', { code: approval_code.trim().toUpperCase() });

    if (error) {
      console.error('Error validating approval code:', error);
      return NextResponse.json(
        { error: 'Failed to validate approval code' },
        { status: 500 }
      );
    }

    // Extract the first row (function returns a single row in an array)
    const validationResult = data && data.length > 0 ? data[0] : null;

    if (!validationResult) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Invalid approval code',
        },
        { status: 200 }
      );
    }

    if (!validationResult.is_valid) {
      return NextResponse.json(
        {
          valid: false,
          message: validationResult.message || 'Approval code is not valid',
        },
        { status: 200 }
      );
    }

    // Valid approval - return details
    return NextResponse.json({
      valid: true,
      approval: {
        approval_id: validationResult.approval_id,
        vehicle_number: validationResult.vehicle_number,
        max_amount: validationResult.max_amount,
        max_liters: validationResult.max_liters,
        contractor_name: validationResult.contractor_name,
      },
      message: validationResult.message,
    });
  } catch (error) {
    console.error('Error in POST /api/pump/validate-code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

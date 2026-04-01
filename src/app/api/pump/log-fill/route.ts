import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { PumpAuthError, requirePumpSession } from '@/lib/pump-auth';
import { recordFuelFillLedgerEntries } from '@/lib/fuel/finance';

/**
 * Validation schema for logging a fill
 */
const logFillSchema = z.object({
  approval_code: z.string().min(1, 'Approval code is required'),
  filled_quantity: z.number()
    .positive('Filled quantity must be positive')
    .max(1000, 'Filled quantity seems too large'),
  filled_amount: z.number()
    .positive('Filled amount must be positive')
    .max(1000000, 'Filled amount seems too large'),
  pump_notes: z.string()
    .max(500, 'Notes cannot exceed 500 characters')
    .trim()
    .optional(),
});

/**
 * POST /api/pump/log-fill
 * Log a filled fuel transaction
 * Pump-scoped endpoint - requires pump dashboard session
 */
export async function POST(request: NextRequest) {
  try {
    const { pumpId } = await requirePumpSession(request);
    const body = await request.json();
    const validationResult = logFillSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { approval_code, filled_quantity, filled_amount, pump_notes } = validationResult.data;

    // Find the approval by code
    const { data: approval, error: fetchError } = await supabaseAdmin
      .from('fuel_approvals')
      .select('id, status, max_liters, max_amount, vehicle_id, contractor_id')
      .eq('approval_code', approval_code.trim().toUpperCase())
      .eq('pump_id', pumpId)
      .single();

    if (fetchError || !approval) {
      return NextResponse.json(
        { error: 'Approval code not found' },
        { status: 404 }
      );
    }

    // Validate status
    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval already ${approval.status}. Cannot log fill.` },
        { status: 400 }
      );
    }

    // Validate filled quantity doesn't exceed max
    if (filled_quantity > approval.max_liters) {
      return NextResponse.json(
        {
          error: `Filled quantity (${filled_quantity}L) exceeds approved maximum (${approval.max_liters}L)`,
        },
        { status: 400 }
      );
    }

    // Validate filled amount doesn't exceed max
    if (filled_amount > approval.max_amount) {
      return NextResponse.json(
        {
          error: `Filled amount (Rs ${filled_amount}) exceeds approved maximum (Rs ${approval.max_amount})`,
        },
        { status: 400 }
      );
    }

    const filledAt = new Date().toISOString();

    // Update approval to filled
    const { data: updatedApproval, error: updateError } = await supabaseAdmin
      .from('fuel_approvals')
      .update({
        status: 'filled',
        filled_at: filledAt,
        filled_quantity,
        filled_amount,
        pump_notes: pump_notes || null,
      })
      .eq('id', approval.id)
      .select('id, approval_code, status, filled_at')
      .single();

    if (updateError || !updatedApproval) {
      console.error('Failed to update approval:', updateError);
      return NextResponse.json(
        { error: 'Failed to log fill. Please try again.' },
        { status: 500 }
      );
    }

    try {
      const ledgerResult = await recordFuelFillLedgerEntries({
        approvalId: approval.id,
        contractorId: approval.contractor_id,
        pumpId,
        filledAmount: filled_amount,
        filledAt,
      });

      return NextResponse.json({
        success: true,
        message: 'Fuel fill logged successfully',
        approval: {
          approval_code: updatedApproval.approval_code,
          status: updatedApproval.status,
          filled_at: updatedApproval.filled_at,
        },
        finance: {
          platform_fee_amount: ledgerResult.platformFeeAmount,
          gross_sme_charge: ledgerResult.grossSmeCharge,
          provider_payable_amount: ledgerResult.providerPayableAmount,
        },
      });
    } catch (ledgerError) {
      console.error('Failed to record fuel ledger entries:', ledgerError);
      await supabaseAdmin
        .from('fuel_approvals')
        .update({
          status: 'pending',
          filled_at: null,
          filled_quantity: null,
          filled_amount: null,
          pump_notes: null,
        })
        .eq('id', approval.id);

      return NextResponse.json(
        { error: 'Failed to post fuel finance entries. Please retry.' },
        { status: 500 }
      );
    }

  } catch (error) {
    if (error instanceof PumpAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in POST /api/pump/log-fill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

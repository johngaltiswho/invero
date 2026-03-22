import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { reviewExpenseSchema } from '@/lib/validations/fuel';
import { currentUser } from '@clerk/nextjs/server';

/**
 * POST /api/admin/fuel-expenses/[id]/review
 * Approve or reject a fuel expense
 * Body: {
 *   action: 'approve' | 'reject',
 *   admin_notes?: string,
 *   rejected_reason?: string (required if action = 'reject')
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    // Get admin user info
    const user = await currentUser();
    const adminId = user?.id || null;

    const { id: expenseId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = reviewExpenseSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { action, admin_notes, rejected_reason } = validationResult.data;

    // Fetch the fuel expense
    const { data: expense, error: fetchError } = await supabaseAdmin
      .from('fuel_expenses')
      .select(`
        *,
        vehicle:vehicles(id, vehicle_number, vehicle_type, contractor_id),
        contractor:contractors(id, company_name)
      `)
      .eq('id', expenseId)
      .single();

    if (fetchError || !expense) {
      console.error('Failed to fetch fuel expense:', fetchError);
      return NextResponse.json(
        { error: 'Fuel expense not found' },
        { status: 404 }
      );
    }

    // Validate current status (must be 'pending_review')
    if (expense.status !== 'pending_review') {
      return NextResponse.json(
        {
          error: `Cannot review expense with status '${expense.status}'. Only 'pending_review' expenses can be reviewed.`,
        },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const capitalDescription = `Fuel expense for vehicle ${expense.vehicle.vehicle_number} - ${expense.pump_name || 'Unknown pump'}`;
      const capitalReference =
        expense.bill_number && expense.bill_number.trim().length > 0
          ? expense.bill_number.trim()
          : `fuel-expense-${expense.id}`;

      const { error: capitalDeploymentError } = await supabaseAdmin
        .from('capital_transactions')
        .insert({
          investor_id: null,
          transaction_type: 'deployment',
          amount: expense.total_amount || 0,
          project_id: expense.project_id || null,
          contractor_id: expense.contractor_id || expense.vehicle?.contractor_id || null,
          contractor_name: expense.contractor?.company_name || null,
          project_name: expense.project_name || null,
          description: capitalDescription,
          reference_number: capitalReference,
          admin_user_id: adminId || 'system',
          status: 'completed',
        });

      if (capitalDeploymentError) {
        console.error('Failed to create capital deployment transaction:', capitalDeploymentError);
        return NextResponse.json(
          { error: 'Failed to deploy capital for this expense' },
          { status: 500 }
        );
      }

      // Update expense status to 'approved'
      const { data: updatedExpense, error: updateError } = await supabaseAdmin
        .from('fuel_expenses')
        .update({
          status: 'approved',
          admin_notes: admin_notes || null,
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .select('*')
        .single();

      if (updateError || !updatedExpense) {
        console.error('Failed to update expense status:', updateError);
        return NextResponse.json(
          { error: 'Failed to approve expense' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedExpense,
        message: 'Fuel expense approved and funds deployed successfully',
      });
    } else {
      // Reject the expense
      const { data: updatedExpense, error: updateError } = await supabaseAdmin
        .from('fuel_expenses')
        .update({
          status: 'rejected',
          admin_notes: admin_notes || null,
          rejected_reason: rejected_reason || null,
        })
        .eq('id', expenseId)
        .select('*')
        .single();

      if (updateError || !updatedExpense) {
        console.error('Failed to update expense status:', updateError);
        return NextResponse.json(
          { error: 'Failed to reject expense' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedExpense,
        message: 'Fuel expense rejected',
      });
    }
  } catch (error) {
    console.error('Error in POST /api/admin/fuel-expenses/[id]/review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import {
  evaluateBulkOrderGuardrails,
  getContractorVerificationPrecheck,
  isBulkGuardrailsEnabled
} from '@/lib/bulk-order-guardrails';

type AdminAction =
  | 'approve'
  | 'reject'
  | 'mark_ordered'
  | 'mark_received'
  | 'mark_invoiced'
  | 'mark_active_repayment'
  | 'close'
  | 'default';

const ACTION_STATUS_MAP: Record<AdminAction, string> = {
  approve: 'approved',
  reject: 'rejected',
  mark_ordered: 'ordered',
  mark_received: 'received',
  mark_invoiced: 'invoiced',
  mark_active_repayment: 'active_repayment',
  close: 'closed',
  default: 'defaulted'
};

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const action = String(body?.action || '').trim() as AdminAction;
    const override = Boolean(body?.override);
    const overrideReason = body?.override_reason ? String(body.override_reason).trim() : null;
    const rejectionReason = body?.rejection_reason ? String(body.rejection_reason).trim() : null;

    if (!action || !ACTION_STATUS_MAP[action]) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = serviceClient();
    const { data: existingOrder, error: fetchError } = await supabase
      .from('buyer_bulk_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Bulk order not found' }, { status: 404 });
    }

    if (action === 'approve' && isBulkGuardrailsEnabled()) {
      const guardrailCheck = await evaluateBulkOrderGuardrails({
        contractorId: existingOrder.contractor_id,
        materialId: existingOrder.material_id,
        orderedQty: Number(existingOrder.ordered_qty || 0),
        supplierUnitRate: Number(existingOrder.supplier_unit_rate || 0),
        includeOrderId: existingOrder.id
      });
      const verificationPrecheck = await getContractorVerificationPrecheck(existingOrder.contractor_id);
      const hardBlockFlags = [
        !verificationPrecheck.is_verified ? 'contractor_not_verified' : null,
        guardrailCheck.reasons.includes('Monthly usage baseline is missing for this material')
          ? 'missing_usage_baseline'
          : null,
        guardrailCheck.reasons.includes('Outstanding cap breach for this material')
          ? 'outstanding_cap_breach'
          : null,
        guardrailCheck.reasons.includes('Bulk supply is blocked for this contractor')
          ? 'supply_blocked'
          : null
      ].filter(Boolean);

      const blocked = hardBlockFlags.length > 0 || !guardrailCheck.can_create_order;
      if (blocked && !override) {
        return NextResponse.json(
          {
            error: 'Approval blocked by pre-check and guardrails',
            hard_block_flags: hardBlockFlags,
            guardrail_reasons: guardrailCheck.reasons
          },
          { status: 400 }
        );
      }
      if (blocked && override && !overrideReason) {
        return NextResponse.json(
          { error: 'override_reason is required when approving with override' },
          { status: 400 }
        );
      }
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json({ error: 'rejection_reason is required for reject action' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: ACTION_STATUS_MAP[action]
    };

    if (action === 'approve') {
      updatePayload.approved_at = now;
      updatePayload.approved_by = body?.approved_by || null;
      if (!existingOrder.submitted_at) {
        updatePayload.submitted_at = now;
      }
      if (override && overrideReason) {
        updatePayload.rejection_reason = `APPROVED_WITH_OVERRIDE: ${overrideReason}`;
      }
    }
    if (action === 'reject') {
      updatePayload.rejected_at = now;
      updatePayload.rejection_reason = rejectionReason;
    }
    if (action === 'mark_invoiced' && body?.invoice_id) {
      updatePayload.invoice_id = body.invoice_id;
    }

    const { data: updated, error: updateError } = await supabase
      .from('buyer_bulk_orders')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        material:materials!buyer_bulk_orders_material_id_fkey(
          id,
          name,
          unit,
          hsn_code
        ),
        contractor:contractors!buyer_bulk_orders_contractor_id_fkey(
          id,
          company_name,
          contact_person
        )
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update bulk order' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PATCH admin bulk order error:', error);
    if (
      error instanceof Error &&
      (error.message === 'Authentication required' || error.message === 'Admin access required')
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update bulk order' }, { status: 500 });
  }
}

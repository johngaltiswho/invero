import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import { evaluateBulkOrderGuardrails, getContractorVerificationPrecheck } from '@/lib/bulk-order-guardrails';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const contractorId = searchParams.get('contractor_id')?.trim();
    const materialId = searchParams.get('material_id')?.trim();
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

    const supabase = serviceClient();
    let query = supabase
      .from('buyer_bulk_orders')
      .select(`
        *,
        contractor:contractors!buyer_bulk_orders_contractor_id_fkey(
          id,
          company_name,
          contact_person,
          status,
          verification_status,
          bulk_order_multiplier,
          bulk_outstanding_months_cap,
          bulk_order_credit_limit,
          bulk_supply_blocked
        ),
        material:materials!buyer_bulk_orders_material_id_fkey(
          id,
          name,
          unit,
          hsn_code
        ),
        project:projects!buyer_bulk_orders_project_id_fkey(
          id,
          project_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);
    if (contractorId) query = query.eq('contractor_id', contractorId);
    if (materialId) query = query.eq('material_id', materialId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch bulk orders' }, { status: 500 });
    }

    const enriched = await Promise.all(
      (data || []).map(async (row: any) => {
        const guardrailCheck = await evaluateBulkOrderGuardrails({
          contractorId: row.contractor_id,
          materialId: row.material_id,
          orderedQty: Number(row.ordered_qty || 0),
          supplierUnitRate: Number(row.supplier_unit_rate || 0),
          includeOrderId: row.id
        });
        const verificationPrecheck = await getContractorVerificationPrecheck(row.contractor_id);
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

        return {
          ...row,
          precheck: {
            verification: verificationPrecheck,
            guardrail: guardrailCheck,
            hard_block_flags: hardBlockFlags,
            can_approve_without_override: hardBlockFlags.length === 0 && guardrailCheck.can_create_order
          }
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('GET admin bulk orders error:', error);
    if (
      error instanceof Error &&
      (error.message === 'Authentication required' || error.message === 'Admin access required')
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch bulk orders' }, { status: 500 });
  }
}

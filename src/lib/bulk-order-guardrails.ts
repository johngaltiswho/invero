import { createClient } from '@supabase/supabase-js';

const OUTSTANDING_STATUSES = ['approved', 'ordered', 'received', 'invoiced', 'active_repayment'];

export type BulkOrderGuardrailCheck = {
  monthly_usage_qty: number | null;
  max_order_qty: number | null;
  monthly_usage_value: number | null;
  current_outstanding_value: number;
  max_outstanding_value: number | null;
  contractor_outstanding_value: number;
  headroom_value: number | null;
  can_create_order: boolean;
  reasons: string[];
  settings: {
    bulk_order_multiplier: number;
    bulk_outstanding_months_cap: number;
    bulk_order_credit_limit: number | null;
    bulk_supply_blocked: boolean;
  };
};

type EvaluateParams = {
  contractorId: string;
  materialId: string;
  orderedQty: number;
  supplierUnitRate: number;
  includeOrderId?: string | null;
};

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function isBulkGuardrailsEnabled(): boolean {
  const raw = (process.env.BULK_GUARDRAILS_V1 || '').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export async function evaluateBulkOrderGuardrails(
  params: EvaluateParams
): Promise<BulkOrderGuardrailCheck> {
  const supabase = serviceClient();
  const reasons: string[] = [];

  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('bulk_order_multiplier, bulk_outstanding_months_cap, bulk_order_credit_limit, bulk_supply_blocked')
    .eq('id', params.contractorId)
    .single();

  if (contractorError || !contractor) {
    throw new Error('Contractor not found while evaluating guardrails');
  }

  const settings = {
    bulk_order_multiplier: Number(contractor.bulk_order_multiplier ?? 1.5),
    bulk_outstanding_months_cap: Number(contractor.bulk_outstanding_months_cap ?? 2.0),
    bulk_order_credit_limit:
      contractor.bulk_order_credit_limit === null || contractor.bulk_order_credit_limit === undefined
        ? null
        : Number(contractor.bulk_order_credit_limit),
    bulk_supply_blocked: Boolean(contractor.bulk_supply_blocked)
  };

  if (settings.bulk_supply_blocked) {
    reasons.push('Bulk supply is blocked for this contractor');
  }

  const { data: materialLimit } = await supabase
    .from('contractor_material_limits')
    .select('monthly_usage_qty')
    .eq('contractor_id', params.contractorId)
    .eq('material_id', params.materialId)
    .maybeSingle();

  const monthlyUsageQty =
    materialLimit?.monthly_usage_qty === null || materialLimit?.monthly_usage_qty === undefined
      ? null
      : Number(materialLimit.monthly_usage_qty);

  let effectiveRate = Number.isFinite(params.supplierUnitRate) && params.supplierUnitRate > 0
    ? params.supplierUnitRate
    : 0;

  if (effectiveRate <= 0) {
    const { data: lastOrder } = await supabase
      .from('buyer_bulk_orders')
      .select('supplier_unit_rate')
      .eq('contractor_id', params.contractorId)
      .eq('material_id', params.materialId)
      .gt('supplier_unit_rate', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastOrder?.supplier_unit_rate) {
      effectiveRate = Number(lastOrder.supplier_unit_rate);
    }
  }

  if (!monthlyUsageQty || monthlyUsageQty <= 0) {
    reasons.push('Monthly usage baseline is missing for this material');
  }

  const maxOrderQty = monthlyUsageQty ? Number((monthlyUsageQty * settings.bulk_order_multiplier).toFixed(3)) : null;
  if (maxOrderQty !== null && params.orderedQty > maxOrderQty) {
    reasons.push(`Ordered quantity exceeds max allowed (${maxOrderQty.toLocaleString('en-IN')})`);
  }

  const { data: outstandingRows, error: outstandingError } = await supabase
    .from('buyer_bulk_orders')
    .select('id, material_id, invoice_total')
    .eq('contractor_id', params.contractorId)
    .in('status', OUTSTANDING_STATUSES);

  if (outstandingError) {
    throw new Error(`Failed to compute outstanding exposure: ${outstandingError.message}`);
  }

  const rows = outstandingRows || [];
  const filteredRows = params.includeOrderId
    ? rows.filter((row) => row.id !== params.includeOrderId)
    : rows;

  const currentOutstandingValue = filteredRows
    .filter((row) => row.material_id === params.materialId)
    .reduce((sum, row) => sum + Number(row.invoice_total || 0), 0);

  const contractorOutstandingValue = filteredRows
    .reduce((sum, row) => sum + Number(row.invoice_total || 0), 0);

  const monthlyUsageValue = monthlyUsageQty && effectiveRate > 0
    ? Number((monthlyUsageQty * effectiveRate).toFixed(2))
    : null;
  const maxOutstandingValue = monthlyUsageValue === null
    ? null
    : Number((monthlyUsageValue * settings.bulk_outstanding_months_cap).toFixed(2));

  const estimatedInvoiceTotal = Number((params.orderedQty * Math.max(effectiveRate, 0)).toFixed(2));
  if (maxOutstandingValue !== null && (currentOutstandingValue + estimatedInvoiceTotal) > maxOutstandingValue) {
    reasons.push('Outstanding cap breach for this material');
  }

  if (
    settings.bulk_order_credit_limit !== null &&
    contractorOutstandingValue + estimatedInvoiceTotal > settings.bulk_order_credit_limit
  ) {
    reasons.push('Contractor hard credit limit exceeded');
  }

  const headroomValue = maxOutstandingValue === null
    ? null
    : Number(Math.max(maxOutstandingValue - currentOutstandingValue, 0).toFixed(2));

  return {
    monthly_usage_qty: monthlyUsageQty,
    max_order_qty: maxOrderQty,
    monthly_usage_value: monthlyUsageValue,
    current_outstanding_value: Number(currentOutstandingValue.toFixed(2)),
    max_outstanding_value: maxOutstandingValue,
    contractor_outstanding_value: Number(contractorOutstandingValue.toFixed(2)),
    headroom_value: headroomValue,
    can_create_order: reasons.length === 0,
    reasons,
    settings
  };
}

export async function getContractorVerificationPrecheck(contractorId: string): Promise<{
  is_verified: boolean;
  status: string | null;
  verification_status: string | null;
}> {
  const supabase = serviceClient();
  const { data: contractor, error } = await supabase
    .from('contractors')
    .select('status, verification_status')
    .eq('id', contractorId)
    .single();

  if (error || !contractor) {
    return {
      is_verified: false,
      status: null,
      verification_status: null
    };
  }

  const isVerified = contractor.status === 'approved' && contractor.verification_status === 'verified';
  return {
    is_verified: isVerified,
    status: contractor.status,
    verification_status: contractor.verification_status
  };
}


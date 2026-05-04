import type { PurchaseRequestAdditionalCharge } from '@/types/purchase-requests';

export async function fetchPurchaseRequestAdditionalChargesByRequestIds(
  supabase: any,
  requestIds: string[]
): Promise<{
  chargesByRequestId: Map<string, PurchaseRequestAdditionalCharge[]>;
  missingTable: boolean;
}> {
  const chargesByRequestId = new Map<string, PurchaseRequestAdditionalCharge[]>();

  if (requestIds.length === 0) {
    return { chargesByRequestId, missingTable: false };
  }

  const { data, error } = await supabase
    .from('purchase_request_additional_charges')
    .select('id, purchase_request_id, description, hsn_code, amount, tax_percent, created_at, updated_at')
    .in('purchase_request_id', requestIds)
    .order('created_at', { ascending: true });

  if (error) {
    const tableMissing = String(error.message || '').includes('purchase_request_additional_charges');
    if (tableMissing) {
      // Distinguish between truly-missing table and PostgREST schema cache lag.
      // The caller can decide whether to show a warning or fail loudly.
      return { chargesByRequestId, missingTable: true };
    }
    throw error;
  }

  ((data || []) as PurchaseRequestAdditionalCharge[]).forEach((charge) => {
    const list = chargesByRequestId.get(charge.purchase_request_id) || [];
    list.push(charge);
    chargesByRequestId.set(charge.purchase_request_id, list);
  });

  return { chargesByRequestId, missingTable: false };
}

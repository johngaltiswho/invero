export type PurchaseRequestPricedItem = {
  requested_qty?: number | string | null;
  purchase_qty?: number | string | null;
  unit_rate?: number | string | null;
  tax_percent?: number | string | null;
  round_off_amount?: number | string | null;
};

export type PurchaseRequestAdditionalCharge = {
  amount?: number | string | null;
  tax_percent?: number | string | null;
};

export type PurchaseRequestTotals = {
  material_subtotal: number;
  material_tax_total: number;
  material_total: number;
  additional_charge_subtotal: number;
  additional_charge_tax_total: number;
  additional_charge_total: number;
  grand_total: number;
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPaise = (value: number) => Math.round(value * 100);
const fromPaise = (paise: number) => paise / 100;

export function calculatePurchaseRequestItemTotal(item: PurchaseRequestPricedItem) {
  const qty = toNumber(item.purchase_qty ?? item.requested_qty);
  const rate = toNumber(item.unit_rate);
  const taxPercent = toNumber(item.tax_percent);
  const roundOffAmount = toNumber(item.round_off_amount);
  const subtotalPaise = toPaise(qty * rate);
  const taxAmountPaise = Math.round(subtotalPaise * (taxPercent / 100));
  const roundOffPaise = toPaise(roundOffAmount);
  return {
    subtotal: fromPaise(subtotalPaise),
    taxAmount: fromPaise(taxAmountPaise),
    roundOffAmount: fromPaise(roundOffPaise),
    total: fromPaise(subtotalPaise + taxAmountPaise + roundOffPaise)
  };
}

export function calculatePurchaseRequestAdditionalChargeTotal(charge: PurchaseRequestAdditionalCharge) {
  const subtotal = toNumber(charge.amount);
  const taxPercent = toNumber(charge.tax_percent);
  const subtotalPaise = toPaise(subtotal);
  const taxAmountPaise = Math.round(subtotalPaise * (taxPercent / 100));
  return {
    subtotal: fromPaise(subtotalPaise),
    taxAmount: fromPaise(taxAmountPaise),
    total: fromPaise(subtotalPaise + taxAmountPaise)
  };
}

export function calculatePurchaseRequestTotals(params: {
  items?: PurchaseRequestPricedItem[] | null;
  additionalCharges?: PurchaseRequestAdditionalCharge[] | null;
}): PurchaseRequestTotals {
  let materialSubtotalPaise = 0;
  let materialTaxPaise = 0;
  let materialTotalPaise = 0;
  for (const item of params.items || []) {
    const totals = calculatePurchaseRequestItemTotal(item);
    materialSubtotalPaise += toPaise(totals.subtotal);
    materialTaxPaise += toPaise(totals.taxAmount);
    materialTotalPaise += toPaise(totals.total);
  }

  let chargeSubtotalPaise = 0;
  let chargeTaxPaise = 0;
  let chargeTotalPaise = 0;
  for (const charge of params.additionalCharges || []) {
    const totals = calculatePurchaseRequestAdditionalChargeTotal(charge);
    chargeSubtotalPaise += toPaise(totals.subtotal);
    chargeTaxPaise += toPaise(totals.taxAmount);
    chargeTotalPaise += toPaise(totals.total);
  }

  return {
    material_subtotal: fromPaise(materialSubtotalPaise),
    material_tax_total: fromPaise(materialTaxPaise),
    material_total: fromPaise(materialTotalPaise),
    additional_charge_subtotal: fromPaise(chargeSubtotalPaise),
    additional_charge_tax_total: fromPaise(chargeTaxPaise),
    additional_charge_total: fromPaise(chargeTotalPaise),
    grand_total: fromPaise(materialTotalPaise + chargeTotalPaise),
  };
}

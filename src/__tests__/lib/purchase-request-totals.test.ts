import {
  calculatePurchaseRequestAdditionalChargeTotal,
  calculatePurchaseRequestItemTotal,
  calculatePurchaseRequestTotals,
} from '@/lib/purchase-request-totals';

describe('purchase request totals', () => {
  it('calculates a material item total including tax and round off', () => {
    expect(
      calculatePurchaseRequestItemTotal({
        purchase_qty: 10,
        unit_rate: 120,
        tax_percent: 18,
        round_off_amount: 2.5
      })
    ).toEqual({
      subtotal: 1200,
      taxAmount: 216,
      roundOffAmount: 2.5,
      total: 1418.5
    });
  });

  it('calculates an additional charge total including tax', () => {
    expect(
      calculatePurchaseRequestAdditionalChargeTotal({
        amount: 500,
        tax_percent: 18
      })
    ).toEqual({
      subtotal: 500,
      taxAmount: 90,
      total: 590
    });
  });

  it('aggregates material and additional charge totals', () => {
    expect(
      calculatePurchaseRequestTotals({
        items: [
          { purchase_qty: 10, unit_rate: 100, tax_percent: 18, round_off_amount: 5 },
          { purchase_qty: 4, unit_rate: 50, tax_percent: 0, round_off_amount: 0 }
        ],
        additionalCharges: [
          { amount: 300, tax_percent: 18 },
          { amount: 100, tax_percent: 0 }
        ]
      })
    ).toEqual({
      material_subtotal: 1200,
      material_tax_total: 180,
      material_total: 1385,
      additional_charge_subtotal: 400,
      additional_charge_tax_total: 54,
      additional_charge_total: 454,
      grand_total: 1839
    });
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { evaluateBulkOrderGuardrails, isBulkGuardrailsEnabled } from '@/lib/bulk-order-guardrails';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const materialId = body?.material_id?.toString().trim();
    const orderedQty = Number(body?.ordered_qty);
    const supplierUnitRate = Number(body?.supplier_unit_rate ?? 0);
    const taxPercent = Number(body?.tax_percent ?? 0);
    const tenureMonths = Number(body?.tenure_months ?? 3);

    if (!materialId || !Number.isFinite(orderedQty) || orderedQty <= 0) {
      return NextResponse.json(
        { error: 'material_id and ordered_qty (> 0) are required' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(tenureMonths) || tenureMonths <= 0) {
      return NextResponse.json(
        { error: 'tenure_months must be greater than 0' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id, platform_fee_rate, platform_fee_cap, participation_fee_rate_daily')
      .eq('clerk_user_id', user.id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, name, hsn_code')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const platformFeeRate = Number(contractor.platform_fee_rate ?? 0.0025);
    const platformFeeCap = Number(contractor.platform_fee_cap ?? 25000);
    const participationFeeRateDaily = Number(contractor.participation_fee_rate_daily ?? 0.001);
    const guardrailsEnabled = isBulkGuardrailsEnabled();

    const baseCost = Number.isFinite(supplierUnitRate) && supplierUnitRate > 0
      ? orderedQty * supplierUnitRate
      : 0;
    const platformFeeAmount = Math.min(baseCost * platformFeeRate, platformFeeCap);
    const taxAmount = (baseCost * taxPercent) / 100;
    const invoiceTotal = baseCost + platformFeeAmount + taxAmount;
    const monthlyRate = participationFeeRateDaily * 30;
    const financePrincipal = invoiceTotal;

    let outstanding = financePrincipal;
    let allocatedPrincipal = 0;
    let totalInterest = 0;
    const monthlyInstallments: Array<{
      month: number;
      principal_component: number;
      interest_component: number;
      emi_amount: number;
      outstanding_after: number;
    }> = [];

    for (let month = 1; month <= tenureMonths; month += 1) {
      const isLast = month === tenureMonths;
      let principalComponent = Number((financePrincipal / tenureMonths).toFixed(2));
      if (isLast) {
        principalComponent = Number((financePrincipal - allocatedPrincipal).toFixed(2));
      }
      allocatedPrincipal = Number((allocatedPrincipal + principalComponent).toFixed(2));

      const interestComponent = Number((outstanding * monthlyRate).toFixed(2));
      totalInterest = Number((totalInterest + interestComponent).toFixed(2));
      const emiAmount = Number((principalComponent + interestComponent).toFixed(2));
      outstanding = Number(Math.max(outstanding - principalComponent, 0).toFixed(2));

      monthlyInstallments.push({
        month,
        principal_component: principalComponent,
        interest_component: interestComponent,
        emi_amount: emiAmount,
        outstanding_after: outstanding
      });
    }

    const totalRepayment = Number((financePrincipal + totalInterest).toFixed(2));
    const avgEmi = Number((totalRepayment / tenureMonths).toFixed(2));

    const guardrailCheck = guardrailsEnabled
      ? await evaluateBulkOrderGuardrails({
          contractorId: contractor.id,
          materialId,
          orderedQty,
          supplierUnitRate
        })
      : {
          monthly_usage_qty: null,
          max_order_qty: null,
          monthly_usage_value: null,
          current_outstanding_value: 0,
          max_outstanding_value: null,
          contractor_outstanding_value: 0,
          headroom_value: null,
          can_create_order: true,
          reasons: [],
          settings: {
            bulk_order_multiplier: 1.5,
            bulk_outstanding_months_cap: 2.0,
            bulk_order_credit_limit: null,
            bulk_supply_blocked: false
          }
        };

    return NextResponse.json({
      success: true,
      data: {
        material_id: material.id,
        material_name: material.name,
        material_hsn_code: material.hsn_code || null,
        ordered_qty: orderedQty,
        supplier_unit_rate: supplierUnitRate,
        base_cost: baseCost,
        platform_fee_rate: platformFeeRate,
        platform_fee_cap: platformFeeCap,
        platform_fee_amount: platformFeeAmount,
        participation_fee_rate_daily: participationFeeRateDaily,
        monthly_participation_rate: monthlyRate,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        invoice_total: invoiceTotal,
        tenure_months: tenureMonths,
        monthly_installments: monthlyInstallments,
        monthly_repayments: monthlyInstallments,
        total_interest: totalInterest,
        total_repayment: totalRepayment,
        average_emi: avgEmi,
        average_monthly_repayment: avgEmi,
        monthly_usage_qty: guardrailCheck.monthly_usage_qty,
        max_order_qty: guardrailCheck.max_order_qty,
        monthly_usage_value: guardrailCheck.monthly_usage_value,
        current_outstanding_value: guardrailCheck.current_outstanding_value,
        max_outstanding_value: guardrailCheck.max_outstanding_value,
        headroom_value: guardrailCheck.headroom_value,
        can_create_order: guardrailCheck.can_create_order,
        guardrail_reasons: guardrailCheck.reasons
      }
    });
  } catch (error) {
    console.error('Error simulating bulk order:', error);
    return NextResponse.json(
      { error: 'Failed to simulate bulk order' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { evaluateBulkOrderGuardrails, isBulkGuardrailsEnabled } from '@/lib/bulk-order-guardrails';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    let query = supabase
      .from('buyer_bulk_orders')
      .select(`
        *,
        material:materials!buyer_bulk_orders_material_id_fkey(
          id,
          name,
          hsn_code,
          unit
        )
      `)
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch bulk orders:', error);
      return NextResponse.json({ error: 'Failed to fetch bulk orders' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching bulk orders:', error);
    return NextResponse.json({ error: 'Failed to fetch bulk orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const materialId = body?.material_id?.toString().trim();
    const orderedQty = Number(body?.ordered_qty);
    const uom = body?.uom?.toString().trim();
    const supplierUnitRate = Number(body?.supplier_unit_rate ?? 0);
    const taxPercent = Number(body?.tax_percent ?? 0);
    const tenureMonths = body?.tenure_months ? Number(body.tenure_months) : null;
    const projectId = body?.project_id?.toString().trim() || null;
    const supplierId = body?.supplier_id?.toString().trim() || null;
    const hsnOverride = body?.hsn_code?.toString().trim() || null;

    if (!materialId || !Number.isFinite(orderedQty) || orderedQty <= 0 || !uom) {
      return NextResponse.json(
        { error: 'material_id, ordered_qty (>0), and uom are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id, platform_fee_rate, platform_fee_cap')
      .eq('clerk_user_id', user.id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, hsn_code')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const resolvedHsnCode = hsnOverride || material.hsn_code || null;
    const baseCost = Number.isFinite(supplierUnitRate) && supplierUnitRate > 0
      ? orderedQty * supplierUnitRate
      : 0;
    const platformFeeRate = Number(contractor.platform_fee_rate ?? 0.0025);
    const platformFeeCap = Number(contractor.platform_fee_cap ?? 25000);
    const platformFeeAmount = Math.min(baseCost * platformFeeRate, platformFeeCap);
    const taxAmount = (baseCost * taxPercent) / 100;
    const invoiceTotal = baseCost + platformFeeAmount + taxAmount;

    if (isBulkGuardrailsEnabled()) {
      const guardrailCheck = await evaluateBulkOrderGuardrails({
        contractorId: contractor.id,
        materialId,
        orderedQty,
        supplierUnitRate
      });

      if (!guardrailCheck.can_create_order) {
        return NextResponse.json(
          {
            error: 'Bulk order blocked by guardrails',
            guardrail_reasons: guardrailCheck.reasons,
            guardrail_check: guardrailCheck
          },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('buyer_bulk_orders')
      .insert({
        contractor_id: contractor.id,
        project_id: projectId,
        material_id: materialId,
        hsn_code: resolvedHsnCode,
        ordered_qty: orderedQty,
        uom,
        supplier_id: supplierId,
        supplier_unit_rate: Number.isFinite(supplierUnitRate) ? supplierUnitRate : 0,
        base_cost: baseCost,
        platform_fee_amount: platformFeeAmount,
        tax_percent: Number.isFinite(taxPercent) ? taxPercent : 0,
        tax_amount: taxAmount,
        invoice_total: invoiceTotal,
        tenure_months: tenureMonths,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        created_by: contractor.id
      })
      .select(`
        *,
        material:materials!buyer_bulk_orders_material_id_fkey(
          id,
          name,
          hsn_code,
          unit
        )
      `)
      .single();

    if (error) {
      console.error('Failed to create bulk order:', error);
      return NextResponse.json(
        { error: 'Failed to create bulk order', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error creating bulk order:', error);
    return NextResponse.json({ error: 'Failed to create bulk order' }, { status: 500 });
  }
}

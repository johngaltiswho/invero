import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateMeasurementQty, toNullableNumber } from '@/lib/measurements';
import type { MeasurementMode } from '@/types/measurements';

type RouteContext = {
  params: Promise<{ id: string; measurementId: string }>;
};

async function getContractorId() {
  const { userId } = await auth();
  if (!userId) return null;

  const { data: contractor } = await supabaseAdmin
    .from('contractors')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  return contractor?.id || null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const contractorId = await getContractorId();
    if (!contractorId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId, measurementId } = await context.params;
    const body = await request.json();
    const measurementMode = body.measurement_mode as MeasurementMode;

    const updatePayload = {
      measurement_date: body.measurement_date,
      location_description: body.location_description?.trim() || null,
      remarks: body.remarks?.trim() || null,
      measurement_mode: measurementMode,
      nos: toNullableNumber(body.nos),
      length: toNullableNumber(body.length),
      breadth: toNullableNumber(body.breadth),
      height: toNullableNumber(body.height),
      direct_qty: toNullableNumber(body.direct_qty),
      computed_qty: calculateMeasurementQty({
        measurement_mode: measurementMode,
        nos: toNullableNumber(body.nos),
        length: toNullableNumber(body.length),
        breadth: toNullableNumber(body.breadth),
        height: toNullableNumber(body.height),
        direct_qty: toNullableNumber(body.direct_qty),
      }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('boq_measurement_rows')
      .update(updatePayload)
      .eq('id', measurementId)
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update measurement row:', error);
      return NextResponse.json({ success: false, error: 'Failed to update measurement row' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to update measurement row:', error);
    return NextResponse.json({ success: false, error: 'Failed to update measurement row' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const contractorId = await getContractorId();
    if (!contractorId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId, measurementId } = await context.params;

    const { error } = await supabaseAdmin
      .from('boq_measurement_rows')
      .delete()
      .eq('id', measurementId)
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId);

    if (error) {
      console.error('Failed to delete measurement row:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete measurement row' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete measurement row:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete measurement row' }, { status: 500 });
  }
}

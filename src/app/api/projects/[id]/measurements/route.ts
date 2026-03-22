import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildMeasurementSummary, calculateMeasurementQty, toNullableNumber } from '@/lib/measurements';
import type { BoqMeasurementRow, MeasurementMode } from '@/types/measurements';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAuthenticatedProject(projectId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }) };
  }

  const { data: contractor, error: contractorError } = await supabaseAdmin
    .from('contractors')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (contractorError || !contractor) {
    return { error: NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 }) };
  }

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, contractor_id, project_name')
    .eq('id', projectId)
    .eq('contractor_id', contractor.id)
    .single();

  if (projectError || !project) {
    return { error: NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 }) };
  }

  return { contractorId: contractor.id, project };
}

async function getLatestProjectBoq(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('project_boqs')
    .select(`
      id,
      file_name,
      created_at,
      boq_items (
        id,
        description,
        unit,
        quantity_numeric,
        category,
        line_order,
        measurement_input_unit,
        measurement_conversion_factor
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0] || null) as any;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const authResult = await getAuthenticatedProject(projectId);
    if ('error' in authResult) return authResult.error;

    const latestBoq = await getLatestProjectBoq(projectId);
    if (!latestBoq) {
      return NextResponse.json({
        success: true,
        data: {
          boq_id: null,
          boq_file_name: null,
          has_measurements: false,
          summary_rows: [],
        },
      });
    }

    const { data: measurementRows, error: measurementError } = await supabaseAdmin
      .from('boq_measurement_rows')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', authResult.contractorId)
      .order('measurement_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (measurementError) {
      console.error('Failed to load measurement rows:', measurementError);
      return NextResponse.json({ success: false, error: 'Failed to load measurements' }, { status: 500 });
    }

    const summaryRows = buildMeasurementSummary({
      boqItems: (latestBoq.boq_items || []) as Array<{
        id: string;
        description: string;
        unit: string;
        category?: string | null;
        quantity_numeric?: number | null;
        line_order?: number | null;
        measurement_input_unit?: string | null;
        measurement_conversion_factor?: number | null;
      }>,
      measurementRows: ((measurementRows || []) as BoqMeasurementRow[]).map((row) => ({
        ...row,
        computed_qty: Number(row.computed_qty || 0),
      })),
    });

    return NextResponse.json({
      success: true,
      data: {
        boq_id: latestBoq.id,
        boq_file_name: latestBoq.file_name,
        has_measurements: (measurementRows || []).length > 0,
        summary_rows: summaryRows,
      },
    });
  } catch (error) {
    console.error('Failed to fetch measurements:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch measurements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const authResult = await getAuthenticatedProject(projectId);
    if ('error' in authResult) return authResult.error;

    const latestBoq = await getLatestProjectBoq(projectId);
    if (!latestBoq) {
      return NextResponse.json({ success: false, error: 'BOQ is required before measurements can be added' }, { status: 400 });
    }

    const body = await request.json();
    const boqItemId = String(body.boq_item_id || '');
    const measurementMode = body.measurement_mode as MeasurementMode;
    const measurementDate = String(body.measurement_date || '');

    if (!boqItemId || !measurementMode || !measurementDate) {
      return NextResponse.json({ success: false, error: 'boq_item_id, measurement_mode, and measurement_date are required' }, { status: 400 });
    }

    const boqItemIds = new Set((latestBoq.boq_items || []).map((item: any) => item.id));
    if (!boqItemIds.has(boqItemId)) {
      return NextResponse.json({ success: false, error: 'Selected BOQ item does not belong to the active BOQ baseline' }, { status: 400 });
    }

    const insertPayload = {
      project_id: projectId,
      contractor_id: authResult.contractorId,
      boq_item_id: boqItemId,
      measurement_date: measurementDate,
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
    };

    const { data, error } = await supabaseAdmin
      .from('boq_measurement_rows')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create measurement row:', error);
      return NextResponse.json({ success: false, error: 'Failed to create measurement row' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to create measurement row:', error);
    return NextResponse.json({ success: false, error: 'Failed to create measurement row' }, { status: 500 });
  }
}

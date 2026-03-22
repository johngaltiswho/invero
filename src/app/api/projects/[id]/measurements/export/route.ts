import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildMeasurementSummary } from '@/lib/measurements';
import type { BoqMeasurementRow } from '@/types/measurements';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId } = await context.params;

    const { data: contractor } = await supabaseAdmin
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!contractor) {
      return NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 });
    }

    const { data: boqRecords, error: boqError } = await supabaseAdmin
      .from('project_boqs')
      .select(`
        id,
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

    if (boqError) {
      console.error('Failed to load BOQ for measurement export:', boqError);
      return NextResponse.json({ success: false, error: 'Failed to export measurement register' }, { status: 500 });
    }

    const latestBoq = boqRecords?.[0] as any;
    if (!latestBoq) {
      return NextResponse.json({ success: false, error: 'No BOQ baseline found for this project' }, { status: 400 });
    }

    const { data: measurementRows, error: measurementError } = await supabaseAdmin
      .from('boq_measurement_rows')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', contractor.id)
      .order('measurement_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (measurementError) {
      console.error('Failed to load measurement rows for export:', measurementError);
      return NextResponse.json({ success: false, error: 'Failed to export measurement register' }, { status: 500 });
    }

    const summaryRows = buildMeasurementSummary({
      boqItems: (latestBoq.boq_items || []) as any[],
      measurementRows: ((measurementRows || []) as BoqMeasurementRow[]).map((row) => ({
        ...row,
        computed_qty: Number(row.computed_qty || 0),
      })),
    });

    const escapeCsv = (value: string | number | null) => {
      if (value === null || value === undefined) return '';
      const text = String(value);
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const lines = [
      ['Description', 'BOQ Unit', 'Measurement Unit', 'Planned Qty', 'Executed Native Qty', 'Executed Qty', 'Balance Qty'].join(','),
      ...summaryRows.map((row) =>
        [
          escapeCsv(row.description),
          escapeCsv(row.unit),
          escapeCsv(row.measurement_input_unit),
          escapeCsv(row.planned_qty),
          escapeCsv(row.executed_native_qty),
          escapeCsv(row.executed_qty),
          escapeCsv(row.balance_qty),
        ].join(',')
      ),
    ];

    const csv = lines.join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="measurement-register-${projectId}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export measurement register:', error);
    return NextResponse.json({ success: false, error: 'Failed to export measurement register' }, { status: 500 });
  }
}

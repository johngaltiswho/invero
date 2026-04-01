import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import {
  createPumpAccessLabel,
  generatePumpAccessCode,
  hashPumpAccessCode,
} from '@/lib/pump-session';

interface RouteContext {
  params: Promise<{ pumpId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { pumpId } = await context.params;

    const { data: currentPump, error: fetchError } = await supabaseAdmin
      .from('fuel_pumps')
      .select('id, pump_name, dashboard_access_version')
      .eq('id', pumpId)
      .single();

    if (fetchError || !currentPump) {
      return NextResponse.json({ error: 'Fuel pump not found' }, { status: 404 });
    }

    const accessCode = generatePumpAccessCode(currentPump.id);
    const accessLabel = createPumpAccessLabel(accessCode);
    const nextVersion = Number(currentPump.dashboard_access_version || 0) + 1;

    const { error: updateError } = await supabaseAdmin
      .from('fuel_pumps')
      .update({
        dashboard_access_code_hash: hashPumpAccessCode(accessCode),
        dashboard_access_label: accessLabel,
        dashboard_access_active: true,
        dashboard_access_version: nextVersion,
      })
      .eq('id', pumpId);

    if (updateError) {
      console.error('Failed to generate pump dashboard access code:', updateError);
      return NextResponse.json({ error: 'Failed to generate dashboard access code' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        pump_id: currentPump.id,
        pump_name: currentPump.pump_name,
        access_code: accessCode,
        access_label: accessLabel,
      },
    });
  } catch (error) {
    console.error('Error generating pump access code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message === 'Admin access required' ? 403 : 500 }
    );
  }
}

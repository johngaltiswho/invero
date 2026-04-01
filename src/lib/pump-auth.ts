import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readPumpSessionFromRequest } from '@/lib/pump-session';

export class PumpAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PumpAuthError';
    this.status = status;
  }
}

export async function requirePumpSession(request: NextRequest) {
  const session = readPumpSessionFromRequest(request);
  if (!session) {
    throw new PumpAuthError('Pump access required', 401);
  }

  const { data: pump, error } = await supabaseAdmin
    .from('fuel_pumps')
    .select('id, pump_name, oem_name, city, state, dashboard_access_active, dashboard_access_version')
    .eq('id', session.pumpId)
    .single();

  if (error || !pump) {
    throw new PumpAuthError('Pump access invalid', 401);
  }

  if (!pump.dashboard_access_active) {
    throw new PumpAuthError('Pump dashboard access disabled', 403);
  }

  if (Number(pump.dashboard_access_version || 0) !== session.accessVersion) {
    throw new PumpAuthError('Pump dashboard session expired', 401);
  }

  return {
    pumpId: pump.id,
    pump,
  };
}

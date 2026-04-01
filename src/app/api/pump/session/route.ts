import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createPumpSessionToken,
  getPumpSessionCookieName,
  getPumpSessionCookieOptions,
  hashPumpAccessCode,
  readPumpSessionFromRequest,
} from '@/lib/pump-session';

const attemptsByIp = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const entry = attemptsByIp.get(ip);
  if (!entry || entry.resetAt < now) {
    attemptsByIp.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerAttempt(ip: string, success = false) {
  const now = Date.now();
  const entry = attemptsByIp.get(ip);
  if (!entry || entry.resetAt < now) {
    attemptsByIp.set(ip, { count: success ? 0 : 1, resetAt: now + WINDOW_MS });
    return;
  }
  attemptsByIp.set(ip, {
    count: success ? 0 : entry.count + 1,
    resetAt: entry.resetAt,
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = readPumpSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { data: pump, error } = await supabaseAdmin
      .from('fuel_pumps')
      .select('id, pump_name, oem_name, city, state, dashboard_access_active, dashboard_access_version')
      .eq('id', session.pumpId)
      .single();

    if (error || !pump || !pump.dashboard_access_active || Number(pump.dashboard_access_version || 0) !== session.accessVersion) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete(getPumpSessionCookieName());
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      pump: {
        id: pump.id,
        pump_name: pump.pump_name,
        oem_name: pump.oem_name,
        city: pump.city,
        state: pump.state,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/pump/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many access attempts. Please wait and retry.' }, { status: 429 });
    }

    const body = await request.json();
    const accessCode = String(body?.access_code || '').trim().toUpperCase();
    if (!accessCode) {
      registerAttempt(ip);
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 });
    }

    const accessCodeHash = hashPumpAccessCode(accessCode);
    const { data: pump, error } = await supabaseAdmin
      .from('fuel_pumps')
      .select('id, pump_name, dashboard_access_active, dashboard_access_version')
      .eq('dashboard_access_code_hash', accessCodeHash)
      .eq('dashboard_access_active', true)
      .maybeSingle();

    if (error || !pump) {
      registerAttempt(ip);
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
    }

    registerAttempt(ip, true);

    await supabaseAdmin
      .from('fuel_pumps')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', pump.id);

    const token = createPumpSessionToken({
      pumpId: pump.id,
      pumpName: pump.pump_name,
      accessVersion: Number(pump.dashboard_access_version || 1),
    });

    const response = NextResponse.json({
      success: true,
      pump: {
        id: pump.id,
        pump_name: pump.pump_name,
      },
    });
    response.cookies.set(getPumpSessionCookieName(), token, getPumpSessionCookieOptions());
    return response;
  } catch (error) {
    console.error('Error in POST /api/pump/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(getPumpSessionCookieName());
  return response;
}

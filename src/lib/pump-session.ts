import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

const PUMP_SESSION_COOKIE = 'finverno_pump_session';
const PUMP_SESSION_TTL_SECONDS = 60 * 60 * 12;
const PUMP_ACCESS_SECRET =
  process.env.PUMP_DASHBOARD_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'pump-dashboard-dev-secret';

export interface PumpSessionPayload {
  pumpId: string;
  pumpName: string;
  accessVersion: number;
  exp: number;
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return Buffer.from(normalized + padding, 'base64');
}

function signValue(value: string) {
  return createHmac('sha256', PUMP_ACCESS_SECRET).update(value).digest();
}

export function hashPumpAccessCode(code: string) {
  return createHash('sha256').update(code.trim()).digest('hex');
}

export function generatePumpAccessCode(pumpId: string) {
  const compactId = pumpId.replace(/-/g, '').toUpperCase();
  return compactId.slice(-6);
}

export function createPumpAccessLabel(code: string) {
  return `PUMP-${code}`;
}

export function createPumpSessionToken(input: {
  pumpId: string;
  pumpName: string;
  accessVersion: number;
}) {
  const payload: PumpSessionPayload = {
    pumpId: input.pumpId,
    pumpName: input.pumpName,
    accessVersion: input.accessVersion,
    exp: Math.floor(Date.now() / 1000) + PUMP_SESSION_TTL_SECONDS,
  };
  const serialized = JSON.stringify(payload);
  const encoded = toBase64Url(serialized);
  const signature = toBase64Url(signValue(encoded));
  return `${encoded}.${signature}`;
}

export function verifyPumpSessionToken(token?: string | null): PumpSessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = signValue(encoded);
  const provided = fromBase64Url(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded).toString('utf8')) as PumpSessionPayload;
    if (!payload?.pumpId || !payload?.pumpName || !payload?.accessVersion || !payload?.exp) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getPumpSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PUMP_SESSION_TTL_SECONDS,
  };
}

export function readPumpSessionFromRequest(request: NextRequest) {
  return verifyPumpSessionToken(request.cookies.get(PUMP_SESSION_COOKIE)?.value || null);
}

export function getPumpSessionCookieName() {
  return PUMP_SESSION_COOKIE;
}

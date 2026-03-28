/**
 * Health Check Endpoint
 *
 * Provides comprehensive health status for monitoring and alerting.
 * Can be called by uptime monitors, load balancers, or health dashboards.
 *
 * GET /api/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // Disable caching

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: HealthCheck[];
  uptime: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // 1. Database Health Check
  try {
    const dbStart = Date.now();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('contractors')
      .select('id')
      .limit(1);

    const dbLatency = Date.now() - dbStart;

    if (error) {
      checks.push({
        name: 'database',
        status: 'unhealthy',
        message: error.message,
        latency: dbLatency,
      });
    } else {
      checks.push({
        name: 'database',
        status: dbLatency > 1000 ? 'degraded' : 'healthy',
        latency: dbLatency,
      });
    }
  } catch (error) {
    checks.push({
      name: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // 2. Supabase Storage Health Check
  try {
    const storageStart = Date.now();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from('contractor-documents')
      .list('', { limit: 1 });

    const storageLatency = Date.now() - storageStart;

    if (error) {
      checks.push({
        name: 'storage',
        status: 'degraded',
        message: error.message,
        latency: storageLatency,
      });
    } else {
      checks.push({
        name: 'storage',
        status: storageLatency > 2000 ? 'degraded' : 'healthy',
        latency: storageLatency,
      });
    }
  } catch (error) {
    checks.push({
      name: 'storage',
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // 3. Environment Variables Check
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    checks.push({
      name: 'environment',
      status: 'unhealthy',
      message: `Missing: ${missingVars.join(', ')}`,
    });
  } else {
    checks.push({
      name: 'environment',
      status: 'healthy',
    });
  }

  // 4. Google Drive Credentials Check
  const hasGoogleBase64 = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const hasGoogleIndividual = !!(
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_PROJECT_ID
  );

  if (hasGoogleBase64 || hasGoogleIndividual) {
    checks.push({
      name: 'google_drive',
      status: 'healthy',
      message: hasGoogleBase64 ? 'Using base64 credentials' : 'Using individual credentials',
    });
  } else {
    checks.push({
      name: 'google_drive',
      status: 'degraded',
      message: 'No Google Drive credentials found',
    });
  }

  // 5. Gemini API Key Check (don't actually call the API, just verify it's set)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 20) {
    checks.push({
      name: 'gemini_api',
      status: 'healthy',
    });
  } else {
    checks.push({
      name: 'gemini_api',
      status: 'degraded',
      message: 'Gemini API key missing or invalid',
    });
  }

  // Determine overall status
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
  const hasDegraded = checks.some(c => c.status === 'degraded');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
    environment: process.env.NODE_ENV || 'development',
    checks,
    uptime: process.uptime(),
  };

  // Return appropriate HTTP status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;

  return NextResponse.json(response, { status: statusCode });
}

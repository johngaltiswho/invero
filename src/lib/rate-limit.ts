/**
 * Rate Limiting Utility for API Routes
 *
 * Provides in-memory rate limiting with configurable windows and limits.
 * For production with multiple servers, consider using Redis-backed rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs?: number;

  /**
   * Maximum number of requests per window
   * @default 100
   */
  max?: number;

  /**
   * Custom message when rate limit is exceeded
   */
  message?: string;

  /**
   * Status code to return when rate limited
   * @default 429
   */
  statusCode?: number;

  /**
   * Skip rate limiting for specific conditions
   */
  skip?: (request: NextRequest) => boolean;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limit tracking
// Key format: "ip:endpoint" or "user:endpoint"
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client identifier from request
 * Tries to get IP address from various headers
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (for reverse proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}

/**
 * Rate limit middleware for API routes
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, { max: 10, windowMs: 60000 });
 *   if (rateLimitResult) return rateLimitResult;
 *
 *   // Your API logic here
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {}
): Promise<NextResponse | null> {
  const {
    windowMs = 60000, // 1 minute default
    max = 100,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skip,
  } = config;

  // Skip if custom condition is met
  if (skip && skip(request)) {
    return null;
  }

  const now = Date.now();
  const clientId = getClientIdentifier(request);
  const endpoint = new URL(request.url).pathname;
  const key = `${clientId}:${endpoint}`;

  // Get or create rate limit record
  let record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, record);
  } else {
    // Increment count
    record.count += 1;
  }

  // Check if limit exceeded
  if (record.count > max) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    return NextResponse.json(
      {
        error: message,
        retryAfter: `${retryAfter} seconds`,
      },
      {
        status: statusCode,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        },
      }
    );
  }

  // Add rate limit headers to track usage
  const remaining = max - record.count;
  request.headers.set('X-RateLimit-Limit', max.toString());
  request.headers.set('X-RateLimit-Remaining', remaining.toString());
  request.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

  return null; // No rate limit hit, continue processing
}

/**
 * Predefined rate limit configurations for common use cases
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  AUTH: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },

  /**
   * Standard rate limit for general API endpoints
   * 100 requests per minute
   */
  STANDARD: {
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many requests. Please slow down.',
  },

  /**
   * Strict rate limit for mutation endpoints (POST, PUT, DELETE)
   * 30 requests per minute
   */
  MUTATION: {
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many write operations. Please slow down.',
  },

  /**
   * Lenient rate limit for read-only endpoints
   * 300 requests per minute
   */
  READ_ONLY: {
    windowMs: 60 * 1000,
    max: 300,
  },

  /**
   * Very strict rate limit for expensive operations
   * 10 requests per hour
   */
  EXPENSIVE: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'This operation is rate-limited. Please try again later.',
  },
};

/**
 * Utility to get rate limit status for a client
 * Useful for debugging or admin dashboards
 */
export function getRateLimitStatus(clientId: string, endpoint: string): {
  count: number;
  limit: number;
  resetTime: Date;
  isLimited: boolean;
} | null {
  const key = `${clientId}:${endpoint}`;
  const record = rateLimitStore.get(key);

  if (!record) {
    return null;
  }

  return {
    count: record.count,
    limit: 100, // This should be passed in or stored
    resetTime: new Date(record.resetTime),
    isLimited: record.count > 100,
  };
}

/**
 * Clear rate limit for a specific client and endpoint
 * Useful for admin operations or testing
 */
export function clearRateLimit(clientId: string, endpoint: string): void {
  const key = `${clientId}:${endpoint}`;
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits
 * Use with caution - primarily for testing
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

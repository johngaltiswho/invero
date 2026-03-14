# Rate Limiting Guide

## Overview

Rate limiting protects your API from abuse, DoS attacks, and excessive usage. Our implementation uses an in-memory store suitable for single-server deployments.

## Basic Usage

### Simple Rate Limiting

```typescript
import { rateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Apply rate limit: 100 requests per minute
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  // Your API logic here
  return NextResponse.json({ success: true });
}
```

### Custom Configuration

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Custom rate limit: 30 requests per minute
  const rateLimitResult = await rateLimit(request, {
    max: 30,
    windowMs: 60000, // 1 minute
    message: 'Too many requests, slow down!',
  });
  if (rateLimitResult) return rateLimitResult;

  // Your API logic
}
```

### Using Presets

```typescript
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

// For authentication endpoints (strict)
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimitPresets.AUTH);
  if (rateLimitResult) return rateLimitResult;

  // Login logic
}

// For mutation endpoints (moderate)
export async function PUT(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MUTATION);
  if (rateLimitResult) return rateLimitResult;

  // Update logic
}

// For read-only endpoints (lenient)
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimitPresets.READ_ONLY);
  if (rateLimitResult) return rateLimitResult;

  // Fetch logic
}
```

## Available Presets

| Preset | Window | Max Requests | Use Case |
|--------|--------|--------------|----------|
| `AUTH` | 15 min | 5 | Authentication, password reset |
| `STANDARD` | 1 min | 100 | General API endpoints |
| `MUTATION` | 1 min | 30 | POST, PUT, DELETE operations |
| `READ_ONLY` | 1 min | 300 | GET requests, data fetching |
| `EXPENSIVE` | 1 hour | 10 | AI operations, file processing |

## Response Headers

When rate limiting is active, the following headers are included:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the limit resets (ISO 8601)
- `Retry-After`: Seconds until rate limit resets (only when limited)

## Client-Side Handling

### JavaScript/TypeScript

```typescript
async function makeRequest() {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);

    const errorData = await response.json();
    // { error: "Too many requests...", retryAfter: "45 seconds" }

    return;
  }

  // Check remaining requests
  const remaining = response.headers.get('X-RateLimit-Remaining');
  console.log(`${remaining} requests remaining`);

  const data = await response.json();
  return data;
}
```

## Production Considerations

### For Single Server Deployments

The in-memory implementation works well for:
- Single server instances
- Development environments
- Small to medium traffic applications

### For Multi-Server Deployments (Recommended)

For production with multiple servers, use Redis-backed rate limiting:

```typescript
// Example with Redis (requires implementation)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Rate limit using Redis
export async function rateLimitWithRedis(
  request: NextRequest,
  config: RateLimitConfig
) {
  // Implementation using Redis for distributed rate limiting
}
```

**Recommended Redis Solutions:**
- Upstash Redis (serverless, pay-per-request)
- Redis Cloud
- Self-hosted Redis

## Monitoring Rate Limits

### Admin Dashboard

Use the utility functions to monitor rate limit status:

```typescript
import { getRateLimitStatus } from '@/lib/rate-limit';

// Get rate limit info for a client
const status = getRateLimitStatus('192.168.1.1', '/api/projects');
if (status) {
  console.log(`Count: ${status.count}/${status.limit}`);
  console.log(`Resets: ${status.resetTime}`);
  console.log(`Limited: ${status.isLimited}`);
}
```

### Clearing Rate Limits (Admin Only)

```typescript
import { clearRateLimit, clearAllRateLimits } from '@/lib/rate-limit';

// Clear specific client
clearRateLimit('192.168.1.1', '/api/projects');

// Clear all (use with caution)
clearAllRateLimits();
```

## Security Best Practices

1. **Use stricter limits for sensitive endpoints**
   - Authentication: 5 requests per 15 minutes
   - Password reset: 3 requests per hour
   - Account creation: 3 requests per hour

2. **Apply different limits based on user role**
   ```typescript
   const config = user.role === 'admin'
     ? { max: 1000 }
     : RateLimitPresets.STANDARD;
   ```

3. **Log rate limit violations**
   ```typescript
   const rateLimitResult = await rateLimit(request, config);
   if (rateLimitResult) {
     console.warn(`Rate limit exceeded for ${clientId} on ${endpoint}`);
     // Send to Sentry or monitoring service
     return rateLimitResult;
   }
   ```

4. **Consider IP-based + User-based limiting**
   - Use IP for unauthenticated requests
   - Use User ID for authenticated requests

## Common Patterns

### Skip Rate Limiting for Certain Users

```typescript
const rateLimitResult = await rateLimit(request, {
  max: 30,
  skip: (req) => {
    const userId = req.headers.get('x-user-id');
    return userId === 'admin-user-id'; // Skip for admin
  },
});
```

### Different Limits for Different Methods

```typescript
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimitPresets.READ_ONLY);
  if (rateLimitResult) return rateLimitResult;
  // GET logic
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MUTATION);
  if (rateLimitResult) return rateLimitResult;
  // POST logic
}
```

### Combine with Authentication

```typescript
export async function POST(request: NextRequest) {
  // 1. Check rate limit first (fast)
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MUTATION);
  if (rateLimitResult) return rateLimitResult;

  // 2. Then check authentication (slower)
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Process request
}
```

## Testing

```typescript
// In your test file
import { clearAllRateLimits } from '@/lib/rate-limit';

beforeEach(() => {
  clearAllRateLimits(); // Reset for each test
});

test('should rate limit after max requests', async () => {
  const config = { max: 3, windowMs: 60000 };

  // Make 3 successful requests
  for (let i = 0; i < 3; i++) {
    const result = await rateLimit(mockRequest, config);
    expect(result).toBeNull();
  }

  // 4th request should be rate limited
  const result = await rateLimit(mockRequest, config);
  expect(result).not.toBeNull();
  expect(result?.status).toBe(429);
});
```

## Next Steps

- [ ] Apply rate limiting to all API routes
- [ ] Monitor rate limit violations in Sentry
- [ ] Consider Redis for multi-server deployments
- [ ] Add rate limiting metrics to admin dashboard
- [ ] Document rate limits in API documentation

# Error Monitoring Setup (Sentry)

Simple error monitoring setup for Invero using Sentry.

## Setup Steps

### 1. Get Your Sentry DSN

1. Sign up at [sentry.io](https://sentry.io) (free tier is fine to start)
2. Create a new project (choose "Next.js")
3. Copy your DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 2. Add to Environment Variables

Add to your `.env.local`:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your_dsn_here
```

Add to your Vercel environment variables (Production and Preview).

### 3. That's It!

Client-side errors are automatically captured. For server-side errors, use the utility functions.

## Usage in API Routes

### Basic Error Logging

```typescript
import { logError } from '@/lib/error-monitoring';

export async function POST(req: Request) {
  try {
    // Your code here
    const data = await someOperation();
    return Response.json({ data });
  } catch (error) {
    // Log error to Sentry with context
    logError(error, {
      user: { id: userId, email: userEmail },
      request: { method: 'POST', url: '/api/projects' },
      extra: { projectId: 'abc123' }
    });

    return Response.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
```

### Using the Wrapper (Simpler)

```typescript
import { withErrorLogging } from '@/lib/error-monitoring';

export const POST = withErrorLogging(async (req: Request) => {
  // Your code - errors automatically logged
  const data = await someOperation();
  return Response.json({ data });
}, '/api/projects');
```

### Logging Non-Error Messages

```typescript
import { logMessage } from '@/lib/error-monitoring';

// Track important events
logMessage('Large file upload started', 'info', {
  extra: { fileSize: '50MB', userId: 'abc123' }
});

// Track warnings
logMessage('API rate limit approaching', 'warning', {
  extra: { requests: 950, limit: 1000 }
});
```

## Usage in Client Components

Client errors are automatically captured. For manual logging:

```typescript
'use client';

import * as Sentry from '@sentry/nextjs';

try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
  // Show user-friendly message
}
```

## What Gets Tracked

✅ **Automatically Tracked:**
- Unhandled client-side errors
- React component errors
- Failed API requests (when using error-monitoring utils)

❌ **Not Tracked (to reduce noise):**
- Network failures (can't control)
- Browser extension errors
- Expected validation errors (handle these gracefully)

## Best Practices

1. **Don't log expected errors**: Validation failures, 404s, etc. should return proper error responses, not go to Sentry
2. **Add context**: Always include user ID, request details, relevant IDs
3. **Use in critical paths**: Focus on payment flows, data mutations, authentication
4. **Review weekly**: Check Sentry dashboard to identify patterns

## Cost Management

- Free tier: 5,000 errors/month + 50 replays/month (plenty for MVP)
- Current config: 10% performance tracing, replays only on errors
- If you exceed limits, errors still logged to console

## Troubleshooting

**Errors not showing in Sentry?**
1. Check DSN is correct in `.env.local`
2. Verify `NEXT_PUBLIC_SENTRY_DSN` is set (must have `NEXT_PUBLIC_` prefix)
3. Check browser console for Sentry initialization messages
4. Make sure you're testing in production mode (`pnpm build && pnpm start`)

**Want to disable Sentry temporarily?**
Just remove or comment out the `NEXT_PUBLIC_SENTRY_DSN` variable.

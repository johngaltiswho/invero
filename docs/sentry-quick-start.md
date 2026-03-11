# Sentry Integration - Quick Start

## 5-Minute Setup

### Step 1: Get Your Sentry DSN

1. Sign up at [https://sentry.io](https://sentry.io) (free tier available)
2. Create a new Next.js project
3. Copy your DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)

### Step 2: Add Environment Variable

Create or update `.env.local`:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here
```

### Step 3: Done!

That's it! Sentry is now tracking errors automatically.

## Verify It's Working

### Test Client-Side Error Tracking

Add a test button anywhere:

```tsx
<button onClick={() => { throw new Error('Test Sentry!'); }}>
  Test Error
</button>
```

Click it, then check your Sentry dashboard. You should see the error appear within 1-2 minutes.

### Test Server-Side Error Tracking

Add to any API route:

```typescript
export async function GET() {
  throw new Error('Test server error!');
}
```

Call the endpoint, check Sentry dashboard.

## What's Already Configured

✅ Client-side error tracking (React errors, unhandled rejections)
✅ Server-side error tracking (API routes, server components)
✅ Edge runtime tracking (middleware)
✅ Performance monitoring (10% of requests)
✅ Session replay (only on errors)
✅ Error boundaries (graceful error handling)
✅ Custom error utilities (business logic tracking)

## Using Custom Error Tracking

### Track Purchase Request Errors

```typescript
import { capturePurchaseRequestError } from '@/lib/sentry';

try {
  await updatePurchaseRequest(prId);
} catch (error) {
  capturePurchaseRequestError(error as Error, prId, {
    contractor_id: contractorId,
    status: 'submitted',
    action: 'approve',
  });
  throw error;
}
```

### Track Capital Transaction Errors

```typescript
import { captureCapitalTransactionError } from '@/lib/sentry';

try {
  await deployCapital(amount);
} catch (error) {
  captureCapitalTransactionError(error as Error, txnId, {
    investor_id: investorId,
    transaction_type: 'deployment',
    amount,
  });
  throw error;
}
```

### Set User Context (for better debugging)

```typescript
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

// After user logs in
setSentryUser({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

// When user logs out
clearSentryUser();
```

## Common Use Cases

### Wrap Components with Error Boundaries

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary showDialog={true}>
  <YourComponentThatMightError />
</ErrorBoundary>
```

### Track API Errors

```typescript
import { captureAPIError } from '@/lib/sentry';

export async function POST(request: NextRequest) {
  try {
    // Your logic
  } catch (error) {
    captureAPIError(error as Error, '/api/endpoint', 'POST', 500);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Track Slow Queries

```typescript
import { trackDatabaseQuery } from '@/lib/sentry';

const data = await trackDatabaseQuery(
  'fetch_purchase_requests',
  async () => {
    return await supabase.from('purchase_requests').select('*');
  },
  1000 // Alert if query takes > 1 second
);
```

## Viewing Errors

1. Go to your [Sentry dashboard](https://sentry.io)
2. Click on your project
3. View the **Issues** tab to see all errors
4. Click any error to see:
   - Stack trace
   - User context
   - Breadcrumbs (actions leading to error)
   - Session replay (if error occurred)

## Setting Up Alerts

1. Go to **Alerts** in Sentry
2. Click **Create Alert**
3. Choose a template or custom rule
4. Recommended alerts:
   - **Error Spike**: Alerts when errors increase suddenly
   - **New Issue**: Alerts on first occurrence of new error
   - **Slow Performance**: Alerts when queries are slow

## Cost Management

**Free Tier Includes:**
- 5,000 errors per month
- 10,000 performance transactions per month
- 50 session replays per month

**Current Configuration:**
- Error tracking: All errors (within limits)
- Performance: 10% sample rate (reduces cost)
- Session replay: Only on errors (cost-optimized)

**To reduce costs further:**
- Lower `tracesSampleRate` to 0.05 (5%)
- Disable replays: `replaysOnErrorSampleRate: 0`

## Next Steps

- Read full guide: `docs/sentry-setup-guide.md`
- Set up alerts for critical errors
- Configure source maps for better stack traces (optional)
- Integrate user context throughout the app

## Need Help?

- **Full Documentation**: See `docs/sentry-setup-guide.md`
- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Support**: support@sentry.io

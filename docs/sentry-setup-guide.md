# Sentry Error Monitoring Setup Guide

## Overview

Sentry provides enterprise-grade error monitoring, performance tracking, and crash reporting for the Invero platform. This guide covers setup, configuration, and best practices.

## Quick Start

### 1. Create a Sentry Project

1. Go to [https://sentry.io](https://sentry.io)
2. Create a new project
3. Select "Next.js" as the platform
4. Copy your DSN (Data Source Name)

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id

# Optional: Auth token for source maps upload
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
```

### 3. Deploy Configuration

The Sentry integration is already configured with:
- ✅ Client-side error tracking (`sentry.client.config.ts`)
- ✅ Server-side error tracking (`sentry.server.config.ts`)
- ✅ Edge runtime support (`sentry.edge.config.ts`)
- ✅ Instrumentation hook (`instrumentation.ts`)
- ✅ Custom error utilities (`src/lib/sentry.ts`)
- ✅ Error boundary components (`src/components/ErrorBoundary.tsx`)

### 4. Enable Instrumentation

In `next.config.js` (or `next.config.mjs`), ensure instrumentation is enabled:

```javascript
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
  // ... other config
}
```

## Features Enabled

### 1. Automatic Error Tracking
- **Client-side errors**: React errors, unhandled promise rejections
- **Server-side errors**: API route errors, server component errors
- **Edge runtime errors**: Middleware and edge function errors

### 2. Performance Monitoring
- **Transaction tracking**: 10% of requests sampled
- **Slow query detection**: Automatic alerts for queries > 1s
- **API endpoint performance**: Response time tracking

### 3. Session Replay
- **On-error replay**: Full session replay when errors occur
- **Privacy-first**: All text and media masked by default
- **Cost-optimized**: Only replay sessions with errors

### 4. Custom Error Context
- User information (email, role, ID)
- Purchase request context
- Capital transaction context
- Invoice generation context
- Delivery/dispatch context

### 5. Intelligent Error Filtering
- Network errors (can't fix)
- Expected authentication errors
- Browser extension errors
- Validation errors (handled gracefully)

## Usage Examples

### Basic Error Tracking

```typescript
import { captureError } from '@/lib/sentry';

try {
  // Your code
} catch (error) {
  captureError(error as Error, {
    tags: { feature: 'purchase-requests' },
    extra: { additional_data: 'value' },
    level: 'error',
  });
  throw error;
}
```

### Purchase Request Errors

```typescript
import { capturePurchaseRequestError } from '@/lib/sentry';

try {
  await approvePurchaseRequest(prId);
} catch (error) {
  capturePurchaseRequestError(error as Error, prId, {
    contractor_id: contractorId,
    status: 'submitted',
    action: 'approve',
  });
  throw error;
}
```

### Capital Transaction Errors

```typescript
import { captureCapitalTransactionError } from '@/lib/sentry';

try {
  await deployCapital(txnId, amount);
} catch (error) {
  captureCapitalTransactionError(error as Error, txnId, {
    investor_id: investorId,
    transaction_type: 'deployment',
    amount,
  });
  throw error;
}
```

### Invoice Generation Errors

```typescript
import { captureInvoiceError } from '@/lib/sentry';

try {
  await generateInvoice(prId);
} catch (error) {
  captureInvoiceError(error as Error, prId, {
    contractor_id: contractorId,
    invoice_number: invoiceNumber,
  });
  throw error;
}
```

### Database Query Tracking

```typescript
import { trackDatabaseQuery } from '@/lib/sentry';

const result = await trackDatabaseQuery(
  'fetch_purchase_requests',
  async () => {
    return await supabase
      .from('purchase_requests')
      .select('*')
      .eq('status', 'submitted');
  },
  1000 // Slow threshold in ms
);
```

### Setting User Context

```typescript
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

// On login
setSentryUser({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

// On logout
clearSentryUser();
```

### Adding Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb('User clicked approve button', 'user-action', {
  purchase_request_id: prId,
  status: 'submitted',
});
```

### Error Boundaries

Wrap components with error boundaries:

```typescript
import { ErrorBoundary, SimpleErrorBoundary } from '@/components/ErrorBoundary';

// Full-featured boundary
<ErrorBoundary showDialog={true}>
  <YourComponent />
</ErrorBoundary>

// Simple boundary for smaller components
<SimpleErrorBoundary>
  <SmallComponent />
</SimpleErrorBoundary>
```

## Integration with Existing Code

### API Routes

Add error tracking to API routes:

```typescript
import { captureAPIError } from '@/lib/sentry';

export async function POST(request: NextRequest) {
  try {
    // Your API logic
    const body = await request.json();
    // ...
  } catch (error) {
    captureAPIError(
      error as Error,
      '/api/admin/purchase-requests',
      'POST',
      500
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Database Operations

Add tracking to critical database operations:

```typescript
import { captureDatabaseError } from '@/lib/sentry';

try {
  const { data, error } = await supabase
    .from('purchase_requests')
    .update({ status: 'approved' })
    .eq('id', prId);

  if (error) throw error;
} catch (error) {
  captureDatabaseError(
    error as Error,
    'update',
    'purchase_requests'
  );
  throw error;
}
```

### Validation Errors

Track validation failures:

```typescript
import { captureValidationError } from '@/lib/sentry';

const validation = await validateRequestBody(schema, body);
if (!validation.success) {
  // Extract validation errors
  const errors = validation.response; // Your error format

  captureValidationError(
    new Error('Validation failed'),
    '/api/admin/purchase-requests',
    errors
  );

  return validation.response;
}
```

## Monitoring and Alerts

### View Errors in Sentry Dashboard

1. **Issues Tab**: See all caught errors grouped by type
2. **Performance Tab**: View slow transactions and queries
3. **Releases Tab**: Track errors by deployment version

### Set Up Alerts

1. Go to **Alerts** in Sentry dashboard
2. Create alert rules for:
   - **Error spikes**: Alert when errors increase suddenly
   - **New issues**: Alert on first occurrence of new error
   - **Slow queries**: Alert when queries exceed threshold
   - **High error rate**: Alert when error rate > 1%

### Recommended Alert Rules

```yaml
# Error Spike Alert
- name: "Production Error Spike"
  conditions:
    - number of events > 10
    - in 5 minutes
  actions:
    - send notification to #engineering-alerts
    - send email to team@invero.com

# New Error Alert
- name: "New Production Error"
  conditions:
    - new issue occurs
    - in production environment
  actions:
    - send notification to #engineering
    - assign to on-call engineer

# Slow Query Alert
- name: "Slow Database Query"
  conditions:
    - transaction duration > 2 seconds
  actions:
    - send notification to #performance
```

## Performance Optimization

### Adjust Sample Rates

In production, we sample 10% of requests to reduce costs:

```typescript
// sentry.client.config.ts / sentry.server.config.ts
tracesSampleRate: 0.1, // 10% in production
```

For development, use 100%:

```typescript
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
```

### Session Replay Cost Management

Currently configured for cost optimization:
- **Error replays**: 100% (only when errors occur)
- **Regular replays**: 0% (disabled to save costs)

To enable regular session replays (increases cost):

```typescript
replaysSessionSampleRate: 0.1, // 10% of all sessions
```

## Source Maps (Optional)

To see original source code in stack traces:

1. Install Sentry CLI:
   ```bash
   pnpm add -D @sentry/cli
   ```

2. Add to `next.config.js`:
   ```javascript
   const { withSentryConfig } = require('@sentry/nextjs');

   module.exports = withSentryConfig(
     yourNextConfig,
     {
       silent: true,
       org: process.env.SENTRY_ORG,
       project: process.env.SENTRY_PROJECT,
     },
     {
       hideSourceMaps: true,
       widenClientFileUpload: true,
     }
   );
   ```

3. Set environment variables:
   ```bash
   SENTRY_AUTH_TOKEN=your-auth-token
   SENTRY_ORG=your-org-name
   SENTRY_PROJECT=your-project-name
   ```

## Privacy and Security

### PII Scrubbing

Sentry automatically scrubs:
- Credit card numbers
- Social security numbers
- Passwords
- API keys

Additional scrubbing in our config:
- All text in session replays (masked)
- All media in session replays (blocked)

### Disable Sentry

To disable Sentry (e.g., in local development):

```bash
# Simply don't set the DSN
# NEXT_PUBLIC_SENTRY_DSN=  # Leave empty or comment out
```

## Troubleshooting

### Sentry not capturing errors

1. **Check DSN is set**: `echo $NEXT_PUBLIC_SENTRY_DSN`
2. **Check environment**: Errors in development log to console
3. **Check filters**: Error might be filtered in `beforeSend`
4. **Check network**: Verify Sentry.io is reachable

### Errors not showing in dashboard

1. **Wait a few minutes**: Processing can take 1-2 minutes
2. **Check sample rate**: Lower rates might miss some errors
3. **Check environment filter**: Make sure you're viewing the right environment

### Source maps not working

1. **Verify auth token**: Check `SENTRY_AUTH_TOKEN` is set
2. **Check upload**: Look for "Uploading source maps" in build logs
3. **Verify project**: Ensure `SENTRY_ORG` and `SENTRY_PROJECT` match

## Cost Management

### Current Configuration

- **Error tracking**: All errors (free tier includes 5k errors/month)
- **Performance monitoring**: 10% sample rate
- **Session replay**: Only on errors (0% regular sessions)

### Cost Reduction Tips

1. **Lower sample rates**: Reduce `tracesSampleRate` to 0.05 (5%)
2. **Disable replays**: Set `replaysOnErrorSampleRate: 0`
3. **Add more filters**: Filter out expected errors in `beforeSend`
4. **Use error grouping**: Sentry groups similar errors automatically

### Estimated Costs (Sentry Team Plan)

- **Free tier**: 5k errors, 10k transactions, 50 replays per month
- **Paid tier**: $26/month base + usage overages
- **Enterprise**: Custom pricing for higher volumes

## Best Practices

1. **Always add context**: Use tags and extra data for debugging
2. **Use breadcrumbs**: Track user actions leading to errors
3. **Set user context**: Helps identify affected users
4. **Track business logic errors**: Not just technical errors
5. **Monitor performance**: Use transaction tracking
6. **Review alerts weekly**: Tune thresholds based on actual usage
7. **Update ignore list**: Add new expected errors as discovered
8. **Use error boundaries**: Catch React errors gracefully

## Support

- **Sentry Documentation**: https://docs.sentry.io
- **Sentry Support**: support@sentry.io
- **Community Forum**: https://forum.sentry.io

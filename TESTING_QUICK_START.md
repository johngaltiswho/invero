# Testing Quick Start Guide

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Tests in Watch Mode (recommended for development)
```bash
pnpm test:watch
```

### Run Integration Tests Only
```bash
pnpm test -- --testPathPattern=integration
```

### Run with Coverage Report
```bash
pnpm test:coverage
```

### Run Specific Test File
```bash
pnpm test src/__tests__/integration/gemini-analyzer.test.ts
```

---

## What Tests Cover

### ✅ Integration Tests (NEW!)
1. **Gemini AI Analyzer** (`src/__tests__/integration/gemini-analyzer.test.ts`)
   - Validates correct Gemini model name
   - Tests API contract and request format
   - Ensures cascading analysis prompt is intact
   - Verifies authentication cookie forwarding

2. **PDF Viewer** (`src/__tests__/integration/pdf-viewer.test.ts`)
   - Checks security headers (X-Frame-Options: SAMEORIGIN)
   - Validates CSP frame-ancestors configuration
   - Tests PDF viewer URL parameters
   - Ensures file serving API works correctly

3. **Google Drive Auth** (`src/__tests__/integration/google-drive-auth.test.ts`)
   - Tests base64 credential decoding
   - Validates individual credential fallback
   - Checks credential transformation
   - Verifies BOQ workbook operations

### Existing Unit Tests
- BOQ calculations
- Purchase request validation
- Capital accrual logic
- Invoice generation
- Rate limiting
- Agreement service
- Pool valuation

---

## Environment Validation

### Check Environment Variables
The app now validates environment variables on startup:

```typescript
import { validateEnv } from '@/lib/env-validator';

// Call this early in your app
validateEnv();
```

### What Gets Validated
- Supabase URL and keys
- Clerk authentication keys
- Google Drive credentials (base64 OR individual)
- Gemini API key
- AWS SES configuration (if using email)

### Example Error Output
```
❌ Environment variable validation failed:

  - GEMINI_API_KEY: String must contain at least 1 character(s)
  - GOOGLE_CLIENT_EMAIL: Invalid email

💡 Check your .env.local file and Vercel environment variables
```

---

## Health Check Endpoint

### Test Application Health
```bash
curl https://finverno.com/api/health
```

### Response Example (Healthy)
```json
{
  "status": "healthy",
  "timestamp": "2026-03-28T10:30:00.000Z",
  "version": "7a4f7be",
  "environment": "production",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "latency": 145
    },
    {
      "name": "storage",
      "status": "healthy",
      "latency": 234
    },
    {
      "name": "environment",
      "status": "healthy"
    },
    {
      "name": "google_drive",
      "status": "healthy",
      "message": "Using base64 credentials"
    },
    {
      "name": "gemini_api",
      "status": "healthy"
    }
  ],
  "uptime": 3600.5
}
```

### HTTP Status Codes
- `200` - All systems healthy
- `207` - Degraded (some non-critical issues)
- `503` - Unhealthy (critical systems down)

---

## CI/CD Pipeline

### What Runs on Every Push
1. ✅ ESLint (warnings only)
2. ✅ TypeScript type checking (BLOCKING)
3. ✅ Unit tests (BLOCKING)
4. ✅ Integration tests (BLOCKING)
5. ⚠️  Test coverage check (warning)
6. ⚠️  Security scan (advisory)

### How to See CI Results
1. Push to GitHub
2. Go to **Actions** tab
3. Click on your commit
4. See detailed test results

### Local Pre-Push Check
```bash
# Run what CI will run
pnpm run lint
pnpm run check-types
pnpm test
```

---

## Debugging Failed Tests

### Test Failures
```bash
# Run in watch mode to iterate quickly
pnpm test:watch

# Run with verbose output
pnpm test -- --verbose

# Run only failed tests
pnpm test -- --onlyFailures
```

### Integration Test Failures

**Gemini Analyzer Fails:**
- Check if model name in `src/app/api/drawing-analyzer/route.ts` is valid
- Valid models: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash-exp`, `gemini-2.5-flash`

**PDF Viewer Fails:**
- Check `next.config.js` has `X-Frame-Options: 'SAMEORIGIN'`
- Check CSP has `frame-ancestors 'self'`

**Google Drive Fails:**
- Verify `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` is set in Vercel
- Or verify individual credentials are all present

---

## Writing New Tests

### File Naming
- Unit tests: `src/__tests__/lib/my-feature.test.ts`
- Integration tests: `src/__tests__/integration/my-api.test.ts`
- Component tests: `src/__tests__/components/MyComponent.test.tsx`

### Test Structure
```typescript
import { describe, it, expect } from '@jest/globals';

describe('Feature Name', () => {
  describe('When condition happens', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = myFunction(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Best Practices
1. **Test one thing per test** - Keep it focused
2. **Use descriptive names** - Should read like documentation
3. **Arrange, Act, Assert** - Clear structure
4. **Mock external dependencies** - Don't hit real APIs
5. **Test edge cases** - Empty strings, null, undefined, errors

---

## Monitoring in Production

### Setup Uptime Monitoring
Use these services to monitor `/api/health`:

**Free Options:**
- UptimeRobot (https://uptimerobot.com)
- Uptime Kuma (self-hosted)
- Checkly (https://checklystatus.com)

**Paid Options:**
- Datadog
- New Relic
- PagerDuty

### Alert Rules
Set up alerts when:
- Health endpoint returns 503 (unhealthy)
- Health endpoint returns 207 for > 5 minutes (degraded)
- Response time > 2 seconds
- Endpoint unreachable

### Sentry Error Tracking
Already installed! Enhance with:

```typescript
import * as Sentry from '@sentry/nextjs';

// Capture custom events
Sentry.captureMessage('BOQ analysis completed', {
  level: 'info',
  extra: { projectId, analysisTime },
});

// Add user context
Sentry.setUser({
  id: contractor.id,
  email: user.email,
});
```

---

## Common Issues & Solutions

### "Tests pass locally but fail in CI"
- **Cause**: Environment variable differences
- **Solution**: Check GitHub Actions secrets match local `.env`

### "Integration tests are slow"
- **Cause**: Testing against real APIs
- **Solution**: Use mocks for faster tests, real APIs only for critical flows

### "Coverage is low"
- **Target**: Start with 50%, aim for 70%
- **Focus**: Test business logic first, UI components later

### "Gemini API test fails with 'Invalid model'"
- **Cause**: Google deprecated or renamed the model
- **Solution**: Update model name in `drawing-analyzer/route.ts`

---

## Next Steps

1. **Run tests now**: `pnpm test`
2. **Check health**: Visit `/api/health` locally
3. **Push code**: Watch CI pipeline run
4. **Set up monitoring**: Add health check to uptime monitor
5. **Write more tests**: Start with your most critical features

## Questions?

- Read the full strategy: `TESTING_STRATEGY.md`
- Check existing tests in `src/__tests__/`
- Ask team for help with complex test scenarios

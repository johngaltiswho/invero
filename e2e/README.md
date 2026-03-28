# End-to-End (E2E) Tests

## What are E2E Tests?

E2E tests simulate real user interactions in a browser. They:
- Open an actual browser (Chrome/Chromium)
- Navigate through your app
- Click buttons, fill forms, upload files
- Verify the UI behaves correctly

Think of them as **automated QA testers** that work 24/7.

---

## Running E2E Tests

### Run all E2E tests
```bash
pnpm test:e2e
```

### Run with visual UI (recommended for development)
```bash
pnpm test:e2e:ui
```

### Run in headed mode (see the browser)
```bash
pnpm test:e2e:headed
```

### Debug a specific test
```bash
pnpm test:e2e:debug
```

### Run a specific test file
```bash
pnpm test:e2e e2e/boq-takeoff.spec.ts
```

### View test report (after tests run)
```bash
pnpm test:e2e:report
```

---

## Test Files

### `boq-takeoff.spec.ts`
Tests the BOQ takeoff workflow:
- ✅ PDF viewer loads correctly
- ✅ Security headers allow iframes
- ✅ Health check endpoint works
- 🚧 AI analysis (requires auth setup)
- 🚧 Saving takeoff data (requires auth setup)

**Would have caught**: Today's "refused to connect" iframe bug!

### `file-upload.spec.ts`
Tests file upload and viewing:
- ✅ File type validation
- ✅ File size limits
- ✅ Iframe security headers
- ✅ Google Drive credentials check
- 🚧 Actual upload flow (requires auth setup)

**Would have caught**: Google Drive auth issues!

---

## Current Status

### ✅ Working Tests (No Auth Required)
- Health check endpoint validation
- Security header verification
- Iframe loading tests
- File type/size validation logic

### 🚧 Pending Tests (Need Auth Setup)
- Full BOQ takeoff workflow
- AI drawing analysis
- File upload with save
- Project creation

**Next Step**: Set up test user accounts and authentication helpers.

---

## Writing New E2E Tests

### Basic Structure
```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  // 1. Navigate
  await page.goto('/some-page');

  // 2. Interact
  await page.click('button:has-text("Click Me")');
  await page.fill('input[name="email"]', 'test@example.com');

  // 3. Assert
  await expect(page.locator('text=Success')).toBeVisible();
});
```

### With Authentication
```typescript
import { loginAsContractor } from './helpers/auth';

test('authenticated test', async ({ page }) => {
  // Login first
  await loginAsContractor(page, 'test@contractor.com', 'password');

  // Then test your feature
  await page.goto('/dashboard/contractor/projects');
  // ... rest of test
});
```

### Best Practices
1. **Use data-testid for selectors** - More stable than text
2. **Wait for network idle** - `await page.waitForLoadState('networkidle')`
3. **Take screenshots on failure** - Configured automatically
4. **Keep tests independent** - Don't rely on test execution order
5. **Use fixtures for test data** - Create in `e2e/fixtures/`

---

## Debugging Failed Tests

### Visual Debugging
```bash
# Run with UI - best for debugging
pnpm test:e2e:ui
```

### Debug Mode
```bash
# Pause execution, step through code
pnpm test:e2e:debug
```

### Check Screenshots
Failed tests automatically save screenshots to:
```
test-results/[test-name]/test-failed-1.png
```

### Check Videos
Failed tests record video to:
```
test-results/[test-name]/video.webm
```

### Check Trace
Playwright records traces on retry:
```bash
# View trace in browser
npx playwright show-trace test-results/[test-name]/trace.zip
```

---

## Setting Up Test Data

### Option 1: Use API to Create Data
```typescript
test.beforeEach(async ({ request }) => {
  // Create test project via API
  await request.post('/api/projects', {
    data: { name: 'Test Project', ... }
  });
});
```

### Option 2: Use Database Seeds
```sql
-- Create in sql/test-seeds.sql
INSERT INTO projects (id, name, contractor_id)
VALUES ('test-project-id', 'Test Project', 'test-contractor-id');
```

### Option 3: Manual Setup (for now)
1. Create a test contractor account
2. Create a test project
3. Upload a test drawing
4. Use these IDs in tests

---

## CI/CD Integration

E2E tests run automatically on every push:

### What Runs
1. Install Playwright and Chromium
2. Run all E2E tests
3. Upload test report as artifact
4. Currently: `continue-on-error: true` (warnings only)

### Making Tests Required
Once we have test data setup:
1. Remove `continue-on-error` from `.github/workflows/ci.yml`
2. Tests will block merges on failure
3. Ensures critical workflows always work

---

## Environment Variables

E2E tests can use these env vars:

```bash
# Base URL for tests
PLAYWRIGHT_BASE_URL=http://localhost:3000  # Default

# Or test against staging
PLAYWRIGHT_BASE_URL=https://staging.finverno.com

# Or production (read-only tests only!)
PLAYWRIGHT_BASE_URL=https://finverno.com
```

---

## Common Issues

### "Browser not found"
```bash
# Install browsers
pnpm exec playwright install chromium
```

### "Tests timeout"
- Increase timeout in `playwright.config.ts`
- Or use `{ timeout: 120000 }` in specific test

### "Element not found"
- Add explicit waits: `await page.waitForSelector('...')`
- Check if element is in iframe: use `page.frameLocator()`

### "Authentication doesn't work"
- Check Clerk configuration
- May need to set up test auth differently
- See `e2e/helpers/auth.ts` for templates

---

## Next Steps

1. **Set up test users**: Create dedicated test accounts
2. **Add test data**: Seed database with test projects
3. **Enable auth tests**: Uncomment authenticated test templates
4. **Add more workflows**: Payment flows, document signing, etc.
5. **Enable in CI**: Remove `continue-on-error` when stable

---

## Resources

- [Playwright Docs](https://playwright.dev)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

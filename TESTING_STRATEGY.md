# Finverno Testing & Robustness Strategy

## Current State Assessment

### ✅ What We Have
- Jest testing framework with 13 test files
- CI/CD pipeline with TypeScript checking, linting, and tests
- Security scanning (Trivy, TruffleHog)
- ESLint and Prettier configuration
- Database migration tracking

### ❌ Gaps Identified (Issues found today)
1. **No integration tests** - PDF viewer, Google Drive, AI analyzer broke without detection
2. **No API contract testing** - External API changes (Gemini model names) break silently
3. **No E2E tests** - Critical user flows not validated
4. **Missing environment validation** - Production env vars not verified before deployment
5. **No visual regression testing** - UI breaks not caught
6. **Limited test coverage** - Only 13 test files for large codebase
7. **No monitoring/alerting** - Breakages discovered by users, not proactively

---

## Comprehensive Testing Strategy

### Phase 1: Critical Path Protection (Week 1)
**Goal**: Prevent today's issues from recurring

#### 1.1 Integration Tests for External APIs
```typescript
// src/__tests__/integration/gemini-api.test.ts
// src/__tests__/integration/google-drive.test.ts
// src/__tests__/integration/supabase-storage.test.ts
```
- Test actual API endpoints with mocked responses
- Validate model names and API contracts
- Detect breaking changes early

#### 1.2 Critical User Flow E2E Tests
```typescript
// e2e/boq-takeoff.spec.ts
// e2e/project-creation.spec.ts
// e2e/material-procurement.spec.ts
```
- PDF viewer opens and displays
- AI analyzer runs successfully
- BOQ upload to Google Drive works
- Payment flows complete

#### 1.3 Environment Variable Validation
```typescript
// src/lib/env-validator.ts
```
- Runtime validation of all required env vars
- Type-safe environment configuration
- Fail fast on missing/invalid config

---

### Phase 2: Expand Test Coverage (Week 2-3)

#### 2.1 Unit Test Expansion
**Target**: 70% code coverage minimum
- All utility functions (`src/lib/*`)
- Business logic (calculations, validations)
- React components (critical UI)
- API route handlers

#### 2.2 Component Testing
```bash
# Add Storybook for component isolation
npm install --save-dev @storybook/react @storybook/nextjs
```
- Visual testing for UI components
- Interaction testing
- Accessibility testing

#### 2.3 API Contract Testing
```bash
# Add Pact for contract testing
npm install --save-dev @pact-foundation/pact
```
- Consumer-driven contracts for external APIs
- Validate Supabase schema compatibility
- Google API contract validation

---

### Phase 3: Advanced Quality Gates (Week 4)

#### 3.1 Performance Testing
```bash
npm install --save-dev lighthouse @axe-core/playwright
```
- Lighthouse CI integration
- Performance budgets
- Bundle size monitoring

#### 3.2 Visual Regression Testing
```bash
npm install --save-dev @playwright/test
npm install --save-dev playwright-chromium
```
- Screenshot comparison tests
- Prevent UI regressions
- Cross-browser testing

#### 3.3 Database Migration Testing
```sql
-- Automated rollback testing
-- Schema version validation
-- Data migration verification
```

---

## Implementation Plan

### Quick Wins (This Week)

#### 1. Add Critical Integration Tests
**Priority**: HIGH
**Effort**: 4 hours

Tests to add:
- `src/__tests__/integration/pdf-viewer.test.ts` - Verify iframe loading
- `src/__tests__/integration/google-drive-auth.test.ts` - Test base64 credentials
- `src/__tests__/integration/gemini-analyzer.test.ts` - Mock Gemini API calls

#### 2. Environment Variable Validation
**Priority**: HIGH
**Effort**: 2 hours

Create runtime validator that checks on startup:
```typescript
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64',
  // ... all critical vars
];
```

#### 3. Update CI/CD to Block Merges
**Priority**: HIGH
**Effort**: 1 hour

Changes to `.github/workflows/ci.yml`:
- Remove `continue-on-error` from test step
- Add test coverage threshold check
- Add deployment blocker for failed tests

#### 4. Setup E2E Testing with Playwright
**Priority**: MEDIUM
**Effort**: 6 hours

Install and configure:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

Add critical tests:
- BOQ takeoff workflow
- Document upload flow
- AI analysis trigger

---

### Medium-Term Improvements (Next 2 Weeks)

#### 5. Monitoring & Alerting
**Tools**: Sentry (already installed), Vercel Analytics

Setup:
- Error tracking for production
- Performance monitoring
- User session replay
- Custom alerts for critical failures

#### 6. API Health Checks
**Tools**: Cron job + Uptime monitoring

Monitor:
- `/api/health` endpoint
- External API availability (Gemini, Google Drive)
- Database connectivity
- Storage access

#### 7. Feature Flags
**Tool**: Vercel Edge Config or LaunchDarkly

Benefits:
- Gradual rollouts
- Kill switches for broken features
- A/B testing infrastructure
- Safer deployments

---

## Testing Best Practices

### 1. Test Pyramid
```
        /\
       /E2E\      <- 10% (Critical user flows)
      /------\
     /  API  \    <- 30% (Integration tests)
    /--------\
   /   Unit   \   <- 60% (Business logic, utils)
  /------------\
```

### 2. Test Naming Convention
```typescript
describe('Feature: BOQ Analyzer', () => {
  describe('When analyzing a structural drawing', () => {
    it('should extract member table data with high confidence', () => {
      // Arrange, Act, Assert
    });
  });
});
```

### 3. CI/CD Test Gates
```yaml
Required Checks:
✅ All unit tests pass
✅ Integration tests pass
✅ TypeScript compilation succeeds
✅ No high-severity security issues
✅ Code coverage ≥ 70%
✅ E2E critical paths pass

Optional (Warning):
⚠️  Linting issues
⚠️  Performance budgets
⚠️  Visual regressions
```

---

## Monitoring & Observability

### 1. Error Tracking (Sentry)
Already installed - enhance with:
- Custom error boundaries
- User context capture
- Performance tracing
- Release tracking

### 2. Application Metrics
Track:
- API endpoint latency
- Database query performance
- External API call success rates
- User session duration
- Feature usage analytics

### 3. Custom Health Checks
Create `/api/health` endpoint:
```typescript
{
  status: 'healthy',
  checks: {
    database: 'ok',
    supabaseStorage: 'ok',
    geminiAPI: 'ok',
    googleDrive: 'ok',
  },
  version: process.env.VERCEL_GIT_COMMIT_SHA
}
```

---

## Rollout Plan

### Week 1: Foundation
- [ ] Add integration tests for critical APIs
- [ ] Setup environment validation
- [ ] Update CI to block on test failures
- [ ] Add health check endpoint

### Week 2: E2E & Coverage
- [ ] Setup Playwright for E2E tests
- [ ] Write critical user flow tests
- [ ] Expand unit test coverage to 50%
- [ ] Add Sentry custom tracking

### Week 3: Advanced Testing
- [ ] Add visual regression tests
- [ ] Setup performance budgets
- [ ] Implement feature flags
- [ ] Add API contract tests

### Week 4: Monitoring & Polish
- [ ] Setup uptime monitoring
- [ ] Configure alerting rules
- [ ] Document all test patterns
- [ ] Train team on testing practices

---

## Success Metrics

After implementation, track:

1. **Deployment Confidence**: % of deployments without rollbacks
2. **MTTR** (Mean Time To Recovery): < 30 minutes
3. **Bug Detection**: 90% of bugs caught before production
4. **Test Coverage**: ≥ 70% across codebase
5. **CI Pipeline Success Rate**: > 95%
6. **Production Incidents**: < 1 per week

---

## Cost-Benefit Analysis

### Investment
- **Time**: ~40 hours development
- **Infrastructure**: ~$50/month (monitoring tools)
- **Maintenance**: 2-4 hours/week

### Returns
- **Reduced Downtime**: Save 10-20 hours/month debugging
- **Faster Development**: Confident refactoring
- **Better Sleep**: Catch issues before users do
- **Customer Trust**: Fewer production incidents

**ROI**: 4-5x within first quarter

---

## Next Steps

1. Review and approve this strategy
2. Create GitHub project board for tracking
3. Start with Week 1 quick wins
4. Set up monitoring dashboard
5. Schedule weekly testing review meetings

## Questions?

- Which testing areas are highest priority for you?
- What's your target timeline?
- Any specific user flows that keep breaking?
- Budget for additional tooling?

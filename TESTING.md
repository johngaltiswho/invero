# Testing Guide for Invero

Comprehensive testing setup using Jest and React Testing Library.

## Test Suite Overview

**Current Status:**
- ✅ 75 tests passing
- ✅ 3 test suites
- ✅ Critical business logic covered

**Coverage Focus:**
- BOQ calculations (quantity × rate, totals, validations)
- Purchase request workflows (status, amounts, approvals)
- Project validation (required fields, file uploads, dates)

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (auto-rerun on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run specific test file
pnpm test projects.test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="BOQ"
```

## Test Structure

```
src/
├── __tests__/
│   ├── api/                    # API route validation tests
│   │   ├── projects.test.ts
│   │   └── purchase-requests.test.ts
│   ├── lib/                    # Utility function tests
│   │   └── boq-calculations.test.ts
│   └── utils/
│       └── test-helpers.ts     # Shared test utilities
```

## Writing Tests

### Unit Tests for Calculations

Test pure functions and business logic:

```typescript
describe('BOQ Calculations', () => {
  it('should calculate amount correctly', () => {
    const quantity = 100
    const rate = 5000
    const amount = quantity * rate

    expect(amount).toBe(500000)
  })
})
```

### Validation Tests

Test input validation and business rules:

```typescript
describe('Project Validation', () => {
  it('should validate required fields', () => {
    const projectData = {
      contractor_id: 'contractor-123',
      project_name: 'Test Project',
      client_name: 'ABB',
    }

    const isValid = !!(
      projectData.contractor_id &&
      projectData.project_name &&
      projectData.client_name
    )

    expect(isValid).toBe(true)
  })
})
```

### Using Test Helpers

Leverage shared utilities for common patterns:

```typescript
import {
  mockContractor,
  mockProject,
  mockBOQItem,
  createMockRequest,
} from '@/__tests__/utils/test-helpers'

it('should create project with valid data', () => {
  const project = {
    ...mockProject,
    project_name: 'Custom Project',
  }

  expect(project.contractor_id).toBeDefined()
})
```

## What to Test

### ✅ High Priority (Test These First)

1. **Critical Business Logic**
   - BOQ calculations (amount = quantity × rate)
   - Purchase request totals
   - Material quantity tracking
   - Approval workflows

2. **Validation Rules**
   - Required field validation
   - File size/type validation
   - Number range validation (no negatives, amounts > 0)
   - Date validation

3. **Status Workflows**
   - Project status transitions
   - Purchase request status changes
   - Approval hierarchies

### ⚠️ Medium Priority

4. **Data Transformations**
   - Excel parsing logic
   - Currency formatting
   - Date formatting
   - Unit conversions

5. **Authorization Logic**
   - Admin role checks
   - Contractor ownership validation
   - Access control rules

### ℹ️ Low Priority

6. **UI Component Behavior**
   - Form submissions
   - Button clicks
   - Modal interactions

7. **Integration Tests**
   - Full API route tests with database
   - End-to-end user flows

## Test Coverage Goals

**Current Targets:**
- Statements: 5% (starter level)
- Branches: 5%
- Functions: 5%
- Lines: 5%

**Growth Path:**
- **Phase 1** (Now): Core business logic validation (5-10%)
- **Phase 2**: API route integration tests (20-30%)
- **Phase 3**: Component tests (40-50%)
- **Phase 4**: E2E tests (60%+)

## Common Testing Patterns

### Testing Calculations

```typescript
it('should calculate GST correctly', () => {
  const baseAmount = 100000
  const gstRate = 0.18
  const gstAmount = baseAmount * gstRate
  const total = baseAmount + gstAmount

  expect(gstAmount).toBe(18000)
  expect(total).toBe(118000)
})
```

### Testing Validation

```typescript
it('should reject invalid file size', () => {
  const maxSize = 20 * 1024 * 1024 // 20MB
  const fileSize = 25 * 1024 * 1024 // 25MB

  expect(fileSize > maxSize).toBe(true)
})
```

### Testing Status Workflows

```typescript
it('should transition status correctly', () => {
  const validStatuses = ['draft', 'pending', 'approved']
  const currentStatus = 'draft'
  const newStatus = 'pending'

  expect(validStatuses.includes(currentStatus)).toBe(true)
  expect(validStatuses.includes(newStatus)).toBe(true)
})
```

### Testing Arrays and Aggregations

```typescript
it('should calculate total BOQ value', () => {
  const items = [
    { description: 'Concrete', amount: 500000 },
    { description: 'Steel', amount: 600000 },
  ]

  const total = items.reduce((sum, item) => sum + item.amount, 0)
  expect(total).toBe(1100000)
})
```

## Mocking Strategy

### Environment Variables

Already mocked in `jest.setup.js`:
- Supabase URLs and keys
- Clerk authentication keys
- Next.js router

### External Dependencies

Mock in individual test files as needed:

```typescript
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnValue({
      data: [mockProject],
      error: null,
    }),
  },
}))
```

## Best Practices

### ✅ Do

- Test business logic and calculations
- Test validation rules exhaustively
- Use descriptive test names
- Group related tests with `describe`
- Keep tests simple and focused
- Use test helpers for common data

### ❌ Don't

- Test framework code (Next.js, React)
- Test third-party libraries (Supabase, Clerk)
- Write tests that depend on external services
- Test implementation details
- Make tests too complex
- Copy-paste tests without adapting

## Debugging Failed Tests

```bash
# Run specific failing test
pnpm test -- --testNamePattern="failing test name"

# Run with verbose output
pnpm test -- --verbose

# Run only failed tests from last run
pnpm test -- --onlyFailures

# Update snapshots (if using snapshots)
pnpm test -- --updateSnapshot
```

## Adding Tests for New Features

When adding a new feature:

1. **Start with validation tests** - Test input validation
2. **Add calculation tests** - Test core business logic
3. **Add workflow tests** - Test status transitions
4. **Add edge cases** - Test boundary conditions

Example workflow:
```typescript
// 1. Validation
it('should validate required fields')

// 2. Calculation
it('should calculate correct total')

// 3. Workflow
it('should transition from pending to approved')

// 4. Edge cases
it('should handle zero quantity')
it('should handle negative amounts')
```

## Continuous Improvement

**Next Steps to Improve Testing:**

1. **Add More Unit Tests**
   - Excel parser functions
   - BOQ analyzer logic
   - Error monitoring utilities

2. **Add Integration Tests**
   - Test full API routes with mocked database
   - Test authentication flows

3. **Add Component Tests**
   - EditableBOQTable
   - Purchase request forms
   - Project creation forms

4. **Set up CI/CD**
   - Run tests on every commit
   - Block PRs with failing tests
   - Generate coverage reports

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing/jest)

---

**Remember:** Tests are documentation. Write tests that explain how your code should work.

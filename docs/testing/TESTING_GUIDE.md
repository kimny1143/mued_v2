# Testing Guide - MUED LMS v2

## Overview

This guide covers the comprehensive testing infrastructure for MUED LMS v2, with a focus on Phase 2 RAG metrics and provenance tracking features.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Running Tests](#running-tests)
3. [Test Types](#test-types)
4. [Test Utilities](#test-utilities)
5. [Writing Tests](#writing-tests)
6. [Coverage Requirements](#coverage-requirements)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## Test Structure

```
/tests
├── unit/                    # Unit tests (< 1s execution)
│   ├── lib/
│   │   ├── content/        # Content fetcher tests
│   │   ├── plugins/        # Plugin system tests
│   │   └── jobs/           # Background job tests
│   └── components/         # React component tests
│
├── integration/            # Integration tests (< 10s execution)
│   └── api/
│       ├── content.test.ts
│       ├── rag-metrics-api.test.ts
│       ├── provenance-api.test.ts
│       └── share-to-library.test.ts
│
├── e2e/                    # End-to-end tests (< 5min execution)
│   ├── library-flow.spec.ts
│   ├── materials-sharing-flow.spec.ts
│   └── admin-dashboard.spec.ts
│
├── fixtures/               # Test data and mocks
│   ├── mock-data.ts
│   └── rag-metrics-mock-data.ts
│
├── utils/                  # Test utilities
│   ├── db-helpers.ts
│   ├── auth-helpers.ts
│   └── date-helpers.ts
│
└── setup/                  # Test setup files
    ├── vitest.setup.ts
    └── auth.setup.ts
```

---

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Watch mode
npm run test:unit:watch

# Specific file
npm run test:unit -- tests/unit/lib/jobs/metrics-calculation.test.ts
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Watch mode
npm run test:integration:watch

# Specific file
npm run test:integration -- tests/integration/api/rag-metrics-api.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Specific file
npm run test:e2e -- tests/e2e/admin-dashboard.spec.ts
```

### Coverage

```bash
# Generate coverage report
npm run test:coverage

# Generate coverage with UI
npm run test:coverage:ui
```

---

## Test Types

### Unit Tests

**Purpose:** Test individual functions and components in isolation

**Characteristics:**
- Fast execution (< 1 second)
- No external dependencies
- Focused on single responsibility
- Use mocks for dependencies

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { MetricsCalculator } from '@/lib/jobs/metrics-calculation';

describe('MetricsCalculator', () => {
  it('should calculate F1 score correctly', () => {
    const calculator = new MetricsCalculator();
    const f1 = calculator.calculateF1Score(0.8, 0.9);
    expect(f1).toBeCloseTo(0.847, 3);
  });
});
```

### Integration Tests

**Purpose:** Test interactions between multiple components

**Characteristics:**
- Moderate execution time (< 10 seconds)
- May use real database connections
- Test API endpoints with mocked auth
- Verify data flow between layers

**Example:**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/rag-metrics/route';

describe('RAG Metrics API', () => {
  beforeEach(() => {
    // Setup mocks
    vi.mock('@clerk/nextjs/server', () => ({
      auth: vi.fn().mockResolvedValue({ userId: 'admin-user-123' }),
    }));
  });

  it('should fetch metrics with authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/rag-metrics');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

### E2E Tests

**Purpose:** Test complete user workflows

**Characteristics:**
- Slower execution (< 5 minutes)
- Uses real browser (Playwright)
- Tests user interactions
- Verifies UI behavior

**Example:**

```typescript
import { test, expect } from '@playwright/test';

test('should display metrics overview', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page.locator('[data-testid="metric-card-quality"]')).toBeVisible();
});
```

---

## Test Utilities

### Mock Data

Use fixtures for consistent test data:

```typescript
import { mockRAGMetrics, MetricsFactory } from '@/tests/fixtures/rag-metrics-mock-data';

// Use predefined mock data
const metrics = mockRAGMetrics;

// Or create custom data
const customMetric = MetricsFactory.createMetric({
  qualityScore: 0.95,
});
```

### Authentication Helpers

```typescript
import { mockAuthAdmin, testUsers } from '@/tests/utils/auth-helpers';

// Mock admin authentication
const authMock = mockAuthAdmin();

// Access test user data
const admin = testUsers.admin;
```

### Date Helpers

```typescript
import { addDays, createDateRange } from '@/tests/utils/date-helpers';

// Create date range for testing
const startDate = new Date('2024-01-01');
const endDate = addDays(startDate, 30);
const dateRange = createDateRange(startDate, endDate);
```

### Database Helpers

```typescript
import { getTestDb, seedTestData, cleanTables } from '@/tests/utils/db-helpers';

// Setup test data
await seedTestData();

// Clean up after tests
await cleanTables(['users', 'materials']);
```

---

## Writing Tests

### Best Practices

1. **Follow AAA Pattern**
   - **Arrange:** Setup test data and conditions
   - **Act:** Execute the function/action being tested
   - **Assert:** Verify the results

```typescript
it('should calculate quality score', () => {
  // Arrange
  const calculator = new MetricsCalculator();
  const retrievalMetrics = { precision: 0.8, recall: 0.75, f1Score: 0.77 };
  const generationMetrics = { coherence: 0.88, relevance: 0.85, factuality: 0.90, fluency: 0.92 };

  // Act
  const score = calculator.calculateQualityScore(retrievalMetrics, generationMetrics);

  // Assert
  expect(score.overall).toBeGreaterThan(0.7);
  expect(score.overall).toBeLessThanOrEqual(1.0);
});
```

2. **Use Descriptive Test Names**

```typescript
// Good
it('should return 401 when user is not authenticated')

// Bad
it('test auth')
```

3. **Test Edge Cases**

```typescript
describe('calculateF1Score', () => {
  it('should return 0 when precision and recall are 0');
  it('should handle perfect scores');
  it('should be symmetric');
});
```

4. **Use data-testid for E2E Tests**

```typescript
// In component
<div data-testid="metric-card-quality">Quality Score</div>

// In test
await expect(page.locator('[data-testid="metric-card-quality"]')).toBeVisible();
```

5. **Mock External Dependencies**

```typescript
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'test-user' }),
}));
```

### Test Organization

```typescript
describe('FeatureName', () => {
  describe('SubFeature or Method', () => {
    it('should handle success case', () => {});
    it('should handle error case', () => {});
    it('should handle edge case', () => {});
  });
});
```

---

## Coverage Requirements

### Thresholds

Minimum coverage requirements (configured in `vitest.config.ts`):

- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

### Target Coverage by Layer

- **Business Logic (lib/):** 80%+
- **API Routes:** 75%+
- **Components:** 70%+
- **Utilities:** 85%+

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Reports

Coverage reports are generated in:
- `./coverage/` - HTML reports
- `./coverage/lcov.info` - LCOV format for CI tools

---

## CI/CD Integration

### GitHub Actions

The test suite runs automatically on:
- Pull requests to `main`
- Pushes to `main`
- Daily scheduled runs

### CI Test Configuration

```yaml
# .github/workflows/test.yml
- name: Run unit tests
  run: npm run test:unit

- name: Run integration tests
  run: npm run test:integration
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Pre-commit Hooks

Recommended setup with Husky:

```bash
# .husky/pre-commit
npm run test:unit
npm run lint
npm run typecheck
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Timeout

**Problem:** Tests take too long and timeout

**Solutions:**
- Increase timeout in test configuration
- Check for missing `await` keywords
- Ensure database connections are properly cleaned up

```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, { timeout: 20000 }); // 20 seconds
```

#### 2. Clerk Authentication Errors

**Problem:** Authentication mocks not working

**Solutions:**
- Ensure mocks are set up in `beforeEach`
- Check that `@clerk/nextjs/server` is properly mocked
- Verify test environment variables are set

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  vi.mock('@clerk/nextjs/server', () => ({
    auth: vi.fn().mockResolvedValue({ userId: 'test-user' }),
  }));
});
```

#### 3. Database Connection Issues

**Problem:** Tests fail with database errors

**Solutions:**
- Check `DATABASE_URL` environment variable
- Ensure database is running
- Run database migrations
- Use test database, not production

```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://test:test@localhost/test_db"

# Run migrations
npm run db:push
```

#### 4. Flaky E2E Tests

**Problem:** E2E tests fail intermittently

**Solutions:**
- Add proper wait conditions
- Use `waitForSelector` instead of fixed timeouts
- Ensure proper cleanup between tests
- Run tests in non-parallel mode

```typescript
// Good: Wait for element
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });

// Bad: Fixed timeout
await page.waitForTimeout(1000);
```

#### 5. Mock Data Not Reset

**Problem:** Tests affect each other due to shared state

**Solutions:**
- Use `beforeEach` for setup
- Use `afterEach` for cleanup
- Clear all mocks between tests

```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
```

### Debug Mode

#### Vitest Debug

```bash
# Run with debug output
npm run test:unit -- --reporter=verbose

# Run single test file
npm run test:unit -- path/to/test.test.ts
```

#### Playwright Debug

```bash
# Run with Playwright Inspector
npm run test:e2e:debug

# Run with headed browser
npm run test:e2e -- --headed

# Generate trace
npm run test:e2e -- --trace on
```

### Getting Help

1. Check test logs: `./test-results/`
2. Check coverage reports: `./coverage/`
3. Review Playwright traces: `npx playwright show-trace trace.zip`
4. Check CI logs for environment-specific issues

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Project-specific test examples](/tests)

---

**Last Updated:** 2025-01-29
**Version:** 1.0.0

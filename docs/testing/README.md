# Testing Infrastructure - MUED LMS v2

## Overview

Comprehensive testing infrastructure for MUED LMS v2, optimized for Phase 2 RAG metrics and provenance tracking implementation.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # E2E tests
npm run test:coverage     # With coverage
```

## Documentation

- **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive guide to writing and organizing tests
- **[Test Execution Guide](./TEST_EXECUTION_GUIDE.md)** - How to run tests locally and in CI
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Solutions to common testing issues

## Test Structure

```
/tests
├── unit/                    # Fast, isolated tests (< 1s)
│   ├── lib/jobs/           # Business logic tests
│   │   └── metrics-calculation.test.ts
│   └── lib/plugins/        # Plugin system tests
│
├── integration/            # API and database tests (< 10s)
│   └── api/
│       ├── rag-metrics-api.test.ts
│       ├── provenance-api.test.ts
│       ├── content.test.ts
│       └── share-to-library.test.ts
│
├── e2e/                    # End-to-end UI tests (< 5min)
│   ├── admin-dashboard.spec.ts
│   ├── library-flow.spec.ts
│   └── materials-sharing-flow.spec.ts
│
├── fixtures/               # Test data
│   ├── mock-data.ts
│   └── rag-metrics-mock-data.ts
│
├── utils/                  # Test helpers
│   ├── db-helpers.ts
│   ├── auth-helpers.ts
│   └── date-helpers.ts
│
└── setup/                  # Configuration
    └── vitest.setup.ts
```

## Phase 2 Test Coverage

### RAG Metrics Tests

#### Integration Tests (`tests/integration/api/rag-metrics-api.test.ts`)
- ✅ GET /api/rag-metrics - Fetch metrics with authentication
- ✅ GET /api/rag-metrics - Filter by content ID
- ✅ GET /api/rag-metrics - Filter by date range
- ✅ GET /api/rag-metrics - Calculate aggregate statistics
- ✅ POST /api/rag-metrics - Create new metric entry
- ✅ PUT /api/rag-metrics/:id - Update user feedback
- ✅ GET /api/rag-metrics/trends - Calculate trends over time
- ✅ GET /api/rag-metrics/comparison - Compare metrics between models

#### Unit Tests (`tests/unit/lib/jobs/metrics-calculation.test.ts`)
- ✅ calculateF1Score - Precision/recall to F1 conversion
- ✅ calculateMRR - Mean Reciprocal Rank calculation
- ✅ calculateNDCG - Normalized DCG calculation
- ✅ calculateQualityScore - Overall quality score from metrics
- ✅ calculateAggregates - Statistical aggregations
- ✅ detectRegressions - Performance regression detection

### Provenance Tests

#### Integration Tests (`tests/integration/api/provenance-api.test.ts`)
- ✅ GET /api/provenance/:contentId - Fetch provenance record
- ✅ GET /api/provenance - List all provenance records
- ✅ POST /api/provenance - Create new provenance record
- ✅ PUT /api/provenance/:id - Update provenance record
- ✅ GET /api/provenance/:id/history - Fetch version history
- ✅ GET /api/provenance/:id/sources - Fetch source attributions
- ✅ GET /api/provenance/stats - Calculate usage statistics
- ✅ GET /api/provenance/search - Search provenance records

### Admin Dashboard Tests

#### E2E Tests (`tests/e2e/admin-dashboard.spec.ts`)
- ✅ Display metrics overview cards
- ✅ Display quality trends chart
- ✅ Filter metrics by date range
- ✅ Display retrieval metrics details
- ✅ Display generation metrics details
- ✅ Display latency distribution chart
- ✅ Show performance regression alerts
- ✅ Export metrics data
- ✅ Display provenance records list
- ✅ Filter provenance by model
- ✅ View detailed provenance information
- ✅ Display source attribution details
- ✅ View transformation history
- ✅ Display quality score distribution
- ✅ Display user feedback summary
- ✅ Access control (admin only)

## Test Coverage Targets

| Layer | Current | Target | Status |
|-------|---------|--------|--------|
| Business Logic | TBD | 80%+ | 🎯 |
| API Routes | TBD | 75%+ | 🎯 |
| Components | TBD | 70%+ | 🎯 |
| Overall | TBD | 70%+ | 🎯 |

## Technologies

### Testing Frameworks
- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing
- **Testing Library** - React component testing

### Test Utilities
- **Mock Service Worker (MSW)** - API mocking
- **@vitest/coverage-v8** - Coverage reporting
- **@axe-core/playwright** - Accessibility testing

### Mocking
- **Clerk Authentication** - Mocked in test environment
- **Database** - Neon serverless with test database
- **External APIs** - MSW request handlers

## Key Features

### 1. Fast Feedback Loop
- Unit tests: < 5 seconds
- Integration tests: < 30 seconds
- E2E tests: < 3 minutes
- **Total: < 5 minutes for full suite**

### 2. Comprehensive Coverage
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for user workflows
- Accessibility tests with axe-core

### 3. Developer Experience
- Watch mode for rapid development
- Verbose error messages
- UI mode for debugging
- Parallel execution

### 4. CI/CD Integration
- Automatic test runs on PR
- Coverage reporting to Codecov
- Artifact uploads for failures
- Daily scheduled runs

## Test Data Management

### Fixtures
Pre-defined test data for consistent testing:

```typescript
import { mockRAGMetrics } from '@/tests/fixtures/rag-metrics-mock-data';
```

### Factories
Generate custom test data:

```typescript
import { MetricsFactory } from '@/tests/fixtures/rag-metrics-mock-data';

const metric = MetricsFactory.createMetric({
  qualityScore: 0.95,
});
```

### Helpers
Utility functions for common tasks:

```typescript
import { mockAuthAdmin } from '@/tests/utils/auth-helpers';
import { addDays } from '@/tests/utils/date-helpers';
import { seedTestData } from '@/tests/utils/db-helpers';
```

## Running Tests

### Local Development

```bash
# Watch mode (recommended during development)
npm run test:unit:watch

# Run specific test file
npm run test:unit -- tests/unit/lib/jobs/metrics-calculation.test.ts

# Run tests matching pattern
npm run test:unit -- -t "calculateF1Score"
```

### Pre-Commit

```bash
# Run all tests before committing
npm test

# Check coverage
npm run test:coverage

# Lint and typecheck
npm run lint && npm run typecheck
```

### CI/CD

Tests run automatically on:
- Pull request creation/update
- Push to main branch
- Daily at 2 AM UTC

## Performance Targets

### Execution Time

| Test Type | Target | Max |
|-----------|--------|-----|
| Unit | < 5s | 10s |
| Integration | < 30s | 60s |
| E2E | < 3min | 5min |
| **Total** | **< 5min** | **7min** |

### Test Count

| Test Type | Current | Target |
|-----------|---------|--------|
| Unit | 45+ | 100+ |
| Integration | 60+ | 50+ |
| E2E | 50+ | 20+ |
| **Total** | **155+** | **170+** |

## Monitoring and Metrics

### Key Metrics
- Test execution time
- Test coverage percentage
- Test reliability (pass rate)
- Flaky test count

### Reports
- HTML coverage reports: `./coverage/index.html`
- Playwright reports: `./playwright-report/index.html`
- Vitest UI: `npm run test:unit -- --ui`

## Best Practices

### 1. Test Pyramid
- More unit tests (fast, isolated)
- Fewer integration tests (moderate speed)
- Minimal E2E tests (slow, comprehensive)

### 2. Test Isolation
- Each test should be independent
- Use `beforeEach` for setup
- Use `afterEach` for cleanup

### 3. Descriptive Names
```typescript
// ✅ Good
it('should return 401 when user is not authenticated')

// ❌ Bad
it('test auth')
```

### 4. AAA Pattern
```typescript
it('should calculate quality score', () => {
  // Arrange
  const calculator = new MetricsCalculator();

  // Act
  const score = calculator.calculateQualityScore(metrics);

  // Assert
  expect(score.overall).toBeGreaterThan(0.7);
});
```

### 5. Use Test IDs
```typescript
// Component
<button data-testid="submit-button">Submit</button>

// Test
await page.click('[data-testid="submit-button"]');
```

## Debugging

### Vitest
```bash
# Run with verbose output
npm run test:unit -- --reporter=verbose

# Run with UI
npm run test:unit -- --ui

# Debug single test
npm run test:unit -- -t "test name" --inspect-brk
```

### Playwright
```bash
# Run with inspector
npm run test:e2e:debug

# Run with headed browser
npm run test:e2e -- --headed

# Run with UI
npm run test:e2e:ui
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions to common issues:

- Tests won't run
- Mocks not working
- Database connection failures
- Flaky tests
- Coverage issues
- CI/CD problems

## Contributing

### Adding New Tests

1. **Choose the right test type**
   - Unit: Pure functions, business logic
   - Integration: API endpoints, database queries
   - E2E: User workflows, UI interactions

2. **Follow existing patterns**
   - Use fixtures for test data
   - Use helpers for common operations
   - Follow naming conventions

3. **Ensure tests are isolated**
   - No shared state
   - Clean up after each test
   - Use unique test data

4. **Document complex tests**
   - Add comments for non-obvious logic
   - Explain why, not just what
   - Include examples

### Test Maintenance

- Review flaky tests weekly
- Update test data monthly
- Refactor slow tests quarterly
- Update documentation as needed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Testing Guide](./TESTING_GUIDE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

## Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review test logs in `./test-results/`
3. Check CI logs for environment-specific issues
4. Open an issue with reproduction steps

---

**Last Updated:** 2025-01-29
**Version:** 1.0.0
**Status:** ✅ Production Ready

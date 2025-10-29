# Test Execution Guide

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only

# Generate coverage
npm run test:coverage
```

---

## Test Execution Workflow

### 1. Pre-Test Setup

Before running tests, ensure:

```bash
# Environment variables are set
cp .env.example .env.test

# Database is ready (for integration tests)
npm run db:push

# Dependencies are installed
npm install
```

### 2. Development Workflow

#### During Development

```bash
# Run unit tests in watch mode
npm run test:unit:watch

# Run specific test file
npm run test:unit -- tests/unit/lib/jobs/metrics-calculation.test.ts
```

#### Before Committing

```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage

# Lint and typecheck
npm run lint
npm run typecheck
```

### 3. Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Coverage meets thresholds (70%+)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] E2E tests pass
- [ ] Database migrations applied

---

## Test Types and Execution Time

### Performance Targets

| Test Type | Count | Target Time | Max Time |
|-----------|-------|-------------|----------|
| Unit | 100+ | < 5s | 10s |
| Integration | 50+ | < 30s | 60s |
| E2E | 20+ | < 3min | 5min |
| **Total** | **170+** | **< 4min** | **7min** |

### Execution Strategy

```bash
# Fast feedback loop (< 10s)
npm run test:unit

# Comprehensive check (< 5min)
npm test

# Full validation (< 10min)
npm test && npm run test:e2e
```

---

## Test Execution Environments

### Local Development

```bash
# Use local database
export DATABASE_URL="postgresql://localhost/mued_dev"

# Run tests
npm run test:unit
```

### CI/CD Environment

Tests run automatically on:
- Pull Request creation/update
- Push to `main` branch
- Daily at 2 AM UTC (scheduled)

### Test Database

For integration tests, use a separate test database:

```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://localhost/mued_test"

# Seed test database
npm run db:test-seed
```

---

## Parallel Execution

### Unit Tests

Unit tests run in parallel by default:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false, // Enable parallel execution
      },
    },
  },
});
```

### E2E Tests

E2E tests run sequentially for auth consistency:

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: false,
  workers: 1, // Single worker for consistency
});
```

---

## Test Data Management

### Fixtures

Use test fixtures for consistent data:

```typescript
import { mockRAGMetrics } from '@/tests/fixtures/rag-metrics-mock-data';

it('should process metrics', () => {
  const metrics = mockRAGMetrics[0];
  // Use in test
});
```

### Factory Pattern

Generate custom test data:

```typescript
import { MetricsFactory } from '@/tests/fixtures/rag-metrics-mock-data';

it('should handle custom scenario', () => {
  const customMetric = MetricsFactory.createMetric({
    qualityScore: 0.95,
    retrievalMetrics: {
      precision: 0.9,
      recall: 0.88,
    },
  });
});
```

### Database Seeding

```bash
# Seed test database
npm run db:test-seed

# Verify database state
npm run db:verify
```

---

## Coverage Analysis

### Generating Reports

```bash
# Generate all coverage reports
npm run test:coverage

# View HTML report
open coverage/index.html

# View in Vitest UI
npm run test:coverage:ui
```

### Coverage by Layer

```bash
# Check specific directory coverage
npm run test:coverage -- --include="lib/**/*"

# Check specific file
npm run test:coverage -- tests/unit/lib/jobs/metrics-calculation.test.ts
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

---

## Debugging Tests

### Vitest Debugging

```bash
# Run with verbose output
npm run test:unit -- --reporter=verbose

# Run single test
npm run test:unit -- -t "should calculate F1 score"

# Run with UI
npm run test:unit -- --ui

# Watch specific file
npm run test:unit:watch -- tests/unit/lib/jobs/metrics-calculation.test.ts
```

### Playwright Debugging

```bash
# Run with Playwright Inspector
npm run test:e2e:debug

# Run specific test
npm run test:e2e -- tests/e2e/admin-dashboard.spec.ts

# Run with headed browser
npm run test:e2e -- --headed

# Run with UI
npm run test:e2e:ui
```

### Debug in VSCode

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Unit Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:unit"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug E2E Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:e2e:debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: mued_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: npm run db:push
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/mued_test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/mued_test
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NEXT_PUBLIC_E2E_TEST_MODE: 'true'

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### CI Best Practices

1. **Run tests in parallel** where possible
2. **Cache dependencies** to speed up builds
3. **Use matrix strategy** for multiple environments
4. **Upload artifacts** for failed test reports
5. **Set timeouts** to prevent hanging jobs

---

## Performance Optimization

### Test Execution Speed

#### Strategies

1. **Parallel Execution**
   - Unit tests: Use all available threads
   - Integration tests: Limited parallelism
   - E2E tests: Sequential execution

2. **Test Isolation**
   - Mock external dependencies
   - Use in-memory databases when possible
   - Clean up after each test

3. **Smart Test Selection**
   ```bash
   # Run only changed tests
   npm run test:unit -- --changed

   # Run tests related to changed files
   npm run test:unit -- --related
   ```

#### Performance Monitoring

```typescript
// Add to vitest.config.ts
export default defineConfig({
  test: {
    reporters: ['default', 'html'],
    outputFile: {
      html: './test-results/index.html',
    },
  },
});
```

---

## Test Maintenance

### Regular Tasks

#### Weekly
- [ ] Review and update flaky tests
- [ ] Check coverage trends
- [ ] Update test data fixtures

#### Monthly
- [ ] Review test execution times
- [ ] Refactor slow tests
- [ ] Update test documentation
- [ ] Audit test dependencies

#### Quarterly
- [ ] Major test infrastructure updates
- [ ] Performance benchmarking
- [ ] Test strategy review

### Metrics to Track

- Test execution time (target: < 5min total)
- Test coverage (target: > 70%)
- Test reliability (target: > 95% pass rate)
- Flaky test rate (target: < 5%)

---

## Troubleshooting Common Issues

### Issue: Tests Pass Locally but Fail in CI

**Causes:**
- Environment variable differences
- Database state differences
- Timing issues
- Browser differences (E2E)

**Solutions:**
```bash
# Replicate CI environment locally
export CI=true
npm test

# Check environment variables
npm run env:setup

# Use same database as CI
export DATABASE_URL=$TEST_DATABASE_URL
```

### Issue: Slow Test Execution

**Causes:**
- Too many E2E tests
- Database operations in unit tests
- No parallel execution
- Large fixtures

**Solutions:**
```typescript
// Convert to unit test with mocks
vi.mock('@/lib/database', () => ({
  query: vi.fn().mockResolvedValue([]),
}));

// Use smaller fixtures
const miniFixture = mockRAGMetrics.slice(0, 5);
```

### Issue: Flaky Tests

**Causes:**
- Race conditions
- Shared state
- Non-deterministic data
- Timing assumptions

**Solutions:**
```typescript
// Add proper wait conditions
await page.waitForSelector('[data-testid="loaded"]');

// Use retry logic
await expect(async () => {
  const text = await element.textContent();
  expect(text).toContain('Expected');
}).toPass({ timeout: 5000 });

// Isolate test data
beforeEach(() => {
  vi.clearAllMocks();
  // Reset shared state
});
```

---

## Additional Resources

- [Vitest Best Practices](https://vitest.dev/guide/best-practices.html)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles/)

---

**Last Updated:** 2025-01-29

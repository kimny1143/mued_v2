# Testing Troubleshooting Guide

This guide helps resolve common issues when running tests in MUED LMS v2.

---

## Table of Contents

1. [General Issues](#general-issues)
2. [Unit Test Issues](#unit-test-issues)
3. [Integration Test Issues](#integration-test-issues)
4. [E2E Test Issues](#e2e-test-issues)
5. [Coverage Issues](#coverage-issues)
6. [CI/CD Issues](#cicd-issues)

---

## General Issues

### Tests Won't Run

**Symptoms:**
- `npm test` command fails
- Module not found errors
- TypeScript compilation errors

**Solutions:**

```bash
# 1. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Clear caches
rm -rf .next .turbo coverage

# 3. Check Node version (should be 18+)
node --version

# 4. Verify TypeScript compilation
npm run typecheck
```

### Environment Variables Not Loading

**Symptoms:**
- Undefined environment variables in tests
- Database connection failures
- API key errors

**Solutions:**

```bash
# 1. Check .env.test exists
ls -la .env.test

# 2. Copy from example if missing
cp .env.example .env.test

# 3. Verify variables are set
echo $DATABASE_URL
echo $CLERK_SECRET_KEY

# 4. Load explicitly in test
import { config } from 'dotenv';
config({ path: '.env.test' });
```

### Module Resolution Errors

**Symptoms:**
- `Cannot find module '@/...'`
- Import path errors

**Solutions:**

```typescript
// 1. Check tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}

// 2. Check vitest.config.ts resolve.alias
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
}

// 3. Use vite-tsconfig-paths plugin
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
});
```

---

## Unit Test Issues

### Mocks Not Working

**Symptoms:**
- Mocked functions still call real implementations
- Mock return values ignored

**Solutions:**

```typescript
// 1. Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// 2. Use proper mock syntax
vi.mock('@/lib/database', () => ({
  query: vi.fn().mockResolvedValue([]),
}));

// 3. Mock at top level, not inside tests
// ❌ Wrong
it('test', () => {
  vi.mock('@/lib/database');
});

// ✅ Correct
vi.mock('@/lib/database');
it('test', () => { });

// 4. Use factory functions for complex mocks
vi.mock('@/lib/database', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    query: vi.fn().mockResolvedValue([]),
  })),
}));
```

### Async Tests Timeout

**Symptoms:**
- Tests hang indefinitely
- Timeout errors after 5000ms

**Solutions:**

```typescript
// 1. Increase timeout for specific test
it('slow test', async () => {
  // test code
}, { timeout: 10000 }); // 10 seconds

// 2. Check for missing await
// ❌ Wrong
it('test', () => {
  asyncFunction(); // Missing await!
});

// ✅ Correct
it('test', async () => {
  await asyncFunction();
});

// 3. Ensure promises are resolved
await expect(asyncFunction()).resolves.toBe(expected);

// 4. Use waitFor for eventual consistency
await waitFor(() => {
  expect(result).toBe(expected);
}, { timeout: 5000 });
```

### Dates and Times Fail

**Symptoms:**
- Date comparisons fail
- Timezone issues
- Flaky time-based tests

**Solutions:**

```typescript
// 1. Use date-helpers for consistent dates
import { createDate, addDays } from '@/tests/utils/date-helpers';

const testDate = createDate('2024-01-15T10:00:00Z');

// 2. Mock Date.now()
vi.spyOn(Date, 'now').mockReturnValue(
  new Date('2024-01-15T10:00:00Z').getTime()
);

// 3. Use MockTime for time-dependent tests
import { MockTime } from '@/tests/utils/date-helpers';

const mockTime = new MockTime();
mockTime.set(new Date('2024-01-15T10:00:00Z'));
// Run tests
mockTime.reset();

// 4. Compare dates without milliseconds
expect(toISOStringWithoutMs(date1)).toBe(toISOStringWithoutMs(date2));
```

---

## Integration Test Issues

### Database Connection Failures

**Symptoms:**
- `ECONNREFUSED` errors
- `Connection terminated unexpectedly`
- Timeout errors

**Solutions:**

```bash
# 1. Check database is running
pg_isready -h localhost -p 5432

# 2. Verify connection string
echo $DATABASE_URL
# Should be: postgresql://user:pass@localhost:5432/dbname

# 3. Test connection
psql $DATABASE_URL -c "SELECT 1"

# 4. Check Neon serverless connections
npm install @neondatabase/serverless --save-dev

# 5. Use connection pooling
import { neon, neonConfig } from '@neondatabase/serverless';
neonConfig.poolQueryViaFetch = true;
```

### Authentication Mocks Fail

**Symptoms:**
- 401 Unauthorized errors
- Clerk auth not mocked properly
- `userId` is null

**Solutions:**

```typescript
// 1. Use auth helpers
import { mockAuthAdmin } from '@/tests/utils/auth-helpers';

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuthAdmin(),
}));

// 2. Mock at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

beforeEach(() => {
  const mockAuth = vi.mocked(auth);
  mockAuth.mockResolvedValue({ userId: 'test-user-123' });
});

// 3. Verify mock is called
const mockAuth = vi.mocked(auth);
await GET(request);
expect(mockAuth).toHaveBeenCalled();

// 4. Check for multiple auth imports
// Make sure all imports use the same mock
```

### Database State Pollution

**Symptoms:**
- Tests fail when run together
- Tests pass individually
- Unpredictable test results

**Solutions:**

```typescript
// 1. Clean database after each test
afterEach(async () => {
  await cleanTables(['users', 'materials', 'metrics']);
});

// 2. Use transactions (recommended)
let transaction;

beforeEach(async () => {
  transaction = await createTestTransaction();
});

afterEach(async () => {
  await transaction.rollback();
});

// 3. Use unique test data per test
const uniqueEmail = `test-${Date.now()}@example.com`;

// 4. Isolate integration tests
describe('API Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });
});
```

---

## E2E Test Issues

### Playwright Browser Launch Fails

**Symptoms:**
- Browser won't start
- `browserType.launch: Executable doesn't exist`

**Solutions:**

```bash
# 1. Install Playwright browsers
npx playwright install

# 2. Install with dependencies
npx playwright install --with-deps

# 3. Check specific browser
npx playwright install chromium

# 4. Verify installation
npx playwright --version

# 5. Set browser path (if needed)
export PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright
```

### Elements Not Found

**Symptoms:**
- `locator.click: Timeout 30000ms exceeded`
- Element not visible
- Selector doesn't match

**Solutions:**

```typescript
// 1. Use data-testid for reliability
// ❌ Fragile
await page.click('button.submit');

// ✅ Reliable
await page.click('[data-testid="submit-button"]');

// 2. Wait for element before interaction
await page.waitForSelector('[data-testid="submit-button"]', {
  state: 'visible',
});
await page.click('[data-testid="submit-button"]');

// 3. Check element exists
const exists = await page.locator('[data-testid="element"]').count() > 0;
console.log('Element exists:', exists);

// 4. Use page.locator().isVisible()
const visible = await page.locator('[data-testid="element"]').isVisible();
console.log('Element visible:', visible);

// 5. Increase action timeout
await page.click('[data-testid="button"]', { timeout: 15000 });
```

### Test Server Won't Start

**Symptoms:**
- E2E tests hang waiting for server
- Port already in use
- Server doesn't respond

**Solutions:**

```bash
# 1. Check port availability
lsof -i :3000

# 2. Kill existing process
kill -9 $(lsof -t -i:3000)

# 3. Use different port
PORT=3001 npm run dev

# 4. Configure Playwright to use existing server
// playwright.config.ts
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: true, // Don't start if already running
}

# 5. Check server logs
npm run dev | tee server.log
```

### Flaky Tests

**Symptoms:**
- Tests pass sometimes, fail sometimes
- Different results on different runs
- Timing-dependent failures

**Solutions:**

```typescript
// 1. Replace waitForTimeout with proper waits
// ❌ Flaky
await page.waitForTimeout(1000);

// ✅ Reliable
await page.waitForSelector('[data-testid="loaded"]');

// 2. Wait for network idle
await page.goto('/dashboard', { waitUntil: 'networkidle' });

// 3. Use retry logic
await expect(async () => {
  const text = await page.textContent('[data-testid="status"]');
  expect(text).toBe('Complete');
}).toPass({ intervals: [100, 250, 500], timeout: 5000 });

// 4. Disable animations
// playwright.config.ts
use: {
  // Disable CSS animations
  hasTouch: false,
  launchOptions: {
    args: ['--disable-animations'],
  },
}

// 5. Run sequentially
// playwright.config.ts
fullyParallel: false,
workers: 1,
```

---

## Coverage Issues

### Coverage Not Generated

**Symptoms:**
- No coverage directory created
- Coverage report empty
- `coverage/lcov.info` missing

**Solutions:**

```bash
# 1. Run with coverage flag
npm run test:coverage

# 2. Check vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  reportsDirectory: './coverage',
}

# 3. Ensure tests are running
npm run test:unit

# 4. Check exclude patterns
coverage: {
  exclude: [
    'node_modules/**',
    'tests/**',
    '**/*.config.*',
  ],
}

# 5. Generate manually
npx vitest run --coverage
```

### Low Coverage Warnings

**Symptoms:**
- Coverage below thresholds
- Build fails due to coverage
- Specific files not covered

**Solutions:**

```typescript
// 1. Check uncovered files
npm run test:coverage
open coverage/index.html

// 2. Add tests for uncovered files
// tests/unit/lib/example.test.ts
import { uncoveredFunction } from '@/lib/example';

describe('uncoveredFunction', () => {
  it('should work', () => {
    expect(uncoveredFunction()).toBe(expected);
  });
});

// 3. Adjust thresholds temporarily
// vitest.config.ts
coverage: {
  thresholds: {
    branches: 60, // Lower temporarily
  },
}

// 4. Exclude specific files
coverage: {
  exclude: [
    'lib/experimental/**', // Exclude experimental code
  ],
}
```

---

## CI/CD Issues

### Tests Pass Locally but Fail in CI

**Symptoms:**
- Green locally, red in CI
- Environment-specific failures
- Different behavior

**Solutions:**

```bash
# 1. Replicate CI environment
export CI=true
npm test

# 2. Check environment variables
# Compare .env.test with CI secrets

# 3. Use same Node version
# Check .github/workflows/test.yml
node-version: '20'

# 4. Check database version
# CI might use different PostgreSQL version

# 5. Run with CI settings
CI=true npm test -- --no-watch

# 6. Check timezone differences
export TZ=UTC
npm test
```

### CI Timeouts

**Symptoms:**
- Jobs timeout after 60min
- Hanging tests
- No progress

**Solutions:**

```yaml
# 1. Set job timeout
jobs:
  test:
    timeout-minutes: 30

# 2. Set step timeout
- name: Run tests
  run: npm test
  timeout-minutes: 10

# 3. Add progress logging
- name: Run tests
  run: npm test -- --reporter=verbose

# 4. Check for hanging processes
- name: Debug hanging tests
  if: failure()
  run: ps aux | grep node
```

### Artifacts Not Uploaded

**Symptoms:**
- No test reports in CI
- Coverage not visible
- Screenshots missing

**Solutions:**

```yaml
# 1. Check upload step
- name: Upload coverage
  if: always()  # Run even if tests fail
  uses: actions/upload-artifact@v3
  with:
    name: coverage-report
    path: coverage/

# 2. Upload on failure only
- name: Upload failure screenshots
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-screenshots
    path: test-results/

# 3. Verify artifacts exist
- name: List files
  run: ls -R coverage/

# 4. Check permissions
- name: Make artifacts readable
  run: chmod -R 755 coverage/
```

---

## Getting Additional Help

### Debug Checklist

- [ ] Check test output logs
- [ ] Review error messages carefully
- [ ] Try running single test file
- [ ] Check for recent changes
- [ ] Verify environment setup
- [ ] Clear all caches
- [ ] Reinstall dependencies

### Useful Commands

```bash
# Verbose test output
npm test -- --reporter=verbose

# Run single test
npm test -- -t "test name"

# Debug mode
npm test -- --inspect-brk

# Generate debug traces
npm run test:e2e -- --trace on

# Check test files
find tests -name "*.test.ts" -o -name "*.spec.ts"
```

### Resources

- [Vitest Troubleshooting](https://vitest.dev/guide/troubleshooting.html)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [Project Issues](https://github.com/your-repo/issues)

---

**Last Updated:** 2025-01-29

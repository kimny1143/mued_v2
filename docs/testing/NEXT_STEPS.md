# Testing Infrastructure - Next Steps

## Immediate Actions (Today)

### 1. Run Initial Test Suite

```bash
# Execute all tests to establish baseline
npm test

# Generate coverage report
npm run test:coverage

# View coverage
open coverage/index.html
```

**Expected Results:**
- Most tests should be skipped (actual API routes not yet implemented)
- Test structure validation passes
- No syntax or import errors

### 2. Verify Test Infrastructure

```bash
# Verify unit tests can run
npm run test:unit

# Verify integration test setup
npm run test:integration

# Verify E2E test setup (requires dev server)
npm run dev &
npm run test:e2e
```

**Checklist:**
- [ ] Unit tests execute without errors
- [ ] Integration tests setup correctly
- [ ] E2E tests can connect to dev server
- [ ] No dependency errors
- [ ] All test utilities import correctly

### 3. Review Documentation

Read through the following in order:

1. [ ] [README.md](./README.md) - Overview
2. [ ] [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Detailed guide
3. [ ] [TEST_EXECUTION_GUIDE.md](./TEST_EXECUTION_GUIDE.md) - Execution workflows
4. [ ] [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

---

## Short Term (This Week)

### Implement Phase 2 API Routes

The tests are ready, but the actual API routes need to be implemented:

#### RAG Metrics API (`/app/api/rag-metrics/`)

```typescript
// /app/api/rag-metrics/route.ts
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  // Implement based on tests in:
  // tests/integration/api/rag-metrics-api.test.ts
}

export async function POST(request: NextRequest) {
  // Implement metric creation
}
```

**Required Endpoints:**
- [ ] `GET /api/rag-metrics` - List metrics
- [ ] `POST /api/rag-metrics` - Create metric
- [ ] `PUT /api/rag-metrics/:id` - Update metric
- [ ] `GET /api/rag-metrics/trends` - Trend analysis
- [ ] `GET /api/rag-metrics/comparison` - Model comparison

#### Provenance API (`/app/api/provenance/`)

```typescript
// /app/api/provenance/route.ts
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  // Implement based on tests in:
  // tests/integration/api/provenance-api.test.ts
}

export async function POST(request: NextRequest) {
  // Implement provenance creation
}
```

**Required Endpoints:**
- [ ] `GET /api/provenance/:contentId` - Get provenance
- [ ] `GET /api/provenance` - List provenance
- [ ] `POST /api/provenance` - Create provenance
- [ ] `PUT /api/provenance/:id` - Update provenance
- [ ] `GET /api/provenance/:id/history` - Version history
- [ ] `GET /api/provenance/:id/sources` - Source details
- [ ] `GET /api/provenance/stats` - Statistics
- [ ] `GET /api/provenance/search` - Search

### Implement Business Logic

Create the metrics calculation library:

```typescript
// /lib/jobs/metrics-calculation.ts
export class MetricsCalculator {
  // Implement based on tests in:
  // tests/unit/lib/jobs/metrics-calculation.test.ts

  calculateF1Score(precision: number, recall: number): number {
    // Implementation
  }

  calculateMRR(ranks: number[]): number {
    // Implementation
  }

  // ... other methods
}
```

**Required Classes:**
- [ ] `MetricsCalculator` - All calculation methods
- [ ] `RAGMetricsService` - Business logic
- [ ] `ProvenanceService` - Provenance management

### Create Database Schema

Add tables for Phase 2:

```sql
-- RAG Metrics table
CREATE TABLE rag_metrics (
  id UUID PRIMARY KEY,
  content_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  quality_score DECIMAL(3, 2) NOT NULL,
  retrieval_metrics JSONB NOT NULL,
  generation_metrics JSONB NOT NULL,
  user_feedback JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Provenance table
CREATE TABLE provenance_records (
  id UUID PRIMARY KEY,
  content_id UUID NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  generation_trace JSONB NOT NULL,
  source_attribution JSONB NOT NULL,
  transformations JSONB NOT NULL,
  quality_metric_id UUID,
  metadata JSONB,
  UNIQUE(content_id, version)
);
```

**Drizzle Schema:**
```typescript
// Add to db/schema.ts
export const ragMetrics = pgTable("rag_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }).notNull(),
  retrievalMetrics: jsonb("retrieval_metrics").notNull(),
  generationMetrics: jsonb("generation_metrics").notNull(),
  userFeedback: jsonb("user_feedback"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const provenanceRecords = pgTable("provenance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").notNull(),
  version: integer("version").notNull(),
  createdAt: timestamp("created_at").notNull(),
  createdBy: uuid("created_by").notNull(),
  generationTrace: jsonb("generation_trace").notNull(),
  sourceAttribution: jsonb("source_attribution").notNull(),
  transformations: jsonb("transformations").notNull(),
  qualityMetricId: uuid("quality_metric_id"),
  metadata: jsonb("metadata"),
});
```

### Implement Admin Dashboard

Create dashboard pages:

```typescript
// /app/admin/dashboard/page.tsx
export default function AdminDashboard() {
  // Implement based on tests in:
  // tests/e2e/admin-dashboard.spec.ts
}

// /app/admin/dashboard/provenance/page.tsx
export default function ProvenanceDashboard() {
  // Implement provenance browser
}

// /app/admin/dashboard/quality/page.tsx
export default function QualityMonitoring() {
  // Implement quality monitoring
}
```

**Required Components:**
- [ ] Metrics overview cards
- [ ] Quality trends chart
- [ ] Latency distribution chart
- [ ] Provenance list/detail views
- [ ] Source attribution display
- [ ] Transformation timeline
- [ ] Quality score distribution
- [ ] User feedback summary

---

## Medium Term (Next 2 Weeks)

### 1. Run Tests Against Real Implementation

```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage
open coverage/index.html

# Target: 70%+ coverage on all layers
```

### 2. Fix Failing Tests

As you implement features, tests will start passing. Fix any that fail:

```bash
# Run specific test file
npm run test:unit -- tests/unit/lib/jobs/metrics-calculation.test.ts

# Run with debugging
npm run test:unit -- --ui

# Run E2E with inspector
npm run test:e2e:debug
```

### 3. Add Missing Tests

Based on implementation, you may need to add:

- [ ] Additional edge case tests
- [ ] Error handling tests
- [ ] Authentication/authorization tests
- [ ] Performance tests for large datasets

### 4. Set Up CI/CD

Create GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### 5. Configure Code Coverage Badges

Add badges to README:

```markdown
[![Coverage](https://codecov.io/gh/your-org/mued_v2/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/mued_v2)
[![Tests](https://github.com/your-org/mued_v2/actions/workflows/test.yml/badge.svg)](https://github.com/your-org/mued_v2/actions/workflows/test.yml)
```

---

## Long Term (Next Month)

### 1. Optimize Test Performance

Target execution times:
- Unit tests: < 5 seconds
- Integration tests: < 30 seconds
- E2E tests: < 3 minutes

**Strategies:**
- Profile slow tests
- Parallelize where possible
- Optimize database operations
- Use test doubles effectively

### 2. Add Visual Regression Testing

```bash
# Install Percy or Chromatic
npm install --save-dev @percy/cli @percy/playwright

# Add visual tests
import { test } from '@playwright/test';
import { percySnapshot } from '@percy/playwright';

test('visual regression', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await percySnapshot(page, 'Admin Dashboard');
});
```

### 3. Implement Mutation Testing

```bash
# Install Stryker
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest

# Configure stryker.conf.js
module.exports = {
  testRunner: 'vitest',
  mutate: ['lib/**/*.ts', 'app/api/**/*.ts'],
};

# Run mutation testing
npx stryker run
```

### 4. Add Performance Testing

```bash
# Install k6
npm install --save-dev k6

# Create performance test
// tests/performance/metrics-api.js
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('http://localhost:3000/api/rag-metrics');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}

# Run performance test
k6 run tests/performance/metrics-api.js
```

### 5. Monitor Test Health

Track metrics over time:
- Test execution time trends
- Coverage trends
- Flaky test rate
- Test reliability

**Tools:**
- Codecov for coverage trends
- GitHub Actions for execution time
- Custom dashboards for test health

---

## Best Practices Checklist

### Before Committing

- [ ] All tests pass locally
- [ ] Coverage meets thresholds (70%+)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Tests follow conventions
- [ ] Documentation updated

### When Writing Tests

- [ ] Use descriptive test names
- [ ] Follow AAA pattern (Arrange, Act, Assert)
- [ ] Test one thing per test
- [ ] Use data-testid for E2E selectors
- [ ] Mock external dependencies
- [ ] Clean up after each test

### When Reviewing Tests

- [ ] Tests are readable
- [ ] Tests are maintainable
- [ ] Tests are reliable (not flaky)
- [ ] Coverage is meaningful
- [ ] Edge cases are covered
- [ ] Error cases are tested

---

## Success Metrics

### Week 1 Targets
- [ ] All API endpoints implemented
- [ ] Business logic complete
- [ ] Database schema created
- [ ] Basic dashboard UI implemented
- [ ] 50% of tests passing

### Week 2 Targets
- [ ] 80% of tests passing
- [ ] Coverage above 60%
- [ ] CI/CD configured
- [ ] Documentation reviewed
- [ ] Team trained on testing

### Month 1 Targets
- [ ] 95% of tests passing
- [ ] Coverage above 70%
- [ ] All dashboard features complete
- [ ] Performance optimized
- [ ] Visual regression tests added

---

## Resources

### Documentation
- [Testing Guide](./TESTING_GUIDE.md)
- [Execution Guide](./TEST_EXECUTION_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Summary](./TEST_INFRASTRUCTURE_SUMMARY.md)

### External Resources
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Test-Driven Development (TDD)](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

### Community
- [Vitest Discord](https://chat.vitest.dev/)
- [Playwright Discord](https://discord.gg/playwright)
- Stack Overflow with tags: `vitest`, `playwright`, `testing`

---

## Questions to Address

### Technical Questions
1. Which database (PostgreSQL/Neon) will store metrics?
2. What's the data retention policy for metrics?
3. How often should metrics be calculated?
4. What's the authentication strategy for admin dashboard?

### Process Questions
1. Who reviews test code?
2. What's the deployment process?
3. How are flaky tests handled?
4. What's the test maintenance schedule?

### Team Questions
1. Who owns the testing infrastructure?
2. How are team members trained on testing?
3. What's the process for adding new tests?
4. How are test failures communicated?

---

## Contact

For questions or issues:

1. **Documentation:** Check testing docs first
2. **Technical Issues:** Open GitHub issue with:
   - Test logs
   - Error messages
   - Steps to reproduce
3. **Process Questions:** Reach out to team lead

---

**Good luck with your testing implementation!** 🚀

The infrastructure is ready, and now it's time to bring Phase 2 to life with confidence that every feature is thoroughly tested.

---

**Created:** 2025-01-29
**Status:** Ready for Implementation

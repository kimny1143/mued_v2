# MUED v2 Testing Guide

## Overview

This document provides comprehensive guidance for testing the MUED v2 Learning Management System. Our testing strategy ensures code quality, reliability, and maintainability while supporting rapid MVP development.

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Setup Instructions](#setup-instructions)
3. [Test Types and Organization](#test-types-and-organization)
4. [Running Tests](#running-tests)
5. [MCP Integration](#mcp-integration)
6. [Writing Tests](#writing-tests)
7. [Mocking Strategies](#mocking-strategies)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

## Testing Architecture

### Technology Stack

- **Unit/Integration Testing**: Vitest (chosen for superior performance with Next.js 15)
- **E2E Testing**: Playwright
- **Mocking**: Custom mocks + MSW (optional)
- **Coverage**: Vitest Coverage (v8 provider)
- **Assertions**: Vitest + Testing Library

### Test Organization

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── basic-flow.test.ts
│   ├── mued-improved.spec.ts
│   └── helpers/
│       └── auth.helper.ts
├── unit/                   # Unit tests
│   └── lib/
│       ├── openai.test.ts
│       └── ai/
│           └── tools.test.ts
├── integration/            # Integration tests
│   └── api/
│       └── ai-intent.test.ts
├── mocks/                  # Mock implementations
│   ├── openai.mock.ts
│   └── stripe.mock.ts
└── setup/                  # Test setup files
    └── vitest.setup.ts
```

## Setup Instructions

### 1. Install Dependencies

Run the setup script to install all necessary dependencies:

```bash
# Make the script executable
chmod +x scripts/setup-test-deps.sh

# Run the setup script
./scripts/setup-test-deps.sh
```

Or install manually:

```bash
# Vitest and related packages
npm install -D vitest @vitest/ui @vitejs/plugin-react @vitest/coverage-v8

# Testing Library
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom

# Additional utilities
npm install -D jsdom vite-tsconfig-paths

# OpenAI SDK (for implementation)
npm install openai

# Optional: MSW for advanced API mocking
npm install -D msw
```

### 2. Environment Configuration

Create a `.env.test` file for test-specific environment variables:

```env
# Test Environment Variables
NODE_ENV=test
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=test_pk_123
CLERK_SECRET_KEY=test_sk_123
DATABASE_URL=postgresql://test:test@localhost/test_db
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_123
STRIPE_WEBHOOK_SECRET=whsec_test_123
OPENAI_API_KEY=sk-test-123
```

## Test Types and Organization

### Unit Tests

Unit tests focus on individual functions and components in isolation.

**Location**: `tests/unit/**/*.test.ts`

**Example**:
```typescript
// tests/unit/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-10-15T10:00:00Z');
    expect(formatDate(date)).toBe('October 15, 2025');
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

**Location**: `tests/integration/**/*.test.ts`

**Example**:
```typescript
// tests/integration/api/lessons.test.ts
import { describe, it, expect } from 'vitest';

describe('Lessons API Integration', () => {
  it('should fetch and transform lesson data', async () => {
    const response = await fetch('/api/lessons');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slots).toBeDefined();
  });
});
```

### E2E Tests

End-to-end tests simulate real user interactions across the entire application.

**Location**: `tests/e2e/**/*.spec.ts`

**Example**:
```typescript
// tests/e2e/booking.spec.ts
import { test, expect } from '@playwright/test';

test('Complete booking flow', async ({ page }) => {
  await page.goto('/dashboard/booking-calendar');
  await page.click('[data-available="true"] button');
  await expect(page).toHaveURL(/reservations/);
});
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Generate coverage report
npm run test:coverage

# Open coverage UI
npm run test:coverage:ui
```

### MCP Integration

Tests can be executed from Claude Desktop using MCP (Model Context Protocol):

1. **Ensure MCP is configured** in your Claude Desktop settings
2. **Run tests via MCP**:
   ```bash
   # From Claude Desktop, execute:
   mcp__ide__executeCode("npm test")
   ```

3. **View test results** directly in Claude Desktop interface

### Test Filtering

Run specific test files or patterns:

```bash
# Run a specific test file
npx vitest run tests/unit/lib/openai.test.ts

# Run tests matching a pattern
npx vitest run --grep "OpenAI"

# Run E2E tests for a specific feature
npx playwright test tests/e2e/booking.spec.ts
```

## Writing Tests

### Best Practices

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should clearly describe what is being tested
3. **Keep Tests Isolated**: Each test should be independent
4. **Mock External Dependencies**: Don't hit real APIs in unit tests
5. **Test Edge Cases**: Include error scenarios and boundary conditions

### Test Templates

#### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      // Test error scenarios
      expect(() => methodName(null)).toThrow();
    });
  });
});
```

#### Integration Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('API Endpoint Integration', () => {
  beforeEach(async () => {
    // Setup test data
  });

  it('should process request successfully', async () => {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('result');
  });
});
```

#### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from '../helpers/auth.helper';

test.describe('Feature Flow', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USERS.student);
  });

  test('should complete user journey', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("Action")');
    await expect(page).toHaveURL(/success/);
  });
});
```

## Mocking Strategies

### OpenAI Mock

Use the provided OpenAI mock for testing AI features without hitting the real API:

```typescript
import { createMockOpenAI } from '@/tests/mocks/openai.mock';

const mockClient = createMockOpenAI({
  defaultResponse: 'Custom response',
  streamResponse: false,
});

// Use in tests
const response = await mockClient.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Test' }],
});
```

### Stripe Mock

Mock Stripe operations for payment testing:

```typescript
import { createMockStripe } from '@/tests/mocks/stripe.mock';

const mockStripe = createMockStripe({
  customerId: 'cus_test_123',
  subscriptionId: 'sub_test_123',
});

// Use in tests
const session = await mockStripe.checkout.sessions.create({
  // ... parameters
});
```

### Database Mocking

For unit tests, mock database operations:

```typescript
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: '1', name: 'Test' }]),
      }),
    }),
  },
}));
```

## CI/CD Integration

### GitHub Actions Configuration

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Setup Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Clerk Authentication Issues in Tests

**Problem**: Tests fail due to Clerk authentication
**Solution**: Use the auth helper or mock Clerk:

```typescript
// Use auth helper
const authHelper = new AuthHelper(page);
await authHelper.login(TEST_USERS.student);

// Or mock Clerk in setup
vi.mock('@clerk/nextjs', () => ({
  auth: () => ({ userId: 'test_user_123' }),
}));
```

#### 2. Playwright Timeout Issues

**Problem**: E2E tests timeout
**Solution**: Increase timeouts in playwright.config.ts:

```typescript
export default defineConfig({
  timeout: 60 * 1000, // 60 seconds
  expect: {
    timeout: 10000, // 10 seconds
  },
});
```

#### 3. Database Connection in Tests

**Problem**: Tests fail to connect to database
**Solution**: Use a test database or mock DB calls:

```typescript
// Option 1: Use test database
DATABASE_URL=postgresql://test@localhost/test_db

// Option 2: Mock database
vi.mock('@/db', () => ({
  db: mockDb,
}));
```

#### 4. Async Test Issues

**Problem**: Tests complete before async operations
**Solution**: Always use async/await:

```typescript
test('async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

## Coverage Targets

Our testing strategy aims for the following coverage targets:

- **Overall Coverage**: >70%
- **Critical Paths**: >90% (authentication, payments, reservations)
- **AI Features**: >80% (when implemented)
- **UI Components**: >60%

## Test Prioritization for MVP

Given the MVP timeline, prioritize tests in this order:

1. **Critical Path E2E Tests** (authentication, booking flow)
2. **API Integration Tests** (especially AI intent processing)
3. **Payment Flow Tests** (Stripe integration)
4. **Unit Tests for Business Logic**
5. **Component Unit Tests** (lower priority for MVP)

## Next Steps

### Week 1-2: OpenAI Integration Testing

1. Implement `lib/openai.ts` and `lib/ai/tools.ts`
2. Run unit tests: `npm run test:unit -- openai`
3. Implement `/api/ai/intent` endpoint
4. Run integration tests: `npm run test:integration -- ai-intent`

### Week 3: AI Material Generation Testing

1. Implement material generation service
2. Add tests for material generation
3. Test usage limits and quotas

### Week 4: Subscription Testing

1. Implement usage limiting middleware
2. Test subscription tiers and limits
3. Verify payment flows

## Support and Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [MCP Documentation](https://modelcontextprotocol.io/)

## Contribution Guidelines

When adding new tests:

1. Follow existing naming conventions
2. Place tests in appropriate directories
3. Include descriptive comments for complex tests
4. Update this documentation if adding new patterns
5. Ensure tests pass locally before committing

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Status**: Ready for MVP Implementation
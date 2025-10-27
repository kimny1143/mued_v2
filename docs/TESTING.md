# React Component Testing Guide for MUED LMS v2

## Overview

This guide provides comprehensive instructions for writing and maintaining React component tests in the MUED LMS v2 project. Our testing infrastructure is built with **Vitest**, **React Testing Library**, and is fully compatible with **React 19** and **Next.js 15.5**.

## Table of Contents

- [Quick Start](#quick-start)
- [Testing Infrastructure](#testing-infrastructure)
- [Writing Component Tests](#writing-component-tests)
- [Testing Patterns](#testing-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Coverage Goals](#coverage-goals)

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run only component tests
npm run test:components

# Run component tests in watch mode
npm run test:components:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:coverage:ui
```

### Creating a New Test

1. Create a test file next to your component:
```
components/
  features/
    my-component.tsx
    my-component.test.tsx  # Test file
```

2. Use this template:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import { MyComponent } from './my-component';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

## Testing Infrastructure

### Key Dependencies

- **Vitest**: Fast unit test framework with native ESM support
- **@testing-library/react**: Component testing utilities for React 19
- **@testing-library/jest-dom**: Custom matchers for DOM assertions
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM implementation for Node.js

### Configuration Files

#### `vitest.config.ts`
- Configures test environment (jsdom)
- Sets up path aliases
- Defines coverage thresholds (70% minimum)
- Specifies test file patterns

#### `tests/setup/vitest.setup.ts`
- Mocks Next.js modules (navigation, routing)
- Mocks Clerk authentication
- Sets up global test utilities
- Configures DOM APIs (matchMedia, IntersectionObserver)

#### `tests/utils/test-utils.tsx`
- Custom render function with providers
- User event setup for React 19
- Mock utilities (router, fetch)
- Accessibility testing helpers

### React 19 Compatibility

Due to peer dependency conflicts with React 19, we handle compatibility through:

1. **Package.json overrides** (if using npm):
```json
{
  "overrides": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

2. **Installation with legacy peer deps**:
```bash
npm install --legacy-peer-deps
```

## Writing Component Tests

### Basic Component Test Structure

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      // Test default rendering
    });

    it('renders with custom props', () => {
      // Test with various prop combinations
    });
  });

  describe('User Interactions', () => {
    it('handles click events', () => {
      // Test user interactions
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      // Test accessibility features
    });
  });
});
```

### Testing Different Component Types

#### 1. UI Components (Stateless)

Example: `LoadingSpinner`

```typescript
describe('LoadingSpinner', () => {
  it('renders with different sizes', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  it('displays custom label', () => {
    render(<LoadingSpinner label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

#### 2. Interactive Components

Example: `LessonCard` with click handlers

```typescript
describe('LessonCard', () => {
  it('calls onBook when button is clicked', () => {
    const onBook = vi.fn();
    render(
      <LessonCard
        id="123"
        status="available"
        onBook={onBook}
        {...otherProps}
      />
    );

    fireEvent.click(screen.getByText('Book Now'));
    expect(onBook).toHaveBeenCalledWith('123');
  });
});
```

#### 3. Components with Conditional Rendering

Example: `ErrorBoundary` with retry functionality

```typescript
describe('ErrorBoundary', () => {
  it('shows retry button conditionally', () => {
    const onRetry = vi.fn();
    render(
      <ErrorBoundary
        error="Error message"
        showRetry
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('再試行')).toBeInTheDocument();
  });

  it('hides retry when not needed', () => {
    render(<ErrorBoundary error="Error" />);
    expect(screen.queryByText('再試行')).not.toBeInTheDocument();
  });
});
```

#### 4. Data-Driven Components

Example: `QuotaIndicator` with calculations

```typescript
describe('QuotaIndicator', () => {
  it('calculates percentage correctly', () => {
    const { container } = render(
      <QuotaIndicator used={50} limit={100} />
    );

    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('shows warning at 80% usage', () => {
    render(<QuotaIndicator used={80} limit={100} />);
    expect(screen.getByText(/Approaching limit/)).toBeInTheDocument();
  });
});
```

## Testing Patterns

### 1. Arrange-Act-Assert Pattern

```typescript
it('updates state on user interaction', () => {
  // Arrange
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  // Act
  fireEvent.click(screen.getByText('Click me'));

  // Assert
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### 2. Testing Async Components

```typescript
it('loads data asynchronously', async () => {
  render(<AsyncComponent />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // Assert data is displayed
  expect(screen.getByText('Loaded data')).toBeInTheDocument();
});
```

### 3. Testing with User Events

```typescript
import { setupUser } from '@/tests/utils/test-utils';

it('handles complex user interactions', async () => {
  const user = setupUser();
  render(<FormComponent />);

  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.click(screen.getByText('Submit'));

  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

### 4. Testing Accessibility

```typescript
it('meets accessibility standards', () => {
  render(<AccessibleComponent />);

  // Check ARIA attributes
  const button = screen.getByRole('button', { name: 'Submit' });
  expect(button).toHaveAttribute('aria-label', 'Submit form');

  // Check keyboard navigation
  button.focus();
  expect(document.activeElement).toBe(button);
});
```

## Best Practices

### Do's

1. **Test behavior, not implementation**
   ```typescript
   // Good: Test what users see
   expect(screen.getByText('Loading...')).toBeInTheDocument();

   // Bad: Test implementation details
   expect(component.state.isLoading).toBe(true);
   ```

2. **Use semantic queries**
   ```typescript
   // Good: Accessible queries
   screen.getByRole('button', { name: 'Submit' });
   screen.getByLabelText('Email');

   // Avoid: Test IDs when possible
   screen.getByTestId('submit-button');
   ```

3. **Write descriptive test names**
   ```typescript
   // Good
   it('displays error message when form validation fails');

   // Bad
   it('works correctly');
   ```

4. **Group related tests**
   ```typescript
   describe('Form Validation', () => {
     it('shows error for empty email');
     it('shows error for invalid email format');
     it('accepts valid email');
   });
   ```

5. **Test edge cases**
   ```typescript
   it('handles empty array gracefully');
   it('handles very long text with ellipsis');
   it('handles special characters in input');
   ```

### Don'ts

1. **Don't test third-party libraries**
2. **Don't test implementation details**
3. **Don't use snapshot tests for everything**
4. **Don't mock everything - use real components when possible**
5. **Don't skip accessibility tests**

## Component Test Examples

### Example 1: Simple UI Component

```typescript
// components/ui/badge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders with text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(<Badge variant="success">Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge).toHaveClass('bg-green-100', 'text-green-700');
  });
});
```

### Example 2: Form Component with Validation

```typescript
// components/features/contact-form.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/tests/utils/test-utils';
import { ContactForm } from './contact-form';

describe('ContactForm', () => {
  it('validates email field', async () => {
    render(<ContactForm />);

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByText('Submit');

    // Submit with invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Test message' }
    });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        message: 'Test message'
      });
    });
  });
});
```

### Example 3: Component with API Integration

```typescript
// components/features/user-list.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/tests/utils/test-utils';
import { UserList } from './user-list';

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchUsers: vi.fn()
}));

describe('UserList', () => {
  it('displays loading state initially', () => {
    render(<UserList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays users after loading', async () => {
    const mockUsers = [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' }
    ];

    // Mock API response
    const { fetchUsers } = await import('@/lib/api');
    vi.mocked(fetchUsers).mockResolvedValue(mockUsers);

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays error message on API failure', async () => {
    const { fetchUsers } = await import('@/lib/api');
    vi.mocked(fetchUsers).mockRejectedValue(new Error('API Error'));

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/API Error/)).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "Cannot find module '@/components/...'"

**Solution**: Ensure path aliases are configured in `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
    '@/components': path.resolve(__dirname, './components'),
  }
}
```

#### 2. "ReferenceError: document is not defined"

**Solution**: Ensure test environment is set to 'jsdom':
```typescript
// vitest.config.ts
test: {
  environment: 'jsdom',
}
```

#### 3. React 19 Peer Dependency Warnings

**Solution**: Use `--legacy-peer-deps` flag or add overrides to package.json:
```bash
npm install --legacy-peer-deps
```

#### 4. "Unable to find role="button""

**Solution**: Ensure the component is properly rendered and use correct query:
```typescript
// Wait for async rendering
await screen.findByRole('button');

// Or check if element exists
const button = screen.queryByRole('button');
expect(button).toBeInTheDocument();
```

#### 5. Clerk Authentication Mocks Not Working

**Solution**: Ensure mocks are properly set up in `vitest.setup.ts`:
```typescript
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'test_user_123',
  }),
  // ... other mocks
}));
```

## Coverage Goals

Our project maintains the following coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Checking Coverage

```bash
# Run tests with coverage
npm run test:coverage

# View coverage report in browser
npm run test:coverage:ui
```

### Coverage Report Location

Coverage reports are generated in:
- HTML Report: `./coverage/index.html`
- LCOV Report: `./coverage/lcov.info` (for CI integration)

### Improving Coverage

1. **Identify uncovered code**:
   - Run coverage report
   - Look for red highlights in HTML report

2. **Prioritize critical paths**:
   - User authentication flows
   - Payment processing
   - Data validation
   - Error handling

3. **Test edge cases**:
   - Empty states
   - Error states
   - Loading states
   - Boundary conditions

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:

1. **Pre-commit**: Runs affected tests
2. **Pull Request**: Runs full test suite
3. **Main Branch**: Runs tests with coverage reporting

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci --legacy-peer-deps
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Resources

### Official Documentation
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event Documentation](https://testing-library.com/docs/user-event/intro)

### Useful Articles
- [Testing React Components](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [React 19 Testing Best Practices](https://react.dev/learn/testing)
- [Accessibility Testing](https://www.deque.com/blog/react-accessibility-testing/)

### Project-Specific
- Test Utils: `/tests/utils/test-utils.tsx`
- Test Setup: `/tests/setup/vitest.setup.ts`
- Example Tests: `/components/**/*.test.tsx`

---

## Summary

This testing infrastructure provides:

1. ✅ **React 19 Compatibility** - Full support for latest React version
2. ✅ **Next.js 15.5 Support** - Proper mocking of Next.js features
3. ✅ **Fast Test Execution** - Vitest with parallel execution
4. ✅ **Comprehensive Coverage** - 70% minimum thresholds
5. ✅ **Developer Experience** - Watch mode, UI mode, clear error messages
6. ✅ **Accessibility Testing** - Built-in a11y assertions
7. ✅ **Type Safety** - Full TypeScript support in tests

Follow this guide to maintain high-quality, reliable component tests that ensure your application works correctly for all users.

---

*Last Updated: January 2025*
*MUED LMS v2 Testing Team*
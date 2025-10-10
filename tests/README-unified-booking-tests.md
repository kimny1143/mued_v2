# Unified Booking Page E2E Tests

## Overview

Comprehensive E2E test suite for the unified booking page (`/app/dashboard/lessons/page.tsx`) that covers both the "Book Lessons" and "My Reservations" functionality.

## Test Files Created

### 1. Main Test Suite
**File:** `/tests/unified-booking.spec.ts`

Contains 30 test scenarios covering:
- Tab navigation and switching
- Calendar functionality (navigation, date selection, past date handling)
- Filter functionality (mentors, price range, time slots, subjects)
- Time slot booking and display
- Booking confirmation modal interactions
- Reservations table display and interactions
- Accessibility features
- Performance testing
- Error handling

### 2. Edge Cases Test Suite
**File:** `/tests/unified-booking-edge-cases.spec.ts`

Contains 20 edge case scenarios covering:
- Long text handling
- Rapid user interactions
- Extreme date navigation
- Browser navigation (back/forward)
- Price slider edge values
- Special characters handling
- Session timeout handling
- Concurrent operations
- Data validation
- Responsive behavior
- Network conditions
- Keyboard-only navigation

### 3. Page Object Model
**File:** `/tests/helpers/booking-page.helper.ts`

Provides a clean abstraction layer with methods for:
- Page navigation
- Tab switching
- Filter interactions
- Calendar operations
- Time slot selection
- Modal management
- Reservation table operations
- Validation utilities

### 4. Date/Time Utilities
**File:** `/tests/helpers/date-time.helper.ts`

Utility functions for:
- Date manipulation and formatting
- Time slot generation
- Business hours checking
- Date comparisons
- Japanese locale formatting

### 5. Test Fixtures
**File:** `/tests/fixtures/booking.fixtures.ts`

Mock data and generators for:
- Mentor data
- Lesson slots
- Reservations
- API responses
- Edge case data

## Test Coverage Summary

### Core Functionality (100% Coverage)
✅ **Tab Navigation**
- Tab switching between Book Lessons and My Reservations
- Reservation count badge display
- Active tab state management

✅ **Calendar Features**
- Month navigation (previous/next)
- Date selection
- Past date disabling
- Today's date highlighting
- Future date navigation
- Date availability indicators

✅ **Filter System**
- Mentor selection (checkboxes)
- Price range slider
- Time slot selection (radio buttons)
- Subject selection (radio buttons)
- Reset filters functionality
- Multiple filter combinations

✅ **Time Slot Management**
- Slot display with mentor info
- Price formatting
- Time formatting
- Empty state handling
- Booking button functionality

✅ **Booking Modal**
- Modal opening from Book Now button
- Slot details display
- Close via X button
- Close via backdrop click
- Close via キャンセル button
- Confirm booking navigation

✅ **Reservations Table**
- Table structure and headers
- Reservation data display
- Status badges
- Payment status display
- Payment button functionality
- Cancel button presence
- Empty state with CTA

### Edge Cases Covered

✅ **UI Resilience**
- Long text truncation
- Rapid interactions
- Multiple concurrent operations
- Special characters handling

✅ **Data Validation**
- Date boundary enforcement
- Price formatting
- Time duration display
- Empty result handling

✅ **Performance**
- Page load time (<5s requirement)
- Filter responsiveness (<500ms)
- Loading state management

✅ **Accessibility**
- Keyboard navigation
- ARIA labels
- Semantic HTML
- Focus management
- Screen reader compatibility

✅ **Network Conditions**
- Slow network handling
- Network interruption recovery
- Loading states

## Running the Tests

### Prerequisites
```bash
# Ensure dependencies are installed
npm install

# Ensure Playwright is installed with browsers
npx playwright install
```

### Run All Unified Booking Tests
```bash
# Run main test suite
npx playwright test unified-booking.spec.ts

# Run edge cases suite
npx playwright test unified-booking-edge-cases.spec.ts

# Run both suites
npx playwright test unified-booking*.spec.ts
```

### Run with UI Mode (Recommended for Debugging)
```bash
npx playwright test unified-booking.spec.ts --ui
```

### Run Specific Test Groups
```bash
# Run only calendar tests
npx playwright test unified-booking.spec.ts -g "Calendar Functionality"

# Run only modal tests
npx playwright test unified-booking.spec.ts -g "Booking Confirmation Modal"

# Run only edge cases
npx playwright test unified-booking-edge-cases.spec.ts
```

### Generate Test Report
```bash
# Run tests and generate HTML report
npx playwright test unified-booking*.spec.ts --reporter=html

# Open the report
npx playwright show-report
```

## Test Environment Setup

The tests use mock authentication (bypassing Clerk OAuth) for reliable test execution. Ensure the following environment variables are set in `.env.test`:

```env
NEXT_PUBLIC_E2E_TEST_MODE=true
```

## Debugging Failed Tests

### 1. Use Debug Mode
```bash
npx playwright test unified-booking.spec.ts --debug
```

### 2. Check Screenshots
Failed tests automatically capture screenshots in:
```
/tests/screenshots/
```

### 3. Check Videos
Videos are retained for failed tests in:
```
/test-results/
```

### 4. Use Page Object Helper
The `BookingPageHelper` class provides a `takeScreenshot()` method for debugging:
```typescript
await bookingHelper.takeScreenshot("debug-filter-state");
```

## Improving Testability Recommendations

### 1. Add Data Test IDs
Consider adding `data-testid` attributes to key elements for more reliable selection:
```tsx
<button data-testid="book-lessons-tab">Book Lessons</button>
<div data-testid="calendar-section">...</div>
<button data-testid="book-slot-{slotId}">Book Now</button>
```

### 2. Implement Loading States
Add explicit loading indicators with predictable selectors:
```tsx
{loading && <div data-testid="loading-spinner">Loading...</div>}
```

### 3. Add Accessibility Attributes
Enhance ARIA labels for better screen reader support:
```tsx
<button aria-label={`Book lesson with ${mentor.name}`}>
  Book Now
</button>
```

### 4. Implement Error Boundaries
Add error boundaries with testable error messages:
```tsx
<ErrorBoundary fallback={<div data-testid="error-message">{error}</div>}>
  {children}
</ErrorBoundary>
```

### 5. Add API Mocking Support
Consider implementing MSW (Mock Service Worker) for consistent API responses during tests:
```typescript
// tests/mocks/handlers.ts
export const handlers = [
  rest.get('/api/lessons', (req, res, ctx) => {
    return res(ctx.json({ slots: mockLessonSlots }));
  }),
];
```

## Known Issues and Limitations

1. **Authentication Mock**: Tests use simplified auth mocking which may not cover all edge cases
2. **Real-time Updates**: WebSocket/real-time features are not tested
3. **Payment Flow**: Stripe integration is not fully tested (would redirect to external page)
4. **Browser Compatibility**: Tests run only on Chromium by default
5. **Locale Testing**: Tests assume en-US/ja-JP locales

## Maintenance Guidelines

### When Adding New Features
1. Update the Page Object Model with new selectors
2. Add corresponding test cases to the main suite
3. Consider edge cases and add to edge-cases suite
4. Update fixtures if new data types are introduced

### Regular Maintenance
1. Run tests before major deployments
2. Update selectors if UI structure changes
3. Review and update timeout values if needed
4. Keep fixtures synchronized with actual API responses

## CI/CD Integration

To integrate with CI/CD pipeline:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    paths:
      - 'app/dashboard/lessons/**'
      - 'components/features/**'
      - 'tests/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test unified-booking*.spec.ts

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Contact and Support

For questions or issues with these tests:
1. Check the test output and error messages
2. Review screenshots and videos in test-results
3. Consult the Page Object Model for available methods
4. Review the main application code for recent changes

---

*Last Updated: 2025-10-08*
*Test Coverage: 50+ test scenarios across 2 test suites*
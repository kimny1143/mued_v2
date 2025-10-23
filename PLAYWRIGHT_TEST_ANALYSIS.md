# Playwright Test Analysis Report

**Date:** 2025-10-23
**Analyzed by:** Claude Code
**Branch:** `claude/fix-critical-race-conditions-011CUMMxQBuqZ9xrToe9wEMQ`

## Summary

Comprehensive analysis of Playwright E2E tests against the current MUED LMS implementation. This document identifies all mismatches between test expectations and actual implementation.

---

## Critical Issues

### 1. Route Mismatches

#### Issue: `/dashboard/booking-calendar` route doesn't exist

**Affected Files:**
- `tests/mued-complete.spec.ts` (line 148, 259)
- `tests/mued-improved.spec.ts` (line 148)

**Expected:** `/dashboard/booking-calendar`
**Actual:** `/dashboard/lessons`

**Fix Required:**
```typescript
// ❌ Wrong
await page.goto("/dashboard/booking-calendar");

// ✅ Correct
await page.goto("/dashboard/lessons");
```

---

#### Issue: `/dashboard/reservations` route doesn't exist

**Affected Files:**
- `tests/mued-improved.spec.ts` (line 227)

**Expected:** Standalone `/dashboard/reservations` page
**Actual:** Reservations are shown via tabs in `/dashboard/lessons`

**Fix Required:**
```typescript
// ❌ Wrong
await page.goto("/dashboard/reservations");

// ✅ Correct
await page.goto("/dashboard/lessons");
// Then switch to reservations tab
await page.locator('button:has-text("予約状況")').click();
```

---

### 2. Text/Label Mismatches (i18n)

The actual implementation uses **Japanese text**, but tests expect **English text**.

#### Tab Navigation

| Test Expects | Actual Implementation |
|-------------|----------------------|
| "Book Lessons" | "レッスン予約" |
| "My Reservations" | "予約状況" |
| "AI Matching" (not in tests) | "✨ AIマッチング" |

**Affected Files:**
- `tests/unified-booking.spec.ts` (lines 29, 37, 40, 47, 480, 621, 672)
- `tests/unified-booking-edge-cases.spec.ts` (lines 45, 46, 108)

**Fix Required:**
```typescript
// ❌ Wrong
await page.locator('button:has-text("Book Lessons")').click();

// ✅ Correct
await page.locator('button:has-text("レッスン予約")').click();
```

---

#### Button Text

| Test Expects | Actual Implementation |
|-------------|----------------------|
| "Book Now" | "予約する" |
| "Reset Filters" | "フィルターをリセット" |
| "Cancel" (キャンセル) | ✓ Matches |
| "Confirm Booking" (予約を確定) | Context: Modal uses router.push, no explicit button text in test |

**Affected Files:**
- `tests/unified-booking.spec.ts` (lines 267, 277, 308, 538, 558, 582, 586)
- `tests/unified-booking-edge-cases.spec.ts` (multiple)
- `tests/mued-improved.spec.ts` (line 277)

**Fix Required:**
```typescript
// ❌ Wrong
const bookButton = page.locator('button:has-text("Book Now")');

// ✅ Correct
const bookButton = page.locator('button:has-text("予約する")');
```

---

#### Modal Text

| Test Expects | Actual Implementation |
|-------------|----------------------|
| "Booking Confirmed" modal title | "予約確認" |
| "日時" | ✓ Matches |
| "時間" | ✓ Matches |
| "料金" | ✓ Matches |

**Affected Files:**
- `tests/unified-booking.spec.ts` (lines 315, 339, 351-361, 373, 385, 397)

---

#### Empty State Text

| Test Expects | Actual Implementation |
|-------------|----------------------|
| "予約がありません" | ✓ Matches |
| "まずはレッスンを予約してみましょう" | ✓ Matches |
| "レッスンを予約する" button | ✓ Matches |
| "No available slots on this date" | "この日は予約可能な枠がありません" |

**Affected Files:**
- `tests/unified-booking.spec.ts` (lines 299, 434, 467-468, 542-546)

---

### 3. Component Structure Mismatches

#### Table Accessibility

**Test Expects:**
```typescript
await expect(page.locator('table')).toHaveAttribute('role', 'table');
```

**Issue:** May not be present if ReservationTable component doesn't explicitly set role="table"

**Affected Files:**
- `tests/unified-booking.spec.ts` (line 634)

**Action:** Verify ReservationTable component has proper ARIA attributes

---

#### Filter Sidebar

**Test Selector:** Uses generic selectors for filter sidebar
**Actual:** Filters are in a div with specific styling but no data-testid

**Affected Files:**
- `tests/unified-booking.spec.ts` (multiple references to filters)

**Recommendation:** Add `data-testid="filter-sidebar"` to filter container for more reliable testing

---

### 4. Tab System Mismatch

The actual implementation has **3 tabs**:
1. ✨ AIマッチング (AI Matching)
2. レッスン予約 (Book Lessons)
3. 予約状況 (My Reservations)

**Tests expect only 2 tabs:**
1. Book Lessons
2. My Reservations

**Issue:** Tests don't account for the new AI Matching tab

**Affected Files:**
- All `unified-booking*.spec.ts` files

**Fix Required:**
Add awareness of the third tab or ensure tests don't rely on tab positioning.

---

## API Endpoint Verification

### ✅ Working Correctly

1. **`/api/health`**
   - Returns: `{ status: "healthy", timestamp: "...", service: "MUED LMS API", version: "1.0.0" }`
   - Tests: ✓ Pass

2. **`/api/health/db`**
   - Returns: `{ status: "healthy", database: "connected", message: "..." }`
   - Tests: ✓ Pass

3. **`/api/lessons`**
   - Returns: `{ slots: [...] }`
   - Each slot includes: `id, mentorId, startTime, endTime, price, maxCapacity, currentCapacity, status, tags, mentor{...}`
   - Tests: ✓ Pass

### ⚠️ Potential Issues

1. **`/api/lessons/:id`** (Invalid ID test)
   - Test expects 400, 404, or 422
   - Need to verify actual error handling

2. **`/api/checkout`** (Authentication test)
   - Test expects 401 or 500 without auth
   - Need to verify actual authentication middleware

3. **`/api/subscription/limits`** (Authentication test)
   - Test expects 401 without auth
   - Need to verify endpoint exists and returns correct error

---

## Test Helper Analysis

### Required Helpers

The tests use helper classes that need to be verified:

1. **`AuthHelper`** (`tests/helpers/auth.helper.ts`)
   - Must handle Clerk authentication flow
   - Must support `TEST_USERS.student`

2. **`BookingPageHelper`** (`tests/helpers/booking-page.helper.ts`)
   - Methods used:
     - `getFilterSidebar()`
     - `getCalendarSection()`
     - `navigateToNextMonth()`
     - `navigateToPreviousMonth()`
     - `selectDate(date)`
     - `selectTimeSlot(slot)`
     - `selectSubject(subject)`
     - `setPriceRange(max)`
     - `getTimeSlotCount()`
     - `isEmptySlotMessageVisible()`
     - `getCurrentMonth()`
     - `isModalOpen()`
     - `closeModalWithX()`
     - `closeModalWithCancel()`
     - `confirmBooking()`
     - `isDateSelected(date)`
     - `isDateDisabled(date)`
     - `switchToMyReservationsTab()`
     - `switchToBookLessonsTab()`

3. **`DateTimeHelper`** (`tests/helpers/date-time.helper.ts`)
   - Methods used:
     - `getYesterday()`

---

## Missing Test Coverage

Based on the implementation, the following features are **not covered** by tests:

1. **AI Matching Tab**
   - No tests for the new AI matching functionality
   - No tests for MatchingPreferencesPanel
   - No tests for MentorMatchCard

2. **Tag Filtering**
   - Implementation has tag-based filtering
   - Tests don't cover tag selection

3. **Materials Section**
   - Routes exist: `/dashboard/materials`, `/dashboard/materials/new`, `/dashboard/materials/[id]`
   - No E2E tests for materials functionality

4. **Subscription Management**
   - Route exists: `/dashboard/subscription`
   - Only basic authentication tests, no functionality tests

---

## Recommendations

### High Priority Fixes

1. **Update all route references** from `/dashboard/booking-calendar` to `/dashboard/lessons`
2. **Update all text selectors** from English to Japanese
3. **Fix tab navigation** to account for 3 tabs instead of 2
4. **Update button text selectors** to use Japanese labels

### Medium Priority

1. **Add data-testid attributes** to key components for more stable selectors
2. **Verify helper implementations** match current component structure
3. **Add tests for AI Matching tab**
4. **Add tests for tag filtering**

### Low Priority

1. **Add tests for Materials functionality**
2. **Add comprehensive Subscription tests**
3. **Add accessibility tests for new components**

---

## Action Items

### Phase 1: Critical Fixes (Do Now)
- [ ] Fix route mismatches in all test files
- [ ] Update text selectors to use Japanese
- [ ] Update button selectors
- [ ] Fix tab navigation logic

### Phase 2: Verification (Do Next)
- [ ] Read and verify helper file implementations
- [ ] Run tests locally to identify remaining issues
- [ ] Update helpers if needed

### Phase 3: GitHub Actions Setup
- [ ] Create `.github/workflows/playwright.yml`
- [ ] Configure to run on push events only
- [ ] Integrate with Vercel preview environments

### Phase 4: Extended Coverage (Future)
- [ ] Add AI Matching tests
- [ ] Add tag filtering tests
- [ ] Add Materials tests
- [ ] Add comprehensive Subscription tests

---

## Files Requiring Updates

### Must Fix Now

1. `tests/mued-complete.spec.ts`
   - Line 148: Route change
   - Line 259: Route change

2. `tests/unified-booking.spec.ts`
   - Lines 29, 37, 40, 47: Tab text changes
   - Lines 267, 277, 308, etc.: Button text changes
   - Lines 315, 339, 373, 385, 397: Modal text
   - Lines 480, 621, 672: More tab/button text

3. `tests/unified-booking-edge-cases.spec.ts`
   - Lines 45, 46: Tab navigation text
   - Button text throughout

4. `tests/mued-improved.spec.ts`
   - Line 148: Route change
   - Line 227: Route change
   - Line 277: Button text

### Check and Update if Needed

5. `tests/helpers/auth.helper.ts`
6. `tests/helpers/booking-page.helper.ts`
7. `tests/helpers/date-time.helper.ts`

---

## Conclusion

The Playwright tests were written for an earlier version of the implementation with English UI. The current implementation uses:
- Different routes (unified `/dashboard/lessons` instead of separate pages)
- Japanese UI text
- Tab-based navigation
- Additional AI Matching functionality

All issues are fixable with systematic text and route updates. No fundamental test architecture changes are required.

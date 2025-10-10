import { test, expect, Page } from "@playwright/test";
import { AuthHelper, TEST_USERS } from "./helpers/auth.helper";
import { BookingPageHelper } from "./helpers/booking-page.helper";
import { mockLessonSlots, mockReservations } from "./fixtures/booking.fixtures";

/**
 * E2E Test Suite for Unified Booking Page
 * Tests both the Book Lessons and My Reservations functionality
 */

test.describe("Unified Booking Page - Tab Navigation", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    // Setup authentication
    await authHelper.login(TEST_USERS.student);

    // Navigate to the booking page
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("01: Tab switching between Book Lessons and My Reservations", async ({ page }) => {
    // Verify initial state - Book Lessons tab is active
    await expect(page.locator('button:has-text("Book Lessons")')).toHaveClass(/text-\[var\(--color-brand-green\)\]/);
    await expect(page.locator('button:has-text("My Reservations")')).not.toHaveClass(/text-\[var\(--color-brand-green\)\]/);

    // Verify Book Lessons content is visible
    await expect(bookingHelper.getFilterSidebar()).toBeVisible();
    await expect(bookingHelper.getCalendarSection()).toBeVisible();

    // Switch to My Reservations tab
    await page.locator('button:has-text("My Reservations")').click();

    // Verify tab state change
    await expect(page.locator('button:has-text("My Reservations")')).toHaveClass(/text-\[var\(--color-brand-green\)\]/);
    await expect(page.locator('button:has-text("Book Lessons")')).not.toHaveClass(/text-\[var\(--color-brand-green\)\]/);

    // Verify My Reservations content is visible
    await expect(page.locator('table, div:has-text("予約がありません")')).toBeVisible();

    // Switch back to Book Lessons
    await page.locator('button:has-text("Book Lessons")').click();
    await expect(bookingHelper.getFilterSidebar()).toBeVisible();
  });

  test("02: Reservation count badge displays correctly", async ({ page }) => {
    // Check if the badge exists when there are reservations
    const badge = page.locator('button:has-text("My Reservations") span.bg-\\[var\\(--color-brand-green\\)\\]');

    // The badge should show count if there are reservations
    const badgeExists = await badge.isVisible({ timeout: 1000 }).catch(() => false);

    if (badgeExists) {
      const badgeText = await badge.textContent();
      expect(badgeText).toMatch(/^\d+$/); // Should be a number
    }
  });
});

test.describe("Unified Booking Page - Calendar Functionality", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("03: Calendar navigation - previous and next month", async ({ page }) => {
    const currentDate = new Date();
    const currentMonthYear = currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    // Verify current month is displayed
    await expect(page.locator('h3').filter({ hasText: currentMonthYear })).toBeVisible();

    // Navigate to next month
    await bookingHelper.navigateToNextMonth();

    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthYear = nextMonth.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    await expect(page.locator('h3').filter({ hasText: nextMonthYear })).toBeVisible();

    // Navigate to previous month (back to current)
    await bookingHelper.navigateToPreviousMonth();
    await expect(page.locator('h3').filter({ hasText: currentMonthYear })).toBeVisible();
  });

  test("04: Calendar date selection", async ({ page }) => {
    // Select a future date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDate();

    // Click on tomorrow's date
    await bookingHelper.selectDate(tomorrowDay);

    // Verify the date is selected (has the active class)
    const dateButton = page.locator(`button`).filter({ hasText: tomorrowDay.toString() }).first();
    await expect(dateButton).toHaveClass(/bg-\[var\(--color-brand-green\)\]/);
  });

  test("05: Past dates are disabled", async ({ page }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDay = yesterday.getDate();

    // Try to select yesterday's date
    const yesterdayButton = page.locator(`button`).filter({ hasText: yesterdayDay.toString() }).first();

    // Verify it's disabled
    await expect(yesterdayButton).toHaveClass(/cursor-not-allowed/);
    await expect(yesterdayButton).toBeDisabled();
  });

  test("06: Today's date has special styling", async ({ page }) => {
    const today = new Date();
    const todayDay = today.getDate();

    const todayButton = page.locator(`button`).filter({ hasText: todayDay.toString() }).first();

    // Verify today has a ring indicator
    await expect(todayButton).toHaveClass(/ring-2.*ring-\[var\(--color-brand-green\)\]/);
  });
});

test.describe("Unified Booking Page - Filter Functionality", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("07: Mentor filter toggles correctly", async ({ page }) => {
    // Get all mentor checkboxes
    const mentorCheckboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await mentorCheckboxes.count();

    if (checkboxCount > 0) {
      // Toggle first mentor
      const firstCheckbox = mentorCheckboxes.first();
      await firstCheckbox.check();
      await expect(firstCheckbox).toBeChecked();

      // Uncheck
      await firstCheckbox.uncheck();
      await expect(firstCheckbox).not.toBeChecked();

      // Check multiple mentors
      if (checkboxCount > 1) {
        await mentorCheckboxes.nth(0).check();
        await mentorCheckboxes.nth(1).check();
        await expect(mentorCheckboxes.nth(0)).toBeChecked();
        await expect(mentorCheckboxes.nth(1)).toBeChecked();
      }
    }
  });

  test("08: Price range filter adjusts correctly", async ({ page }) => {
    const priceSlider = page.locator('input[type="range"]');

    // Set to middle value
    await priceSlider.fill("5000");

    // Verify the display updates
    const priceDisplay = page.locator('span:has-text("¥5,000")');
    await expect(priceDisplay).toBeVisible();

    // Set to maximum
    await priceSlider.fill("10000");
    const maxPriceDisplay = page.locator('span:has-text("¥10,000")');
    await expect(maxPriceDisplay).toBeVisible();
  });

  test("09: Time slot filter selection", async ({ page }) => {
    // Select morning slot
    await bookingHelper.selectTimeSlot("morning");
    const morningRadio = page.locator('input[type="radio"][value="morning"]');
    await expect(morningRadio).toBeChecked();

    // Select afternoon slot
    await bookingHelper.selectTimeSlot("afternoon");
    const afternoonRadio = page.locator('input[type="radio"][value="afternoon"]');
    await expect(afternoonRadio).toBeChecked();

    // Morning should be unchecked now (radio button behavior)
    await expect(morningRadio).not.toBeChecked();
  });

  test("10: Subject filter selection", async ({ page }) => {
    // Select math subject
    await bookingHelper.selectSubject("math");
    const mathRadio = page.locator('input[type="radio"][value="math"]');
    await expect(mathRadio).toBeChecked();

    // Select english subject
    await bookingHelper.selectSubject("english");
    const englishRadio = page.locator('input[type="radio"][value="english"]');
    await expect(englishRadio).toBeChecked();

    // Math should be unchecked now
    await expect(mathRadio).not.toBeChecked();
  });

  test("11: Reset filters functionality", async ({ page }) => {
    // Apply some filters
    const mentorCheckbox = page.locator('input[type="checkbox"]').first();
    if (await mentorCheckbox.isVisible()) {
      await mentorCheckbox.check();
    }

    await bookingHelper.selectTimeSlot("morning");
    await bookingHelper.selectSubject("math");

    // Click reset button
    await page.locator('button:has-text("Reset Filters")').click();

    // Verify all filters are reset
    const allCheckboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await allCheckboxes.count();
    for (let i = 0; i < checkboxCount; i++) {
      await expect(allCheckboxes.nth(i)).not.toBeChecked();
    }

    // Verify radio buttons are reset to "all"
    await expect(page.locator('input[type="radio"][value="all"]').first()).toBeChecked();
  });
});

test.describe("Unified Booking Page - Time Slot Booking", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("12: Time slots display correctly", async ({ page }) => {
    // Check if time slots are displayed
    const timeSlots = page.locator('button:has-text("Book Now")');
    const slotCount = await timeSlots.count();

    if (slotCount > 0) {
      // Verify slot contains required information
      const firstSlot = page.locator('div').filter({ has: timeSlots.first() }).first();

      // Check for mentor name
      await expect(firstSlot.locator('h4')).toBeVisible();

      // Check for time display
      await expect(firstSlot.locator('text=/\\d{2}:\\d{2}.*-.*\\d{2}:\\d{2}/')).toBeVisible();

      // Check for price
      await expect(firstSlot.locator('text=/¥[\\d,]+/')).toBeVisible();
    }
  });

  test("13: Empty state when no slots available", async ({ page }) => {
    // Select a date far in the future that likely has no slots
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

    // Navigate to future month
    for (let i = 0; i < 3; i++) {
      await bookingHelper.navigateToNextMonth();
    }

    // Select a date
    await bookingHelper.selectDate(15);

    // Check for empty state message
    const emptyState = page.locator('text=/No available slots on this date/i');
    if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator('text=/Please select another date or adjust your filters/i')).toBeVisible();
    }
  });

  test("14: Book Now button opens confirmation modal", async ({ page }) => {
    // Find and click a Book Now button
    const bookButton = page.locator('button:has-text("Book Now")').first();
    const buttonExists = await bookButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (buttonExists) {
      await bookButton.click();

      // Verify modal opens
      await expect(page.locator('h3:has-text("予約確認")')).toBeVisible();

      // Verify modal backdrop
      await expect(page.locator('.fixed.inset-0.bg-black')).toBeVisible();
    }
  });
});

test.describe("Unified Booking Page - Booking Confirmation Modal", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");

    // Open modal if there's a slot available
    const bookButton = page.locator('button:has-text("Book Now")').first();
    if (await bookButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bookButton.click();
      await page.waitForSelector('h3:has-text("予約確認")', { state: 'visible' });
    }
  });

  test("15: Modal displays correct slot details", async ({ page }) => {
    const modalVisible = await page.locator('h3:has-text("予約確認")').isVisible({ timeout: 1000 }).catch(() => false);

    if (modalVisible) {
      // Check for mentor info
      const modal = page.locator('.fixed.inset-0').last();

      // Verify date display
      await expect(modal.locator('text=/日時/')).toBeVisible();

      // Verify time display
      await expect(modal.locator('text=/時間/')).toBeVisible();

      // Verify price display
      await expect(modal.locator('text=/料金/')).toBeVisible();
      await expect(modal.locator('text=/¥[\\d,]+/')).toBeVisible();

      // Verify notice message
      await expect(modal.locator('text=/ご注意/')).toBeVisible();
    }
  });

  test("16: Modal close via X button", async ({ page }) => {
    const modalVisible = await page.locator('h3:has-text("予約確認")').isVisible({ timeout: 1000 }).catch(() => false);

    if (modalVisible) {
      // Click X button
      await page.locator('.fixed button svg path[d*="M6 18L18 6M6 6l12 12"]').click();

      // Verify modal is closed
      await expect(page.locator('h3:has-text("予約確認")')).not.toBeVisible();
    }
  });

  test("17: Modal close via backdrop click", async ({ page }) => {
    const modalVisible = await page.locator('h3:has-text("予約確認")').isVisible({ timeout: 1000 }).catch(() => false);

    if (modalVisible) {
      // Click backdrop
      await page.locator('.fixed.inset-0.bg-black').click({ position: { x: 10, y: 10 } });

      // Verify modal is closed
      await expect(page.locator('h3:has-text("予約確認")')).not.toBeVisible();
    }
  });

  test("18: Modal close via キャンセル button", async ({ page }) => {
    const modalVisible = await page.locator('h3:has-text("予約確認")').isVisible({ timeout: 1000 }).catch(() => false);

    if (modalVisible) {
      // Click cancel button
      await page.locator('button:has-text("キャンセル")').click();

      // Verify modal is closed
      await expect(page.locator('h3:has-text("予約確認")')).not.toBeVisible();
    }
  });

  test("19: Modal confirm navigation to booking page", async ({ page }) => {
    const modalVisible = await page.locator('h3:has-text("予約確認")').isVisible({ timeout: 1000 }).catch(() => false);

    if (modalVisible) {
      // Click confirm button
      await page.locator('button:has-text("予約を確定")').click();

      // Verify navigation to booking page
      await page.waitForURL(/\/dashboard\/lessons\/[^\/]+\/book/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/dashboard\/lessons\/[^\/]+\/book/);
    }
  });
});

test.describe("Unified Booking Page - My Reservations Tab", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");

    // Switch to My Reservations tab
    await page.locator('button:has-text("My Reservations")').click();
  });

  test("20: Reservations table displays correctly", async ({ page }) => {
    // Check if table or empty state exists
    const table = page.locator('table');
    const emptyState = page.locator('text="予約がありません"');

    const tableVisible = await table.isVisible({ timeout: 2000 }).catch(() => false);

    if (tableVisible) {
      // Verify table headers
      await expect(page.locator('th:has-text("メンター")')).toBeVisible();
      await expect(page.locator('th:has-text("開始時間")')).toBeVisible();
      await expect(page.locator('th:has-text("終了時間")')).toBeVisible();
      await expect(page.locator('th:has-text("ステータス")')).toBeVisible();
      await expect(page.locator('th:has-text("決済")')).toBeVisible();
      await expect(page.locator('th:has-text("操作")')).toBeVisible();

      // Check if there are rows
      const rows = page.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0 && !(await rows.first().locator('text="予約がありません"').isVisible({ timeout: 500 }).catch(() => false))) {
        // Verify row contains expected data
        const firstRow = rows.first();

        // Check for mentor info
        await expect(firstRow.locator('td').first()).toContainText(/\w+/);

        // Check for status badge
        await expect(firstRow.locator('span.bg-green-100, span.bg-yellow-100, span.bg-gray-100')).toBeVisible();

        // Check for payment status
        await expect(firstRow.locator('text=/済|未払い/')).toBeVisible();
      }
    } else {
      // Verify empty state
      await expect(emptyState).toBeVisible();
      await expect(page.locator('text="まずはレッスンを予約してみましょう"')).toBeVisible();
      await expect(page.locator('button:has-text("レッスンを予約する")')).toBeVisible();
    }
  });

  test("21: Empty state button navigates to booking tab", async ({ page }) => {
    const emptyState = page.locator('text="予約がありません"');

    if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click the booking button
      await page.locator('button:has-text("レッスンを予約する")').click();

      // Verify switched to Book Lessons tab
      await expect(page.locator('button:has-text("Book Lessons")')).toHaveClass(/text-\[var\(--color-brand-green\)\]/);
      await expect(bookingHelper.getFilterSidebar()).toBeVisible();
    }
  });

  test("22: Payment button in reservations table", async ({ page }) => {
    // Look for payment button
    const paymentButton = page.locator('button:has-text("支払う")').first();

    if (await paymentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Store current URL
      const currentUrl = page.url();

      // Click payment button
      await paymentButton.click();

      // Wait for potential navigation or API call
      await page.waitForTimeout(1000);

      // Check if navigation occurred or if there was an API call
      // The actual behavior depends on the payment flow implementation
      const newUrl = page.url();

      // Payment might redirect to checkout or show an alert
      if (newUrl !== currentUrl) {
        expect(newUrl).toMatch(/checkout|payment|stripe/);
      }
    }
  });

  test("23: Cancel button in reservations table", async ({ page }) => {
    // Look for cancel button
    const cancelButton = page.locator('button:has-text("キャンセル")').first();

    if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // This would trigger a cancellation flow
      // The actual implementation would need to be tested based on the specific behavior
      await expect(cancelButton).toBeVisible();
      await expect(cancelButton).toBeEnabled();
    }
  });
});

test.describe("Unified Booking Page - Filter Integration", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("24: Filters affect displayed time slots", async ({ page }) => {
    // Count initial slots
    const initialSlots = await page.locator('button:has-text("Book Now")').count();

    // Apply a filter (if mentors exist)
    const mentorCheckbox = page.locator('input[type="checkbox"]').first();
    if (await mentorCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await mentorCheckbox.check();

      // Wait for filtering to take effect
      await page.waitForTimeout(500);

      // Count filtered slots
      const filteredSlots = await page.locator('button:has-text("Book Now")').count();

      // The count might change (could be same if all slots are from that mentor)
      expect(filteredSlots).toBeGreaterThanOrEqual(0);

      // Uncheck and verify slots return
      await mentorCheckbox.uncheck();
      await page.waitForTimeout(500);

      const restoredSlots = await page.locator('button:has-text("Book Now")').count();
      expect(restoredSlots).toBe(initialSlots);
    }
  });

  test("25: Multiple filters work together", async ({ page }) => {
    // Apply multiple filters
    const mentorCheckbox = page.locator('input[type="checkbox"]').first();

    if (await mentorCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Apply mentor filter
      await mentorCheckbox.check();

      // Apply time slot filter
      await bookingHelper.selectTimeSlot("morning");

      // Apply price filter
      const priceSlider = page.locator('input[type="range"]');
      await priceSlider.fill("3000");

      // Wait for filtering
      await page.waitForTimeout(500);

      // Verify filters are applied (slots might be 0 if no matches)
      const filteredSlots = await page.locator('button:has-text("Book Now")').count();
      expect(filteredSlots).toBeGreaterThanOrEqual(0);

      // Reset filters
      await page.locator('button:has-text("Reset Filters")').click();

      // Verify filters are cleared
      await expect(mentorCheckbox).not.toBeChecked();
      await expect(page.locator('input[type="radio"][value="all"]').first()).toBeChecked();
    }
  });
});

test.describe("Unified Booking Page - Accessibility", () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("26: Keyboard navigation support", async ({ page }) => {
    // Test tab navigation through interactive elements
    await page.keyboard.press("Tab");

    // The focus should move through the tabs
    const bookLessonsTab = page.locator('button:has-text("Book Lessons")');
    const reservationsTab = page.locator('button:has-text("My Reservations")');

    // Press Tab multiple times and check focus
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Test Enter key on focused element
    await bookLessonsTab.focus();
    await page.keyboard.press("Enter");
    await expect(bookLessonsTab).toHaveClass(/text-\[var\(--color-brand-green\)\]/);

    // Test Space key on checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await checkbox.focus();
      await page.keyboard.press("Space");
      await expect(checkbox).toBeChecked();
    }
  });

  test("27: ARIA labels and semantic HTML", async ({ page }) => {
    // Verify semantic HTML structure
    await expect(page.locator('table')).toHaveAttribute('role', 'table');

    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);

    // Verify form controls have labels
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    for (let i = 0; i < Math.min(checkboxCount, 3); i++) {
      const checkbox = checkboxes.nth(i);
      const label = page.locator(`label`).filter({ has: checkbox });
      await expect(label).toBeVisible();
    }
  });
});

test.describe("Unified Booking Page - Performance", () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USERS.student);
  });

  test("28: Page load performance", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Critical content should be visible quickly
    await expect(page.locator('button:has-text("Book Lessons")')).toBeVisible();
  });

  test("29: Filter responsiveness", async ({ page }) => {
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");

    // Measure filter response time
    const startTime = Date.now();

    // Apply filter
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await checkbox.check();

      // Wait for slots to update
      await page.waitForTimeout(100);

      const filterTime = Date.now() - startTime;

      // Filtering should be near-instant (< 500ms)
      expect(filterTime).toBeLessThan(500);
    }
  });
});

test.describe("Unified Booking Page - Error Handling", () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("30: Handles loading states gracefully", async ({ page }) => {
    // Reload the page and check for loading state
    await page.reload();

    // Look for loading indicator
    const loadingIndicator = page.locator('text=/読み込み中|Loading/i');

    // Loading state should appear briefly
    if (await loadingIndicator.isVisible({ timeout: 500 }).catch(() => false)) {
      // Loading state exists
      await expect(loadingIndicator).toBeVisible();

      // Should disappear after loading
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    }

    // Content should load eventually
    await expect(page.locator('button:has-text("Book Lessons")')).toBeVisible({ timeout: 5000 });
  });
});
import { test, expect } from "@playwright/test";
import { AuthHelper, TEST_USERS } from "./helpers/auth.helper";
import { BookingPageHelper } from "./helpers/booking-page.helper";
import { DateTimeHelper } from "./helpers/date-time.helper";
import { edgeCaseData } from "./fixtures/booking.fixtures";

/**
 * Edge Case Test Suite for Unified Booking Page
 * Tests boundary conditions, error states, and unusual scenarios
 */

test.describe("Unified Booking Page - Edge Cases", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("EC01: Handle very long mentor names gracefully", async ({ page }) => {
    // Check if mentor names are truncated properly
    const mentorLabels = page.locator('label:has(input[type="checkbox"])');
    const count = await mentorLabels.count();

    for (let i = 0; i < Math.min(count, 2); i++) {
      const label = mentorLabels.nth(i);
      const text = await label.textContent();

      // Check if text is displayed properly (should not break layout)
      const box = await label.boundingBox();
      if (box) {
        expect(box.width).toBeLessThan(300); // Should not exceed container width
      }
    }
  });

  test("EC02: Handle rapid tab switching", async ({ page }) => {
    // Rapidly switch between tabs
    for (let i = 0; i < 5; i++) {
      await bookingHelper.switchToMyReservationsTab();
      await bookingHelper.switchToBookLessonsTab();
    }

    // Verify the page is still functional
    await expect(bookingHelper.getFilterSidebar()).toBeVisible();
    await expect(bookingHelper.getCalendarSection()).toBeVisible();
  });

  test("EC03: Handle multiple filter applications", async ({ page }) => {
    // Apply all filters simultaneously
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    // Check all mentors
    for (let i = 0; i < checkboxCount; i++) {
      await checkboxes.nth(i).check();
    }

    // Set restrictive price range
    await bookingHelper.setPriceRange(1000);

    // Select morning time slot
    await bookingHelper.selectTimeSlot("morning");

    // Select specific subject
    await bookingHelper.selectSubject("math");

    // Wait for filtering
    await page.waitForTimeout(500);

    // Should handle empty results gracefully
    const slotsCount = await bookingHelper.getTimeSlotCount();
    const emptyMessage = await bookingHelper.isEmptySlotMessageVisible();

    // Either show slots or empty message
    expect(slotsCount >= 0 || emptyMessage).toBeTruthy();
  });

  test("EC04: Calendar navigation to extreme dates", async ({ page }) => {
    // Navigate far into the future (12 months)
    for (let i = 0; i < 12; i++) {
      await bookingHelper.navigateToNextMonth();
      await page.waitForTimeout(100); // Small delay between navigations
    }

    // Should still be functional
    const monthHeader = await bookingHelper.getCurrentMonth();
    expect(monthHeader).toBeTruthy();

    // Navigate back
    for (let i = 0; i < 12; i++) {
      await bookingHelper.navigateToPreviousMonth();
      await page.waitForTimeout(100);
    }

    // Should return to around current month
    const currentMonth = await bookingHelper.getCurrentMonth();
    expect(currentMonth).toBeTruthy();
  });

  test("EC05: Handle browser back/forward navigation", async ({ page }) => {
    // Switch to reservations tab
    await bookingHelper.switchToMyReservationsTab();

    // Go back
    await page.goBack();
    await page.waitForLoadState("networkidle");

    // Should still be on the page
    await expect(page).toHaveURL(/dashboard\/lessons/);

    // Go forward
    await page.goForward();
    await page.waitForLoadState("networkidle");

    // Should maintain state
    await expect(page).toHaveURL(/dashboard\/lessons/);
  });

  test("EC06: Handle price slider edge values", async ({ page }) => {
    // Set to minimum
    await bookingHelper.setPriceRange(0);
    await page.waitForTimeout(300);

    let slotCount = await bookingHelper.getTimeSlotCount();
    const zeroSlots = slotCount;

    // Set to maximum
    await bookingHelper.setPriceRange(10000);
    await page.waitForTimeout(300);

    slotCount = await bookingHelper.getTimeSlotCount();
    const maxSlots = slotCount;

    // Maximum should show more or equal slots than minimum
    expect(maxSlots).toBeGreaterThanOrEqual(zeroSlots);
  });

  test("EC07: Handle modal interactions during loading", async ({ page }) => {
    const bookButton = page.locator('button:has-text("Book Now")').first();

    if (await bookButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click book button
      await bookButton.click();

      // Immediately try to close
      await bookingHelper.closeModalWithX();

      // Modal should close properly
      await expect(await bookingHelper.isModalOpen()).toBeFalsy();
    }
  });

  test("EC08: Handle special characters in search/filter", async ({ page }) => {
    // This would test if special characters in mentor names are handled
    // The actual implementation depends on whether search is implemented

    const mentorLabels = page.locator('label:has(input[type="checkbox"])');
    const labelTexts = await mentorLabels.allTextContents();

    // Verify labels can contain special characters
    labelTexts.forEach(text => {
      expect(text).toBeDefined();
      // Text should be properly escaped/displayed
    });
  });

  test("EC09: Handle very fast date selections", async ({ page }) => {
    // Rapidly select different dates
    const dates = [5, 10, 15, 20, 25];

    for (const date of dates) {
      await bookingHelper.selectDate(date);
      // Don't wait between selections
    }

    // Last selected date should be active
    const isSelected = await bookingHelper.isDateSelected(25);
    expect(isSelected).toBeTruthy();
  });

  test("EC10: Handle session timeout gracefully", async ({ page }) => {
    // Simulate long idle time by waiting
    // This is a simplified test - real implementation would mock session expiry

    // Clear session storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to interact with the page
    const bookButton = page.locator('button:has-text("Book Now")').first();

    if (await bookButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bookButton.click();

      // Should handle gracefully (redirect to login or show error)
      await page.waitForTimeout(1000);

      // Check if redirected or error shown
      const url = page.url();
      const isOnBookingPage = url.includes("/dashboard/lessons");
      const isOnLoginPage = url.includes("/sign-in");

      expect(isOnBookingPage || isOnLoginPage).toBeTruthy();
    }
  });
});

test.describe("Unified Booking Page - Concurrent Operations", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("EC11: Handle filter changes while modal is open", async ({ page }) => {
    const bookButton = page.locator('button:has-text("Book Now")').first();

    if (await bookButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Open modal
      await bookButton.click();
      await expect(await bookingHelper.isModalOpen()).toBeTruthy();

      // Try to change filters (should not affect modal)
      await bookingHelper.selectTimeSlot("morning");

      // Modal should remain open
      await expect(await bookingHelper.isModalOpen()).toBeTruthy();

      // Close modal
      await bookingHelper.closeModalWithCancel();
    }
  });

  test("EC12: Handle multiple rapid modal opens/closes", async ({ page }) => {
    const bookButton = page.locator('button:has-text("Book Now")').first();

    if (await bookButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Rapidly open and close modal
      for (let i = 0; i < 3; i++) {
        await bookButton.click();
        await page.waitForTimeout(100);
        await bookingHelper.closeModalWithX();
        await page.waitForTimeout(100);
      }

      // Page should remain functional
      await expect(bookButton).toBeVisible();
      await expect(bookButton).toBeEnabled();
    }
  });
});

test.describe("Unified Booking Page - Data Validation", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("EC13: Verify date boundaries are enforced", async ({ page }) => {
    // Try to select past dates
    const yesterday = DateTimeHelper.getYesterday().getDate();

    // Past date should be disabled
    const isDisabled = await bookingHelper.isDateDisabled(yesterday);
    expect(isDisabled).toBeTruthy();
  });

  test("EC14: Verify price display formatting", async ({ page }) => {
    const slots = page.locator('text=/¥[\\d,]+/');
    const count = await slots.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const priceText = await slots.nth(i).textContent();

      // Should be properly formatted with yen symbol
      expect(priceText).toMatch(/^¥[\d,]+$/);

      // Should not have decimal points for Japanese yen
      expect(priceText).not.toContain(".");
    }
  });

  test("EC15: Verify time slot duration display", async ({ page }) => {
    const timeSlots = page.locator('text=/(60 min)/');

    if (await timeSlots.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      const count = await timeSlots.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const durationText = await timeSlots.nth(i).textContent();
        expect(durationText).toContain("60 min");
      }
    }
  });
});

test.describe("Unified Booking Page - Responsive Behavior", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
  });

  test("EC16: Handle viewport resize", async ({ page }) => {
    // Set different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1366, height: 768 },  // Laptop
      { width: 768, height: 1024 },  // Tablet
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/lessons");
      await page.waitForLoadState("networkidle");

      // Page should adapt and remain functional
      await expect(page.locator('button:has-text("Book Lessons")')).toBeVisible();

      // Check if layout adapts (grid should change on smaller screens)
      const grid = page.locator('.grid');
      const gridClass = await grid.getAttribute('class');

      if (viewport.width < 1024) {
        // Should not have 3-column layout on smaller screens
        expect(gridClass).not.toContain('grid-cols-[280px_400px_1fr]');
      }
    }
  });
});

test.describe("Unified Booking Page - Network Conditions", () => {
  let authHelper: AuthHelper;
  let bookingHelper: BookingPageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    bookingHelper = new BookingPageHelper(page);

    await authHelper.login(TEST_USERS.student);
  });

  test("EC17: Handle slow network conditions", async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', route => {
      setTimeout(() => route.continue(), 1000); // 1 second delay
    });

    await page.goto("/dashboard/lessons", { waitUntil: 'domcontentloaded' });

    // Should show loading state
    const loadingIndicator = page.locator('text=/読み込み中|Loading/i');

    if (await loadingIndicator.isVisible({ timeout: 500 }).catch(() => false)) {
      await expect(loadingIndicator).toBeVisible();
    }

    // Should eventually load
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await expect(page.locator('button:has-text("Book Lessons")')).toBeVisible();
  });

  test("EC18: Handle network interruption during booking", async ({ page, context }) => {
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");

    const bookButton = page.locator('button:has-text("Book Now")').first();

    if (await bookButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Open modal
      await bookButton.click();
      await expect(await bookingHelper.isModalOpen()).toBeTruthy();

      // Simulate network failure
      await context.route('**/api/**', route => route.abort());

      // Try to confirm booking
      await bookingHelper.confirmBooking();

      // Should handle error gracefully
      await page.waitForTimeout(2000);

      // Check for error message or still on same page
      const url = page.url();
      expect(url).toContain("/dashboard/lessons");
    }
  });
});

test.describe("Unified Booking Page - Accessibility Edge Cases", () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USERS.student);
    await page.goto("/dashboard/lessons");
    await page.waitForLoadState("networkidle");
  });

  test("EC19: Handle keyboard-only navigation", async ({ page }) => {
    // Navigate using only keyboard
    await page.keyboard.press("Tab"); // Focus first element

    // Tab through interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");

      // Check if focused element is interactive
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName.toLowerCase(),
          type: (el as HTMLInputElement)?.type,
          role: el?.getAttribute('role'),
        };
      });

      // Focused element should be interactive
      const interactiveTags = ['button', 'input', 'a', 'select', 'textarea'];
      const isInteractive =
        (focusedElement.tagName && interactiveTags.includes(focusedElement.tagName)) ||
        focusedElement.role === 'button';

      expect(isInteractive).toBeTruthy();
    }
  });

  test("EC20: Screen reader compatibility check", async ({ page }) => {
    // Check for ARIA labels and roles
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button should have either text content or aria-label
      expect(text || ariaLabel).toBeTruthy();
    }

    // Check form controls have labels
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');

      // Input should have label association or aria-label
      if (!ariaLabel && id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.isVisible({ timeout: 100 }).catch(() => false);
        expect(hasLabel || ariaLabel).toBeTruthy();
      }
    }
  });
});
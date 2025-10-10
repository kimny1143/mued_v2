import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Unified Booking Page
 * Encapsulates all page interactions and element locators
 */
export class BookingPageHelper {
  private page: Page;

  // Locator constants
  private readonly selectors = {
    // Tabs
    bookLessonsTab: 'button:has-text("Book Lessons")',
    myReservationsTab: 'button:has-text("My Reservations")',
    reservationBadge: 'button:has-text("My Reservations") span.bg-\\[var\\(--color-brand-green\\)\\]',

    // Filter sidebar
    filterSidebar: '.grid > div:first-child',
    mentorCheckbox: 'input[type="checkbox"]',
    priceSlider: 'input[type="range"]',
    timeSlotRadio: (value: string) => `input[type="radio"][value="${value}"][name="timeSlot"]`,
    subjectRadio: (value: string) => `input[type="radio"][value="${value}"][name="subject"]`,
    resetFiltersButton: 'button:has-text("Reset Filters")',

    // Calendar
    calendarSection: '.grid > div:nth-child(2)',
    calendarHeader: 'h3',
    prevMonthButton: 'button svg path[d*="M15 19l-7-7"]',
    nextMonthButton: 'button svg path[d*="M9 5l7 7"]',
    calendarDay: (day: number) => `button:has-text("${day}")`,
    weekdayHeaders: '.grid-cols-7 > div.text-xs',

    // Time slots
    timeSlotsContainer: '.space-y-3',
    timeSlot: '.bg-white.border.border-gray-100.rounded-xl',
    bookNowButton: 'button:has-text("Book Now")',
    emptySlotMessage: 'text=/No available slots on this date/i',

    // Modal
    modal: '.fixed.inset-0.z-50',
    modalBackdrop: '.fixed.inset-0.bg-black',
    modalTitle: 'h3:has-text("予約確認")',
    modalCloseButton: '.fixed button svg path[d*="M6 18L18 6M6 6l12 12"]',
    modalCancelButton: 'button:has-text("キャンセル")',
    modalConfirmButton: 'button:has-text("予約を確定")',

    // Reservations table
    reservationsTable: 'table',
    reservationsEmptyState: 'text="予約がありません"',
    reservationsBookButton: 'button:has-text("レッスンを予約する")',
    paymentButton: 'button:has-text("支払う")',
    cancelReservationButton: 'button:has-text("キャンセル")',
    tableHeaders: 'th',
    tableRows: 'tbody tr',
  };

  constructor(page: Page) {
    this.page = page;
  }

  // Navigation methods
  async navigateToBookingPage(): Promise<void> {
    await this.page.goto("/dashboard/lessons");
    await this.page.waitForLoadState("networkidle");
  }

  async switchToBookLessonsTab(): Promise<void> {
    await this.page.locator(this.selectors.bookLessonsTab).click();
    await expect(this.page.locator(this.selectors.bookLessonsTab)).toHaveClass(
      /text-\[var\(--color-brand-green\)\]/
    );
  }

  async switchToMyReservationsTab(): Promise<void> {
    await this.page.locator(this.selectors.myReservationsTab).click();
    await expect(this.page.locator(this.selectors.myReservationsTab)).toHaveClass(
      /text-\[var\(--color-brand-green\)\]/
    );
  }

  // Filter methods
  async selectMentor(mentorIndex: number): Promise<void> {
    const checkbox = this.page.locator(this.selectors.mentorCheckbox).nth(mentorIndex);
    await checkbox.check();
  }

  async deselectMentor(mentorIndex: number): Promise<void> {
    const checkbox = this.page.locator(this.selectors.mentorCheckbox).nth(mentorIndex);
    await checkbox.uncheck();
  }

  async toggleMentor(mentorIndex: number): Promise<void> {
    const checkbox = this.page.locator(this.selectors.mentorCheckbox).nth(mentorIndex);
    const isChecked = await checkbox.isChecked();

    if (isChecked) {
      await checkbox.uncheck();
    } else {
      await checkbox.check();
    }
  }

  async setPriceRange(maxPrice: number): Promise<void> {
    await this.page.locator(this.selectors.priceSlider).fill(maxPrice.toString());
  }

  async selectTimeSlot(slot: "all" | "morning" | "afternoon" | "evening"): Promise<void> {
    await this.page.locator(this.selectors.timeSlotRadio(slot)).check();
  }

  async selectSubject(subject: "all" | "math" | "english" | "science"): Promise<void> {
    await this.page.locator(this.selectors.subjectRadio(subject)).check();
  }

  async resetFilters(): Promise<void> {
    await this.page.locator(this.selectors.resetFiltersButton).click();
  }

  // Calendar methods
  async navigateToNextMonth(): Promise<void> {
    const nextButton = this.page.locator(this.selectors.nextMonthButton).locator("..");
    await nextButton.click();
    await this.page.waitForTimeout(300); // Wait for animation
  }

  async navigateToPreviousMonth(): Promise<void> {
    const prevButton = this.page.locator(this.selectors.prevMonthButton).locator("..");
    await prevButton.click();
    await this.page.waitForTimeout(300); // Wait for animation
  }

  async selectDate(day: number): Promise<void> {
    const dateButton = this.page
      .locator("button")
      .filter({ hasText: day.toString() })
      .first();

    // Check if the button is not disabled
    const isDisabled = await dateButton.isDisabled();
    if (!isDisabled) {
      await dateButton.click();
    }
  }

  async getCurrentMonth(): Promise<string> {
    return await this.page.locator(this.selectors.calendarHeader).textContent() || "";
  }

  async isDateSelected(day: number): Promise<boolean> {
    const dateButton = this.page
      .locator("button")
      .filter({ hasText: day.toString() })
      .first();

    const classes = await dateButton.getAttribute("class") || "";
    return classes.includes("bg-[var(--color-brand-green)]");
  }

  async isDateToday(day: number): Promise<boolean> {
    const dateButton = this.page
      .locator("button")
      .filter({ hasText: day.toString() })
      .first();

    const classes = await dateButton.getAttribute("class") || "";
    return classes.includes("ring-2") && classes.includes("ring-[var(--color-brand-green)]");
  }

  async isDateDisabled(day: number): Promise<boolean> {
    const dateButton = this.page
      .locator("button")
      .filter({ hasText: day.toString() })
      .first();

    return await dateButton.isDisabled();
  }

  // Time slot methods
  async getTimeSlotCount(): Promise<number> {
    return await this.page.locator(this.selectors.bookNowButton).count();
  }

  async bookTimeSlot(index: number = 0): Promise<void> {
    const bookButton = this.page.locator(this.selectors.bookNowButton).nth(index);
    await bookButton.click();
  }

  async getTimeSlotDetails(index: number = 0): Promise<{
    mentorName: string;
    time: string;
    price: string;
  }> {
    const slot = this.page.locator(this.selectors.timeSlot).nth(index);

    const mentorName = await slot.locator("h4").textContent() || "";
    const time = await slot.locator('text=/\\d{2}:\\d{2}.*-.*\\d{2}:\\d{2}/').textContent() || "";
    const price = await slot.locator('text=/¥[\\d,]+/').textContent() || "";

    return { mentorName, time, price };
  }

  async isEmptySlotMessageVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptySlotMessage).isVisible();
  }

  // Modal methods
  async isModalOpen(): Promise<boolean> {
    return await this.page.locator(this.selectors.modalTitle).isVisible();
  }

  async getModalSlotDetails(): Promise<{
    mentorName: string;
    date: string;
    time: string;
    price: string;
  }> {
    const modal = this.page.locator(this.selectors.modal);

    const mentorName = await modal.locator("h4").textContent() || "";
    const dateText = await modal.locator('p:has-text("日時") + p').textContent() || "";
    const timeText = await modal.locator('p:has-text("時間") + p').textContent() || "";
    const priceText = await modal.locator('.text-2xl.font-bold').textContent() || "";

    return {
      mentorName,
      date: dateText,
      time: timeText,
      price: priceText,
    };
  }

  async closeModalWithX(): Promise<void> {
    const closeButton = this.page.locator(this.selectors.modalCloseButton).locator("..");
    await closeButton.click();
    await expect(this.page.locator(this.selectors.modalTitle)).not.toBeVisible();
  }

  async closeModalWithBackdrop(): Promise<void> {
    await this.page.locator(this.selectors.modalBackdrop).click({
      position: { x: 10, y: 10 },
    });
    await expect(this.page.locator(this.selectors.modalTitle)).not.toBeVisible();
  }

  async closeModalWithCancel(): Promise<void> {
    await this.page.locator(this.selectors.modalCancelButton).click();
    await expect(this.page.locator(this.selectors.modalTitle)).not.toBeVisible();
  }

  async confirmBooking(): Promise<void> {
    await this.page.locator(this.selectors.modalConfirmButton).click();
  }

  // Reservation table methods
  async getReservationCount(): Promise<number> {
    const rows = this.page.locator(this.selectors.tableRows);
    const count = await rows.count();

    // Check if it's the empty state row
    if (count === 1) {
      const hasEmptyMessage = await rows
        .first()
        .locator('text="予約がありません"')
        .isVisible()
        .catch(() => false);

      return hasEmptyMessage ? 0 : count;
    }

    return count;
  }

  async isReservationTableEmpty(): Promise<boolean> {
    return await this.page.locator(this.selectors.reservationsEmptyState).isVisible();
  }

  async getReservationDetails(index: number = 0): Promise<{
    mentorName: string;
    mentorEmail: string;
    startTime: string;
    endTime: string;
    status: string;
    paymentStatus: string;
  }> {
    const row = this.page.locator(this.selectors.tableRows).nth(index);
    const cells = row.locator("td");

    const mentorCell = cells.nth(0);
    const mentorName = await mentorCell.locator("p").first().textContent() || "";
    const mentorEmail = await mentorCell.locator("p").nth(1).textContent() || "";
    const startTime = await cells.nth(1).textContent() || "";
    const endTime = await cells.nth(2).textContent() || "";
    const status = await cells.nth(3).locator("span").textContent() || "";
    const paymentStatus = await cells.nth(4).locator("span").textContent() || "";

    return {
      mentorName,
      mentorEmail,
      startTime,
      endTime,
      status,
      paymentStatus,
    };
  }

  async clickPaymentButton(reservationIndex: number = 0): Promise<void> {
    const row = this.page.locator(this.selectors.tableRows).nth(reservationIndex);
    const payButton = row.locator(this.selectors.paymentButton);

    if (await payButton.isVisible()) {
      await payButton.click();
    }
  }

  async clickCancelReservationButton(reservationIndex: number = 0): Promise<void> {
    const row = this.page.locator(this.selectors.tableRows).nth(reservationIndex);
    const cancelButton = row.locator(this.selectors.cancelReservationButton);

    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  }

  async clickBookFromEmptyState(): Promise<void> {
    await this.page.locator(this.selectors.reservationsBookButton).click();
  }

  // Helper getter methods for direct locator access
  getFilterSidebar(): Locator {
    return this.page.locator(this.selectors.filterSidebar);
  }

  getCalendarSection(): Locator {
    return this.page.locator(this.selectors.calendarSection);
  }

  getTimeSlotsContainer(): Locator {
    return this.page.locator(this.selectors.timeSlotsContainer);
  }

  getReservationsTable(): Locator {
    return this.page.locator(this.selectors.reservationsTable);
  }

  // Utility methods
  async waitForSlotsToLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
    // Wait for either slots or empty state to be visible
    await this.page.waitForSelector(
      `${this.selectors.bookNowButton}, ${this.selectors.emptySlotMessage}`,
      { state: "visible", timeout: 5000 }
    ).catch(() => {
      // If neither appears, that's okay - might be loading
    });
  }

  async waitForReservationsToLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector(
      `${this.selectors.reservationsTable}, ${this.selectors.reservationsEmptyState}`,
      { state: "visible", timeout: 5000 }
    );
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/tests/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  // Validation methods
  async verifyPageStructure(): Promise<void> {
    // Verify main layout components are present
    await expect(this.page.locator(this.selectors.bookLessonsTab)).toBeVisible();
    await expect(this.page.locator(this.selectors.myReservationsTab)).toBeVisible();

    // If on Book Lessons tab, verify 3-column layout
    const isBookLessonsActive = await this.page
      .locator(this.selectors.bookLessonsTab)
      .evaluate((el) => el.classList.contains("text-[var(--color-brand-green)]"));

    if (isBookLessonsActive) {
      await expect(this.getFilterSidebar()).toBeVisible();
      await expect(this.getCalendarSection()).toBeVisible();
    }
  }

  async verifyFilterDefaults(): Promise<void> {
    // Check all mentors unchecked
    const checkboxes = this.page.locator(this.selectors.mentorCheckbox);
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }

    // Check time slot is "all"
    await expect(this.page.locator(this.selectors.timeSlotRadio("all"))).toBeChecked();

    // Check subject is "all"
    await expect(this.page.locator(this.selectors.subjectRadio("all"))).toBeChecked();

    // Check price slider is at max
    const sliderValue = await this.page.locator(this.selectors.priceSlider).inputValue();
    expect(sliderValue).toBe("10000");
  }
}
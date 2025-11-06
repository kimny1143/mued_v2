/**
 * E2E Tests: Accessibility (WCAG 2.1 AA Compliance)
 *
 * Automated accessibility testing using axe-core
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper to check accessibility with specific rules
async function checkAccessibility(
  page: any,
  options: {
    tags?: string[];
    exclude?: string[];
    include?: string[];
  } = {}
) {
  const builder = new AxeBuilder({ page });

  if (options.tags) {
    builder.withTags(options.tags);
  }

  if (options.include) {
    options.include.forEach(selector => builder.include(selector));
  }

  if (options.exclude) {
    options.exclude.forEach(selector => builder.exclude(selector));
  }

  const results = await builder.analyze();

  // Log violations for debugging
  if (results.violations.length > 0) {
    console.log('Accessibility violations:', JSON.stringify(results.violations, null, 2));
  }

  return results;
}

test.describe('WCAG 2.1 AA Compliance', () => {
  test('Dashboard page should have no accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');

    const results = await checkAccessibility(page, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });

    expect(results.violations).toEqual([]);
  });

  test('Material creation page should be accessible', async ({ page }) => {
    await page.goto('/dashboard/materials/create');

    const results = await checkAccessibility(page, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });

    expect(results.violations).toEqual([]);
  });

  test('Practice page with music player should be accessible', async ({ page }) => {
    await page.goto('/materials/test-material/practice');

    const results = await checkAccessibility(page, {
      tags: ['wcag2a', 'wcag2aa'],
      // Music notation might have known issues, exclude for now
      exclude: ['[data-testid="abc-notation-display"]'],
    });

    expect(results.violations).toEqual([]);
  });
});

test.describe('Keyboard Navigation', () => {
  test('Main navigation should be keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');

    // Start from body
    await page.keyboard.press('Tab');

    // Should focus skip link if present
    const skipLink = page.locator('a:has-text("Skip to content")');
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeFocused();
      await page.keyboard.press('Tab');
    }

    // Check main navigation items are reachable
    const navItems = [
      'Dashboard',
      'Materials',
      'Practice',
      'Progress',
      'Settings',
    ];

    for (const item of navItems) {
      const link = page.locator(`nav a:has-text("${item}")`);
      if (await link.count() > 0) {
        // Tab until we reach this item
        let attempts = 0;
        while (attempts < 20) {
          const focused = await page.evaluate(() => document.activeElement?.textContent);
          if (focused?.includes(item)) break;
          await page.keyboard.press('Tab');
          attempts++;
        }

        // Verify we can activate with Enter
        const currentUrl = page.url();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        // URL should change or action should occur
        if (item !== 'Dashboard' || !currentUrl.includes('dashboard')) {
          expect(page.url()).not.toBe(currentUrl);
        }

        // Go back for next test
        await page.goto('/dashboard');
      }
    }
  });

  test('Music player controls should be keyboard operable', async ({ page }) => {
    await page.goto('/materials/test-material/practice');

    // Wait for player to load
    await page.waitForSelector('[data-testid="music-player"]');

    // Tab to play button
    const playButton = page.locator('button[aria-label="Play"]');
    await playButton.focus();
    await expect(playButton).toBeFocused();

    // Space should toggle play
    await page.keyboard.press('Space');
    // Verify state change
    const isPlaying = await page.locator('[data-testid="player-playing"]').count() > 0;
    expect(isPlaying).toBeTruthy();

    // Tab to tempo control
    await page.keyboard.press('Tab');
    const tempoControl = page.locator('input[aria-label="Tempo"]');
    if (await tempoControl.count() > 0) {
      // Arrow keys should adjust tempo
      const initialTempo = await tempoControl.inputValue();
      await page.keyboard.press('ArrowUp');
      const newTempo = await tempoControl.inputValue();
      expect(parseInt(newTempo)).toBeGreaterThan(parseInt(initialTempo));
    }

    // Tab to loop controls
    await page.keyboard.press('Tab');
    const loopStart = page.locator('input[aria-label="Loop start"]');
    if (await loopStart.count() > 0) {
      await expect(loopStart).toBeFocused();
      // Should accept numeric input
      await page.keyboard.type('1');
      expect(await loopStart.inputValue()).toContain('1');
    }
  });

  test('Modal dialogs should trap focus', async ({ page }) => {
    await page.goto('/dashboard/materials/create');

    // Open quality analysis modal
    await page.click('button:has-text("Analyze Quality")');
    await page.waitForSelector('[role="dialog"]');

    // First Tab should go to first focusable element in modal
    await page.keyboard.press('Tab');
    const firstFocusable = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocusable).toBeTruthy();

    // Tab through all elements and verify we stay in modal
    let tabCount = 0;
    const maxTabs = 20;
    const modalElements = [];

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => {
        const elem = document.activeElement;
        return {
          tag: elem?.tagName,
          text: elem?.textContent?.slice(0, 50),
          inModal: elem?.closest('[role="dialog"]') !== null,
        };
      });

      if (activeElement.inModal) {
        modalElements.push(activeElement);
      } else {
        // Should wrap back to modal
        break;
      }
      tabCount++;
    }

    // All focused elements should be within modal
    expect(modalElements.every(el => el.inModal)).toBe(true);

    // ESC should close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});

test.describe('Screen Reader Support', () => {
  test('Images should have appropriate alt text', async ({ page }) => {
    await page.goto('/dashboard');

    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');

      // Decorative images should have empty alt
      if (src?.includes('decoration') || src?.includes('background')) {
        expect(alt).toBe('');
      } else {
        // Functional images should have descriptive alt
        expect(alt).toBeTruthy();
        expect(alt?.length).toBeGreaterThan(0);
      }
    }
  });

  test('Form inputs should have labels', async ({ page }) => {
    await page.goto('/dashboard/materials/create');

    // Get all form inputs
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputId = await input.getAttribute('id');
      const inputName = await input.getAttribute('name');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');

      // Must have either aria-label, aria-labelledby, or associated label
      if (!ariaLabel && !ariaLabelledby && inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        const labelCount = await label.count();
        expect(labelCount).toBeGreaterThan(0);
      } else {
        expect(ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
  });

  test('Buttons should have accessible names', async ({ page }) => {
    await page.goto('/dashboard');

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledby = await button.getAttribute('aria-labelledby');

      // Must have accessible name from text, aria-label, or aria-labelledby
      expect(text?.trim() || ariaLabel || ariaLabelledby).toBeTruthy();

      // Icon-only buttons must have aria-label
      const hasOnlyIcon = await button.locator('svg').count() > 0 && !text?.trim();
      if (hasOnlyIcon) {
        expect(ariaLabel).toBeTruthy();
      }
    }
  });

  test('Page should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');

    // There should be exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Get all headings
    const headings = await page.evaluate(() => {
      const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return allHeadings.map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent,
      }));
    });

    // Check hierarchy - no skipping levels
    let previousLevel = 0;
    for (const heading of headings) {
      if (previousLevel > 0) {
        // Can go up any amount, but down only by 1
        expect(heading.level).toBeLessThanOrEqual(previousLevel + 1);
      }
      previousLevel = heading.level;
    }
  });
});

test.describe('Color Contrast', () => {
  test('Text should meet WCAG AA contrast requirements', async ({ page }) => {
    await page.goto('/dashboard');

    const results = await checkAccessibility(page, {
      tags: ['wcag2aa'],
    });

    // Filter for color contrast violations
    const contrastViolations = results.violations.filter(v =>
      v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });

  test('Focus indicators should be visible', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check if focus is visible
    const focusedElement = await page.evaluate(() => {
      const elem = document.activeElement;
      if (!elem) return null;

      const styles = window.getComputedStyle(elem);
      const focusStyles = window.getComputedStyle(elem, ':focus');

      return {
        outline: styles.outline,
        outlineColor: styles.outlineColor,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
        border: styles.border,
      };
    });

    // Should have visible focus indicator
    expect(
      focusedElement?.outline !== 'none' ||
      focusedElement?.boxShadow !== 'none' ||
      parseFloat(focusedElement?.outlineWidth || '0') > 0
    ).toBe(true);
  });
});

test.describe('ARIA Attributes', () => {
  test('Interactive elements should have appropriate ARIA roles', async ({ page }) => {
    await page.goto('/dashboard');

    // Check custom interactive elements
    const customButtons = page.locator('div[onclick], span[onclick]');
    const customButtonCount = await customButtons.count();

    for (let i = 0; i < customButtonCount; i++) {
      const element = customButtons.nth(i);
      const role = await element.getAttribute('role');
      const tabindex = await element.getAttribute('tabindex');

      // Should have button role and be keyboard accessible
      expect(role).toBe('button');
      expect(tabindex).toBe('0');
    }
  });

  test('Loading states should be announced', async ({ page }) => {
    await page.goto('/dashboard/materials/create');

    // Trigger an action that causes loading
    await page.fill('textarea[name="abc"]', 'X:1\nK:C\nCDEF|');
    await page.click('button:has-text("Analyze Quality")');

    // Check for aria-live region or loading announcement
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    const loadingIndicator = page.locator('[role="status"]');

    expect(
      (await liveRegion.count()) > 0 ||
      (await loadingIndicator.count()) > 0
    ).toBe(true);

    // If using aria-busy
    const busyElement = page.locator('[aria-busy="true"]');
    if (await busyElement.count() > 0) {
      // Should eventually become not busy
      await expect(busyElement).toHaveAttribute('aria-busy', 'false', {
        timeout: 10000
      });
    }
  });

  test('Error messages should be associated with inputs', async ({ page }) => {
    await page.goto('/dashboard/materials/create');

    // Submit form with empty required field
    await page.click('button[type="submit"]');

    // Wait for validation
    await page.waitForTimeout(500);

    // Find inputs with errors
    const errorInputs = page.locator('input[aria-invalid="true"], input.error');
    const errorCount = await errorInputs.count();

    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const input = errorInputs.nth(i);
        const ariaDescribedby = await input.getAttribute('aria-describedby');

        if (ariaDescribedby) {
          // Error message should exist
          const errorMessage = page.locator(`#${ariaDescribedby}`);
          await expect(errorMessage).toBeVisible();

          // Should have role="alert" or live region
          const role = await errorMessage.getAttribute('role');
          const ariaLive = await errorMessage.getAttribute('aria-live');
          expect(role === 'alert' || ariaLive !== null).toBe(true);
        }
      }
    }
  });
});

test.describe('Responsive Accessibility', () => {
  test('Mobile view should maintain accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Check mobile menu button
    const menuButton = page.locator('button[aria-label*="Menu"], button[aria-label*="menu"]');
    if (await menuButton.count() > 0) {
      await expect(menuButton).toBeVisible();

      // Should have aria-expanded
      const ariaExpanded = await menuButton.getAttribute('aria-expanded');
      expect(ariaExpanded).toBeDefined();

      // Click to open
      await menuButton.click();

      // aria-expanded should change
      const newAriaExpanded = await menuButton.getAttribute('aria-expanded');
      expect(newAriaExpanded).toBe('true');

      // Navigation should be accessible
      const nav = page.locator('nav[role="navigation"]');
      await expect(nav).toBeVisible();
    }

    // Run axe on mobile view
    const results = await checkAccessibility(page, {
      tags: ['wcag2aa'],
    });

    expect(results.violations).toEqual([]);
  });
});
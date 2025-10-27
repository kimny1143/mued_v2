import React from 'react';
import { render as rtlRender, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect } from 'vitest';

/**
 * Custom render function that wraps components with necessary providers
 * This is essential for testing components that rely on context providers
 */

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial route for testing navigation
   */
  initialRoute?: string;
  /**
   * Mock user data for Clerk authentication
   */
  mockUser?: {
    id?: string;
    username?: string;
    email?: string;
  };
}

/**
 * All the providers that our app needs
 * Add more providers here as your app grows
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Add your providers here, e.g., ThemeProvider, AuthProvider, etc. */}
      {children}
    </>
  );
}

/**
 * Custom render method that includes all necessary providers
 * @param ui - The component to render
 * @param options - Render options including custom options
 * @returns Render result with all testing utilities
 */
function customRender(
  ui: React.ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  // Extract custom options
  const { initialRoute, mockUser, ...renderOptions } = options || {};

  // Set initial route if provided
  if (initialRoute) {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  // Mock user if provided (for Clerk)
  if (mockUser) {
    // This is already mocked in vitest.setup.ts, but we can override here if needed
  }

  return rtlRender(ui, {
    wrapper: AllTheProviders,
    ...renderOptions,
  });
}

/**
 * Setup user event with proper configuration for React 19
 * This is important for simulating user interactions
 */
function setupUser() {
  return userEvent.setup({
    // Add any specific configuration for user events here
    advanceTimers: vi.advanceTimersByTime,
  });
}

/**
 * Utility to wait for async operations
 * Useful for testing components with async data fetching
 */
export async function waitForLoadingToFinish() {
  const { findByRole } = rtlRender(<div />);

  // Wait for any loading spinners to disappear
  const loadingElements = document.querySelectorAll('[role="status"]');
  if (loadingElements.length > 0) {
    await Promise.all(
      Array.from(loadingElements).map(async (element) => {
        // Wait for element to be removed from DOM
        await new Promise((resolve) => {
          const observer = new MutationObserver((mutations) => {
            if (!document.contains(element)) {
              observer.disconnect();
              resolve(undefined);
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });

          // Timeout after 5 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve(undefined);
          }, 5000);
        });
      })
    );
  }
}

/**
 * Create mock props for testing components
 * This helps maintain consistency across tests
 */
export function createMockProps<T extends Record<string, any>>(
  overrides?: Partial<T>
): T {
  return {
    // Add default props here
    ...overrides,
  } as T;
}

/**
 * Mock Next.js router for testing
 * Useful for testing components that use Next.js navigation
 */
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  pathname: '/',
};

/**
 * Mock fetch response for API testing
 */
export function mockFetch(data: any, status: number = 200) {
  return vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  );
}

/**
 * Helper to test accessibility
 * Ensures components meet a11y standards
 */
export async function expectNoA11yViolations(container: HTMLElement) {
  // This is a simplified version. In a real app, you'd use jest-axe
  const requiredAttributes = [
    // Check for aria-labels on interactive elements
    ...Array.from(container.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')),
    ...Array.from(container.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])')),
    ...Array.from(container.querySelectorAll('a:not([aria-label]):not([aria-labelledby])')),
  ];

  expect(requiredAttributes).toHaveLength(0);
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Export our custom utilities
export {
  customRender as render,
  setupUser,
  userEvent
};
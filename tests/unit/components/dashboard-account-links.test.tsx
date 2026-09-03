/**
 * Dashboard → plugin portal: the account list must link to /dashboard/plugins.
 *
 * ★Why this test exists: the portal shipped in #693 with NO entry point anywhere in the UI.
 * docs/portal/plan-brief-user-portal-20260717.md L107 listed the home→portal link inside PR-2's own
 * scope — it is the one bullet that did not land, and nothing failed: tsc, lint and every test stayed
 * green, because "a page nobody can navigate to" is not a type error. Measured 2026-09-03 on
 * origin/main: zero .tsx linked to /dashboard/plugins, while /dashboard/settings had three.
 *
 * ★Why it matters past tidiness: the free modules ship version updates (MUEDsat/MUEDlim 0.1.1,
 * MUEDrive 0.1.0). With the welcome email as the only door, a customer who loses that mail can never
 * fetch a newer build — the exact "no email link to dig up" the portal's own lede promises.
 *
 * ★What each assertion actually catches — MEASURED in two separate RED runs, not derived:
 *   keys ABSENT (the state this PR started from): 4/4 fail, but only TWO of them on the anchor. The
 *     accessible-name test degenerates instead (an undefined label drops the name filter, so it
 *     matches all three links and fails on multiple-match), and the locale test compares undefined
 *     to undefined.
 *   keys PRESENT, only the <Link> row removed: 3/4 fail on the anchor — "expected null not to be
 *     null" (x2) and "Unable to find an accessible element with the role 'link' and name 'Your
 *     plugins'" — while the locale test correctly PASSES.
 * ★So the locale test is an i18n guard, not a reachability guard. That distinction is on the record
 * because an over-stated rationale gets checked, fails the check, and takes the sound design down
 * with it (product課, reviewing #964).
 *
 * ★Asserted through a render, not a grep: the label and the destination have to survive together.
 * An i18n key that resolves to nothing still renders an anchor, and a grep for the path would be
 * happy with a link nobody can read. So the accessible name is asserted too, from the real
 * messages/{en,ja}.json — and EN ≠ JA, which is what tells us each file supplied its own string
 * rather than one locale being copied into the other (see the empty-key gotcha in #561).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import enMessages from '../../../messages/en.json';
import jaMessages from '../../../messages/ja.json';

// ★next/link prefetch uses IntersectionObserver. The shared setup mocks it with
// `vi.fn().mockImplementation(...)`, and vitest.config.unit.ts sets `mockReset: true`, which strips
// the implementation before each test — leaving a mock that is present but inert. A plain class
// cannot be reset, so it is defined here per-test (same reason as plugins-portal-available.test.tsx).
beforeEach(() => {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
});

// The shared setup pins this module to en.json. This file needs to swap locales, so it overrides the
// mock with a mutable holder — and feeds it the REAL message files, so a missing key fails here
// instead of being echoed back as its own key name.
const state = vi.hoisted(() => ({ messages: null as unknown }));

vi.mock('@/lib/i18n/locale-context', () => ({
  useLocale: () => ({ locale: 'en', setLocale: () => {}, t: state.messages }),
}));

// AccountSection calls useClerk() for sign-out; the shared Clerk mock does not provide it.
vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({ signOut: vi.fn().mockResolvedValue(undefined) }),
}));

import { AccountSection } from '@/components/dashboard/account-section';

const PORTAL_HREF = '/dashboard/plugins';

const label = (m: typeof enMessages) => m.muednote.dashboardHub.account.plugins;

describe('AccountSection — plugin portal entry', () => {
  it.each([
    ['en', enMessages],
    ['ja', jaMessages],
  ])('links to the portal with a readable label (%s)', (_locale, messages) => {
    state.messages = messages;
    const { container } = render(<AccountSection />);

    const link = container.querySelector(`a[href="${PORTAL_HREF}"]`);
    expect(link).not.toBeNull();
    expect(link?.textContent?.trim()).toBe(label(messages as typeof enMessages));
    expect(label(messages as typeof enMessages).length).toBeGreaterThan(0);

    // ★Positive control: the sibling link that already worked renders in the same pass. Without it,
    // a section that failed to render for an unrelated reason would make the assertion above fail
    // for the wrong reason, and a future reader would chase the portal link instead of the render.
    expect(container.querySelector('a[href="/dashboard/settings"]')).not.toBeNull();
  });

  it('reaches the portal by its accessible name, not just by href', () => {
    state.messages = enMessages;
    render(<AccountSection />);

    expect(screen.getByRole('link', { name: label(enMessages) })).toHaveAttribute(
      'href',
      PORTAL_HREF
    );
  });

  it('carries a distinct string per locale (each file supplied its own)', () => {
    expect(label(enMessages)).not.toBe(label(jaMessages));
  });
});

/**
 * PluginsPortalView — the "not on your shelf yet" affordance, rendered.
 *
 * ★Why a render test and not just the pure-function one: the property that matters is what the
 * browser gets. `buildAvailableItems` can be perfectly correct while the view links the wrong thing,
 * and the wrong thing here is specific — a direct `.pkg` URL downloads the plugin WITHOUT passing the
 * email gate, so no entitlement row is written and the module never appears on the shelf. That is the
 * exact failure this section was added to fix, reintroduced one layer up. tsc cannot see it (both are
 * strings) and the pure test cannot see it (it never renders).
 *
 * ★Every "must not contain a .pkg link" assertion here is paired with a positive control in the same
 * render: the OWNED tile's download link IS a .pkg. Without it, deleting the whole component would
 * make the negative assertions pass.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

// ★next/link prefetch uses IntersectionObserver. tests/setup/vitest.setup.ts does mock it — but with
// `vi.fn().mockImplementation(...)`, and vitest.config.unit.ts sets `mockReset: true`, which strips
// the implementation before each test. The mock is present and inert: `new IntersectionObserver()`
// returns undefined and next/link throws "observer.observe is not a function". A plain class cannot
// be reset, so it is defined here per-test rather than relying on the shared (reset) mock.
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

// ★The component imports a CSS module; vitest routes that through the app's Tailwind 4 PostCSS
// config, which does not load in this context. Stub it with a proxy that echoes the class name — the
// assertions here are about links and text, never about styling.
vi.mock('@/app/dashboard/plugins/plugins-portal.module.css', () => ({
  default: new Proxy({}, { get: (_t, k) => String(k) }),
}));

vi.mock('next-intl', () => ({
  // Keys are echoed back, so an assertion reads the key rather than a translation that may be reworded.
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useLocale: () => 'ja',
}));

import { PluginsPortalView } from '@/app/dashboard/plugins/plugins-portal-view';

const owned = [
  {
    pluginKey: 'muedsat',
    i18nNamespace: 'muedsat',
    version: '1.0.0',
    downloadUrl: 'https://cdn.example/MUEDsat-1.0.0.pkg',
    claimedAtISO: '2026-07-17T00:00:00.000Z',
  },
];
const available = [{ pluginKey: 'muedrive', lpPath: '/muedrive' }];

const hrefs = () =>
  Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');

describe('PluginsPortalView — available section', () => {
  it('★links the landing page, locale-prefixed — and no .pkg appears in that section', () => {
    render(<PluginsPortalView items={owned} available={available} />);

    const cta = screen.getByText(/available\.cta/);
    const link = cta.closest('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/ja/muedrive');
    expect(link!.getAttribute('href')).not.toMatch(/\.pkg$/);

    // ★Positive control in the SAME render: the owned tile really does link a .pkg, so "no .pkg in
    //   the available link" is a discriminating result rather than an empty page.
    expect(hrefs().some((h) => h.endsWith('.pkg'))).toBe(true);
  });

  it('shows the module name and its section label', () => {
    render(<PluginsPortalView items={owned} available={available} />);
    expect(screen.getByText('MUEDrive')).toBeTruthy();
    expect(screen.getByText('available.label')).toBeTruthy();
  });

  it('renders nothing extra when there is nothing left to get', () => {
    render(<PluginsPortalView items={owned} available={[]} />);
    expect(screen.queryByText('available.label')).toBeNull();
    // ★Positive control: the owned rack still rendered, so the absence above is the branch, not a
    //   component that failed to mount.
    expect(screen.getByText('MUEDsat')).toBeTruthy();
  });

  it('defaults to no available section when the prop is omitted (server not yet passing it)', () => {
    render(<PluginsPortalView items={owned} />);
    expect(screen.queryByText('available.label')).toBeNull();
    expect(screen.getByText('MUEDsat')).toBeTruthy();
  });

  it('★an owned module is never offered again — the two sections are disjoint on screen', () => {
    render(<PluginsPortalView items={owned} available={available} />);
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['MUEDsat', 'MUEDrive']);
    expect(new Set(headings).size).toBe(headings.length);
  });

  it('★an included module (claimedAtISO=null) shows "included", never a made-up date', () => {
    render(
      <PluginsPortalView
        items={[{ ...owned[0], pluginKey: 'muedrive', claimedAtISO: null }, ...owned]}
        available={[]}
      />,
    );
    expect(screen.getByText('included')).toBeTruthy();
    // ★Positive control in the same render: the genuinely claimed tile DOES print its date line, so
    //   "no date on the included one" is the branch and not a component that stopped rendering dates.
    expect(screen.getByText(/^added:/)).toBeTruthy();
    // ★And no date string leaked onto the included tile.
    expect(screen.queryAllByText(/^added:/).length).toBe(1);
  });

  it('the available tile carries no download control at all', () => {
    render(<PluginsPortalView items={owned} available={available} />);
    const tile = screen.getByText('MUEDrive').closest('div[class]')!.parentElement!.parentElement!;
    expect(within(tile).queryByText('download')).toBeNull();
    expect(Array.from(tile.querySelectorAll('a')).every((a) => !(a.getAttribute('href') ?? '').endsWith('.pkg'))).toBe(true);
  });
});

/**
 * The version shown to owners carries no pre-release tag, and the download sub-label is not the
 * filename.
 *
 * ★Why (kimny 逐語 2026-09-03): 「もうユーザーに配ってるのにバージョンが alpha っておかしくないの？」
 * → 「版表記は alpha 外します。」The reason given: masterchain is a $69 paid product, and a maker's
 * "unfinished" tag must not ride along with it.
 *
 * ★Why the sub-label had to move off the filename: the .pkg names stay as they are, deliberately.
 * 311 subscribers already hold emails with the literal 0.1.0 URL and sent mail cannot be edited
 * (see plugin-download-artifact-integrity.test.ts) — renaming would force yet another byte-identical
 * alias. So the file keeps its name and the SCREEN stops quoting it. Stripping "-alpha" out of a
 * displayed filename was rejected instead: it would print a filename that does not exist, and the
 * viewer can check it against their own Downloads folder.
 *
 * ★Scope note: the version guard runs over LIVE plugins only. A staged plugin may legitimately carry
 * a pre-release tag; the test then fires on the PR that flips it live, which is exactly when someone
 * should be asked whether the tag is still true.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PLUGIN_DIST, type PluginKey } from '@/lib/plugins/registry';

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

vi.mock('@/app/dashboard/plugins/plugins-portal.module.css', () => ({
  default: new Proxy({}, { get: (_t, k) => String(k) }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useLocale: () => 'ja',
}));

import { PluginsPortalView } from '@/app/dashboard/plugins/plugins-portal-view';

describe('shipped version strings', () => {
  const liveKeys = (Object.keys(PLUGIN_DIST) as PluginKey[]).filter((k) => PLUGIN_DIST[k].live);

  it('has live plugins to check (the guard below is not vacuous)', () => {
    expect(liveKeys.length).toBeGreaterThan(0);
  });

  it.each(liveKeys)('%s carries plain semver — no pre-release tag', (key) => {
    expect(PLUGIN_DIST[key].version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('portal download sub-label', () => {
  // The URL deliberately still carries "-alpha": the file is not renamed. That makes this fixture the
  // real shape, not a hypothetical one.
  const item = {
    pluginKey: 'muedsat',
    i18nNamespace: 'muedsat',
    version: '0.1.1',
    downloadUrl: 'https://mued.jp/downloads/MUEDsat-0.1.1-alpha-installer.pkg',
    claimedAtISO: '2026-07-17T00:00:00.000Z',
  };

  it('shows the version, and never the filename', () => {
    const { container } = render(<PluginsPortalView items={[item]} />);

    const link = container.querySelector('a[download]');
    expect(link).not.toBeNull();

    // ★Positive control in the same render: the href still points at the real, still-alpha-named file.
    // Without this, deleting the download link entirely would satisfy the assertion below.
    expect(link?.getAttribute('href')).toBe(item.downloadUrl);

    // The screen must not quote the filename — neither the pre-release tag nor the "-installer" stem.
    expect(container.textContent).not.toMatch(/alpha/i);
    expect(container.textContent).not.toMatch(/installer/i);

    // …and it must still say which build this is.
    expect(link?.textContent).toContain('0.1.1');
  });
});

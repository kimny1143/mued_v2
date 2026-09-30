/**
 * Windows VST3 beta (10/1–10/3) — where the zip is linked, and where it is not.
 *
 * ★conductor 2026-09-30, option (b): the zips are on the portal ONLY, behind the same email sign-up
 * as the Mac builds. /muedsp#windows carries the install steps and never a zip link — the free
 * plugins are exchanged for the sign-up, and the North Star / 5,000 target rest on that.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { WINDOWS_BETA, WINDOWS_BETA_LIVE, windowsBetaFor } from "@/lib/plugins/windows-beta";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";

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

vi.mock("@/app/dashboard/plugins/plugins-portal.module.css", () => ({
  default: new Proxy({}, { get: (_t, k) => String(k) }),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
  useLocale: () => "ja",
}));

import { PluginsPortalView } from "@/app/dashboard/plugins/plugins-portal-view";

const ROOT = join(__dirname, "..", "..");

describe("Windows beta config", () => {
  it("is off until conductor's signal (a reviewed code change, never env)", () => {
    expect(WINDOWS_BETA_LIVE).toBe(false);
  });

  it("every free plugin has a Windows zip, and nothing else does", () => {
    expect(Object.keys(WINDOWS_BETA).sort()).toEqual((Object.keys(PLUGIN_DIST) as PluginKey[]).sort());
    for (const b of Object.values(WINDOWS_BETA)) {
      expect(b.url).toMatch(/^https:\/\/mued\.jp\/downloads\/MUED(sat|lim|rive)-\d+\.\d+\.\d+-win-x64-[0-9a-f]+\.zip$/);
      expect(b.url).toContain(`-${b.version}-win-x64-`);
    }
  });

  it("windowsBetaFor: null while not live, the build when live, null for an unknown key", () => {
    expect(windowsBetaFor("muedrive", false)).toBeNull();
    expect(windowsBetaFor("muedrive", true)).toEqual(WINDOWS_BETA.muedrive);
    expect(windowsBetaFor("masterchain", true)).toBeNull();
  });
});

describe("portal", () => {
  const base = {
    pluginKey: "muedrive",
    i18nNamespace: "muedrive",
    version: "1.0.1",
    downloadUrl: "https://mued.jp/downloads/MUEDrive-1.0.1-installer.pkg",
    claimedAtISO: "2026-09-30T00:00:00.000Z",
  };

  it("shows the Windows button + install note only for a row that carries a build", () => {
    const off = render(<PluginsPortalView items={[{ ...base, windows: null }]} />);
    expect(off.container.querySelector('[data-testid="portal-windows-beta"]')).toBeNull();
    expect(off.container.textContent).not.toContain("windows.howto");
    off.unmount();

    const on = render(<PluginsPortalView items={[{ ...base, windows: WINDOWS_BETA.muedrive }]} />);
    const link = on.container.querySelector('[data-testid="portal-windows-beta"]');
    expect(link?.getAttribute("href")).toBe(WINDOWS_BETA.muedrive.url);
    expect(link?.textContent).toContain("MUEDrive 1.0.1 · VST3 · .zip");
    expect(on.container.textContent).toContain("windows.howto");
    // ★Positive control: the Mac build is still the first download link.
    expect(on.container.querySelector("a[download]")?.getAttribute("href")).toBe(base.downloadUrl);
  });

  it("the server page fills `windows` only through windowsBetaFor (the flag)", () => {
    const page = readFileSync(join(ROOT, "app", "dashboard", "plugins", "page.tsx"), "utf8");
    expect(page).toContain("windows: windowsBetaFor(it.pluginKey)");
  });
});

describe("/muedsp#windows — steps only, never a zip link", () => {
  const landing = readFileSync(join(ROOT, "components", "features", "muedsp-landing", "muedsp-landing-content.tsx"), "utf8");

  it("the landing page does not import the zip URLs", () => {
    expect(landing).not.toMatch(/WINDOWS_BETA\b(?!_LIVE)/);
    expect(landing).not.toContain(".zip");
    expect(landing).not.toContain("windowsBetaFor");
    // ★Positive control: the section is flag-gated on the same constant.
    expect(landing).toContain("WINDOWS_BETA_LIVE");
  });

  it.each(["ja", "en"])("%s copy: no zip URL, no 'on this page', and the outer-folder warning is in the steps", (l) => {
    const w = JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).muedsp.windows;
    const all = JSON.stringify(w);
    expect(all).not.toContain(".zip");
    expect(all).not.toMatch(/このページで|on this page/);
    const steps: string[] = w.steps;
    expect(steps.some((s) => s.includes(".vst3") && /外側のフォルダは入れず|Don't copy that outer folder/.test(s))).toBe(true);
    const portal = JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).pluginPortal.windows;
    expect(portal.howto).toMatch(/外側のフォルダは入れず|Don't copy that outer folder/);
  });
});

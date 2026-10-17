/**
 * Windows launch prep (conductor 2026-10-01: "Windows 版のローンチまでやれることやっちゃおう"). Everything for
 * the free VST3 beta and masterchain for Windows is in place behind two flags that ship FALSE:
 *   WINDOWS_BETA_LIVE (lib/plugins/windows-beta.ts) · MASTERCHAIN_WINDOWS_LIVE (lib/masterchain/config.ts)
 * ★With both false, not one character a visitor sees may change (conductor). That is the first block here.
 */
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import { MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION } from "@/lib/masterchain/config";
import {
  WINDOWS_BETA_LIVE,
  freePluginOperatingSystem,
  masterchainWindowsBuild,
  withWindowsSentence,
} from "@/lib/plugins/windows-beta";
import { detectDemoOs, planDemoDownload } from "@/lib/masterchain/demo-download";
import { PAID_PRODUCTS } from "@/lib/plugins/paid-products";
import { buildPurchaseItems } from "@/lib/plugins/portal";

vi.mock("@/app/dashboard/plugins/plugins-portal.module.css", () => ({
  default: new Proxy({}, { get: (_t, k) => String(k) }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
  useLocale: () => "ja",
}));
import { PluginsPortalView } from "@/app/dashboard/plugins/plugins-portal-view";

const src = (f: string) => readFileSync(f, "utf8");
const PRODUCTS = ["muedsat", "muedlim", "muedrive"] as const;

describe("the flags: the free beta and masterchain for Windows are live (2026-10-01)", () => {
  it("both are on (2026-10-01): the free beta, and masterchain for Windows with its zip", () => {
    expect(WINDOWS_BETA_LIVE).toBe(true);
    expect(MASTERCHAIN_WINDOWS_LIVE).toBe(true);
    expect(MASTERCHAIN_WINDOWS_URL).toBe("https://mued.jp/downloads/MUEDsp-masterchain-1.0.3-win-x64-7d3d881b.zip");
    expect(MASTERCHAIN_WINDOWS_VERSION).toBe("1.0.3");
    expect(MASTERCHAIN_WINDOWS_URL).toContain(`-${MASTERCHAIN_WINDOWS_VERSION}-win-x64-`);
    expect(masterchainWindowsBuild(MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION)).toEqual({
      url: MASTERCHAIN_WINDOWS_URL,
      version: MASTERCHAIN_WINDOWS_VERSION,
    });
  });

  it("the Mac strings are untouched — the Windows ones are added beside them, never replacing them", () => {
    expect(ja.muedsat.hero.badge).toBe("無料 · macOS · VST3 · AU · AAX");
    expect(ja.muedlim.hero.badge).toBe("無料 · macOS · VST3 · AU · AAX");
    expect(ja.muedrive.hero.badge).toBe("無料 · macOS · VST3 · AU · AAX");
    expect(en.muedsat.hero.badge).toBe("Free · macOS · VST3 · AU · AAX");
    expect(ja.muedsat.footer.format).toBe("VST3 · AU · AAX（Pro Tools）· macOS（Universal — Apple Silicon / Intel）");
    expect(en.muedrive.footer.format).toBe("VST3 · AU · AAX · macOS (Universal — Apple Silicon / Intel)");
    expect(ja.tokushoho.muedsp.environment.windows).toBe("Windows 版は現在ご提供しておりません。");
    expect(en.tokushoho.muedsp.environment.windows).toBe("A Windows build is not currently offered.");
  });

  it("the meta description and the JSON-LD OS: unchanged when off, Windows added when on (now on)", () => {
    expect(withWindowsSentence("D", "W", false)).toBe("D");
    expect(freePluginOperatingSystem(false)).toBe("macOS");
    expect(withWindowsSentence("D", "W", true)).toBe("D W");
    expect(freePluginOperatingSystem(true)).toBe("macOS, Windows");
    // The shipped default follows WINDOWS_BETA_LIVE (on since 2026-10-01).
    expect(withWindowsSentence("D", "W")).toBe("D W");
    expect(freePluginOperatingSystem()).toBe("macOS, Windows");
  });

  it.each(PRODUCTS)("%s: the Windows badge/format lines are behind WINDOWS_BETA_LIVE; meta and JSON-LD go through the helpers", (p) => {
    const c = src(`components/features/${p}-landing/${p}-landing-content.tsx`);
    expect(c).toContain('{th("badge")}');
    expect(c).toContain('{WINDOWS_BETA_LIVE && <> · {twin("productBadge")}</>}');
    expect(c).toMatch(/\{WINDOWS_BETA_LIVE && <p [^>]*>\{twin\("productFormat"\)\}<\/p>\}/);
    expect(c.match(/twin\("/g)).toHaveLength(2); // nothing else reads the Windows block unconditionally
    const page = src(`app/[locale]/${p}/page.tsx`);
    expect(page).toContain('const description = withWindowsSentence(t("description"), tw("productMeta"));');
    expect(page).not.toContain('description: t("description")');
    expect(page).toContain("operatingSystem: freePluginOperatingSystem(),");
    expect(page).not.toContain('operatingSystem: "macOS"');
  });

  it("特商法: the old sentence while both flags are off; free-only / all when they are on", () => {
    const t = src("app/[locale]/tokushoho/page.tsx");
    expect(t).toMatch(/MASTERCHAIN_WINDOWS_LIVE\s*\?\s*twin\("tokushohoAll"\)\s*:\s*WINDOWS_BETA_LIVE\s*\?\s*twin\("tokushohoFree"\)\s*:\s*t\("muedsp\.environment\.windows"\)/);
  });
});

describe("the Windows copy lives in the Windows blocks (the format-claims exemption is by block)", () => {
  it.each([ja, en])("muedsp.windows / pluginPortal.windows carry the new strings, VST3 only", (m) => {
    const w = m.muedsp.windows as Record<string, unknown>;
    for (const k of ["productBadge", "productFormat", "productMeta", "tokushohoFree", "tokushohoAll", "demoOtherMac", "demoOtherWindows", "demoChoose"]) {
      expect(typeof w[k], k).toBe("string");
    }
    for (const k of ["productBadge", "productFormat", "tokushohoFree", "tokushohoAll"]) {
      expect(String(w[k])).toContain("VST3");
      expect(String(w[k])).not.toMatch(/\bAU\b|AAX/); // the Windows builds are VST3 only (kimny 9/30)
    }
    expect(m.pluginPortal.windows.masterchainSameKey).toContain("VST3");
  });
});

describe("masterchain for Windows — the product page status", () => {
  it("the masterchain row switches to masterchainStatusLive only with MASTERCHAIN_WINDOWS_LIVE", () => {
    const c = src("components/features/muedsp-landing/muedsp-landing-content.tsx");
    expect(c).toMatch(/key === "masterchain" && MASTERCHAIN_WINDOWS_LIVE\s*\?\s*"masterchainStatusLive"/);
    for (const m of [ja, en]) expect(m.muedsp.windows.masterchainStatusLive).toMatch(/VST3/);
    expect(ja.muedsp.windows.masterchainStatus).toBe("近日公開予定。ライセンスキーはMac版と共通です"); // kimny 9/30, unchanged while off
  });
});

describe("masterchain for Windows — portal", () => {
  const row = { productId: "muedsp_masterchain", licenseKey: "MUEDSP-LICENSE-v2\nsig=x\n", createdAt: new Date("2026-10-02") };
  const win = { url: "https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-win-x64.zip", version: "1.0.1" };

  it("masterchainWindowsBuild needs both the flag and a URL", () => {
    expect(masterchainWindowsBuild(false, win.url, "1.0.1")).toBeNull();
    expect(masterchainWindowsBuild(true, "", "1.0.1")).toBeNull();
    expect(masterchainWindowsBuild(true, win.url, "1.0.1")).toEqual(win);
  });

  it("a purchase carries the Windows build only when given one, and never once refunded", () => {
    expect(buildPurchaseItems([row], () => ({ product: PAID_PRODUCTS.masterchain, downloadUrl: "https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-installer.pkg", windows: null }))[0].windows).toBeNull();
    expect(buildPurchaseItems([row], () => ({ product: PAID_PRODUCTS.masterchain, downloadUrl: "https://mued.jp/x-1.0.1-installer.pkg", windows: win }))[0].windows).toEqual(win);
    expect(buildPurchaseItems([{ ...row, refundedAt: new Date("2026-10-03") }], () => ({ product: PAID_PRODUCTS.masterchain, downloadUrl: "https://mued.jp/x-1.0.1-installer.pkg", windows: win }))[0].windows).toBeNull();
  });

  it("the card shows the Windows download + same-key note only when the row has one", () => {
    const base = { productKey: "masterchain" as const, displayName: "masterchain", keyFileName: "MUEDsp-masterchain.license.key", version: "1.0.1", downloadUrl: "https://mued.jp/x-1.0.1-installer.pkg", licenseKey: "K\n", purchasedAtISO: "2026-10-02T00:00:00Z" };
    const { unmount } = render(<PluginsPortalView items={[]} purchases={[base]} />);
    expect(screen.queryByTestId("portal-masterchain-windows")).toBeNull();
    expect(screen.queryByTestId("portal-masterchain-windows-note")).toBeNull();
    unmount();
    render(<PluginsPortalView items={[]} purchases={[{ ...base, windows: win }]} />);
    expect(screen.getByTestId("portal-masterchain-windows")).toHaveAttribute("href", win.url);
    expect(screen.getByTestId("portal-masterchain-windows-note")).toHaveTextContent("windows.masterchainSameKey");
  });
});

describe("masterchain for Windows — demo download", () => {
  const MAC = "https://mued.jp/m.pkg";
  const WIN = "https://mued.jp/w.zip";

  it("reads the OS from userAgentData.platform or the user agent", () => {
    expect(detectDemoOs({ platform: "Windows" })).toBe("windows");
    expect(detectDemoOs({ platform: "macOS" })).toBe("mac");
    expect(detectDemoOs({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" })).toBe("windows");
    expect(detectDemoOs({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" })).toBe("mac");
    expect(detectDemoOs({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" })).toBe("unknown");
    expect(detectDemoOs({ userAgent: "Mozilla/5.0 (X11; Linux x86_64)" })).toBe("unknown");
    expect(detectDemoOs({})).toBe("unknown");
    // ★iPadOS Safari reports "Macintosh" (CCO #1200): a Mac with touch points is an iPad → unknown.
    const ipadUa = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    expect(detectDemoOs({ userAgent: ipadUa, maxTouchPoints: 5 })).toBe("unknown");
    expect(detectDemoOs({ userAgent: ipadUa, maxTouchPoints: 0 })).toBe("mac"); // a real Mac
  });

  it("★without a Windows URL it is exactly the old behaviour: start the Mac download, offer nothing", () => {
    for (const os of ["mac", "windows", "unknown"] as const) expect(planDemoDownload(os, MAC, null)).toEqual({ start: MAC, offer: [] });
  });

  it("with one: the visitor's OS starts, the other is offered; an unknown OS starts nothing and gets both", () => {
    expect(planDemoDownload("mac", MAC, WIN)).toEqual({ start: MAC, offer: [{ os: "windows", url: WIN }] });
    expect(planDemoDownload("windows", MAC, WIN)).toEqual({ start: WIN, offer: [{ os: "mac", url: MAC }] });
    expect(planDemoDownload("unknown", MAC, WIN)).toEqual({ start: null, offer: [{ os: "mac", url: MAC }, { os: "windows", url: WIN }] });
  });

  it("the receipt email carries a Windows link only when there is a Windows build", async () => {
    const { emailTemplates } = await import("@/lib/services/email.service");
    for (const locale of ["ja", "en"] as const) {
      const off = emailTemplates.masterchainDemoDownload({ locale, windowsUrl: null });
      expect(off.html).not.toMatch(/Windows/);
      expect(off.text).not.toMatch(/Windows/);
      const on = emailTemplates.masterchainDemoDownload({ locale, windowsUrl: WIN });
      expect(on.html).toContain(`href="${WIN}"`);
      expect(on.text).toContain(WIN);
      // ★With a Windows build both buttons name their OS and the format line is the Mac's (CCO #1200).
      expect(on.text).toContain(locale === "ja" ? "Mac 版のデモをダウンロード" : "Download the demo for Mac");
      expect(on.text).toContain(locale === "ja" ? "Windows 版のデモをダウンロード" : "Download the demo for Windows");
      expect(on.text).toContain("Mac: VST3 · AU · AAX (Pro Tools) · macOS");
      // Without one, the old wording exactly.
      expect(off.text).toContain(locale === "ja" ? "デモをダウンロード: " : "Download the demo: ");
      expect(off.text).not.toContain("Mac: ");
    }
  });
});

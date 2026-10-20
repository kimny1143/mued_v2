/**
 * The MUEDvox user manual at /{ja,en}/muedvox/manual (conductor 2026-10-16: a tester asked for one; web only).
 * ★The text is VOX's (mued-vox docs/manual/): the copies here are pinned by sha256, so a hand edit on this side
 *   fails CI — fix it in mued-vox and copy it again.
 */
import { cleanup, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import enMain from "@/messages/en.json";
import jaMain from "@/messages/ja.json";
import enVox from "@/messages/muedvox.en.json";
import jaVox from "@/messages/muedvox.ja.json";
import { readMuedvoxManual, splitManual } from "@/lib/muedvox/manual";
import { muedvoxManualPath } from "@/lib/muedvox/manual-path";
import ManualPage, { generateMetadata } from "@/app/[locale]/muedvox/manual/page";
import sitemap from "@/app/sitemap";

const en = { ...enMain, muedvox: enVox };
const ja = { ...jaMain, muedvox: jaVox };
const state = vi.hoisted(() => ({ locale: "en" as "en" | "ja" }));
function translations(locale: "en" | "ja", namespace: string) {
  const messages = locale === "en" ? en : ja;
  const lookup = (key: string): any => `${namespace}.${key}`.split(".").reduce((value: any, part) => value[part], messages);
  return Object.assign((key: string, values?: Record<string, string>) => String(lookup(key)).replace(/\{(\w+)\}/g, (_m, k) => values?.[k] ?? `{${k}}`), { raw: lookup });
}
vi.mock("next-intl", () => ({
  useLocale: () => state.locale,
  useTranslations: (namespace: string) => translations(state.locale, namespace),
}));
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async ({ locale, namespace }: { locale: "en" | "ja"; namespace: string }) => translations(locale, namespace),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));
vi.mock("@/components/ui/locale-switcher", () => ({ LocaleSwitcher: () => null }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "mued.jp" }) }));
afterEach(cleanup);

// ★Copied from mued-vox badbaae0 (#229: the 1.1.0 text — 9. Saving the harmony as MIDI) with
//   git show badbaae06d768405247339725273bf953600b916:docs/manual/MUEDvox-manual.<locale>.md (shasum -a 256,
//   2026-10-20). Before: eaf37abe (1.0.2, 2026-10-17), e1c88af5 (1.0.1, never shipped). Update only together with a fresh byte copy.
const MANUAL_SHA256 = {
  en: "3f6bb4a436758a493e3a056d98b2ea69a63bd33084383a0219e6817ca7614ba5",
  ja: "bb5b78728fcf5e0f903baad0ac93d5f95d59424757d38e806c2fc1f321e6e9a9",
};

describe("★the text is VOX's, byte for byte", () => {
  it.each(["en", "ja"] as const)("%s: the copy is the pinned one", (locale) => {
    const bytes = readFileSync(`content/muedvox/manual/MUEDvox-manual.${locale}.md`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(MANUAL_SHA256[locale]);
  });

  it("the title is the file's own first line; a file without one fails loudly", () => {
    expect(splitManual("# T (1)\n\nbody").title).toBe("T (1)");
    expect(() => splitManual("no title")).toThrow(/title line/);
  });
});

describe("the page", () => {
  it.each(["en", "ja"] as const)("%s: renders the manual with its title, indexed, with canonical and hreflang", async (locale) => {
    state.locale = locale;
    const params = Promise.resolve({ locale });
    const metadata = await generateMetadata({ params });
    const { title } = splitManual(readMuedvoxManual(locale));
    expect(metadata.title).toBe(`${title} | MUED`);
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe(`https://mued.jp/${locale}/muedvox/manual`);
    render(await ManualPage({ params }));
    const article = screen.getByTestId("muedvox-manual");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(title);
    expect(article.querySelectorAll("h2").length).toBeGreaterThanOrEqual(5);
    expect(article.querySelector("table")).not.toBeNull(); // the troubleshooting table (GFM)
    expect(article.textContent).not.toMatch(/^#|\*\*/m); // markdown rendered, not shown raw
    // ★The trademark line closes the page (conductor 2026-10-16: the manual names other companies' products).
    expect(article.textContent).toContain(locale === "en" ? "Pro Tools and AudioSuite are trademarks of Avid Technology, Inc." : "Pro Tools および AudioSuite は Avid Technology, Inc. の商標です。");
  });

  it("★the same gate as the product page (404 before LIVE in production)", () => {
    const page = readFileSync("app/[locale]/muedvox/manual/page.tsx", "utf8");
    expect(page).toContain("muedvoxPageVisible(MUEDVOX_LIVE, process.env.VERCEL_ENV, process.env.NODE_ENV)) notFound()");
  });

  it("★the files reach the deployed function (read at request time, like /licenses)", () => {
    expect(readFileSync("next.config.ts", "utf8")).toContain('"/[locale]/muedvox/manual": ["./content/muedvox/manual/*.md"]');
  });

  it("is in the sitemap in both locales", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://mued.jp/ja/muedvox/manual");
    expect(urls).toContain("https://mued.jp/en/muedvox/manual");
  });
});

describe("★where it is linked from: the product page (top and FAQ) and the portal's MUEDvox cards", () => {
  it.each(["en", "ja"] as const)("%s: the product page links it twice", async (locale) => {
    state.locale = locale;
    const { MuedvoxLandingContent } = await import("@/components/features/muedvox-landing/muedvox-landing-content");
    render(<MuedvoxLandingContent />);
    expect(screen.getByTestId("muedvox-manual-link").getAttribute("href")).toBe(muedvoxManualPath(locale));
    expect(screen.getByTestId("muedvox-faq-manual-link").getAttribute("href")).toBe(muedvoxManualPath(locale));
  });

  it("the portal links it from MUEDvox's purchase and grant cards, and from nothing else", () => {
    const view = readFileSync("app/dashboard/plugins/plugins-portal-view.tsx", "utf8");
    expect(view.match(/<ManualLink /g)).toHaveLength(2);
    expect(view).toContain('if (productKey !== "muedvox") return null;');
    expect(ja.pluginPortal.manualLink).toContain("{product}");
    expect(en.pluginPortal.manualLink).toContain("{product}");
  });
});

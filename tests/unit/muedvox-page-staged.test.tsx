import { cleanup, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import enMain from "@/messages/en.json";
import jaMain from "@/messages/ja.json";
import enVox from "@/messages/muedvox.en.json";
import jaVox from "@/messages/muedvox.ja.json";
import * as config from "@/lib/muedvox/config";
import { MuedvoxLandingContent } from "@/components/features/muedvox-landing";
import { visibleFaq, type MuedvoxFaqItem } from "@/components/features/muedvox-landing/muedvox-landing-content";
import MuedvoxPage, { generateMetadata, generateStaticParams } from "@/app/[locale]/muedvox/page";
import sitemap from "@/app/sitemap";

// MUEDvox's words live in their own files until launch; lib/i18n/request.ts joins them on the server like this.
const en = { ...enMain, muedvox: enVox };
const ja = { ...jaMain, muedvox: jaVox };
const state = vi.hoisted(() => ({ locale: "en" as "en" | "ja" }));
function translations(locale: "en" | "ja", namespace: string) {
  const messages = locale === "en" ? en : ja;
  const lookup = (key: string): any => `${namespace}.${key}`.split(".").reduce((value: any, part) => value[part], messages);
  return Object.assign((key: string) => lookup(key) as string, { raw: lookup });
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
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "mued.jp" }) }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
afterEach(cleanup);

function deepKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...deepKeys(child, path)];
  }).sort();
}

describe("MUEDvox staged product page", () => {
  it("ships with every publication gate closed and no media", () => {
    expect(config.MUEDVOX_LIVE).toBe(false);
    expect(config.MUEDVOX_PURCHASE_LIVE).toBe(false);
    expect(config.MUEDVOX_DEMO_LIVE).toBe(false);
    expect(config.MUEDVOX_SCREENSHOT).toBe("");
    expect(config.MUEDVOX_AUDIO_EXAMPLES).toEqual([]);
  });

  it("pre-renders both locales and keeps their namespace keys identical", () => {
    expect(generateStaticParams()).toEqual([{ locale: "ja" }, { locale: "en" }]);
    expect(deepKeys(en.muedvox)).toEqual(deepKeys(ja.muedvox));
  });

  it.each(["en", "ja"] as const)("%s: noindex/nofollow, canonical and hreflang, no JSON-LD", async (locale) => {
    state.locale = locale;
    const params = Promise.resolve({ locale });
    const metadata = await generateMetadata({ params });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBe(`https://mued.jp/${locale}/muedvox`);
    expect(metadata.alternates?.languages).toMatchObject({
      en: "https://mued.jp/en/muedvox", ja: "https://mued.jp/ja/muedvox",
    });
    expect(metadata.description).not.toMatch(/\$69|demo|デモ/i);
    const before = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "preview"; // the page renders only on a preview (or local dev) before LIVE
    let page;
    try { page = await MuedvoxPage({ params }); } finally {
      if (before === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = before;
    }
    const { container } = render(page);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it.each(["en", "ja"] as const)("%s: approved copy, no commerce, demo or missing-media placeholders", (locale) => {
    state.locale = locale;
    const copy = (locale === "en" ? en : ja).muedvox;
    const { container } = render(<MuedvoxLandingContent />);
    expect(container.querySelector(".brand-mark")).toHaveTextContent("MUEDvox");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(locale === "en"
      ? "One vocal in, up to four voices out — each sung a different way."
      : "リード 1 本から、歌い方の違う最大 4 声を。");
    expect(screen.getByText(copy.hero.lead).textContent?.startsWith(locale === "en"
      ? "Vocal harmonies that follow your key and chords."
      : "調とコードに沿って、ハモリを書くボーカルハーモナイザー。")).toBe(true);
    expect(screen.getByText(locale === "en" ? "macOS: AU, VST3 and AAX. Windows: VST3." : "macOS: AU・VST3・AAX。Windows: VST3。")).toBeInTheDocument();
    for (const text of [copy.buy.button, copy.buy.price, copy.buy.consent, copy.buy.afterPurchase, copy.demo.button, copy.demo.body]) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
    expect(container.textContent).not.toMatch(/\[|\$69|USD 69|demo|デモ|plug-in|!|！/i);
    expect(container.querySelector("#buy, #demo, #before-after, #screen, audio, main img")).toBeNull();
    expect(screen.queryByRole("button", { name: /buy|購入|demo|デモ/i })).toBeNull();
    expect(screen.getByRole("link", { name: "EULA" })).toHaveAttribute("href", `/${locale}/eula`);
    expect(screen.getByRole("table")).toBeInTheDocument();
    // FAQ: filtered by subject, checked by content (CCO #1216) — not by position.
    const items = copy.faq.items as MuedvoxFaqItem[];
    for (const item of items) {
      if (item.requires) expect(screen.queryByText(item.question)).not.toBeInTheDocument();
      else expect(screen.getByText(item.question)).toBeInTheDocument();
    }
    // Three modes, the build's values (mued-vox main, docs/mvp-listening-guide.md).
    expect(screen.getAllByRole("row")).toHaveLength(4); // header + Track / Track Short / Live
    expect(screen.getByText(copy.modes.render.latency)).toBeInTheDocument();
    expect(screen.getByText(copy.modes.track.latency)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/3–40|3〜40/);
  });

  it("FAQ subjects: the key / refund answers need purchase, the demo answer needs the demo (open = control)", () => {
    for (const messages of [en, ja]) {
      const items = messages.muedvox.faq.items as MuedvoxFaqItem[];
      const byId = (open: { purchase: boolean; demo: boolean }) => visibleFaq(items, open).map((i) => i.id);
      expect(byId({ purchase: false, demo: false })).toEqual(["latency", "windows", "protools", "input", "voice", "presets"]);
      expect(byId({ purchase: true, demo: false })).toEqual(["latency", "windows", "protools", "input", "voice", "presets", "license", "refund"]);
      expect(byId({ purchase: false, demo: true })).toEqual(["latency", "windows", "protools", "input", "voice", "presets", "demo"]);
      expect(byId({ purchase: true, demo: true })).toHaveLength(9);
    }
  });

  it("is a 404 in production until LIVE; preview and local dev still render (CCO #1216)", async () => {
    expect(config.muedvoxPageVisible(false, "production", "production")).toBe(false);
    expect(config.muedvoxPageVisible(false, "preview", "production")).toBe(true);
    expect(config.muedvoxPageVisible(false, undefined, "development")).toBe(true); // local next dev
    expect(config.muedvoxPageVisible(false, undefined, "production")).toBe(false); // ★missing VERCEL_ENV → closed
    expect(config.muedvoxPageVisible(false, undefined, "test")).toBe(false);
    expect(config.muedvoxPageVisible(true, "production", "production")).toBe(true);
    const before = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    try {
      await expect(MuedvoxPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    } finally {
      if (before === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = before;
    }
  });

  it("excludes MUEDvox from the sitemap", async () => {
    expect((await sitemap()).some(({ url }) => url.includes("/muedvox"))).toBe(false);
  });
});

describe("★launch day: the page mounts MUEDvox's own Buy button and demo form (flags on, in a fixture)", () => {
  it("passes each component MUEDvox's product — its flag, its words, its image, its endpoint — and drops the old consent line", async () => {
    vi.resetModules();
    const seen: Record<string, unknown> = {};
    vi.doMock("@/lib/muedvox/config", async (original) => ({
      ...await original<typeof import("@/lib/muedvox/config")>(),
      MUEDVOX_PURCHASE_LIVE: true, MUEDVOX_DEMO_LIVE: true, MUEDVOX_SCREENSHOT: "/muedvox/screen.webp",
    }));
    vi.doMock("@/components/features/muedsp-landing/masterchain-buy-button", () => ({
      PaidBuyButton: (props: { product: unknown; buyLabel: string }) => { seen.buy = props; return <button>{props.buyLabel}</button>; },
    }));
    vi.doMock("@/components/features/muedsp-landing/masterchain-try", () => ({
      PaidDemoForm: (props: { product: unknown }) => { seen.demo = props; return <form id="demo" />; },
    }));
    const { MuedvoxLandingContent: Live } = await import("@/components/features/muedvox-landing/muedvox-landing-content");
    state.locale = "en";
    const { container } = render(<Live />);
    expect(seen.buy).toEqual({
      product: { key: "muedvox", purchaseLive: true, cartThumb: "/muedvox/screen.webp", messages: "muedvox.cart" },
      buyLabel: enVox.buy.button,
    });
    expect(seen.demo).toEqual({
      product: { key: "muedvox", demoLive: true, endpoint: "/api/muedvox/demo", messages: { form: "muedvox.demoForm", demo: "muedvox.demoForm", windows: "muedvox.demoForm" } },
    });
    expect(screen.getByRole("button", { name: enVox.buy.button })).toBeInTheDocument();
    expect(container.querySelector("form#demo")).not.toBeNull(); // the hero's "Try the demo" lands here
    // The cart's button is the EULA consent now; a second, unlinked consent line beside Buy is gone.
    expect(container.textContent).not.toContain(enVox.buy.consent);
    vi.doUnmock("@/lib/muedvox/config");
    vi.doUnmock("@/components/features/muedsp-landing/masterchain-buy-button");
    vi.doUnmock("@/components/features/muedsp-landing/masterchain-try");
  });
});

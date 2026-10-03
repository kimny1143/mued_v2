import { cleanup, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import * as config from "@/lib/muedvox/config";
import { MuedvoxLandingContent } from "@/components/features/muedvox-landing";
import MuedvoxPage, { generateMetadata, generateStaticParams } from "@/app/[locale]/muedvox/page";
import sitemap from "@/app/sitemap";

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
    const { container } = render(await MuedvoxPage({ params }));
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
    expect(screen.getByText(copy.faq.items[2].answer)).toBeInTheDocument();
  });

  it("excludes MUEDvox from the sitemap", async () => {
    expect((await sitemap()).some(({ url }) => url.includes("/muedvox"))).toBe(false);
  });
});

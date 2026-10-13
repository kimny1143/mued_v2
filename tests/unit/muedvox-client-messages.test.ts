// @vitest-environment node
/**
 * Before LIVE, MUEDvox's copy must not ride in the HTML of other pages. The page itself answers 404
 * (muedvox-page-staged.test.tsx), but NextIntlClientProvider serialises every namespace it is given into every
 * page — measured on production 2026-10-13: /ja, /ja/muedsp, /en/eula and /ja/tokushoho each carried the whole
 * `muedvox` namespace (price, modes, latency figures).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import { clientMessages, muedvoxPageVisible, MUEDVOX_LIVE } from "@/lib/muedvox/config";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(path).isDirectory() ? filesUnder(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("★MUEDvox's copy stays out of the browser payload until the page is visible", () => {
  it.each([["en", en], ["ja", ja]] as const)("%s: not visible → the muedvox namespace is gone, nothing else changes", (_locale, messages) => {
    expect(JSON.stringify(messages)).toContain(messages.muedvox.hero.title); // positive control: it is there to remove
    const sent = clientMessages(messages, false);
    expect("muedvox" in sent).toBe(false);
    expect(JSON.stringify(sent)).not.toContain(messages.muedvox.hero.title);
    expect(JSON.stringify(sent)).not.toContain(messages.muedvox.buy.price);
    const { muedvox: _removed, ...rest } = messages;
    void _removed;
    expect(sent).toEqual(rest);
  });

  it("visible (LIVE, a Vercel preview, local dev) → every namespace, untouched", () => {
    expect(clientMessages(en, true)).toBe(en);
  });

  it("★the default follows the page's own condition: production before LIVE strips, a preview does not", () => {
    const before = { VERCEL_ENV: process.env.VERCEL_ENV, NODE_ENV: process.env.NODE_ENV };
    const env = process.env as Record<string, string | undefined>;
    try {
      env.VERCEL_ENV = "production";
      env.NODE_ENV = "production";
      expect("muedvox" in clientMessages(en)).toBe(muedvoxPageVisible(MUEDVOX_LIVE, "production", "production"));
      env.VERCEL_ENV = "preview";
      expect("muedvox" in clientMessages(en)).toBe(true);
    } finally {
      env.VERCEL_ENV = before.VERCEL_ENV;
      env.NODE_ENV = before.NODE_ENV;
    }
  });

  it("★every place that hands messages to the browser goes through clientMessages", () => {
    // Population by search, not by a list: a new layout with its own provider is found here.
    const providers = [...filesUnder("app"), ...filesUnder("components")].filter((file) => /<NextIntlClientProvider\b/.test(readFileSync(file, "utf8")));
    expect(providers.length).toBeGreaterThanOrEqual(3); // app/[locale], app/dashboard, app/lobe
    for (const file of providers) {
      const source = readFileSync(file, "utf8");
      const tags = source.match(/<NextIntlClientProvider\b[^>]*>/g) ?? [];
      for (const tag of tags) expect(tag, file).toMatch(/messages=\{clientMessages\(messages\)\}/);
    }
  });

  it("★no client component reads the muedvox namespace — it would render keys once the namespace is stripped", () => {
    const readers = [...filesUnder("app"), ...filesUnder("components")].filter((file) => {
      const source = readFileSync(file, "utf8");
      return /useTranslations\(\s*["'`]muedvox/.test(source) && /^\s*["']use client["']/m.test(source);
    });
    expect(readers).toEqual([]);
  });
});

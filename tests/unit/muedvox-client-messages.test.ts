// @vitest-environment node
/**
 * Before LIVE, MUEDvox's copy must not reach the browser by any road. The page itself answers 404
 * (muedvox-page-staged.test.tsx), but two other roads carried the whole namespace — price, modes, latency
 * figures — to every visitor (measured on production 2026-10-13):
 *   1. the HTML: NextIntlClientProvider serialises every namespace it is given into every page;
 *   2. a JS chunk: client modules import messages/{en,ja}.json whole (CCO #1268).
 * Road 2 is closed by WHERE the words live (their own files, read only on the server); road 1 by clientMessages().
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import enVox from "@/messages/muedvox.en.json";
import jaVox from "@/messages/muedvox.ja.json";
import { clientMessages, muedvoxPageVisible, MUEDVOX_LIVE } from "@/lib/muedvox/config";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(path).isDirectory() ? filesUnder(path) : /\.(tsx?|mjs)$/.test(name) ? [path] : [];
  });
}
const SOURCES = ["app", "components", "lib", "hooks"].flatMap((dir) => { try { return filesUnder(dir); } catch { return []; } });

/** Every string value in a messages object. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
}

describe("★road 2 — the JS chunks: MUEDvox's words are not in the files client modules import", () => {
  it.each([["en", en, enVox], ["ja", ja, jaVox]] as const)("%s: messages/<locale>.json has no muedvox namespace and none of its sentences", (_locale, main, vox) => {
    expect("muedvox" in main).toBe(false);
    const shipped = JSON.stringify(main);
    // Sentences only (a bare "MUEDvox" or "Windows" is not the unreleased copy); positive control: there are many.
    // ★`cart` and `demoForm` are left out of the population on purpose: they are masterchain's already-public cart
    //   and demo-form sentences, word for word (tests/unit/muedvox-launch-gates.test.ts pins that), so finding
    //   them in the main file says nothing about MUEDvox. Everything else in the file is MUEDvox's own copy.
    const { cart: _cart, demoForm: _demoForm, ...own } = vox;
    void _cart; void _demoForm;
    const sentences = strings(own).filter((text) => text.length >= 20);
    expect(sentences.length).toBeGreaterThan(20);
    for (const text of sentences) expect(shipped.includes(JSON.stringify(text).slice(1, -1)), text).toBe(false);
  });

  it("★only the server's request config imports the MUEDvox message files", () => {
    const importers = SOURCES.filter((file) => /messages\/muedvox\./.test(readFileSync(file, "utf8")) && !/^lib\/muedvox\/config\.ts$/.test(file));
    expect(importers).toEqual(["lib/i18n/request.ts"]);
    expect(readFileSync("lib/i18n/request.ts", "utf8")).not.toMatch(/^\s*["']use client["']/m);
  });

  it("positive control: client modules really do import the main files whole — that is why the words moved", () => {
    const wholeImporters = SOURCES.filter((file) => {
      const source = readFileSync(file, "utf8");
      return /^\s*["']use client["']/m.test(source) && /from ["'][^"']*messages\/(en|ja)\.json["']/.test(source);
    });
    expect(wholeImporters).toContain("lib/i18n/locale-context.tsx");
  });
});

describe("★road 1 — the HTML: the namespace is not handed to the browser until the page is visible", () => {
  const server = { ...en, muedvox: enVox }; // what lib/i18n/request.ts returns

  it("not visible → the muedvox namespace is gone, nothing else changes", () => {
    const sent = clientMessages(server, false);
    expect("muedvox" in sent).toBe(false);
    expect(JSON.stringify(sent)).not.toContain(enVox.hero.title);
    expect(JSON.stringify(sent)).not.toContain(enVox.buy.price);
    expect(sent).toEqual(en);
  });

  it("visible (LIVE, a Vercel preview, local dev) → every namespace, untouched", () => {
    expect(clientMessages(server, true)).toBe(server);
  });

  it("★the default follows the page's own condition: production before LIVE strips, a preview does not", () => {
    const env = process.env as Record<string, string | undefined>;
    const before = { VERCEL_ENV: env.VERCEL_ENV, NODE_ENV: env.NODE_ENV };
    try {
      env.VERCEL_ENV = "production";
      env.NODE_ENV = "production";
      expect("muedvox" in clientMessages(server)).toBe(muedvoxPageVisible(MUEDVOX_LIVE, "production", "production"));
      env.VERCEL_ENV = "preview";
      expect("muedvox" in clientMessages(server)).toBe(true);
    } finally {
      env.VERCEL_ENV = before.VERCEL_ENV;
      env.NODE_ENV = before.NODE_ENV;
    }
  });

  it("★every place that hands messages to the browser goes through clientMessages", () => {
    // Population by search, not by a list: a new layout with its own provider is found here.
    const providers = SOURCES.filter((file) => /<NextIntlClientProvider\b/.test(readFileSync(file, "utf8")));
    expect(providers.length).toBeGreaterThanOrEqual(3); // app/[locale], app/dashboard, app/lobe
    for (const file of providers) {
      const tags = readFileSync(file, "utf8").match(/<NextIntlClientProvider\b[^>]*>/g) ?? [];
      for (const tag of tags) expect(tag, file).toMatch(/messages=\{clientMessages\(messages\)\}/);
    }
  });

  it("the server still has the words: request config joins the namespace back for the page", () => {
    expect(readFileSync("lib/i18n/request.ts", "utf8")).toMatch(/messages: \{ \.\.\.main\.default, muedvox: muedvox\.default \}/);
    expect(Object.keys(enVox)).toEqual(Object.keys(jaVox));
  });
});

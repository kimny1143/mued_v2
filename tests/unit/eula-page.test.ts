import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEulaContent } from "@/lib/legal/eula-content";

const ROOT = process.cwd();
const PAGE = join(ROOT, "app", "[locale]", "eula", "page.tsx");

function leafKeyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("staged EULA page", () => {
  it.each(["ja", "en"] as const)("exists for %s and renders the message-backed placeholder", (locale) => {
    expect(existsSync(PAGE)).toBe(true);
    const page = readFileSync(PAGE, "utf8");
    const messages = JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8"));

    expect(page).toContain('useTranslations("eula")');
    expect(page).toContain("locales.map((locale) => ({ locale }))");
    expect(messages.eula).toEqual(expect.objectContaining({
      title: expect.any(String),
      lastUpdated: expect.any(String),
      sections: {
        status: { heading: expect.any(String), body: expect.any(String) },
        agreement: { heading: expect.any(String), body: expect.any(String) },
        contact: { heading: expect.any(String), body: expect.any(String) },
      },
    }));
    expect(messages.eula).not.toHaveProperty("body");
    expect(JSON.stringify(messages.eula).toLowerCase()).toMatch(
      locale === "ja" ? /プレースホルダー/ : /placeholder/,
    );
  });

  it("keeps the Japanese and English EULA key sets identical", () => {
    const ja = JSON.parse(readFileSync(join(ROOT, "messages", "ja.json"), "utf8")).eula;
    const en = JSON.parse(readFileSync(join(ROOT, "messages", "en.json"), "utf8")).eula;

    expect(leafKeyPaths(ja).sort()).toEqual(leafKeyPaths(en).sort());
  });

  it("★carries the article container in both locales, parses, and keeps ja/en in step", () => {
    const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).eula;
    const ja = load("ja");
    const en = load("en");
    for (const e of [ja, en]) {
      expect(typeof e.effectiveDate).toBe("string");
      expect(Array.isArray(e.intro)).toBe(true);
      expect(Array.isArray(e.articles)).toBe(true);
      // The real messages must parse — the page does the same at build time.
      expect(() => parseEulaContent(e)).not.toThrow();
    }
    // ★A clause present in one language only must fail here, not ship.
    expect(ja.articles.length).toBe(en.articles.length);
    expect(ja.intro.length).toBe(en.intro.length);
  });

  it("renders from parsed nodes, never raw HTML", () => {
    const page = readFileSync(PAGE, "utf8");
    const body = readFileSync(join(ROOT, "components", "legal", "eula-body.tsx"), "utf8");
    for (const src of [page, body]) expect(src).not.toContain("dangerouslySetInnerHTML");
    expect(page).toContain("parseEulaContent(");
    // ★The version shown is the one recorded at checkout, not a second copy in messages.
    expect(page).toContain('import { EULA_VERSION } from "@/lib/legal/eula"');
  });

  it("mirrors /learn staging: noindex before live and sitemap inclusion only after live", () => {
    const page = readFileSync(PAGE, "utf8");
    const sitemap = readFileSync(join(ROOT, "app", "sitemap.ts"), "utf8");
    const config = readFileSync(join(ROOT, "lib", "legal", "config.ts"), "utf8");

    expect(config).toContain('process.env.EULA_LIVE === "1"');
    expect(page).toContain("robots: { index: EULA_LIVE, follow: EULA_LIVE }");
    expect(sitemap).toContain("...(EULA_LIVE");
    expect(sitemap).toContain("`${MUED}/en/eula`");
    expect(sitemap).toContain("`${MUED}/ja/eula`");
  });

  it("uses a documented build-inlined public flag for the client consent gate", () => {
    const control = readFileSync(
      join(ROOT, "components", "features", "muedsp-landing", "masterchain-purchase-control.tsx"),
      "utf8",
    );

    expect(control).toContain('process.env.NEXT_PUBLIC_EULA_LIVE === "1"');
    expect(control).not.toContain("process.env.EULA_LIVE");
    expect(control).toContain("Client gate: NEXT_PUBLIC_EULA_LIVE");
  });
});

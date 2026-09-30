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
  it.each(["ja", "en"] as const)("exists for %s and carries the EULA text — no placeholder copy left", (locale) => {
    expect(existsSync(PAGE)).toBe(true);
    const page = readFileSync(PAGE, "utf8");
    const messages = JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8"));

    expect(page).toContain('useTranslations("eula")');
    expect(page).toContain("locales.map((locale) => ({ locale }))");
    // ★Exactly the four keys the page reads. The staging placeholder (lastUpdated / sections) was
    //   removed with the provisional text (2026-09-30); it was not rendered, but it still shipped in
    //   the page payload, and a legal page should not carry "this is a placeholder" in any form.
    expect(Object.keys(messages.eula).sort()).toEqual(["articles", "effectiveDate", "intro", "title"]);
    expect(messages.eula.articles.length).toBeGreaterThan(0);
    expect(JSON.stringify(messages.eula).toLowerCase()).not.toMatch(/プレースホルダー|placeholder/);
    // ★Empty text fails the static build instead of rendering a fallback.
    expect(page).toContain("the EULA page must not render without its text");
    expect(page).not.toContain("PlaceholderSections");
  });

  it("★the effective date is the launch day, written exactly as in dsp's installer RTF", () => {
    // ★Same version (2026.09) must mean the same text on the web and in the installer. dsp filled the
    //   RTF's [発売日] as below and baked it into the 1.0.0 builds (conductor 2026-09-30), so the web
    //   copies the strings verbatim instead of formatting a date (a formatter could drift from them).
    const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).eula;
    expect(load("ja").effectiveDate).toBe("2026年9月30日");
    expect(load("en").effectiveDate).toBe("September 30, 2026");
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
      // ★Absent until decided — never "" (messages hold no empty strings; see translations.test.ts).
      if ("effectiveDate" in e) expect(e.effectiveDate.trim()).not.toBe("");
      expect(Array.isArray(e.intro)).toBe(true);
      expect(Array.isArray(e.articles)).toBe(true);
      // The real messages must parse — the page does the same at build time.
      expect(() => parseEulaContent(e)).not.toThrow();
    }
    // ★A clause present in one language only must fail here, not ship.
    expect(ja.articles.length).toBe(en.articles.length);
    expect(ja.intro.length).toBe(en.intro.length);
  });

  it("★keeps ja/en in step inside each article: block kinds, block count and list item counts", () => {
    // Article count alone lets a dropped bullet or a merged paragraph through in one language
    // (CCO review of #1134, finding B). The Japanese text prevails (art. 15), so a one-sided
    // difference is a difference in the contract, not in wording.
    const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).eula;
    type Block = string | { ul: string[] } | { ol: string[] };
    const shape = (blocks: Block[]) =>
      blocks.map((b) => (typeof b === "string" ? "p" : "ul" in b ? `ul:${b.ul.length}` : `ol:${b.ol.length}`));
    const [ja, en] = [load("ja"), load("en")];
    expect(shape(ja.intro)).toEqual(shape(en.intro));
    ja.articles.forEach((article: { heading: string; blocks: Block[] }, i: number) => {
      expect(shape(article.blocks), `${article.heading} ↔ ${en.articles[i]?.heading}`).toEqual(
        shape(en.articles[i].blocks),
      );
    });
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

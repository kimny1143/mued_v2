/**
 * Unit — the EULA container's parsers (lib/legal/eula-content.ts).
 *
 * ★The fixtures here are deliberately NOT legal wording ("Article 3 body"). The container is tested for
 * shape, so a real clause cannot leak into the repo through a test, and nobody mistakes a fixture for
 * the agreement.
 */
import { describe, it, expect } from "vitest";
import { isExternalHref, parseEulaContent, parseInline } from "@/lib/legal/eula-content";

describe("parseInline", () => {
  it("plain text stays one text node", () => {
    expect(parseInline("Article 1 body")).toEqual([{ type: "text", value: "Article 1 body" }]);
  });

  it("**bold** becomes a bold node", () => {
    expect(parseInline("a **b** c")).toEqual([
      { type: "text", value: "a " },
      { type: "bold", value: "b" },
      { type: "text", value: " c" },
    ]);
  });

  it("an unmatched ** stays literal text (never swallows the rest of the clause)", () => {
    expect(parseInline("a **b** c **d")).toEqual([
      { type: "text", value: "a " },
      { type: "bold", value: "b" },
      { type: "text", value: " c **d" },
    ]);
    expect(parseInline("only ** one")).toEqual([{ type: "text", value: "only ** one" }]);
  });

  it("links bare https URLs and leaves trailing punctuation outside the link", () => {
    expect(parseInline("see (https://mued.jp/en/refund). Then")).toEqual([
      { type: "text", value: "see (" },
      { type: "link", href: "https://mued.jp/en/refund", value: "https://mued.jp/en/refund" },
      { type: "text", value: "). Then" },
    ]);
    expect(parseInline("at https://mued.jp")).toEqual([
      { type: "text", value: "at " },
      { type: "link", href: "https://mued.jp", value: "https://mued.jp" },
    ]);
  });

  it("links a bare email address as mailto", () => {
    expect(parseInline("Email: support@mued.jp")).toEqual([
      { type: "text", value: "Email: " },
      { type: "link", href: "mailto:support@mued.jp", value: "support@mued.jp" },
    ]);
  });

  it("\\n becomes a line break (the address block in the last article)", () => {
    expect(parseInline("Company\nEmail: x")).toEqual([
      { type: "text", value: "Company" },
      { type: "break" },
      { type: "text", value: "Email: x" },
    ]);
  });

  it("mixes bold, links and breaks", () => {
    expect(parseInline("**Label.** see https://example.com/a\nnext")).toEqual([
      { type: "bold", value: "Label." },
      { type: "text", value: " see " },
      { type: "link", href: "https://example.com/a", value: "https://example.com/a" },
      { type: "break" },
      { type: "text", value: "next" },
    ]);
  });

  it("does not interpret HTML — it stays text", () => {
    expect(parseInline("<b>x</b>")).toEqual([{ type: "text", value: "<b>x</b>" }]);
  });
});

describe("isExternalHref", () => {
  it("mued.jp stays in place; other sites open in a new tab; mailto is not external", () => {
    expect(isExternalHref("https://mued.jp/en/refund")).toBe(false);
    expect(isExternalHref("https://www.mued.jp/")).toBe(false);
    expect(isExternalHref("https://mued.jp.evil.example/")).toBe(true);
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("mailto:support@mued.jp")).toBe(false);
  });
});

const sixteen = Array.from({ length: 16 }, (_, i) => ({
  heading: `${i + 1}. Heading ${i + 1}`,
  blocks: [`Article ${i + 1} body`],
}));

describe("parseEulaContent", () => {
  it("accepts the empty container with no effectiveDate key (= today's state: text not supplied yet)", () => {
    expect(parseEulaContent({ intro: [], articles: [] })).toEqual({ intro: [], articles: [] });
  });

  it("accepts 16 articles with every block kind", () => {
    const articles = sixteen.map((a, i) =>
      i === 2 ? { ...a, blocks: ["Article 3 body", { ul: ["**Item.** one", "two"] }] }
        : i === 5 ? { ...a, blocks: ["Article 6 body", { ol: ["one", "two"] }] }
          : a,
    );
    const parsed = parseEulaContent({ intro: ["Intro body"], articles, effectiveDate: "2026-10-01" });
    expect(parsed.articles).toHaveLength(16);
    expect(parsed.articles[2].blocks[1]).toEqual({ ul: ["**Item.** one", "two"] });
    expect(parsed.articles[5].blocks[1]).toEqual({ ol: ["one", "two"] });
    expect(parsed.effectiveDate).toBe("2026-10-01");
  });

  it.each([
    ["articles not an array", { intro: [], articles: {} }],
    ["intro not an array", { intro: "x", articles: [] }],
    ["effectiveDate not a string", { intro: [], articles: [], effectiveDate: null }],
    // ★"Not set" is the key being absent. An empty string is rejected: messages must hold no empty
    //   strings (tests/unit/lib/i18n/translations.test.ts), which is what broke #1132.
    ["effectiveDate empty string", { intro: [], articles: [], effectiveDate: "" }],
    ["empty heading", { intro: [], articles: [{ heading: " ", blocks: ["x"] }] }],
    ["article with no blocks", { intro: [], articles: [{ heading: "1. H", blocks: [] }] }],
    ["unknown article key", { intro: [], articles: [{ heading: "1. H", blocks: ["x"], body: "y" }] }],
    ["unknown block key", { intro: [], articles: [{ heading: "1. H", blocks: [{ table: ["x"] }] }] }],
    ["two keys in one block", { intro: [], articles: [{ heading: "1. H", blocks: [{ ul: ["a"], ol: ["b"] }] }] }],
    ["empty list", { intro: [], articles: [{ heading: "1. H", blocks: [{ ul: [] }] }] }],
    ["non-string list item", { intro: [], articles: [{ heading: "1. H", blocks: [{ ol: [1] }] }] }],
    ["empty paragraph", { intro: [""], articles: [] }],
  ])("★throws on %s (a dropped clause must fail the build, not vanish)", (_name, raw) => {
    expect(() => parseEulaContent(raw as never)).toThrow(/\[eula\]/);
  });
});

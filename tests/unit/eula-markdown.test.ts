import { describe, it, expect } from "vitest";
import { eulaFromMarkdown } from "@/lib/legal/eula-markdown";
import { parseEulaContent } from "@/lib/legal/eula-content";

// The draft's real shape, cut down: title, version + effective-date lines, intro, and articles with
// every block kind (paragraph, bullets, numbers, a multi-line address block).
const DRAFT = `# MUEDsp エンドユーザー使用許諾契約

Version 2026.09
施行日: 2026年9月30日

本契約は、お客様と当社との間の契約です。

## 1. 定義

- **「本ソフトウェア」**: MUEDsp プラグインをいいます。
- **「有料版」**: MUEDsp masterchain をいいます。

## 6. 禁止事項

お客様は、次のことをしてはなりません。

1. 逆コンパイル
2. 改変

## 16. お問い合わせ

株式会社グラスワークス（glasswerks inc.）
メール: support@mued.jp
`;

describe("eulaFromMarkdown", () => {
  it("converts the draft shape; the version line is dropped and the date line becomes effectiveDate", () => {
    const out = eulaFromMarkdown(DRAFT);
    expect(out.title).toBe("MUEDsp エンドユーザー使用許諾契約");
    expect(out.version).toBe("2026.09");
    expect(out.intro).toEqual(["本契約は、お客様と当社との間の契約です。"]);
    expect(out.articles).toEqual([
      { heading: "1. 定義", blocks: [{ ul: ["**「本ソフトウェア」**: MUEDsp プラグインをいいます。", "**「有料版」**: MUEDsp masterchain をいいます。"] }] },
      { heading: "6. 禁止事項", blocks: ["お客様は、次のことをしてはなりません。", { ol: ["逆コンパイル", "改変"] }] },
      { heading: "16. お問い合わせ", blocks: ["株式会社グラスワークス（glasswerks inc.）\nメール: support@mued.jp"] },
    ]);
    // ★The date line leaves the body and becomes effectiveDate (verbatim).
    expect(out.effectiveDate).toBe("2026年9月30日");
    expect(JSON.stringify(out.articles)).not.toContain("2026年9月30日");
    // ★The output is exactly what the page's strict parser accepts.
    expect(() => parseEulaContent({ intro: out.intro, articles: out.articles })).not.toThrow();
  });

  it("accepts CRLF line endings", () => {
    expect(eulaFromMarkdown(DRAFT.replace(/\n/g, "\r\n"))).toEqual(eulaFromMarkdown(DRAFT));
  });

  // ★Each of these would otherwise ship as literal characters in a legal text.
  it.each([
    ["a Markdown link", "詳しくは [こちら](https://mued.jp) へ。"],
    ["a placeholder left in the body", "施行日は [発売日] とします。"],
    ["HTML", "<b>重要</b>"],
    ["a nested list", "- 親\n  - 子"],
    ["a table", "| a | b |"],
    ["a third-level heading", "### 小見出し"],
  ])("throws on %s", (_label, body) => {
    expect(() => eulaFromMarkdown(`# T\n\nVersion 1\n\n## 1. A\n\n${body}\n`)).toThrow(/eula-markdown/);
  });

  it("throws on a skipped number (a dropped clause in a numbered list)", () => {
    expect(() => eulaFromMarkdown("# T\n\nVersion 1\n\n## 1. A\n\n1. a\n3. c\n")).toThrow(/expected 2/);
  });

  it("the Version line is optional (dsp's English text has none — the version is EULA_VERSION)", () => {
    const out = eulaFromMarkdown("# T\n\n## 1. A\n\ntext\n");
    expect(out.version).toBeUndefined();
    expect(out.articles).toHaveLength(1);
  });

  it.each([
    ["Last updated: October 1, 2026", "October 1, 2026"],
    ["Effective date: October 1, 2026", "October 1, 2026"],
    ["施行日: 2026年10月1日", "2026年10月1日"],
  ])("★the date line becomes effectiveDate verbatim: %s", (line, date) => {
    const out = eulaFromMarkdown(`# T\n\n${line}\n\n## 1. A\n\ntext\n`);
    expect(out.effectiveDate).toBe(date);
    expect(JSON.stringify(out.articles)).not.toContain(date); // dropped from the body
  });

  it("★an unfilled [DATE] is an error, never a date", () => {
    expect(() => eulaFromMarkdown("# T\n\nLast updated: [DATE]\n\n## 1. A\n\ntext\n")).toThrow(/placeholder/);
  });

  it("throws on an article with no text", () => {
    expect(() => eulaFromMarkdown("# T\n\nVersion 1\n\n## 1. A\n\n## 2. B\n\ntext\n")).toThrow(/without text/);
  });
});

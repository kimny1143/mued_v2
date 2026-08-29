/**
 * Unit — the Japanese-subject detector behind `resend.welcome_ja_delivered` (insight課, 2026-08-29).
 *
 * ★WHY A TEST AND NOT ONLY THE RUNTIME SELF-CHECK. This metric is expected to read 0 for long
 * stretches — conductor's census found zero real-user JA welcome emails across 8/17–8/28, the first on
 * 8/29 — so ★a 0 produced by a broken detector is indistinguishable from a 0 produced by an unused
 * surface. Nothing downstream would notice. The collector's runtime check turns the field to `null`
 * rather than 0 when it detects that, but the runtime check only runs once a day in CI-less cron; this
 * file is what fails a pull request before it merges.
 *
 * ★A character-range typo is the specific accident being guarded: `/[ぁ-んァ-ヶ一-龠]/` is easy to get
 * wrong in a way that either matches nothing (silent 0) or matches everything (silent inflation), and
 * both look plausible in a diff. So the assertions come in pairs — something that must match, and
 * something that must not.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = readFileSync(join(process.cwd(), "scripts", "aggregate-plugin-funnel-daily.ts"), "utf8");

/**
 * The regexes as they are actually written in the collector, rebuilt from source rather than re-typed.
 * ★No `eval`: the pattern and flags are parsed out and handed to the RegExp constructor, which is the
 * same result without executing file contents.
 */
function extract(name: string): RegExp {
  const m = SRC.match(new RegExp(`const ${name} = /(.+?)/([gimsuy]*);`));
  if (!m) throw new Error(`${name} not found in the collector — the test is not measuring it`);
  return new RegExp(m[1], m[2]);
}

// ★Extracted from source, never re-declared here. A copy would let the collector's regex drift while
//   this file kept testing its own — the "test that reimplements the implementation" failure.
const JA = extract("JA_SUBJECT_RE");
const DL = extract("DOWNLOAD_RE");
const isJaWelcome = (s: string) => DL.test(s) && JA.test(s);

describe("JA subject detector", () => {
  it("★the extraction worked (a failed match here would make every assertion below meaningless)", () => {
    expect(JA.source).toContain("ぁ");
    expect(DL.source).toContain("download");
  });

  it("★matches Japanese subjects — hiragana, katakana, kanji", () => {
    expect(JA.test("MUEDriveのダウンロードリンクです")).toBe(true); // hiragana + katakana
    expect(JA.test("ダウンロード")).toBe(true); // katakana only
    expect(JA.test("無料版")).toBe(true); // kanji only
  });

  it("★does NOT match a pure-ASCII subject (a range this wide would inflate silently)", () => {
    expect(JA.test("Your MUEDrive download link")).toBe(false);
    expect(JA.test("MUEDsat 1.0.0")).toBe(false);
    expect(JA.test("")).toBe(false);
  });

  it("★isJaWelcome needs BOTH axes — Japanese text alone is not a welcome email", () => {
    expect(isJaWelcome("MUEDriveのダウンロードリンクです")).toBe(true);
    // ★Japanese, but not a download email — must not be counted.
    expect(isJaWelcome("お知らせ")).toBe(false);
    // ★A download email, but English — belongs to the other side of the axis.
    expect(isJaWelcome("Your MUEDrive download link")).toBe(false);
  });

  it("★counts a JA welcome that names no product (shelf() would call it 'other')", () => {
    // The question is whether the JA surface is used, not which product — so this must count.
    expect(isJaWelcome("ダウンロードのご案内")).toBe(true);
  });

  it("★the collector emits null, not 0, when the detector fails its own check", () => {
    // Source-text guard: the three-value contract is what stops "broken" from reading as "unused",
    // and it is the part a well-meaning simplification would remove first.
    expect(SRC).toContain("welcomeJaDelivered = null");
    expect(SRC).toMatch(/welcome_ja_delivered/);
    expect(SRC).toContain("jaDetectorHealthy");
  });

  it("★the definition travels with the value (as shelf_definition does)", () => {
    expect(SRC).toContain("welcome_ja_definition");
    expect(SRC).toContain("JA_DEFINITION");
  });
});

/**
 * Unit — the legal trio (privacy / support / tokushoho) keeps its cross-links locale-aware, and bare
 * /tokushoho keeps a redirect safety net.
 *
 * Regression guard for a live bug (2026-07-21, found by product課's prod link sweep): the three legal
 * pages cross-linked each other with BARE paths (`<Link href="/tokushoho">`). /privacy and /support had
 * next.config redirects so they merely lost the locale (a JA reader clicking "サポート" on /ja/privacy
 * landed on /en/support), but /tokushoho had none — so the 特定商取引法 disclosure, which a paid service
 * is legally required to publish, was a hard 404 from all four rendered pages (/en|/ja × privacy|support)
 * while /en/tokushoho and /ja/tokushoho themselves returned 200.
 *
 * Every other footer in the repo (advisory / integrated-landing-v2 / muedsp / muedial / muedear) already
 * builds `/${locale}/tokushoho`, so this was the legal trio drifting off the house convention rather than
 * a new pattern. These tests pin the convention at the source level: a source-text guard is what catches
 * the regression class, because a bare `<Link href="/x">` renders and type-checks perfectly fine — only a
 * prod fetch (or this test) can tell it is wrong.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ★包含リストだが、母集団を広げた時に「広げ忘れ」が起きないよう下で assert する。
 * 2026-09-16 に terms / refund を足した: この2面は #1048 で新設され、★当初この配列の外に
 * 在った ∴ cross-link 検査に一度も掛かっていなかった。同じ file の header が /muedrive の
 * 取りこぼしを「registry は filesystem の部分集合にしかなれない」と書いているのに、
 * ★この配列自身が同じ形をしていた。
 */
const LEGAL_PAGES = ["privacy", "support", "tokushoho", "terms", "refund"] as const;

function readPage(page: (typeof LEGAL_PAGES)[number]): string {
  return readFileSync(join(process.cwd(), "app", "[locale]", page, "page.tsx"), "utf8");
}

describe("legal pages — internal links carry the locale", () => {
  it.each(LEGAL_PAGES)("%s/page.tsx has no bare <Link href=\"/…\">", (page) => {
    // `[^>]*` (not `\s+`): href is not necessarily the first attribute, and a negated class also spans
    // newlines, so multi-line JSX is covered. An earlier `<Link\s+href=` version let a NEWLY added
    // `<Link className="…" href="/tokushoho">` through while the sibling-link assertion below still
    // passed on the untouched locale-aware links — i.e. the guard was blind to exactly the case it
    // exists for (product課 review, verified by reintroducing the bug).
    const bare = [...readPage(page).matchAll(/<Link[^>]*href="(\/[^"]*)"/g)].map((m) => m[1]);
    // A bare internal href drops the locale (best case) or 404s (worst case — see the header comment).
    expect(bare).toEqual([]);
  });

  it.each(LEGAL_PAGES)("%s/page.tsx links its siblings + home under /${locale}", (page) => {
    const src = readPage(page);
    const siblings = LEGAL_PAGES.filter((p) => p !== page);
    for (const sibling of siblings) {
      expect(src).toContain("`/${locale}/" + sibling + "`");
    }
    expect(src).toContain("<BrandHeader locale={locale}");
    const header = readFileSync(join(process.cwd(), "components/brand/brand-header.tsx"), "utf8");
    expect(header).toContain("href={`/${locale}`}"); // shared MUED home link
    expect(header).toContain("href={`/${locale}/support`}");
  });
});

describe("LEGAL_PAGES — 母集団そのものを測る", () => {
  it("★MoR を宣言している locale page は全部 LEGAL_PAGES に入っている", () => {
    // ★包含リストの弱点は「足し忘れ」。それを検出できる、リストに依存しない述語を1つ置く:
    // MoR の2行（販売事業者 / 提供者）を描画している面は、法定表記の面である ∴ cross-link の
    // 対象。messages 側から機械的に引くので、6つ目の legal page を足した日に ここが落ちる。
    const ja = JSON.parse(readFileSync(join(process.cwd(), "messages", "ja.json"), "utf8"));
    const declaresMor = Object.entries(ja as Record<string, unknown>)
      .filter(([, v]) => {
        const mor = (v as { mor?: { seller?: unknown } } | null)?.mor;
        return typeof mor?.seller === "string";
      })
      .map(([k]) => k)
      .sort();

    // ★陽性control: 空なら下の比較が無意味（走っていないのと同じ）
    expect(declaresMor.length).toBeGreaterThan(0);

    const missing = declaresMor.filter((ns) => !(LEGAL_PAGES as readonly string[]).includes(ns));
    expect(
      missing,
      `MoR を宣言しているのに LEGAL_PAGES に無い: ${missing.join(", ")} — cross-link 検査の母集団外`,
    ).toEqual([]);
  });

  it("★LEGAL_PAGES の全要素が実在する locale page である", () => {
    for (const page of LEGAL_PAGES) {
      expect(existsSync(join(process.cwd(), "app", "[locale]", page, "page.tsx")), `${page} が無い`).toBe(true);
    }
  });
});

describe("next.config — bare /tokushoho safety net", () => {
  it("redirects /tokushoho → /en/tokushoho, temporarily (307)", async () => {
    const { default: config } = await import("@/next.config");
    const redirects = await config.redirects!();
    const tokushoho = redirects.find((r) => r.source === "/tokushoho");

    expect(tokushoho).toBeDefined();
    expect(tokushoho!.destination).toBe("/en/tokushoho");
    // Temporary, like the locale-symmetric product pages (#717) and unlike the EN-primary /privacy:
    // a permanently-cached EN target would be a liability for a JA-audience legal disclosure.
    expect(tokushoho!.permanent).toBe(false);
  });

  it("keeps the sibling legal redirects intact", async () => {
    const { default: config } = await import("@/next.config");
    const sources = (await config.redirects!()).map((r) => r.source);
    expect(sources).toEqual(expect.arrayContaining(["/privacy", "/support", "/tokushoho"]));
  });
});

/**
 * The two pages added for FastSpring store activation. Pinned separately from LEGAL_PAGES above because
 * that list still holds the original trio: these two are NOT yet in it, so the cross-link assertions do
 * not cover them. That is tracked, not forgotten — see docs/status-blockers.md (0x). Expanding the list
 * means every legal page must link every other one, which is a copy change to privacy/support/tokushoho
 * and belongs with the /tokushoho revision that kimny eyeballs, not here.
 *
 * What IS enforced here is the part that blocks checkout: FastSpring's dashboard cites these URLs once
 * and then serves them to every buyer, so a bare path that 404s is a store failure. Their absence was
 * caught by locale-page-bare-paths.test.ts, whose population is the filesystem rather than a list.
 */
describe("next.config — bare /terms + /refund (FastSpring activation)", () => {
  it.each(["terms", "refund"])("redirects /%s to its /en page, temporarily (307)", async (page) => {
    const { default: config } = await import("@/next.config");
    const hit = (await config.redirects!()).find((r) => r.source === `/${page}`);

    expect(hit, `bare /${page} has no redirect — FastSpring buyers would hit a 404`).toBeDefined();
    expect(hit!.destination).toBe(`/en/${page}`);
    // Temporary for the same reason as /tokushoho: the legal set is locale-symmetric, so a permanently
    // cached EN target would be a liability once these are made locale-aware.
    expect(hit!.permanent).toBe(false);
  });

  it("the pages the redirects point at actually exist", () => {
    // Otherwise the assertions above are satisfied by a redirect into a 404.
    for (const page of ["terms", "refund"]) {
      expect(existsSync(join(process.cwd(), "app", "[locale]", page, "page.tsx")), `${page} page missing`).toBe(true);
    }
    // Negative control: the same check must fail for a page that was never created.
    expect(existsSync(join(process.cwd(), "app", "[locale]", "zzz-nonexistent", "page.tsx"))).toBe(false);
  });
});

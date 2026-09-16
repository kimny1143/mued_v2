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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ★包含リストだが、母集団を広げた時に「広げ忘れ」が起きないよう下で assert する。
 * 2026-09-16 に terms / refund を足した: この2面は #1048 で新設され、★当初この配列の外に
 * 在った ∴ cross-link 検査に一度も掛かっていなかった。同じ file の header が /muedrive の
 * 取りこぼしを「registry は filesystem の部分集合にしかなれない」と書いているのに、
 * ★この配列自身が同じ形をしていた。
 */
const LEGAL_PAGES = ["privacy", "support", "tokushoho", "terms", "refund"] as const;

/**
 * ★locale page のうち「法定表記の面ではない」もの。★理由つきで名指しする。
 *
 * ★なぜ必要か（CCO 指摘・2026-09-16）: 下の MoR 述語は ★(a) `mor` key の形 と ★(b) 逐語 の ★和 だが、
 * ★**両方 同時に 外れるケースが残る** —— ★新しい legal 面が ★別の key 名で ★別の文面で MoR を
 * 宣言したら、★(a) は key 名で落とし ★(b) は文面で落とすので ★どちらも拾わない。
 * ★∴ ★**和は class を閉じていない。狭めただけ。**
 *
 * ★閉じるには母集団の軸を ★filesystem へ移す必要がある ——★それが この表。
 * ★`app/[locale]/*​/page.tsx` の実在から引き、★LEGAL_PAGES と ここ の ★どちらにも無い面は落とす。
 * ★∴ ★**次に legale 面を足す人は、分類するまで CI が通らない**（★黙って母集団の外に出られない）。
 * ★同じ形の前例＝`locale-page-bare-paths.test.ts` の EXEMPT（★あちらも filesystem 由来）。
 *
 * ★★**この軸の射程 ＝ `app/[locale]` の ★直下だけ。★入れ子は見ない**（CCO 実測 2026-09-16・残差3）。
 *   ★`app/[locale]/eula/page.tsx`        … ★落ちる（分類を強制する）
 *   ★★`app/[locale]/legal/eula/page.tsx` … ★★落ちない ——★`legal` 自身に page.tsx が無ければ
 *                                          ★母集団に すら 入らない
 *   ★現に `app/[locale]/story/[slug]/page.tsx` は生きた公開面だが、★`story` に page.tsx が無いので
 *   ★分類の外に在る（★story は legal 面でないので ★今日の実害はゼロ）。
 * ★∴ ★**この軸は「legal 面が depth 1 に在る」ことを仮定する。** ★`/eula` は depth 1 の予定ゆえ足りる。
 * ★**再帰にしない理由**: route segment の意味（`[slug]` / route group / `@slot`）を test が
 *   解釈し始め、★別種の誤りが入る（CCO 推奨）。★入れ子の legal 面を置く日に再帰を入れる
 *   ——★その判断が必要になったことが分かるよう、ここに書いておく。
 *
 * ★/eula は近く足る見込み（EULA 本文が弁護士から届いた時点）。★その時 ここか LEGAL_PAGES の
 * ★どちらかに入れることになる ——★それが この表の主目的。
 */
const NON_LEGAL_LOCALE_PAGES: Record<string, string> = {
  advisory: "サービス紹介（storefront）。法定表記は /tokushoho が担う",
  muedial: "製品 LP。法定表記は /tokushoho が担う",
  muedlim: "製品 LP（無料プラグイン）",
  muedrive: "製品 LP（無料プラグイン）",
  muedsat: "製品 LP（無料プラグイン）",
  muedsp: "製品 LP（プラグイン群のハブ）",
  redesign: "noindex の preview route。公開面ではない（bare-paths 側でも EXEMPT）",
};

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

/**
 * MoR の逐語と、3 面の「関係」。★CCO 指摘で言語化した（設計がどこにも書かれていなかった）。
 *
 *   terms.mor.seller / refund.mor.seller … ★この 2 行 ★そのもの（=== で一致）
 *   tokushoho.mor.value                  … ★同じ 2 行を ★長い文の中に埋め込む（contains で一致）
 *
 * ★∴「3 面で byte 同一」は正確には ★**2 面が逐語 ＋ 1 面が逐語を内包**。
 * ★tokushoho が法定表記の正本で、terms / refund は同じ 2 行を短く掲げる、という設計。
 * ★CCO は `===` で測って「2 面だけ一致」と報告した —— ★どちらの測り方も正しく、
 * ★**差は「内包」を設計として書いていなかったこと**。∴ ここに書く。
 */
const MOR_SELLER = { ja: "販売事業者（Merchant of Record）: FastSpring, Inc.", en: "Seller (Merchant of Record): FastSpring, Inc." } as const;

/**
 * MoR を宣言している top-level namespace 名。★2 つの述語の ★和 で拾う:
 *   (a) ★`mor` オブジェクトを持つ（★CCO 提案。★文面が変わっても拾える）
 *   (b) ★namespace 内のどこかに MoR の逐語が在る（★key 名が `mor` でなくても拾える）
 * ★片方だけだと、それぞれ逆向きの穴が残る:
 *   (a) のみ → ★`mor` 以外の key 名で MoR を出す面を落とす
 *   (b) のみ → ★文面をわずかに変えた面を落とす
 * ★∴ 和にする（★どちらの穴も「検査の外」ではなく「もう一方が拾う」になる）。
 */
function namespacesDeclaringMor(locale: keyof typeof MOR_SELLER): string[] {
  const msgs = JSON.parse(readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8")) as Record<string, unknown>;
  const needle = MOR_SELLER[locale];
  const out: string[] = [];
  for (const [ns, value] of Object.entries(msgs)) {
    // (a) mor オブジェクトの有無
    const mor = (value as { mor?: unknown } | null)?.mor;
    let found = typeof mor === "object" && mor !== null;
    // (b) 逐語の有無（再帰）
    const walk = (node: unknown): void => {
      if (found) return;
      if (typeof node === "string") {
        if (node.includes(needle)) found = true;
      } else if (node && typeof node === "object") {
        for (const v of Object.values(node)) walk(v);
      }
    };
    if (!found) walk(value);
    if (found) out.push(ns);
  }
  return out.sort();
}

describe("LEGAL_PAGES — 母集団そのものを測る", () => {
  it.each(["ja", "en"] as const)("★%s: MoR を宣言している namespace は全部 LEGAL_PAGES に入っている", (locale) => {
    // ★包含リストの弱点は「足し忘れ」。それを検出する、リストに依存しない述語を1つ置く。
    // ★ただし述語の aim を間違えると意味がない: 初版は `mor.seller` の有無で判定しており、
    // ★tokushoho は `mor.value` に逐語を埋めているため ★永久に母集団の外だった（CCO 指摘）。
    // ∴ ★key の形ではなく ★内容で探す。
    const declaring = namespacesDeclaringMor(locale);

    // ★陽性control: 初版は `length > 0` で、★2 件でも通った ＝ under-coverage を検出できない（CCO 指摘）。
    // ★期待する成員を名指しする。3 面のどれかが拾えなくなった日にここが落ちる。
    expect(declaring, `MoR 宣言面の検出が痩せた: ${declaring.join(", ")}`).toEqual(
      expect.arrayContaining(["terms", "refund", "tokushoho"]),
    );

    // ★陰性control: MoR を宣言していない namespace は入っていない（walk が全 string を true にしていない）。
    expect(declaring).not.toContain("muedsp");

    const missing = declaring.filter((ns) => !(LEGAL_PAGES as readonly string[]).includes(ns));
    expect(
      missing,
      `MoR を宣言しているのに LEGAL_PAGES に無い: ${missing.join(", ")} — cross-link 検査の母集団外`,
    ).toEqual([]);
  });

  it("★述語は逐語に依存している（★CCO 提供の control・aim を値の側から確かめる）", () => {
    // ★当課の control は「3 面 返る」を測っていたが、★その 3 面が ★逐語に依存して返っているかは
    // 測っていなかった。★逐語を1文字 崩して検出が空になれば、「何かに当たって 3 面 返している」
    // のではないことが言える（CCO が独立に実施し、ja/en とも空を確認した軸）。
    const broken = { ja: MOR_SELLER.ja.replace("（", "("), en: MOR_SELLER.en.replace("(", "（") } as const;
    for (const locale of ["ja", "en"] as const) {
      const msgs = JSON.parse(readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8")) as Record<string, unknown>;
      const hits: string[] = [];
      for (const [ns, value] of Object.entries(msgs)) {
        let found = false;
        const walk = (n: unknown): void => {
          if (found) return;
          if (typeof n === "string") { if (n.includes(broken[locale])) found = true; }
          else if (n && typeof n === "object") { for (const v of Object.values(n)) walk(v); }
        };
        walk(value);
        if (found) hits.push(ns);
      }
      expect(hits, `${locale}: 崩した逐語が当たった＝述語は逐語に依存していない`).toEqual([]);
    }
    // ★陽性control: 崩していない逐語なら 3 面 当たる（★上の空が「walk が死んでいる」ではない証明）
    expect(namespacesDeclaringMor("ja")).toEqual(expect.arrayContaining(["terms", "refund", "tokushoho"]));
  });

  it("★MoR の逐語は3面で byte 同一（ずれると上の検出が痩せ、表示としても問題になる）", () => {
    for (const locale of ["ja", "en"] as const) {
      const msgs = JSON.parse(readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"));
      const needle = MOR_SELLER[locale];
      expect(msgs.terms.mor.seller, `${locale}: terms`).toBe(needle);
      expect(msgs.refund.mor.seller, `${locale}: refund`).toBe(needle);
      expect(msgs.tokushoho.mor.value, `${locale}: tokushoho`).toContain(needle);
    }
  });

  it("★LEGAL_PAGES の全要素が実在する locale page である", () => {
    for (const page of LEGAL_PAGES) {
      expect(existsSync(join(process.cwd(), "app", "[locale]", page, "page.tsx")), `${page} が無い`).toBe(true);
    }
  });
});

describe("★母集団の軸を filesystem へ ——「分類し忘れ」を落とす", () => {
  const localePages = () =>
    readdirSync(join(process.cwd(), "app", "[locale]"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(process.cwd(), "app", "[locale]", d.name, "page.tsx")))
      .map((d) => d.name)
      .sort();

  it("★母集団が痩せていない（★これが無いと下の分類 test が空で通る）", () => {
    // ★陽性control: 確実に在る 2 面。readdir か filter が壊れた日にここが落ちる。
    // ★`10` の出所: 2026-09-16 の実測が ★12 面。★その下に余裕を取った値で、★面を 3 つ消すと
    // 意図せず落ちる —— ★ただし落ちる向きは正しい（★母集団が痩せたら止まる）。
    expect(localePages().length).toBeGreaterThanOrEqual(10);
    expect(localePages()).toContain("tokushoho");
    expect(localePages()).toContain("muedsp");
  });

  it("★locale page は全部 LEGAL_PAGES か NON_LEGAL のどちらかに分類されている", () => {
    const unclassified = localePages().filter(
      (p) => !(LEGAL_PAGES as readonly string[]).includes(p) && !(p in NON_LEGAL_LOCALE_PAGES),
    );
    expect(
      unclassified,
      `未分類の locale page: ${unclassified.join(", ")} — legal なら LEGAL_PAGES へ、` +
        `そうでなければ NON_LEGAL_LOCALE_PAGES へ理由つきで足すこと（★黙って母集団の外に出さない）`,
    ).toEqual([]);
  });

  it("★NON_LEGAL の要素は実在し、LEGAL_PAGES と重ならない", () => {
    for (const [name, reason] of Object.entries(NON_LEGAL_LOCALE_PAGES)) {
      expect(localePages(), `${name} は NON_LEGAL だが page が無い（stale）`).toContain(name);
      expect(reason.length, `${name} の理由が空`).toBeGreaterThan(0);
      expect(LEGAL_PAGES as readonly string[], `${name} が両方に在る`).not.toContain(name);
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

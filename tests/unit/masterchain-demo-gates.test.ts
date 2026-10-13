import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

/** The version in a masterchain download URL (…-1.0.1-installer.pkg → "1.0.1"). */
const versionIn = (url: string) => new URL(url).pathname.match(/-(\d+\.\d+\.\d+)-installer\.pkg$/)?.[1] ?? null;

it("★the demo is open only on a build that has the demo (≥ 1.0.1 — 1.0.0 had DemoFade=0, CCO)", () => {
  expect(MASTERCHAIN_DEMO_LIVE).toBe(true);
  const v = versionIn(MASTERCHAIN_DOWNLOAD_URL);
  // ★Positive control: the parser reads a version at all (null would make the check below vacuous).
  expect(v).not.toBeNull();
  expect(versionIn("https://mued.jp/downloads/MUEDsp-masterchain-1.0.0-installer.pkg")).toBe("1.0.0");
  // ★At least 1.0.1, not merely "not 1.0.0" (CCO #1177): a 0.1.x URL has no demo mode either.
  const atLeast = (a: string, b: string) => {
    const [x, y] = [a, b].map((s) => s.split(".").map(Number));
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return true;
  };
  expect(atLeast("1.0.1", "1.0.1") && atLeast("1.1.0", "1.0.1") && !atLeast("1.0.0", "1.0.1") && !atLeast("0.1.3", "1.0.1")).toBe(true);
  if (MASTERCHAIN_DEMO_LIVE) expect(atLeast(v ?? "0.0.0", "1.0.1"), `DEMO_LIVE on ${v}: the demo copy describes behaviour that build does not have`).toBe(true);
});

it("gates the demo in product UI, FAQ UI and FAQ structured data on the one flag", () => {
  const product = readFileSync("components/features/muedsp-landing/muedsp-landing-content.tsx", "utf8");
  // ★The demo block (MasterchainTry) renders nothing unless the demo flag is on; the purchase is the
  //   button right under masterchain's screen image (MasterchainBuyButton — kimny 10/1), placed before the demo.
  const block = readFileSync("components/features/muedsp-landing/masterchain-try.tsx", "utf8");
  // The form takes its product (C9 PR-C): masterchain's is wired to masterchain's flag, and a closed flag renders nothing.
  expect(block).toMatch(/demoLive: MASTERCHAIN_DEMO_LIVE,/);
  expect(block).toMatch(/if \(!product\.demoLive\) return null;/);
  expect(block).toContain('id="demo"'); // #demo still lands on the block (demo mail / old links)
  expect(product).toContain("<MasterchainTry");
  expect(product).toContain("<MasterchainBuyButton");
  expect(product.indexOf('id="buy"')).toBeLessThan(product.indexOf("<MasterchainTry"));
  // ★The product first, then the button (kimny 10/1: 「UI画像より先に購入ボタンが出ているのが変」).
  expect(product.indexOf("src={MASTERCHAIN_MOCK}")).toBeGreaterThan(-1);
  expect(product.indexOf('id="buy"')).toBeGreaterThan(product.indexOf("src={MASTERCHAIN_MOCK}"));
  expect(product).not.toMatch(/<details/); // ★always visible, never folded (kimny 10/1)
  expect(product).not.toContain('href="#buy"'); // the hero CTA was removed (kimny 10/1)
  const support = readFileSync("app/[locale]/support/page.tsx", "utf8");
  expect(support.match(/\.\.\.\(MASTERCHAIN_DEMO_LIVE \? \["q10" as const\] : \[\]\)/g)).toHaveLength(2);
  const legal = readFileSync("app/[locale]/tokushoho/page.tsx", "utf8");
  expect(legal).toContain('cancellationDemo={MASTERCHAIN_DEMO_LIVE ? t("muedsp.cancellation.demo") : undefined}');
});
it("keeps all new translation keys paired", () => {
  expect(Object.keys(ja.muedsp.demo)).toEqual(Object.keys(en.muedsp.demo));
  expect(Object.keys(ja.muedsp.demo.errors)).toEqual(Object.keys(en.muedsp.demo.errors));
  for (const messages of [ja, en]) {
    expect(messages.muedsp.buyTry.demoNote).toMatch(/45/);
    expect(messages.support.faq.q10.question).toBeTruthy();
    expect(messages.support.faq.q10.answer).toBeTruthy();
    expect(messages.tokushoho.muedsp.cancellation.demo).toBeTruthy();
  }
});

it("★with the demo open, no user-facing copy still calls masterchain \"in development\" (conductor 2026-09-30)", () => {
  const DEV = /開発中|in development|in-development|Still building|作ってる途中|not the real thing|まだ実物/i;
  const hits: string[] = [];
  const walk = (o: unknown, p: string) => {
    if (typeof o === "string") { if (DEV.test(o)) hits.push(p); }
    else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`);
  };
  walk(ja, "ja");
  walk(en, "en");
  for (const f of [
    "app/llms.txt/route.ts",
    "components/features/landing/integrated-landing-content-v2.tsx",
    "components/features/muedsp-landing/muedsp-landing-content.tsx",
  ]) {
    // String literals only (comments may describe history).
    for (const lit of readFileSync(f, "utf8").match(/"[^"\n]*"|`[^`]*`/g) ?? []) if (DEV.test(lit)) hits.push(`${f}: ${lit.slice(0, 60)}`);
  }
  if (MASTERCHAIN_DEMO_LIVE) expect(hits).toEqual([]);
  // ★Positive control: the pattern does match the old wording.
  expect(DEV.test("全段の masterchain は開発中。")).toBe(true);
});

it("★the masterchain image is the real LICENSED 1.0.1 screen everywhere — never the old mock or the DEMO screen (kimny 10/6)", () => {
  // kimny 10/6 (conductor relay 「muedjpにも使ってOK」, then in the mued window 「全部差し替える」「（デモ）を消す」): the press
  // screen dsp captured while processing a real track, LICENSED — in all four places, so no page shows a DEMO badge.
  for (const f of [
    "components/features/muedsp-landing/muedsp-landing-content.tsx",
    "components/features/muedsp-landing/masterchain-buy-button.tsx",
    "components/features/landing/integrated-landing-content-v2.tsx",
    "components/features/landing/studio-showroom.tsx",
  ]) {
    const src = readFileSync(f, "utf8");
    expect(src, f).toContain('"/muedsp/masterchain-1.0.1-licensed.webp"');
    expect(src, f).not.toMatch(/"\/muedsp\/masterchain-(mock|1\.0\.1-demo)\.webp"/);
  }
  // ★The captions say what it is — and no longer "(demo)": the screen is the licensed plugin.
  for (const m of [ja, en]) {
    expect(m.muedsp.masterchain.mockLabel).toContain("1.0.1");
    for (const v of [m.muedsp.masterchain.mockLabel, m.studioShowroom.masterAlt, m.studioShowroom.mockNote]) expect(v).not.toMatch(/デモ|demo/i);
  }
});

it("★llms.txt: the price leads and the demo is a footnote; while purchase is closed it still says sales have not started (kimny / CCO 2026-09-30)", () => {
  const src = readFileSync("app/llms.txt/route.ts", "utf8");
  const line = src.split("\n").find((l) => l.startsWith("- **MUEDsp masterchain**:")) ?? "";
  expect(line).toContain('MASTERCHAIN_PURCHASE_LIVE ? "買い切り $69・販売中');
  expect(line).toContain('"買い切り $69（販売の開始は近日・現在 live 販売なし）。"');
  expect(line.indexOf("買い切り $69")).toBeLessThan(line.indexOf("デモで確かめられる"));
  expect(line).not.toContain("デモあり");
});

it("★the demo is not a selling point: no 'demo available' badge / eyebrow anywhere (kimny 2026-09-30)", () => {
  expect(JSON.stringify([ja, en])).not.toMatch(/デモあり|Demo available/);
  expect(ja.muedsp.masterchain.eyebrow).toBe("作曲家のためのマスターチェーン");
  expect(en.muedsp.masterchain.eyebrow).toBe("A master chain for composers");
});

it("★no release date for masterchain on Windows anywhere on the site (kimny 2026-09-30)", () => {
  const DATE = /10 ?月 ?14|October 14|Oct\.? 14|10\/14/;
  expect(JSON.stringify([ja, en])).not.toMatch(DATE);
  for (const f of ["app/llms.txt/route.ts", "components/features/muedsp-landing/muedsp-landing-content.tsx"]) {
    expect(readFileSync(f, "utf8"), f).not.toMatch(DATE);
  }
  expect(ja.muedsp.windows.masterchainStatus).toBe("近日公開予定。ライセンスキーはMac版と共通です");
});

it("★FAQ q11: the macOS Installer's 'can't be moved to the Trash' at the end of an install (conductor 10/1 — seen on kimny's Mac, not stoppable from the pkg)", () => {
  const support = readFileSync("app/[locale]/support/page.tsx", "utf8");
  // Always shown (not behind a flag), in the visible list and in the FAQ structured data.
  expect(support.match(/: \[\]\), "q11"\] as const;/g)).toHaveLength(2);
  expect(ja.support.faq.q11.question).toContain("ゴミ箱に入れることはできません");
  expect(ja.support.faq.q11.answer).toContain("インストールは完了しています");
  expect(en.support.faq.q11.question).toContain("can’t be moved to the Trash");
  expect(en.support.faq.q11.answer).toContain("The installation is complete");
  for (const m of [ja, en]) expect(m.support.faq.q11.answer).toContain(".pkg");
});

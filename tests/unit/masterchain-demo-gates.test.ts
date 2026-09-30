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
  expect(product).toMatch(/MASTERCHAIN_DEMO_LIVE && \([\s\S]*?tmc\("demoNote"\)[\s\S]*?id="demo"[\s\S]*?<MasterchainDemoForm \/>[\s\S]*?\)}/);
  expect(product.indexOf("{MASTERCHAIN_DEMO_LIVE &&")).toBeGreaterThan(product.indexOf("<MasterchainPurchaseControl"));
  const support = readFileSync("app/[locale]/support/page.tsx", "utf8");
  expect(support.match(/\.\.\.\(MASTERCHAIN_DEMO_LIVE \? \["q10" as const\] : \[\]\)/g)).toHaveLength(2);
  const legal = readFileSync("app/[locale]/tokushoho/page.tsx", "utf8");
  expect(legal).toContain('cancellationDemo={MASTERCHAIN_DEMO_LIVE ? t("muedsp.cancellation.demo") : undefined}');
});
it("keeps all new translation keys paired", () => {
  expect(Object.keys(ja.muedsp.demo)).toEqual(Object.keys(en.muedsp.demo));
  expect(Object.keys(ja.muedsp.demo.errors)).toEqual(Object.keys(en.muedsp.demo.errors));
  for (const messages of [ja, en]) {
    expect(messages.muedsp.masterchain.demoNote).toBeTruthy();
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

it("★the masterchain image is the real 1.0.1 screen everywhere, never the old mock (kimny: no dummies)", () => {
  for (const f of [
    "components/features/muedsp-landing/muedsp-landing-content.tsx",
    "components/features/landing/integrated-landing-content-v2.tsx",
    "components/features/landing/studio-showroom.tsx",
  ]) {
    const src = readFileSync(f, "utf8");
    expect(src, f).toContain("/muedsp/masterchain-1.0.1-demo.webp");
    expect(src, f).not.toMatch(/"\/muedsp\/masterchain-mock\.webp"/);
  }
  // ★The captions say what it is — not "illustrative".
  for (const m of [ja, en]) expect(m.muedsp.masterchain.mockLabel).toContain("1.0.1");
});

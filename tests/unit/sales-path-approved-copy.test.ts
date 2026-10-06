/**
 * G3 — the copy on the selling surfaces is the copy kimny approved, verbatim; and no promise slips in.
 * (sales-path guard, kimny 2026-10-04「反省文は必要ないから仕組みを作ってくれ」・Chief brief
 * `brief-sales-path-guard-20261004.md`.) The positive controls are this week's real cases:
 *   C1「年に数通」（a frequency promise in the opt-in note）  C2「自動更新はありません」（a line that binds future work）
 * Both are added in the RED tests below and must be caught.
 *
 * Source of truth: docs/copy/approved-{ja,en}.json — change it in the SAME PR as the copy, so the reviewer
 * (and kimny) see the exact words that will ship.
 */
import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";
import approvedJa from "../../docs/copy/approved-ja.json";
import approvedEn from "../../docs/copy/approved-en.json";
import { emailTemplates } from "@/lib/services/email.service";
import { getAllLearnArticles } from "@/lib/learn/articles";

type Approved = { messages: Record<string, string>; emails: Record<string, { subject: string }>; promiseLines: string[] };
const LOCALES = { ja: { messages: ja, approved: approvedJa as Approved }, en: { messages: en, approved: approvedEn as Approved } } as const;

/** The selling surfaces: every string under these keys is customer-facing copy on a form, button or notice. */
export const SCOPE_PREFIXES = ["muedsat.form.", "muedlim.form.", "muedrive.form.", "muedsp.buyTry.", "muedsp.demo."] as const;
export const SCOPE_KEYS = [
  "muedsp.masterchain.buyLabel",
  "muedsp.masterchain.buyLabelLive",
  "muedsp.masterchain.priceLive",
  "muedsp.windows.demoChoose",
  "muedsp.windows.demoOtherMac",
  "muedsp.windows.demoOtherWindows",
  "muedlim.whyFree.masterchainLine", // /muedlim → masterchain (kimny 10/6 「上の案でOK」 via Chief)
] as const;

/** Promise words: binding (frequency, absolutes, "there is no …"). Allowed only when the approved copy itself has them. */
export const PROMISE = {
  ja: /年に数通|月に|週に|必ず|絶対|ありません|しません|のみ|保証|永久|無期限|ずっと/,
  en: /a few emails a year|occasional|\bnever\b|\bonly\b|\balways\b|monthly|weekly|guarantee|forever|lifetime/i,
} as const;

export function flatten(o: unknown, prefix = ""): Record<string, string> {
  if (o === null || typeof o !== "object") return typeof o === "string" ? { [prefix]: o } : {};
  return Object.entries(o as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }),
    {},
  );
}

export function scopedCopy(messages: unknown): Record<string, string> {
  const all = flatten(messages);
  return Object.fromEntries(
    Object.entries(all).filter(([k]) => SCOPE_PREFIXES.some((p) => k.startsWith(p)) || (SCOPE_KEYS as readonly string[]).includes(k)),
  );
}

/** Lines of an email (subject + text) that carry a promise word and are not on the approved list. */
export function unapprovedPromiseLines(locale: "ja" | "en", mail: { subject: string; text: string }, approved: Approved): string[] {
  return `${mail.subject}\n${mail.text}`
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && PROMISE[locale].test(l) && !approved.promiseLines.includes(l));
}

/**
 * ★The guard itself (CCO #1223): every violation of the approved copy on the selling surfaces. The real
 *   messages and the positive controls go through THIS function — a control that only checks its own setup
 *   would stay green even if the guard broke.
 */
export function copyViolations(locale: "ja" | "en", messages: unknown, approved: Approved): string[] {
  const live = scopedCopy(messages);
  const out: string[] = [];
  for (const [key, value] of Object.entries(live)) {
    if (!(key in approved.messages)) out.push(`not approved: ${key}`);
    else if (approved.messages[key] !== value) out.push(`differs from the approved copy: ${key}`);
    if (PROMISE[locale].test(value) && approved.messages[key] !== value) out.push(`promise word outside the approved copy: ${key}`);
  }
  for (const key of Object.keys(approved.messages)) if (!(key in live)) out.push(`approved copy missing: ${key}`);
  return out;
}

type Template = (d: { locale: "ja" | "en"; marketingOptIn?: boolean }) => { subject: string; text: string; html: string };
const templates = emailTemplates as unknown as Record<string, Template>;

describe.each(Object.entries(LOCALES))("%s — approved copy", (locale, { messages, approved }) => {
  it("the selling surfaces carry exactly the approved copy — verbatim, nothing extra, nothing missing, no stray promise", () => {
    expect(copyViolations(locale as "ja" | "en", messages, approved)).toEqual([]);
  });

  it.each(Object.keys(approved.emails))("email %s: the subject is the approved one", (name) => {
    expect(templates[name]({ locale: locale as "ja" | "en", marketingOptIn: true }).subject).toBe(approved.emails[name].subject);
  });

  it.each(Object.keys(approved.emails))("email %s: no promise word outside the approved lines", (name) => {
    const mail = templates[name]({ locale: locale as "ja" | "en", marketingOptIn: true });
    expect(unapprovedPromiseLines(locale as "ja" | "en", mail, approved)).toEqual([]);
  });
});

describe("positive controls — this week's real cases are caught BY THE GUARD", () => {
  it("C1: a frequency promise added to a form note", () => {
    const tampered = structuredClone(ja) as typeof ja;
    tampered.muedsat.form.note = `${tampered.muedsat.form.note}お知らせは年に数通です。`;
    expect(copyViolations("ja", tampered, approvedJa as Approved)).toEqual([
      "differs from the approved copy: muedsat.form.note",
      "promise word outside the approved copy: muedsat.form.note",
    ]);
  });

  it("C2: a new 'there is no auto-updater' line on a form", () => {
    const tampered = structuredClone(ja) as unknown as { muedsat: { form: Record<string, string> } };
    tampered.muedsat.form.updatesReason = "自動更新はありません。更新はメールでお知らせします。";
    expect(copyViolations("ja", tampered, approvedJa as Approved)).toEqual([
      "not approved: muedsat.form.updatesReason",
      "promise word outside the approved copy: muedsat.form.updatesReason",
    ]);
  });

  it("a removed approved string is reported", () => {
    const tampered = structuredClone(en) as unknown as { muedsp: { buyTry: Record<string, string> } };
    delete tampered.muedsp.buyTry.try;
    expect(copyViolations("en", tampered, approvedEn as Approved)).toEqual(["approved copy missing: muedsp.buyTry.try"]);
  });

  it("C1 in an email: an 'occasional' line not on the approved list is reported", () => {
    const mail = { subject: "Your download link", text: "Download: x\n\nI'll send occasional updates.\n" };
    expect(unapprovedPromiseLines("en", mail, approvedEn as Approved)).toEqual(["I'll send occasional updates."]);
  });

  it.each([["ja", "永久にアップデート無料"], ["en", "Lifetime updates guaranteed"]] as const)("%s: the added promise words are caught (%s)", (locale, line) => {
    expect(unapprovedPromiseLines(locale, { subject: "s", text: line }, (locale === "ja" ? approvedJa : approvedEn) as Approved)).toEqual([line]);
  });
});

describe("/learn — the masterchain line under every article's CTA (kimny 10/6 「OK」 via Chief)", () => {
  const approved = (approvedEn as { learnCta2Label?: string }).learnCta2Label;

  it("the approved text exists and carries no promise word", () => {
    expect(approved).toBeTruthy();
    expect(PROMISE.en.test(approved!)).toBe(false);
  });

  it.each(getAllLearnArticles().map((a) => [a.slug, a] as const))("%s: the line is the approved text, verbatim, and links to the demo", (_slug, a) => {
    expect(a.gate.cta2Label).toBe(approved);
    // ★`?from=`, not utm_*: an internal UTM would overwrite the visit's search source in GA4 (Chief 10/6 (b)).
    expect(a.gate.cta2Href).toBe(`/en/muedsp?from=learn-${a.slug}#demo`);
    expect(a.gate.ctaHref).not.toMatch(/utm_/);
  });
});

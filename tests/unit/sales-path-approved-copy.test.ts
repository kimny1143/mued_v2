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
] as const;

/** Promise words: binding (frequency, absolutes, "there is no …"). Allowed only when the approved copy itself has them. */
export const PROMISE = {
  ja: /年に数通|月に|週に|必ず|絶対|ありません|しません|のみ/,
  en: /a few emails a year|occasional|\bnever\b|\bonly\b|\balways\b|monthly|weekly/i,
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

type Template = (d: { locale: "ja" | "en"; marketingOptIn?: boolean }) => { subject: string; text: string; html: string };
const templates = emailTemplates as unknown as Record<string, Template>;

describe.each(Object.entries(LOCALES))("%s — approved copy", (locale, { messages, approved }) => {
  const live = scopedCopy(messages);

  it("every string on the selling surfaces is the approved string, verbatim", () => {
    for (const [key, value] of Object.entries(live)) {
      expect({ key, value }).toEqual({ key, value: approved.messages[key] });
    }
  });

  it("the selling surfaces hold no string that is not approved, and no approved string went missing", () => {
    expect(Object.keys(live).sort()).toEqual(Object.keys(approved.messages).sort());
  });

  it.each(Object.keys(approved.emails))("email %s: the subject is the approved one", (name) => {
    expect(templates[name]({ locale: locale as "ja" | "en", marketingOptIn: true }).subject).toBe(approved.emails[name].subject);
  });

  it.each(Object.keys(approved.emails))("email %s: no promise word outside the approved lines", (name) => {
    const mail = templates[name]({ locale: locale as "ja" | "en", marketingOptIn: true });
    expect(unapprovedPromiseLines(locale as "ja" | "en", mail, approved)).toEqual([]);
  });

  it("the approved copy itself is the only place a promise word may stand on a selling surface", () => {
    for (const [key, value] of Object.entries(live)) {
      if (PROMISE[locale as "ja" | "en"].test(value)) expect(approved.messages[key], key).toBe(value);
    }
  });
});

describe("positive controls — this week's real cases are caught", () => {
  it("C1: a frequency promise added to a form note fails the verbatim check", () => {
    const tampered = structuredClone(ja) as typeof ja;
    tampered.muedsat.form.note = `${tampered.muedsat.form.note}お知らせは年に数通です。`;
    const live = scopedCopy(tampered);
    expect(live["muedsat.form.note"]).not.toBe((approvedJa as Approved).messages["muedsat.form.note"]);
    expect(PROMISE.ja.test(live["muedsat.form.note"])).toBe(true);
  });

  it("C2: a new 'there is no auto-updater' line on a form fails the coverage check", () => {
    const tampered = structuredClone(ja) as unknown as { muedsat: { form: Record<string, string> } };
    tampered.muedsat.form.updatesReason = "自動更新はありません。更新はメールでお知らせします。";
    const live = scopedCopy(tampered);
    expect(Object.keys(live)).toContain("muedsat.form.updatesReason");
    expect(Object.keys((approvedJa as Approved).messages)).not.toContain("muedsat.form.updatesReason");
    expect(PROMISE.ja.test(live["muedsat.form.updatesReason"])).toBe(true);
  });

  it("C1 in an email: an 'occasional' line not on the approved list is reported", () => {
    const mail = { subject: "Your download link", text: "Download: x\n\nI'll send occasional updates.\n" };
    expect(unapprovedPromiseLines("en", mail, approvedEn as Approved)).toEqual(["I'll send occasional updates."]);
  });
});

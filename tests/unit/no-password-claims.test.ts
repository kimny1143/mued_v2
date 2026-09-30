import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

/**
 * ★We do not claim "no password needed" anywhere (kimny 2026-09-30, verbatim:
 * 「だいたい、googleやapple使ってる時点で裏でパスワード生きてるでしょうが。事実と違うことは書かないで」).
 * Say what happens (a code is emailed) — never what is absent. Comments may still describe history,
 * so source files are checked on string literals only.
 */
const CLAIM = /パスワード(は|が|も)?(不要|要りません|いりません|なし|無し)|no password|without a password|passwordless|password-free/i;

it("messages carry no 'no password' claim", () => {
  for (const f of ["messages/ja.json", "messages/en.json"]) {
    const hits = readFileSync(f, "utf8").split("\n").filter((l) => CLAIM.test(l));
    expect(hits, f).toEqual([]);
  }
});

it("the sign-in page and the emails carry no 'no password' claim (string literals)", () => {
  for (const f of ["app/(auth)/sign-in/[[...sign-in]]/page.tsx", "app/(auth)/sign-up/[[...sign-up]]/page.tsx", "lib/services/email.service.ts"]) {
    const lits = readFileSync(f, "utf8").match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? [];
    expect(lits.filter((l) => CLAIM.test(l)), f).toEqual([]);
  }
});

it("positive control: the pattern matches the removed wording", () => {
  for (const s of ["パスワードは不要です。", "パスワードも不要で、", "パスワードは要りません", "No password needed", "no password to remember"]) {
    expect(CLAIM.test(s), s).toBe(true);
  }
});

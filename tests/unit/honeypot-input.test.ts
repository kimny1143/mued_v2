import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, HONEYPOT_INPUT_PROPS } from "@/lib/plugins/registry";

// 2026-10-24: a real MUEDlim user got "sent" on screen three times and no email (0 sends in Resend).
// The silent path was the honeypot. These pin the two things that keep a real browser out of it.
const FORMS = [
  "components/features/muedsat-landing/muedsat-signup-form.tsx",
  "components/features/muedsp-landing/masterchain-try.tsx",
];

// Field names browsers and password managers autofill. The honeypot must not use any of them.
const AUTOFILL_NAMES = ["website", "url", "email", "name", "phone", "tel", "address", "company", "organization"];

describe("honeypot inputs", () => {
  it("carry the password-manager opt-outs, not only autocomplete=off", () => {
    expect(HONEYPOT_INPUT_PROPS).toMatchObject({
      tabIndex: -1,
      autoComplete: "off",
      "data-1p-ignore": "true",
      "data-lpignore": "true",
      "data-bwignore": "true",
      "data-form-type": "other",
    });
  });

  it("use a field name outside the autofill vocabulary", () => {
    expect(AUTOFILL_NAMES).not.toContain(HONEYPOT_FIELD);
  });

  it.each(FORMS)("%s: the off-screen input uses the shared name and props", (path) => {
    const source = readFileSync(path, "utf8");
    // The honeypot is the only input inside the off-screen box (left: -9999px).
    const box = source.slice(source.indexOf('left: "-9999px"'));
    const input = box.slice(box.indexOf("<input"), box.indexOf("/>", box.indexOf("<input")) + 2);
    expect(input).toContain("name={HONEYPOT_FIELD}");
    expect(input).toContain("{...HONEYPOT_INPUT_PROPS}");
    expect(input).not.toMatch(/name="/);
  });
});

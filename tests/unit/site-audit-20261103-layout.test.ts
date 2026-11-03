/**
 * Site audit 2026-11-03 (Chief, _chief/for-conductor/brief-site-audit-actions-20261103.md v2).
 * C4: /muedlim reads "What it is" before the compatibility notes. C6: the top page's free row names its products in
 * the heading. Both are order/markup only — no copy changes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("C4 — /muedlim: the product first, the compatibility notes after", () => {
  const src = read("components/features/muedlim-landing/muedlim-landing-content.tsx");

  it("the 'What it is' heading and the controls come before <PluginVersionDetails>", () => {
    const whatItIs = src.indexOf('{ta("heading")}');
    const controls = src.indexOf('{ta("controlsLead")}');
    const details = src.indexOf("<PluginVersionDetails");
    // ★Positive control: all three are found (a -1 would make the order checks meaningless).
    for (const i of [whatItIs, controls, details]) expect(i).toBeGreaterThan(-1);
    expect(whatItIs).toBeLessThan(details);
    expect(controls).toBeLessThan(details);
    // Rendered once only.
    expect(src.split("<PluginVersionDetails").length).toBe(2);
  });

  it("the hero notice before the form stays (it links down to #version-notes)", () => {
    const notice = src.indexOf('<PluginVersionNotice plugin="muedlim" />');
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(src.indexOf("<SignupForm"));
  });
});

describe("screen alts name no version (B4/C5 — CCO #1324 note ①)", () => {
  const SEMVER = /\b\d+\.\d+\.\d+\b/;
  it.each(["ja", "en"])("%s: every string under muedsat/muedlim/muedrive .visuals is free of a version number", (l) => {
    const m = JSON.parse(read(`messages/${l}.json`));
    let n = 0;
    for (const p of ["muedsat", "muedlim", "muedrive"]) {
      for (const [k, v] of Object.entries(m[p].visuals as Record<string, unknown>)) {
        if (typeof v !== "string") continue;
        n++;
        expect(v, `${p}.visuals.${k}`).not.toMatch(SEMVER);
      }
    }
    // ★Positive control: strings were checked at all, and the pattern matches the old wording.
    expect(n).toBeGreaterThanOrEqual(4);
    expect(SEMVER.test("The MUEDsat 1.0.1 plugin interface")).toBe(true);
  });
});

describe("C6 — top page: the free row's heading names the products", () => {
  const src = read("components/features/landing/studio-showroom.tsx");

  it("the heading carries the card names, then the existing title (no new copy)", () => {
    const h = src.slice(src.indexOf('data-testid="showroom-modules-heading"'), src.indexOf("</h3>", src.indexOf('data-testid="showroom-modules-heading"')));
    expect(h.length).toBeGreaterThan(0);
    expect(h).toContain('modules.map((m) => m.name).join(" · ")');
    expect(h).toContain('t("modulesTitle")');
    for (const name of ["MUEDsat", "MUEDlim", "MUEDrive"]) expect(src).toContain(`name: "${name}"`);
  });
});

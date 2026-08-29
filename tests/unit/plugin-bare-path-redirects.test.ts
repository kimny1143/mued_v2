/**
 * Unit — every live free plugin keeps a bare-path redirect in next.config.
 *
 * Regression guard for a live bug (2026-08-29, found by product課): `app/[locale]/muedrive` exists but
 * `next.config.ts` listed only muedsat / muedlim / muedsp, so **bare `mued.jp/muedrive` was a hard 404
 * in production** from launch. The bare form is not decorative — the comment above that list names it as
 * the locale-agnostic entry used by the welcome-email forward CTA, the portal empty-state CTA and the
 * /learn gate — so any hand-composed link to it (a broadcast, a social post, a doc) would have 404'd.
 *
 * ★The asymmetry this test removes: the plugin family is TYPED — `PLUGIN_DIST` is a
 * `Record<PluginKey, PluginDist>`, so a new module that forgets `lpPath` fails tsc. The redirect list is
 * HAND-ENUMERATED, and nothing tied the two together, so forgetting a line there failed nothing at all.
 * Repeating the list here would reproduce that: this derives the expected set FROM the registry, so a
 * 5th module is covered the day it is added rather than the day someone notices a 404.
 *
 * ★★READS next.config.ts AS SOURCE TEXT — deliberately, and this is not a stylistic choice. The first
 * version of this file did `await import("@/next.config")`, which is what
 * tests/unit/legal-pages-locale-links.test.ts already does. Two test files importing it meant the Next
 * config (and through it `@parcel/watcher`, a native module) was loaded in two vitest workers, and on
 * Linux CI the second load failed with `Module did not self-register` / ERR_DLOPEN_FAILED. macOS did not
 * reproduce it, so local green said nothing — ★it took down the OTHER file's two tests, not this one's.
 * Only one test file may import next.config; this one reads the text instead.
 *
 * A source-text guard is also the right strength here: the thing being protected is a literal list, and
 * the file that first established this convention argues the same way — "a source-text guard is what
 * catches the regression class, because a bare `<Link href="/x">` renders and type-checks perfectly fine".
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLUGIN_DIST } from "@/lib/plugins/registry";

interface RedirectEntry {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * Every `{ source, destination, permanent }` literal in next.config.ts, in file order.
 *
 * ★The parse is asserted non-empty by the caller: a regex that stops matching (a reformat, a helper
 * extracted) would otherwise turn every `arrayContaining` below into a vacuous pass.
 */
function redirectLiterals(): RedirectEntry[] {
  const src = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
  const re =
    /\{\s*source:\s*['"]([^'"]+)['"]\s*,\s*destination:\s*['"]([^'"]+)['"]\s*,\s*permanent:\s*(true|false)\s*,?\s*\}/g;
  const out: RedirectEntry[] = [];
  for (const m of src.matchAll(re)) {
    out.push({ source: m[1], destination: m[2], permanent: m[3] === "true" });
  }
  return out;
}

const liveModules = Object.values(PLUGIN_DIST).filter((d) => d.live);

describe("bare plugin paths — every live module redirects instead of 404ing", () => {
  it("★the parser actually reads the config (a silent parse failure would pass everything below)", () => {
    const redirects = redirectLiterals();
    expect(redirects.length).toBeGreaterThan(5);
    // ★Positive control on a redirect this file does not otherwise assert: if the regex stops matching
    //   the config's shape, this fails first and names the parser rather than the plugins.
    expect(redirects.map((r) => r.source)).toContain("/tokushoho");
  });

  it("★covers every LIVE module in the registry (derived, not re-listed)", () => {
    const sources = redirectLiterals().map((r) => r.source);
    const liveLpPaths = liveModules.map((d) => d.lpPath);
    // ★Assert the population is not empty first: `for all` over zero live modules is vacuously true,
    //   so a registry that went all-staged would make this suite pass while proving nothing.
    expect(liveLpPaths.length).toBeGreaterThan(0);
    expect(sources).toEqual(expect.arrayContaining(liveLpPaths));
  });

  it("★points each one at its own locale page — not at another product's", () => {
    const redirects = redirectLiterals();
    for (const dist of liveModules) {
      const r = redirects.find((x) => x.source === dist.lpPath);
      expect(r, `${dist.key}: bare ${dist.lpPath} has no redirect`).toBeTruthy();
      // A copy-paste that left another key would still be a valid-looking 307 and would silently send
      // MUEDrive traffic to MUEDsat.
      expect(r!.destination).toBe(`/en${dist.lpPath}`);
    }
  });

  it("keeps them temporary (307) so the pages can be made locale-aware later", () => {
    const redirects = redirectLiterals();
    for (const dist of liveModules) {
      expect(redirects.find((x) => x.source === dist.lpPath)!.permanent).toBe(false);
    }
  });

  it("★does not require a redirect for a staged module (the exemption is real, not assumed)", () => {
    const staged = Object.values(PLUGIN_DIST).filter((d) => !d.live);
    const sources = redirectLiterals().map((r) => r.source);
    // Every module is live today, so this documents the rule and starts asserting the moment one is
    // staged. The negative control below keeps the suite honest in the meantime.
    for (const d of staged) expect(sources).not.toContain(d.lpPath);
  });

  it("★negative control: an invented path is NOT in the redirect list", () => {
    // Without this, `arrayContaining` above would also pass against a config that redirected everything.
    expect(redirectLiterals().map((r) => r.source)).not.toContain("/zzz-nonexistent-plugin");
  });

  it("★the /muedsp family entry is still present (it is not a plugin key, so the loop misses it)", () => {
    // ★/muedsp is the catalogue page, not a PluginKey — deriving from PLUGIN_DIST cannot cover it, and
    //   it is the path the welcome-email forward CTA actually uses. Pinned separately on purpose.
    //   ★product課 measured 2026-08-29 that this gap is wider than one entry: /advisory, /muedial and
    //   /redesign are bare-404 with a 200 locale page today. The population that matches the property
    //   is the filesystem (app/[locale]/*/page.tsx), not PLUGIN_DIST — tracked as a follow-up.
    expect(redirectLiterals().map((r) => r.source)).toContain("/muedsp");
  });
});

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
 * `live` is honoured, so a staged module is not required to have a redirect yet (its page is not meant
 * to be reachable). ★The staged case is asserted explicitly rather than assumed — otherwise "we only
 * check live ones" would be an untested claim.
 */
import { describe, it, expect } from "vitest";
import { PLUGIN_DIST } from "@/lib/plugins/registry";

async function redirectSources(): Promise<{ source: string; destination: string; permanent: boolean }[]> {
  const { default: config } = await import("@/next.config");
  return (await config.redirects!()) as { source: string; destination: string; permanent: boolean }[];
}

describe("bare plugin paths — every live module redirects instead of 404ing", () => {
  it("★covers every LIVE module in the registry (derived, not re-listed)", async () => {
    const redirects = await redirectSources();
    const sources = redirects.map((r) => r.source);
    const liveLpPaths = Object.values(PLUGIN_DIST)
      .filter((d) => d.live)
      .map((d) => d.lpPath);

    // ★Assert the population is not empty first: `for all` over zero live modules is vacuously true,
    //   so a registry that went all-staged would make this suite pass while proving nothing.
    expect(liveLpPaths.length).toBeGreaterThan(0);
    expect(sources).toEqual(expect.arrayContaining(liveLpPaths));
  });

  it("★points each one at its own locale page — not at another product's", async () => {
    const redirects = await redirectSources();
    for (const dist of Object.values(PLUGIN_DIST)) {
      if (!dist.live) continue;
      const r = redirects.find((x) => x.source === dist.lpPath);
      expect(r, `${dist.key}: bare ${dist.lpPath} has no redirect`).toBeTruthy();
      // The destination must name THIS plugin — a copy-paste that left another key would still be a
      // valid-looking 307 and would silently send MUEDrive traffic to MUEDsat.
      expect(r!.destination).toBe(`/en${dist.lpPath}`);
    }
  });

  it("keeps them temporary (307) so the pages can be made locale-aware later", async () => {
    const redirects = await redirectSources();
    for (const dist of Object.values(PLUGIN_DIST)) {
      if (!dist.live) continue;
      expect(redirects.find((x) => x.source === dist.lpPath)!.permanent).toBe(false);
    }
  });

  it("★does not require a redirect for a staged module (the exemption is real, not assumed)", async () => {
    const staged = Object.values(PLUGIN_DIST).filter((d) => !d.live);
    const sources = (await redirectSources()).map((r) => r.source);
    // Every module is live today, so this documents the rule and starts asserting the moment one is
    // staged. The negative control below keeps the suite honest in the meantime.
    for (const d of staged) expect(sources).not.toContain(d.lpPath);
  });

  it("★negative control: an invented path is NOT in the redirect list", async () => {
    // Without this, `arrayContaining` above would also pass against a config that redirected everything.
    const sources = (await redirectSources()).map((r) => r.source);
    expect(sources).not.toContain("/zzz-nonexistent-plugin");
  });

  it("★the /muedsp family entry is still present (it is not a plugin key, so the loop misses it)", async () => {
    // ★/muedsp is the catalogue page, not a PluginKey — deriving from PLUGIN_DIST cannot cover it, and
    //   it is the path the welcome-email forward CTA actually uses. Pinned separately on purpose.
    const sources = (await redirectSources()).map((r) => r.source);
    expect(sources).toContain("/muedsp");
  });
});

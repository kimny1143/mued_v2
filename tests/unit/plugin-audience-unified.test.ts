/**
 * ★Does each plugin's Resend audience point at the audience the North Star actually counts?
 *
 * ★WHY THIS PREDICATE EXISTS. `muedsp_reachable` — the North Star denominator — is the distinct count
 * of subscribed contacts in ONE audience (MUEDSP_AUDIENCE_ID). A plugin whose own audience env points
 * anywhere else contributes nothing to it. And the loss is silent in a specific way:
 * `lib/plugins/subscribe-handler.ts` raises its operator alert only under
 * `audienceConfigured && !listCaptured`, so an UNCONFIGURED audience drops the lead with no log and
 * no alert at all. That scoping was correct when "unconfigured" meant "staged, not yet provisioned";
 * it is now indistinguishable from "misconfigured in production".
 *
 * ★WHY NOT "is it configured". Three states matter and a configured-check collapses two of them:
 *
 *     env unset                  → not counted   ← isPluginAudienceEnabled says false ✓
 *     env set to ANOTHER id      → not counted   ← isPluginAudienceEnabled says ★TRUE  ✗
 *     env set to the North Star  → counted       ← isPluginAudienceEnabled says true  ✓
 *
 * ★The middle row is the whole point: a valid-but-wrong audience looks healthy to every check that
 * asks "is it set". These tests pin all three rows, because a predicate that cannot separate them is
 * the same defect wearing the fix's clothes.
 *
 * ★DESIGN, and why it is not a plain boolean either. insight課 proposed computing the comparison
 * server-side rather than publishing ids — that is what keeps this an instrument instead of two
 * strings a human has to diff. conductor then arbitrated the reporting shape: `true` when unified,
 * `false` when unset, and the id's LAST FOUR CHARS when it is set to something else. ★The fragment
 * appears only once the verdict is already bad, so a healthy deployment discloses nothing, and a
 * debugger still learns where the leads actually went. Only `true` is an acceptable value.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MUEDSP_AUDIENCE_ID, PLUGIN_DIST, type PluginKey } from "../../lib/plugins/registry";

const ENV = PLUGIN_DIST.muedrive.audienceEnvName;
let saved: string | undefined;

// ★Import fresh each time: the module reads process.env at call time, but resetModules keeps a stale
// RESEND_API_KEY capture from leaking between cases.
async function unified(plugin: PluginKey): Promise<boolean> {
  const mod = await import("../../lib/plugins/audience");
  return mod.isPluginAudienceUnified(plugin);
}

describe("isPluginAudienceUnified — points at the audience the North Star counts?", () => {
  beforeEach(() => {
    saved = process.env[ENV];
  });
  afterEach(() => {
    if (saved === undefined) delete process.env[ENV];
    else process.env[ENV] = saved;
  });

  it("★unset → false (the silent case: no log, no operator alert, no contribution)", async () => {
    delete process.env[ENV];
    expect(await unified("muedrive")).toBe(false);
  });

  it("★★set to a DIFFERENT valid audience → false — this is the row a configured-check gets wrong", async () => {
    // A real, well-formed uuid that simply is not the North Star audience. Every "is it configured"
    // check passes here, and the registrations still land nowhere the denominator can see.
    process.env[ENV] = "6293ccef-c19f-4a4e-bb52-4bd8a6ef5c6f"; // the General audience
    expect(await unified("muedrive")).toBe(false);
  });

  it("set to the North Star audience → true", async () => {
    process.env[ENV] = MUEDSP_AUDIENCE_ID;
    expect(await unified("muedrive")).toBe(true);
  });

  it("★empty string is not a configuration (it is the third spelling of absent)", async () => {
    process.env[ENV] = "";
    expect(await unified("muedrive")).toBe(false);
  });

  it("★★status reports the tail ONLY when misconfigured — nothing is disclosed when healthy", async () => {
    const mod = await import("../../lib/plugins/audience");
    process.env[ENV] = MUEDSP_AUDIENCE_ID;
    expect(mod.pluginAudienceStatus("muedrive")).toBe(true); // ★healthy → no fragment at all
    delete process.env[ENV];
    expect(mod.pluginAudienceStatus("muedrive")).toBe(false); // ★unset → still no fragment
    process.env[ENV] = "6293ccef-c19f-4a4e-bb52-4bd8a6ef5c6f";
    expect(mod.pluginAudienceStatus("muedrive")).toBe("5c6f"); // ★wrong → last 4 of that id, nothing more
    expect(String(mod.pluginAudienceStatus("muedrive")).length).toBe(4);
  });

  it("★the canonical id is declared ONCE — the collector imports it rather than re-declaring it", async () => {
    // A second literal of the same fact is how MUEDrive shipped counting zero: the collector had its
    // own `type PluginKey` that tsc could never reconcile with the registry's. Same shape, so the
    // same guard: this file must hold the only definition.
    const { readFileSync } = await import("node:fs");
    const collector = readFileSync("scripts/aggregate-plugin-funnel-daily.ts", "utf8");
    const declarations = collector.match(/const\s+MUEDSP_AUDIENCE_ID\s*=/g) ?? [];
    expect(declarations).toHaveLength(0);
    expect(collector).toContain("MUEDSP_AUDIENCE_ID");
    expect(MUEDSP_AUDIENCE_ID).toMatch(/^[0-9a-f-]{36}$/);
  });
});

/**
 * Regression proof for the 案A registry migration (2026-07-11): the live MUEDsat email-gate funnel
 * must be byte-for-byte unchanged after moving MUEDsat onto the shared plugin subscribe pipeline
 * (lib/plugins/{registry,audience,subscribe-handler}). The runtime path is now:
 *   route → handlePluginSubscribe("muedsat") → addPluginSubscriber("muedsat") → sendMuedsatDownloadWelcome
 * Because the handler is driven entirely by PLUGIN_DIST[plugin], proving PLUGIN_DIST.muedsat equals
 * the current MUEDsat constants (source, endpoint, audience env, download URL, press token, live)
 * proves the MUEDsat runtime is unchanged. (conductor merge gate: "回帰0 を test で証明", not asserted.)
 */
import { describe, it, expect } from "vitest";
import { PLUGIN_DIST, HONEYPOT_FIELD, isHoneypotTripped } from "@/lib/plugins/registry";
import { addPluginSubscriber, isPluginAudienceEnabled } from "@/lib/plugins/audience";
import { MUEDSAT_LIVE, MUEDSAT_DOWNLOAD_URL, MUEDSAT_PRESS_TOKEN } from "@/lib/muedsat/config";
import { MUEDLIM_LIVE, MUEDLIM_DOWNLOAD_URL, MUEDLIM_PRESS_TOKEN } from "@/lib/muedlim/config";

describe("plugin distribution registry — MUEDsat regression 0 (案A migration)", () => {
  it("registry.muedsat mirrors the current MUEDsat constants byte-for-byte (runtime unchanged)", () => {
    const m = PLUGIN_DIST.muedsat;
    expect(m.key).toBe("muedsat");
    expect(m.source).toBe("muedsat_lp"); // zod schema default + POST payload source
    expect(m.subscribeEndpoint).toBe("/api/muedsat/subscribe"); // form POST target unchanged
    expect(m.audienceEnvName).toBe("RESEND_MUEDSAT_AUDIENCE_ID"); // same Resend audience env
    expect(m.i18nNamespace).toBe("muedsat"); // same form copy namespace
    expect(m.live).toBe(MUEDSAT_LIVE);
    expect(m.downloadUrl).toBe(MUEDSAT_DOWNLOAD_URL);
    expect(m.pressToken).toBe(MUEDSAT_PRESS_TOKEN);
  });

  it("registry.muedlim is a distinct, correctly-segmented entry (no cross-send with muedsat)", () => {
    const m = PLUGIN_DIST.muedlim;
    expect(m.source).toBe("muedlim_lp");
    expect(m.subscribeEndpoint).toBe("/api/muedlim/subscribe");
    expect(m.audienceEnvName).toBe("RESEND_MUEDLIM_AUDIENCE_ID"); // its OWN audience (誤配防止)
    expect(m.i18nNamespace).toBe("muedlim");
    expect(m.live).toBe(MUEDLIM_LIVE);
    expect(m.downloadUrl).toBe(MUEDLIM_DOWNLOAD_URL);
    expect(m.pressToken).toBe(MUEDLIM_PRESS_TOKEN);
    // MUEDsat and MUEDlim must NOT share the audience or the endpoint (segmentation + no cross-send).
    expect(m.audienceEnvName).not.toBe(PLUGIN_DIST.muedsat.audienceEnvName);
    expect(m.subscribeEndpoint).not.toBe(PLUGIN_DIST.muedsat.subscribeEndpoint);
    expect(m.i18nNamespace).not.toBe(PLUGIN_DIST.muedsat.i18nNamespace);
  });

  it("addPluginSubscriber is no-op-safe (returns false, never throws) when the audience is unconfigured", async () => {
    // In the unit env (no RESEND_*_AUDIENCE_ID / RESEND_API_KEY) both plugins are silent no-ops —
    // identical to the old addMuedsatSubscriber. The staged capture endpoint ships before the
    // audience is provisioned at go-live.
    if (!isPluginAudienceEnabled("muedsat")) {
      await expect(addPluginSubscriber("muedsat", { email: "a@b.co", locale: "en" })).resolves.toBe(false);
    }
    if (!isPluginAudienceEnabled("muedlim")) {
      await expect(addPluginSubscriber("muedlim", { email: "a@b.co", locale: "en" })).resolves.toBe(false);
    }
    // never throws, whatever the env
    await expect(addPluginSubscriber("muedlim", { email: "", locale: "en" })).resolves.toBe(false);
  });
});

describe("plugin email gate — honeypot bot-trap (2026-07-16 quota-defense)", () => {
  it("HONEYPOT_FIELD is a stable, single-source field name shared by form + handler", () => {
    expect(typeof HONEYPOT_FIELD).toBe("string");
    expect(HONEYPOT_FIELD.length).toBeGreaterThan(0);
  });

  it("isHoneypotTripped: empty / whitespace / missing = human (false)", () => {
    expect(isHoneypotTripped(undefined)).toBe(false);
    expect(isHoneypotTripped("")).toBe(false);
    expect(isHoneypotTripped("   ")).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
  });

  it("isHoneypotTripped: any non-empty value = bot (true)", () => {
    expect(isHoneypotTripped("https://spam.example")).toBe(true);
    expect(isHoneypotTripped("x")).toBe(true);
    expect(isHoneypotTripped("  filled  ")).toBe(true);
  });

  it("non-string honeypot values are treated as absent (false), never throw", () => {
    expect(isHoneypotTripped(123)).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
    expect(isHoneypotTripped([])).toBe(false);
  });
});

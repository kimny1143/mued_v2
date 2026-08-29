/**
 * Unit — buildAvailableItems (lib/plugins/portal.ts): the live free modules a user does NOT own yet.
 *
 * ★The assertion that matters most is that an available item carries `lpPath`, never `downloadUrl`.
 * Linking the .pkg directly would skip the email gate, so no entitlement row is written and the module
 * would never appear on the shelf — the very failure this affordance exists to close, in a new shape.
 * A test that only checked "something is returned" would pass while that regressed, so the shape is
 * asserted structurally (no downloadUrl key at all) rather than by reading the value.
 *
 * A separate file from plugin-portal.test.ts on purpose: that one mocks the registry for the SECURITY
 * core and its fixture has neither `live` nor `lpPath`. Extending it would edit a security fixture to
 * serve an unrelated feature.
 */
import { describe, it, expect, vi } from "vitest";

// Deterministic registry: two live modules + one staged, so "staged stays hidden" is testable.
vi.mock("@/lib/plugins/registry", () => ({
  PLUGIN_DIST: {
    muedsat: {
      key: "muedsat",
      live: true,
      i18nNamespace: "muedsat",
      lpPath: "/muedsat",
      downloadUrl: "https://cdn/sat.pkg",
    },
    muedlim: {
      key: "muedlim",
      live: true,
      i18nNamespace: "muedlim",
      lpPath: "/muedlim",
      downloadUrl: "https://cdn/lim.pkg",
    },
    muedstaged: {
      key: "muedstaged",
      live: false,
      i18nNamespace: "muedstaged",
      lpPath: "/muedstaged",
      downloadUrl: "",
    },
  },
}));

import { buildAvailableItems } from "@/lib/plugins/portal";

const keys = (owned: { pluginKey: string }[] | null | undefined) =>
  buildAvailableItems(owned).map((a) => a.pluginKey);

describe("buildAvailableItems", () => {
  it("offers every live module when the user owns nothing", () => {
    expect(keys([])).toEqual(["muedsat", "muedlim"]);
    expect(keys(null)).toEqual(["muedsat", "muedlim"]);
    expect(keys(undefined)).toEqual(["muedsat", "muedlim"]);
  });

  it("omits what the user already owns", () => {
    expect(keys([{ pluginKey: "muedsat" }])).toEqual(["muedlim"]);
  });

  it("returns nothing when every live module is owned", () => {
    expect(keys([{ pluginKey: "muedsat" }, { pluginKey: "muedlim" }])).toEqual([]);
  });

  it("★never offers a staged module (live=false stays undiscoverable)", () => {
    // ★Positive control on the same call: the live pair IS offered, so an empty result would be the
    //   filter working rather than the function returning nothing.
    const out = keys([]);
    expect(out).not.toContain("muedstaged");
    expect(out).toEqual(["muedsat", "muedlim"]);
  });

  it("ignores an unknown owned key rather than throwing", () => {
    expect(keys([{ pluginKey: "legacy-thing" }])).toEqual(["muedsat", "muedlim"]);
  });

  it("★carries lpPath and structurally has NO downloadUrl (the .pkg must not be linked)", () => {
    const item = buildAvailableItems([])[0];
    expect(item.lpPath).toBe("/muedsat");
    expect(Object.keys(item)).not.toContain("downloadUrl");
    expect(Object.values(item).some((v) => String(v).endsWith(".pkg"))).toBe(false);
  });

  it("is stable in registry order (the shelf does not reshuffle between renders)", () => {
    expect(keys([])).toEqual(keys([]));
  });
});

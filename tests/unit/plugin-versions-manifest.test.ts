/**
 * Unit — GET /plugins/versions.json (the in-plugin update-check manifest). Asserts the registry→manifest
 * mapping: plain-semver `latest` (drops the "-alpha" display tag so it lines up with the plugin's
 * PLUG_VERSION_STR), product-page `url`, NO downloadUrl (v1 keeps the .pkg behind the email gate),
 * staged (`live:false`) exclusion, and the CDN Cache-Control. A mocked PLUGIN_DIST keeps it independent
 * of the real live/version constants.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/plugins/registry", () => ({
  PLUGIN_DIST: {
    muedsat: { key: "muedsat", live: true, version: "0.1.0-alpha", downloadUrl: "https://mued.jp/downloads/MUEDsat.pkg" },
    muedlim: { key: "muedlim", live: false, version: "0.2.0", downloadUrl: "" }, // staged → excluded
  },
}));

import { GET } from "@/app/plugins/versions.json/route";

describe("GET /plugins/versions.json", () => {
  it("maps live plugins → {latest(plain semver), url} (no downloadUrl) and excludes staged ones", async () => {
    const res = GET();
    const body = await res.json();

    expect(body.muedsat).toEqual({
      latest: "0.1.0", // "-alpha" stripped → comparable to the plugin's PLUG_VERSION_STR
      url: "https://mued.jp/en/muedsat", // locale product page — linked directly, not via the /muedsat 307 (#717)
    });
    expect(body.muedsat).not.toHaveProperty("downloadUrl"); // v1: .pkg stays behind the email gate
    expect(body.muedlim).toBeUndefined(); // live:false → not advertised
  });

  it("is publicly cacheable (CDN)", () => {
    const res = GET();
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });
});

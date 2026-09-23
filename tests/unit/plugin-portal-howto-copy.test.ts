import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";
import { MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";
import { buildPurchaseItems } from "@/lib/plugins/portal";

// /dashboard/plugins shows this line under the "Copy key" button. It must describe the same
// activation as the licence email (masterchainLicenseDelivery): masterchain 1.0.0 has no key file —
// the buyer copies the key, clicks DEMO, then the "Paste license from clipboard" button.
describe("plugin portal purchased-licence instructions", () => {
  it.each([["ja", ja], ["en", en]] as const)("%s uses clipboard activation", (_locale, messages) => {
    const howto = messages.pluginPortal.purchased.howto;
    expect(howto).toContain("Paste license from clipboard");
    expect(howto).toContain("DEMO");
    expect(howto).toContain("SIGNATURE"); // the on-screen text next to the badge (same landmark as the email)
    expect(howto).toContain("LICENSED");
    expect(howto).not.toContain("license.key");
    expect(howto).not.toContain("Application Support");
  });

  // ★The ordering guard. The button this copy (and the licence email) tells buyers to click first
  // shipped in masterchain 1.0.0 (dsp 35a12e3); 0.1.x has no paste UI at all. Both surfaces hand out
  // MASTERCHAIN_DOWNLOAD_URL, so the copy must not reach production before that URL points at 1.0.0
  // (conductor, 2026-09-24: merge in the same deploy as the 1.0.0 switch). ★This is RED on purpose
  // until the switch lands in the same PR — a draft flag only holds while someone remembers it.
  // The version is read with the portal's own parser (the one that renders the row), not a copy.
  it("the masterchain download it points buyers to has the paste button (1.0.0 or later)", () => {
    const [row] = buildPurchaseItems([{ licenseKey: "k", createdAt: new Date(0) }], MASTERCHAIN_DOWNLOAD_URL);
    expect(row.version, `no version readable from ${MASTERCHAIN_DOWNLOAD_URL}`).not.toBeNull();
    expect(Number(row.version!.split(".")[0])).toBeGreaterThanOrEqual(1);
  });
});

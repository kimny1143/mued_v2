import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

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
});

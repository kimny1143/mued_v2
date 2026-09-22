/**
 * Unit — the version shown on the purchase card is parsed out of the REAL download URL.
 *
 * ★Why this file exists separately from `plugin-portal-purchases.test.ts`: that file mocks
 * `@/lib/masterchain/config` and hands `buildPurchaseItems` a hand-written URL literal. Its
 * expectation and its input therefore come from the same place — if the real constant changes to a
 * shape `versionInUrl` cannot parse, that test stays green on its own fixture and the card silently
 * loses its version line. This file imports the real constant instead, so the two can disagree.
 *
 * ★The failure being guarded is silent by construction: an unparsable URL yields `version: null`,
 * which renders as "no version" rather than as an error. Nobody is told. The trigger is already
 * scheduled — dsp's 0.1.4 changes this URL (status.md `blocked_by` W15).
 */
import { describe, expect, it } from "vitest";

import { MASTERCHAIN_DOWNLOAD_URL } from "@/lib/masterchain/config";
import { buildPurchaseItems } from "@/lib/plugins/portal";

/**
 * ★Both states are judged, rather than skipping one. An empty URL is a real (fail-closed) state:
 * `fastspring-webhook.ts` degrades the delivery email honestly when it is unset, and there is then
 * no version to parse. Skipping it would mean "not checked" while reading as "checked".
 */
function versionVerdict(url: string, version: string | null): { ok: boolean; why: string } {
  if (!url) {
    return { ok: true, why: "download URL unset — the paid line cannot transact yet; nothing to parse" };
  }
  if (version === null) {
    return {
      ok: false,
      why:
        `no version parsed out of ${url} — the purchase card would show a download with no version, ` +
        "and nothing would fail. Update versionInUrl() in lib/plugins/portal.ts to the new shape.",
    };
  }
  if (!url.includes(version)) {
    return { ok: false, why: `parsed version ${version} does not appear in ${url} — it was not read off the URL` };
  }
  return { ok: true, why: `parsed ${version}` };
}

describe("purchase card version — measured against the real download URL", () => {
  it("★parses a version out of the constant the card actually links to", () => {
    const [item] = buildPurchaseItems(
      [{ licenseKey: "MUEDSP-LICENSE-v2\nsig=AAAA\n", createdAt: new Date("2026-09-22T00:00:00Z") }],
      MASTERCHAIN_DOWNLOAD_URL,
    );
    const v = versionVerdict(MASTERCHAIN_DOWNLOAD_URL, item.version);
    expect(v.ok, v.why).toBe(true);
  });

  it("the card links to the same URL the constant holds (no second copy)", () => {
    const [item] = buildPurchaseItems(
      [{ licenseKey: "k", createdAt: new Date("2026-09-22T00:00:00Z") }],
      MASTERCHAIN_DOWNLOAD_URL,
    );
    expect(item.downloadUrl).toBe(MASTERCHAIN_DOWNLOAD_URL);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit — a $69 buyer must be told where to GET the plugin, not only where to save the key.
 *
 * ## What was wrong (2026-09-10, found by conductor)
 *
 * `masterchainLicenseDelivery` rendered the licence key, the file path to save it at, and nothing
 * else. ★The buyer paid, received a key, and had no way to obtain the software it unlocks. The
 * fulfilment spec commits to both — `docs/paid-line/c1-fastspring-product-and-fulfillment-spec.md:66`,
 * 「ライセンスキーはメールでお送りします」+ ダウンロードリンク.
 *
 * ★NOBODY WAS STRANDED, and saying so precisely matters. The purchase path is fail-CLOSED twice
 * over: the FastSpring webhook returns 401 while FASTSPRING_WEBHOOK_SECRET is unset, and licence
 * issuance throws without MASTERCHAIN_LICENSE_PRIVATE_KEY. Both are kimny-gated and unset, so no
 * order has ever completed. ★This is a launch blocker caught before it became an incident — not a
 * live customer failure, and it should not be reported as one.
 *
 * ## Why this renders instead of reading the source
 *
 * Its sibling (plugin-email-format-claims.test.ts) reads the file text on purpose, because the
 * format sentence appears in four places and `sendPluginDownloadEmail` needs Resend. ★This template
 * is a pure function, so it can be RENDERED — which is the stronger check: it verifies what the
 * buyer receives, not what the source says. The only module-level input is the URL constant, and
 * mocking it is what lets both branches be exercised.
 */
const KEY = "-----BEGIN MUED LICENSE-----\nAAAA.BBBB.CCCC\n-----END MUED LICENSE-----";
const URL = "https://mued.jp/downloads/MUEDsp-masterchain-1.0.0-installer.pkg";

async function render(downloadUrl: string, locale: "ja" | "en" = "ja") {
  vi.resetModules();
  vi.doMock("@/lib/masterchain/config", () => ({
    MASTERCHAIN_INTEREST_LIVE: false,
    MASTERCHAIN_DOWNLOAD_URL: downloadUrl,
  }));
  const { emailTemplates } = await import("@/lib/services/email.service");
  return emailTemplates.masterchainLicenseDelivery({ locale, licenseKey: KEY });
}

describe("masterchain licence delivery email", () => {
  beforeEach(() => vi.resetModules());

  it("★carries the installer link in BOTH html and text when the URL is configured", async () => {
    for (const locale of ["ja", "en"] as const) {
      const mail = await render(URL, locale);
      expect(mail.html, `${locale} html`).toContain(URL);
      expect(mail.text, `${locale} text`).toContain(URL);
      // ★A plain-text buyer must get a usable URL, not just a styled button.
      expect(mail.html).toContain(`href="${URL}"`);
      // ★Positive control: the key is still delivered — the fix must not have displaced it.
      expect(mail.html).toContain(KEY);
      expect(mail.text).toContain(KEY);
    }
  });

  it("★degrades honestly when no URL is set — no dead link, and a way to reach a human", async () => {
    for (const locale of ["ja", "en"] as const) {
      const mail = await render("", locale);
      // ★The failure that matters: an anchor pointing nowhere looks like a delivery and is not one.
      expect(mail.html, `${locale}: empty href`).not.toContain('href=""');
      expect(mail.html).not.toMatch(/href="\s*"/);
      // ★A buyer who has already paid needs a path forward, so the copy names one.
      expect(locale === "ja" ? mail.text : mail.text.toLowerCase()).toContain(
        locale === "ja" ? "返信" : "reply",
      );
      // ★…and the key is still delivered.
      expect(mail.text).toContain(KEY);
    }
  });

  it("★self-RED: the assertions above can fail — they are not vacuously true", async () => {
    // ★Without this, "contains the URL" would also pass against an email that happened to contain
    //   the string for any reason, and "no dead link" would pass against an email with no links at
    //   all. Pin the discriminating pair: configured ⇒ URL present, unset ⇒ URL absent.
    const withLink = await render(URL);
    const without = await render("");
    expect(withLink.text).toContain(URL);
    expect(without.text).not.toContain(URL);
    expect(without.html).not.toContain(URL);
    // ★And the two branches genuinely differ, so a future edit collapsing them goes red here.
    expect(withLink.html).not.toEqual(without.html);
  });

  it("★install comes before the key — that is the order the buyer has to do it in", async () => {
    const mail = await render(URL);
    expect(mail.html.indexOf(URL)).toBeLessThan(mail.html.indexOf(KEY));
    expect(mail.text.indexOf(URL)).toBeLessThan(mail.text.indexOf(KEY));
  });
});

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { issueLicense, LICENSE_MAGIC } from "@/lib/masterchain/license";

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
// ★The fixture is ISSUED, not typed. The previous value was `-----BEGIN MUED LICENSE-----…`, an
// armour container this product has never emitted — and the buyer instructions in the template
// carried the same invented assumption, so the check and the checked shared one origin (the
// author's belief) and could not disagree. Asking `issueLicense()` for the bytes means the format
// comes from the implementation: if it moves to v3, this fixture moves with it and the instruction
// assertions below fail loudly instead of the mail going out wrong.
// Throwaway pair, same pattern as masterchain-license.test.ts — no real key, no env dependency.
const THROWAWAY_PEM = generateKeyPairSync("ed25519")
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();
// ★Save and restore, matching masterchain-license.test.ts. CCO measured that leaking it is currently
// unreachable — `vitest.config.ts` names no `isolate`, so the default `isolate: true` gives each file its
// own environment — but that is a default we would be depending on, not a property we assert.
const ORIGINAL_PEM = process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = THROWAWAY_PEM;
const KEY = issueLicense({ owner: "buyer@example.com", order: "FS-TEST-0001" })!;
afterAll(() => {
  if (ORIGINAL_PEM === undefined) delete process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY;
  else process.env.MASTERCHAIN_LICENSE_PRIVATE_KEY = ORIGINAL_PEM;
});
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


  it("★★the SUBJECT follows the body — it never promises a download the mail lacks", async () => {
    // ★The wording was proposed unconditionally. Rendering all four variants showed it true in two
    //   and false in two: with no URL the body says "the link is coming", so an unconditional subject
    //   names something the mail does not contain. ★That would undo the honest degrade IN THE SUBJECT
    //   while the body-level test above stayed green — a property broken from a different line.
    const withLink = await render(URL);
    expect(withLink.subject).toMatch(/ダウンロード|download/i);

    for (const locale of ["ja", "en"] as const) {
      const without = await render("", locale);
      expect(without.subject, `${locale}: subject promises a download the body does not carry`)
        .not.toMatch(/ダウンロード|download/i);
      // ★…and the body really is the "link is coming" shape, so the two are being compared honestly.
      expect(without.text).not.toContain("https://");
    }
  });

  it("★subject and body agree in BOTH directions", async () => {
    // ★One rule, stated as an equivalence, so neither side can drift alone: says-download ⇔ has-URL.
    for (const url of [URL, ""]) {
      for (const locale of ["ja", "en"] as const) {
        const m = await render(url, locale);
        const subjectSaysDownload = /ダウンロード|download/i.test(m.subject);
        const bodyHasUrl = m.text.includes("https://");
        expect(subjectSaysDownload, `url=${url || "(empty)"} locale=${locale}`).toBe(bodyHasUrl);
      }
    }
  });

  // ★The defect this file missed until conductor read the implementation (2026-09-21): the buyer
  // instructions said to copy "including the -----BEGIN and -----END lines", which `issueLicense()`
  // does not emit. `lib/masterchain/license.ts:16` records that a previous version invented that
  // armour and that it was discarded — the mail kept the discarded assumption. The instructions must
  // name landmarks that EXIST in the bytes the buyer receives, so assert against the issued key.
  it("★the copy instructions name landmarks that the issued key actually has", async () => {
    const first = KEY.split("\n")[0];
    const lastLine = KEY.trimEnd().split("\n").at(-1)!;
    expect(first, "issued key must start with the magic line").toBe(LICENSE_MAGIC);
    expect(lastLine.startsWith("sig="), `last line was ${lastLine.slice(0, 12)}…`).toBe(true);

    for (const locale of ["ja", "en"] as const) {
      const mail = await render(URL, locale);
      for (const surface of [mail.html, mail.text]) {
        // ★Assert on the INSTRUCTIONS, not the whole mail. The key is in the body and its own first
        // line IS the magic while its last line starts `sig=`, so a whole-surface toContain() is
        // satisfied by the key even when the instructions name nothing. ★That version of this test
        // was vacuous and meta-RED caught it: deleting the instruction text left it green.
        const keyAt = surface.indexOf(KEY);
        expect(keyAt, "the issued key must appear in the surface").toBeGreaterThan(-1);
        // ★Strip the download URL before asserting. CCO measured (2026-09-22) that the region before
        // the key also holds the download block, so a signed URL (`?exp=…&sig=…`) would satisfy the
        // `sig=` assertion on its own — the instruction text could be deleted and that half of the
        // check would die silently. Expiring download links are ordinary evolution, and this test
        // MOCKS the URL, so production moving to a signed one would never show up here.
        // ★Removing the URL is stronger than forbidding `sig=` inside it: the assertion then cannot be
        // satisfied by anything except the prose it is about, whatever the URL later becomes.
        // ★The strip depends on an EXACT match, so assert its premise on the rendered output. CCO
        // measured (2026-09-22) that if the surface ever HTML-escapes the URL (`?exp=1&amp;sig=…`)
        // the strip whiffs silently and `sig=` comes back. The template interpolates
        // `href="${MASTERCHAIN_DOWNLOAD_URL}"` raw today, so this cannot happen yet — but when it
        // does, this line says "the strip stopped working" instead of the next one quietly passing.
        // ★Note this asserts the RENDERED surface, not the mock constant: a premise written against
        // the fixture would not fire on the very change it guards against.
        expect(surface.slice(0, keyAt), "the download URL must appear verbatim").toContain(URL);
        const instructions = surface.slice(0, keyAt).split(URL).join("");
        expect(instructions, "instructions must name the first line").toContain(LICENSE_MAGIC);
        expect(instructions, "instructions must name the last line").toContain("sig=");
        // ★Never re-introduce armour the issuer does not produce.
        expect(instructions).not.toContain("-----BEGIN");
        expect(instructions).not.toContain("-----END");
      }
    }
  });

  // ★P-4 added a second route to the key (the dashboard). The mail must gain that line WITHOUT
  // losing the key itself: buying masterchain does not require an account, so a buyer who never
  // signs up has only this mail. Asserting both together is the point — "mentions the dashboard"
  // alone would stay green if someone later replaced the key with a link to it.
  it("★names the dashboard as a second route AND still carries the key itself", async () => {
    for (const locale of ["ja", "en"] as const) {
      const mail = await render(URL, locale);
      for (const surface of [mail.html, mail.text]) {
        expect(surface, "the key itself must remain in the mail").toContain(KEY);
        expect(surface).toMatch(locale === "ja" ? /ダッシュボード/ : /dashboard/i);
      }
    }
  });

  it("★install comes before the key — that is the order the buyer has to do it in", async () => {
    const mail = await render(URL);
    expect(mail.html.indexOf(URL)).toBeLessThan(mail.html.indexOf(KEY));
    expect(mail.text.indexOf(URL)).toBeLessThan(mail.text.indexOf(KEY));
  });
});

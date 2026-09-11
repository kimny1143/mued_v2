/**
 * Unit — a welcome email's SUBJECT must not promise a download its BODY does not contain.
 *
 * ## Where this came from
 *
 * #1007 fixed exactly this in `masterchainLicenseDelivery`: the body branched on `hasLink` while the
 * subject unconditionally said "download". ★CCO found the same shape in the three free-plugin
 * welcomes while reviewing that PR, and scoped it here rather than into #1007 — the predicate
 * already existed, only the templates needed running through it.
 *
 * ## ★Why nobody had seen it: the value, not the code
 *
 * MUEDSAT/MUEDLIM/MUEDRIVE_DOWNLOAD_URL all hold a real .pkg today, so the body always renders the
 * link and the unconditional subject happens to be true. MASTERCHAIN_DOWNLOAD_URL is `""`, which is
 * the ONLY reason the identical defect was visible there. ★Same code, and a configured value decides
 * whether it is a bug you can see. That is what makes this worth a test instead of a fix: the test
 * fires on the day someone empties a URL, which is the day the shape becomes live.
 *
 * ## ★Why `text.includes("https://")` is NOT the predicate here
 *
 * #1007's test uses that, correctly — `masterchainLicenseDelivery` embeds no other link. ★These three
 * do: `portalPromoBlock`/`forwardHookBlock` build from APP_URL, which is `https://mued.jp` in
 * production. So in production their bodies contain "https://" whether or not a download link is
 * present, and the naive predicate is true always. ★It only looks right under vitest because the
 * harness sets NEXT_PUBLIC_APP_URL to an http:// localhost value. ★A predicate that passes because
 * of the test environment's scheme is measuring the harness, not the email — so the last case below
 * reconstructs production's APP_URL and pins the difference.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

type Rendered = { subject: string; html: string; text: string };

const PRODUCTS = [
  { key: "MUEDsat", mod: "@/lib/muedsat/config", konst: "MUEDSAT_DOWNLOAD_URL", fn: "muedsatDownloadWelcome" },
  { key: "MUEDlim", mod: "@/lib/muedlim/config", konst: "MUEDLIM_DOWNLOAD_URL", fn: "muedlimDownloadWelcome" },
  { key: "MUEDrive", mod: "@/lib/muedrive/config", konst: "MUEDRIVE_DOWNLOAD_URL", fn: "muedriveDownloadWelcome" },
] as const;

const pkgUrl = (key: string) => `https://mued.jp/downloads/${key}-9.9.9-installer.pkg`;
const LOCALES = ["ja", "en"] as const;

async function render(p: (typeof PRODUCTS)[number], downloadUrl: string, locale: "ja" | "en"): Promise<Rendered> {
  vi.resetModules();
  vi.doMock(p.mod, () => ({ [p.konst]: downloadUrl }));
  const { emailTemplates } = await import("@/lib/services/email.service");
  const fn = (emailTemplates as unknown as Record<string, (d: { locale: "ja" | "en" }) => Rendered>)[p.fn];
  return fn({ locale });
}

const saysDownload = (subject: string) => /ダウンロード|download/i.test(subject);
/** ★The download link specifically — not "a link". See the header note. */
const offersDownload = (mail: Rendered, url: string) => url !== "" && mail.text.includes(url);

afterEach(() => vi.doUnmock("@/lib/muedsat/config"));

describe("free-plugin welcome emails — subject ⇔ body", () => {
  it("★★the subject says 'download' exactly when the body carries the download link", async () => {
    for (const p of PRODUCTS) {
      for (const url of [pkgUrl(p.key), ""]) {
        for (const locale of LOCALES) {
          const mail = await render(p, url, locale);
          expect(
            saysDownload(mail.subject),
            `${p.key} locale=${locale} url=${url || "(empty)"} — subject ${JSON.stringify(mail.subject)}`,
          ).toBe(offersDownload(mail, url));
        }
      }
    }
  });

  it("★one-way would not have caught it — the failing direction is 'no URL but subject says download'", async () => {
    // ★The equivalence above is two-way on purpose. Asserting only "link ⇒ subject mentions it"
    //   passes the exact defect this file exists for, so name the direction that matters.
    for (const p of PRODUCTS) {
      const mail = await render(p, "", "ja");
      expect(saysDownload(mail.subject), `${p.key}: promises a download it does not contain`).toBe(false);
    }
  });

  it("★positive control — with a URL set the subject DOES say download, so the equivalence is not vacuous", async () => {
    // ★Without this, a template whose subject never mentions a download would satisfy every
    //   assertion above by making both sides false.
    for (const p of PRODUCTS) {
      for (const locale of LOCALES) {
        const mail = await render(p, pkgUrl(p.key), locale);
        expect(saysDownload(mail.subject), `${p.key} ${locale}`).toBe(true);
        expect(mail.text).toContain(pkgUrl(p.key));
      }
    }
  });

  it("★the no-link branch really rendered — otherwise the empty case passes for the wrong reason", async () => {
    // ★Liveness of the branch under test: if `hasLink` never went false, every empty-URL assertion
    //   above would be measuring the link branch and still be green.
    for (const p of PRODUCTS) {
      expect((await render(p, "", "ja")).text, `${p.key} ja`).toMatch(/準備が整い次第/);
      expect((await render(p, "", "en")).text, `${p.key} en`).toMatch(/shortly/i);
    }
  });

  it("★★aim — under production's APP_URL the body has https:// with NO download link; the naive predicate would misfire", async () => {
    // ★The one variable changed is APP_URL. `portalPromoBlock` reads it at module scope, so it is set
    //   before the dynamic import. This reconstructs what production renders, where the harness's
    //   http://localhost value is what makes "any https://" look like a working predicate.
    const saved = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://mued.jp";
    try {
      for (const p of PRODUCTS) {
        const mail = await render(p, "", "ja");
        // ★What the naive predicate would have said — true, because the portal button is https.
        expect(mail.text, `${p.key}: expected an unrelated https link from APP_URL`).toContain("https://");
        // ★What is actually true: no download link, and the subject agrees.
        expect(offersDownload(mail, ""), `${p.key}`).toBe(false);
        expect(saysDownload(mail.subject), `${p.key}`).toBe(false);
      }
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = saved;
    }
  });
});

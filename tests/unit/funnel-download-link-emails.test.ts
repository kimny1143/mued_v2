/**
 * Unit — download-link email clicks (conductor 2026-09-27). Pure counting; the collector only lists.
 */
import { describe, it, expect } from "vitest";
import {
  DOWNLOAD_LINK_SINCE,
  downloadLinkProduct,
  stats,
  toDownloadLinkEmails,
  type ResendEmail,
} from "@/lib/funnel/download-link-emails";
import { emailTemplates } from "@/lib/services/email.service";

const KEYS = ["muedsat", "muedlim", "muedrive"] as const;
const UNTIL = "2026-09-27T12:31:00.000Z";

let n = 0;
function mail(subject: string, last_event: string, to: string, created_at = "2026-09-25 03:00:00.000000+00"): ResendEmail {
  return { id: `e${++n}`, subject, last_event, to: [to], created_at };
}

describe("which mails count", () => {
  it("★matches the subjects the templates actually send, in both locales", () => {
    // ★From the real templates, not copied strings — a subject edit cannot silently drop a product to 0.
    const cases = [
      ["muedsat", emailTemplates.muedsatDownloadWelcome],
      ["muedlim", emailTemplates.muedlimDownloadWelcome],
      ["muedrive", emailTemplates.muedriveDownloadWelcome],
    ] as const;
    for (const [key, template] of cases) {
      for (const locale of ["ja", "en"] as const) {
        const { subject, html } = template({ locale });
        // The link subject is only sent when the body carries the link.
        if (!/href=/.test(html)) continue;
        expect(downloadLinkProduct(subject, KEYS), `${key}/${locale}: ${subject}`).toBe(key);
      }
    }
  });

  it("excludes the no-link fallback subject and unrelated mail", () => {
    expect(downloadLinkProduct("MUEDlim をありがとうございます", KEYS)).toBeNull();
    expect(downloadLinkProduct("Thanks for grabbing MUEDrive", KEYS)).toBeNull();
    expect(downloadLinkProduct("[MUED] お支払いが完了しました", KEYS)).toBeNull();
    expect(downloadLinkProduct("Your masterchain download link", KEYS)).toBeNull();
    expect(downloadLinkProduct(undefined, KEYS)).toBeNull();
  });
});

describe("stats", () => {
  it("counts each mail once by its latest status and people by recipient", () => {
    const s = stats([
      mail("x", "clicked", "a@example.com"),
      mail("x", "delivered", "A@Example.com "), // same person, case/space-insensitive
      mail("x", "opened", "b@example.com"),
      mail("x", "delivered", "c@example.com"),
      mail("x", "bounced", "d@example.com"),
      mail("x", "complained", "e@example.com"),
      mail("x", "sent", "f@example.com"),
    ]);
    expect(s).toEqual({
      sent: 7, bounced: 1, reached: 5, clicked: 1, opened: 1, delivered: 2, complained: 1, other: 1,
      unique_recipients: 4, unique_clicked_recipients: 1, unique_opened_or_clicked_recipients: 2,
    });
    // ★Every mail lands in exactly one status.
    expect(s.clicked + s.opened + s.delivered + s.complained + s.bounced + s.other).toBe(s.sent);
  });

  it("★a bounced-only recipient is not a recipient who was reached", () => {
    expect(stats([mail("x", "bounced", "z@example.com")]).unique_recipients).toBe(0);
  });

  it("does not merge mails that have no recipient into one person", () => {
    const s = stats([{ id: "p", last_event: "delivered" }, { id: "q", last_event: "delivered", to: [] }]);
    expect(s.unique_recipients).toBe(2);
  });

  it("★carries no address anywhere in the output", () => {
    const out = toDownloadLinkEmails([mail("Your MUEDlim download link", "clicked", "secret@example.com")], KEYS, UNTIL);
    expect(JSON.stringify(out)).not.toMatch(/@|secret/);
  });
});

describe("windows", () => {
  const before = mail("Your MUEDlim download link", "delivered", "old@example.com", "2026-09-23 06:50:59.999000+00");
  const first = mail("Your MUEDlim download link", "clicked", "p1@example.com", "2026-09-23 06:51:00.000000+00");
  const mid = mail("MUEDsat のダウンロードリンクです", "opened", "p2@example.com", "2026-09-25 00:00:00.000000+00");
  const recent = mail("Your MUEDrive download link", "clicked", "p3@example.com", "2026-09-27 01:00:00.000000+00");
  const after = mail("Your MUEDrive download link", "clicked", "p4@example.com", "2026-09-27 12:31:00.001000+00");
  const other = mail("Payment receipt", "clicked", "p5@example.com", "2026-09-27 02:00:00.000000+00");
  const out = toDownloadLinkEmails([after, recent, other, mid, first, before], KEYS, UNTIL);

  it("★all_time starts at the fixed click-tracking start, inclusive, and ends at until", () => {
    expect(out.since).toBe(DOWNLOAD_LINK_SINCE);
    expect(out.all_time.total.sent).toBe(3); // first, mid, recent
    expect(out.all_time.total.clicked).toBe(2);
    expect(out.all_time.until).toBe(UNTIL);
  });

  it("last_24h covers only the last 24 hours before until", () => {
    expect(out.last_24h.from).toBe("2026-09-26T12:31:00.000Z");
    expect(out.last_24h.total.sent).toBe(1); // recent
    expect(out.last_24h.by_product.muedrive.clicked).toBe(1);
  });

  it("splits by product, zero-filled from the keys, and the parts sum to the total", () => {
    expect(Object.keys(out.all_time.by_product).sort()).toEqual([...KEYS].sort());
    expect(out.all_time.by_product.muedlim.sent).toBe(1);
    expect(out.all_time.by_product.muedsat.opened).toBe(1);
    const sum = KEYS.reduce((acc, k) => acc + out.all_time.by_product[k].sent, 0);
    expect(sum).toBe(out.all_time.total.sent);
  });

  it("★an unparseable timestamp on a counted mail is an error, not a skip", () => {
    const bad = { ...recent, id: "bad", created_at: "yesterday-ish" };
    expect(() => toDownloadLinkEmails([bad], KEYS, UNTIL)).toThrow(/unparseable/);
  });

  it("rejects a window that ends before it starts", () => {
    expect(() => toDownloadLinkEmails([], KEYS, "2026-09-01T00:00:00Z")).toThrow(/bad window/);
    expect(() => toDownloadLinkEmails([], KEYS, "not-a-date")).toThrow(/bad window/);
  });
});

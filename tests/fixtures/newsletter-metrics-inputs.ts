/**
 * Inputs for the null-bearing newsletter-metrics sample shared with gw-dash (CCO #1211).
 * The sample JSON (newsletter-metrics-with-nulls.json) is this writer's output for these inputs;
 * tests/unit/funnel-newsletter-metrics.test.ts fails if the writer's output stops matching it,
 * and gw-dash's test feeds the same JSON to the real parseNewsletterMetrics.
 */
import type { BroadcastInput } from "../../lib/funnel/newsletter-metrics";

export const SAMPLE_NOW = Date.parse("2026-10-02T00:00:00Z");

export const SAMPLE_INPUTS: BroadcastInput[] = [
  {
    // normal broadcast — every field present
    broadcast: { id: "a615f3f2-4bd5-4e52-9e74-32a2ec67cbef", name: "Untitled", subject: "masterchain is here", sent_at: "2026-09-30 22:13:13.198114+00" },
    totals: { sent: 1021, delivered: 1000, bounced: 21, bounced_transient: 20, bounced_permanent: 1, suppressed: 26, unique_opened: 259, unique_clicked: 50, unsubscribed: 10, complained: 0 },
    hourly: [
      { period: "2026-09-30T22:00:00", unique_opened: 96, unique_clicked: 15, unsubscribed: 2 },
      { period: "2026-09-30T23:00:00", unique_opened: 31, unique_clicked: 2, unsubscribed: 1 },
    ],
    links: [
      { url: "https://mued.jp/en/muedsp?utm_campaign=email_nl-launch-a-issue05&utm_content=product", clicks: 32, unique_clicks: 29 },
      { url: "https://unsubscribe.resend.com/?token=REDACTED", clicks: 10, unique_clicks: 10 },
    ],
    errors: [],
  },
  {
    // ① delivered 0 → every rate except delivery is null; a link with a missing unique → null
    broadcast: { id: "00000000-0000-0000-0000-000000000000", name: "All bounced", subject: "s", sent_at: "2026-10-01 00:00:00+00" },
    totals: { sent: 3, delivered: 0, bounced: 3, bounced_transient: 3, bounced_permanent: 0, suppressed: 0, unique_opened: 0, unique_clicked: 0, unsubscribed: 0, complained: 0 },
    hourly: [],
    links: [{ url: "https://unsubscribe.resend.com/?token=REDACTED", clicks: 1 }],
    errors: [],
  },
  {
    // ② every request failed → totals/rates all null, hourly null, links null, subject null, campaign null
    broadcast: { id: "11111111-1111-1111-1111-111111111111", name: "Failed", subject: null, sent_at: "2026-10-01 01:00:00+00" },
    totals: null,
    hourly: null,
    links: null,
    errors: ["件名は取れなかった（HTTP 500）", "合計は取れなかった（HTTP 500）", "時間帯は取れなかった（HTTP 500）", "リンク別は取れなかった（HTTP 500）"],
  },
];

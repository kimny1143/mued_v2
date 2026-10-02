import { describe, it, expect } from "vitest";
import {
  NEWSLETTER_METRICS_SCHEMA,
  broadcastLabel,
  campaignOf,
  classifyLink,
  groupLinks,
  hourlyWindow,
  parseResendTime,
  toJstIso,
  toNewsletterMetrics,
  type BroadcastInput,
} from "@/lib/funnel/newsletter-metrics";

// Shapes as Resend returned them on 2026-10-02 (launch broadcast a615f3f2; addresses/tokens replaced).
const LAUNCH_SENT = "2026-09-30 22:13:13.198114+00"; // 07:13 JST
const UNSUB = "https://unsubscribe.resend.com/?token=SECRET_TOKEN_abc&email=someone%40example.com";
const links = [
  { url: "https://mued.jp/en/muedsp?utm_source=email&utm_medium=broadcast&utm_campaign=email_nl-launch-a-issue05&utm_content=product", clicks: 32, unique_clicks: 29 },
  { url: "https://mued.jp/en/muedsp?utm_campaign=email_nl-launch-a-issue05&utm_content=windows#windows", clicks: 12, unique_clicks: 10 },
  { url: "https://mued.jp/ja/muedsp?utm_campaign=email_nl-launch-a-issue05&utm_content=product", clicks: 9, unique_clicks: 7 },
  { url: "https://mued.jp/ja/eula", clicks: 1, unique_clicks: 1 },
  { url: "https://mued.jp/learn", clicks: 1, unique_clicks: 1 },
  { url: UNSUB, clicks: 6, unique_clicks: 6 },
  { url: "https://unsubscribe.resend.com/?token=OTHER", clicks: 4, unique_clicks: 4 },
];

describe("time", () => {
  it("parses Resend's Postgres-style UTC and writes JST with +09:00, no milliseconds", () => {
    const ms = parseResendTime(LAUNCH_SENT);
    expect(new Date(ms).toISOString()).toBe("2026-09-30T22:13:13.198Z");
    expect(toJstIso(ms)).toBe("2026-10-01T07:13:13+09:00");
    expect(parseResendTime("2026-10-01T08:00:00")).toBe(Date.parse("2026-10-01T08:00:00Z")); // hourly `period` has no zone = UTC
  });
});

describe("label", () => {
  it("uses the name, but not Resend's default 'Untitled'", () => {
    expect(broadcastLabel({ id: "x", name: "MUEDsp on Windows", subject: "S", sent_at: LAUNCH_SENT })).toBe("MUEDsp on Windows");
    expect(broadcastLabel({ id: "x", name: "Untitled", subject: "masterchain is here", sent_at: LAUNCH_SENT })).toBe("masterchain is here");
    expect(broadcastLabel({ id: "x", name: null, subject: null, sent_at: LAUNCH_SENT })).toBe("x");
    // The launch broadcast was sent as "Untitled" and can no longer be renamed in Resend.
    expect(broadcastLabel({ id: "a615f3f2-4bd5-4e52-9e74-32a2ec67cbef", name: "Untitled", subject: "masterchain is here", sent_at: LAUNCH_SENT })).toBe("発売のお知らせ");
    // …but a real name always wins over the override.
    expect(broadcastLabel({ id: "a615f3f2-4bd5-4e52-9e74-32a2ec67cbef", name: "Launch", subject: "s", sent_at: LAUNCH_SENT })).toBe("Launch");
  });
});

describe("hourlyWindow", () => {
  const sentMs = parseResendTime(LAUNCH_SENT);
  const rows = [
    { period: "2026-09-30T22:00:00", unique_opened: 96, unique_clicked: 15, unsubscribed: 2 },
    { period: "2026-09-30T23:00:00", unique_opened: 31, unique_clicked: 2, unsubscribed: 1 },
    { period: "2026-10-01T22:00:00", unique_opened: 1, unique_clicked: 0, unsubscribed: 0 },
    { period: "2026-10-02T03:00:00", unique_opened: 9, unique_clicked: 9, unsubscribed: 9 }, // past the 24 h window
  ];

  it("runs from the send hour to send hour + 24 in JST (25 slots), 翌 after midnight, missing hours 0", () => {
    const h = hourlyWindow(sentMs, rows, Date.parse("2026-10-05T00:00:00Z"));
    expect(h).toHaveLength(25);
    expect(h[0]).toEqual({ hour: "07", opened: 96, clicked: 15, unsubscribed: 2 });
    expect(h[1]).toEqual({ hour: "08", opened: 31, clicked: 2, unsubscribed: 1 });
    expect(h[2]).toEqual({ hour: "09", opened: 0, clicked: 0, unsubscribed: 0 });
    expect(h[16].hour).toBe("23");
    expect(h[17].hour).toBe("翌00");
    expect(h[24]).toEqual({ hour: "翌07", opened: 1, clicked: 0, unsubscribed: 0 });
    expect(h.map((x) => x.opened).reduce((a, b) => a + b)).toBe(128); // the 03:00Z row (翌12) is outside
  });

  it("stops at now — no future hours", () => {
    expect(hourlyWindow(sentMs, rows, Date.parse("2026-09-30T23:30:00Z")).map((x) => x.hour)).toEqual(["07", "08"]);
  });
});

describe("links", () => {
  it("classifies without keeping the query string", () => {
    expect(classifyLink(links[0].url)).toEqual({ lang: "en", kind: "product", place: "/en/muedsp" });
    expect(classifyLink(links[3].url)).toEqual({ lang: "ja", kind: "eula", place: "/ja/eula" });
    expect(classifyLink(links[4].url)).toEqual({ lang: "", kind: "learn", place: "/learn" });
    expect(classifyLink(UNSUB)).toEqual({ lang: "", kind: "unsubscribe", place: "" });
    expect(classifyLink("https://example.com/a?x=secret")).toEqual({ lang: "", kind: "external", place: "example.com" });
    expect(classifyLink("not a url").kind).toBe("other");
  });

  it("groups by (lang, kind), sums, puts 配信停止 last, and labels like the hand-made file", () => {
    expect(groupLinks(links)).toEqual([
      { label: "英語の製品ページ", lang: "en", kind: "product", unique: 29, clicks: 32 },
      { label: "英語の Windows の段", lang: "en", kind: "windows", unique: 10, clicks: 12 },
      { label: "日本語の製品ページ", lang: "ja", kind: "product", unique: 7, clicks: 9 },
      { label: "/ja/eula", lang: "ja", kind: "eula", unique: 1, clicks: 1 },
      { label: "読み物（/learn）", lang: "", kind: "learn", unique: 1, clicks: 1 },
      { label: "配信停止", lang: "", kind: "unsubscribe", unique: 10, clicks: 10 },
    ]);
  });

  it("a missing count makes the group's sum null, not a smaller number", () => {
    expect(groupLinks([{ url: UNSUB, clicks: 1, unique_clicks: 1 }, { url: UNSUB, clicks: "x" }])[0]).toMatchObject({ unique: null, clicks: null });
  });

  it("campaign comes from utm_campaign", () => {
    expect(campaignOf(links)).toBe("email_nl-launch-a-issue05");
    expect(campaignOf([{ url: UNSUB }])).toBeNull();
    expect(campaignOf(null)).toBeNull();
  });
});

describe("toNewsletterMetrics", () => {
  const now = Date.parse("2026-10-02T00:01:42Z");
  const launch: BroadcastInput = {
    broadcast: { id: "a615f3f2-4bd5-4e52-9e74-32a2ec67cbef", name: "Untitled", subject: "masterchain is here", sent_at: LAUNCH_SENT },
    totals: { sent: 1021, delivered: 1000, bounced: 21, bounced_transient: 20, bounced_permanent: 1, suppressed: 26, unique_opened: 259, unique_clicked: 50, unsubscribed: 10, complained: 0 },
    hourly: [{ period: "2026-09-30T22:00:00", unique_opened: 96, unique_clicked: 15, unsubscribed: 2 }],
    links,
    errors: [],
  };
  const windows: BroadcastInput = {
    broadcast: { id: "6ff80645-34af-4cd7-8d1f-d20a16e863b6", name: "MUEDsp on Windows", subject: null, sent_at: "2026-10-01 08:31:35.053312+00" },
    totals: null,
    hourly: null,
    links: null,
    errors: ["合計は取れなかった（HTTP 500）", "リンク別は取れなかった（HTTP 500）"],
  };
  const out = toNewsletterMetrics([launch, windows], now, "test");

  it("has the v1 envelope, newest broadcast first", () => {
    expect(out.schema).toBe(NEWSLETTER_METRICS_SCHEMA);
    expect(out.generated_at).toBe("2026-10-02T09:01:42+09:00");
    expect(out.broadcasts.map((b) => b.id.slice(0, 8))).toEqual(["6ff80645", "a615f3f2"]);
  });

  it("computes the rates the hand-made file used (delivery over sent, the rest over delivered)", () => {
    const b = out.broadcasts[1];
    expect(b.label).toBe("発売のお知らせ");
    expect(b.sent_at).toBe("2026-10-01T07:13:13+09:00");
    expect(b.campaign).toBe("email_nl-launch-a-issue05");
    expect(b.rates).toEqual({ delivery: 97.94, open: 25.9, click: 5, unsubscribe: 1, complaint: 0 });
  });

  it("a failed request is null with its reason in notes — never 0", () => {
    const b = out.broadcasts[0];
    expect(Object.values(b.totals).every((v) => v === null)).toBe(true);
    expect(Object.values(b.rates).every((v) => v === null)).toBe(true);
    expect(b.hourly).toBeNull();
    expect(b.links).toBeNull();
    expect(b.campaign).toBeNull();
    expect(out.notes).toContain("6ff80645: 合計は取れなかった（HTTP 500）");
    expect(out.notes).toContain("6ff80645: リンク別は取れなかった（HTTP 500）");
  });

  it("a field missing from Resend's totals is null and named in notes", () => {
    const partial = toNewsletterMetrics([{ ...launch, totals: { ...launch.totals, suppressed: undefined } }], now, "t");
    expect(partial.broadcasts[0].totals.suppressed).toBeNull();
    expect(partial.notes.some((n) => n.startsWith("a615f3f2:") && n.includes("suppressed"))).toBe(true);
  });

  it("writes no URL, query string, token or address", () => {
    const text = JSON.stringify(out);
    expect(text).not.toContain("SECRET_TOKEN");
    expect(text).not.toContain("token=");
    expect(text).not.toContain("@");
    expect(text).not.toContain("https://");
  });
});

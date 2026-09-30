import { describe, expect, it, vi } from "vitest";
import { DEMO_SUBJECTS, LAUNCH_AT, PURCHASE_SUBJECTS, toLaunchNumbers } from "@/lib/funnel/launch";
import { toFunnelNumbers, type FunnelReport } from "@/lib/funnel/numbers";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_PURCHASE_LIVE } from "@/lib/masterchain/config";
import { INTERNAL_ORDERS, LAST_INTERNAL_ORDER_AT } from "@/lib/masterchain/internal-orders";
import { emailTemplates } from "@/lib/services/email.service";
import type { Newsletter } from "@/lib/funnel/newsletters";
import type { ResendEmail } from "@/lib/funnel/download-link-emails";

const LAUNCH = "2026-10-05T01:00:00.000Z";
const UNTIL = "2026-10-06T12:00:00.000Z";

let n = 0;
const mail = (subject: string, at: string, to = "a@example.com", last_event = "delivered"): ResendEmail => ({
  id: `m${n++}`, subject, created_at: at, to: [to], last_event,
});

const nl = (id: string, sent_at: string, unique_opened: number | null, unique_clicked: number | null): Newsletter => ({
  id, name: id, sent_at, delivered: 100, unique_opened, unique_clicked, unsubscribed: 0, bounced: 0, complained: 0,
  open_tracked: unique_opened && unique_opened > 0 ? true : null,
});

describe("launch numbers", () => {
  it("★ships not-started until LAUNCH_AT is set — a value, never 0", () => {
    expect(LAUNCH_AT).toBeNull(); // flipped in the one-line PR right after the launch send
    expect(toLaunchNumbers([mail(DEMO_SUBJECTS[0], "2026-10-05T02:00:00Z")], [], UNTIL)).toEqual({
      started: false, launch_at: null,
    });
  });

  it("★the subjects are the templates' own subjects (a subject edited there cannot silently count 0 here)", () => {
    for (const locale of ["ja", "en"] as const) {
      expect(DEMO_SUBJECTS).toContain(emailTemplates.masterchainDemoDownload({ locale }).subject);
      expect(PURCHASE_SUBJECTS).toContain(emailTemplates.masterchainLicenseDelivery({ locale }).subject);
    }
  });

  it("★the purchase subjects are EXACTLY the template's four (with and without a download URL)", async () => {
    const subjects = new Set<string>();
    for (const url of ["https://mued.jp/downloads/x.pkg", ""]) {
      vi.resetModules();
      vi.doMock("@/lib/masterchain/config", async (orig) => ({
        ...(await orig<typeof import("@/lib/masterchain/config")>()),
        MASTERCHAIN_DOWNLOAD_URL: url,
      }));
      const { emailTemplates: t } = await import("@/lib/services/email.service");
      for (const locale of ["ja", "en"] as const) subjects.add(t.masterchainLicenseDelivery({ locale }).subject);
      vi.doUnmock("@/lib/masterchain/config");
    }
    expect([...subjects].sort()).toEqual([...PURCHASE_SUBJECTS].sort());
  });

  it("★LAUNCH_AT may be set only once the demo AND purchase are both open (else both counts are 0 by construction)", () => {
    // CCO #1168: with either gate closed, demo downloads / purchases cannot happen, so the fixed guide
    // line "デモ DL < 30 → 伝え方" would point at the wrong cause. Set LAUNCH_AT after both flips.
    if (LAUNCH_AT !== null) {
      expect(MASTERCHAIN_DEMO_LIVE, "LAUNCH_AT is set but the demo entry is closed").toBe(true);
      expect(MASTERCHAIN_PURCHASE_LIVE, "LAUNCH_AT is set but purchase is closed").toBe(true);
    }
  });

  it("★LAUNCH_AT must start after our own orders — kimny's confirmation purchase is not a launch sale (conductor 10/1)", () => {
    // Positive control: the internal order list is not empty and its time parses.
    expect(INTERNAL_ORDERS.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(LAST_INTERNAL_ORDER_AT))).toBe(false);
    expect(LAST_INTERNAL_ORDER_AT).toBe("2026-09-30T20:01:23Z");
    if (LAUNCH_AT !== null) {
      expect(Date.parse(LAUNCH_AT), `LAUNCH_AT ${LAUNCH_AT} would count the internal order at ${LAST_INTERNAL_ORDER_AT}`).toBeGreaterThan(
        Date.parse(LAST_INTERNAL_ORDER_AT),
      );
    }
  });

  it("counts demo PEOPLE (unique recipients, any status) and purchase ORDERS, only inside the window", () => {
    const emails = [
      mail(DEMO_SUBJECTS[0], "2026-10-04T23:59:59Z", "early@example.com"), // before launch → out
      mail(DEMO_SUBJECTS[0], "2026-10-05T02:00:00Z", "p1@example.com"),
      mail(DEMO_SUBJECTS[1], "2026-10-05T03:00:00Z", "P1@example.com", "bounced"), // same person, any status
      mail(DEMO_SUBJECTS[1], "2026-10-06T11:00:00Z", "p2@example.com"), // also in last 24h
      mail(PURCHASE_SUBJECTS[0], "2026-10-05T04:00:00Z", "buyer@example.com"),
      mail(PURCHASE_SUBJECTS[0], "2026-10-06T10:00:00Z", "buyer@example.com"), // second order, same person
      mail("[MUEDsat] Your download link", "2026-10-05T05:00:00Z"), // free plugin → not counted
      mail(PURCHASE_SUBJECTS[1], "2026-10-06T12:00:01Z"), // after until → out
    ];
    const r = toLaunchNumbers(emails, [], UNTIL, LAUNCH);
    if (!r.started) throw new Error("expected started");
    expect(r.all_time).toMatchObject({ demo_downloads: 2, purchases: 2 });
    expect(r.last_24h).toMatchObject({ demo_downloads: 1, purchases: 1 });
    expect(r.last_24h.from).toBe("2026-10-05T12:00:00.000Z");
    expect(r.launch_at).toBe(LAUNCH);
  });

  it("the launch newsletter is the FIRST broadcast sent at or after LAUNCH_AT; earlier ones never count", () => {
    const r = toLaunchNumbers([], [
      nl("older", "2026-09-16T05:24:27.000Z", 351, 0),
      nl("later", "2026-10-20T00:00:00.000Z", 10, 1),
      nl("launch", "2026-10-05T01:00:00.000Z", 120, 30),
    ], UNTIL, LAUNCH);
    if (!r.started) throw new Error("expected started");
    expect(r.launch_newsletter).toEqual({
      id: "launch", name: "launch", sent_at: "2026-10-05T01:00:00.000Z", unique_opened: 120, unique_clicked: 30,
    });
    expect(toLaunchNumbers([], null, UNTIL, LAUNCH)).toMatchObject({ launch_newsletter: null });
  });

  it("before any launch mail arrives, started=true with zeros (the window is empty, not negative)", () => {
    const r = toLaunchNumbers([], [], "2026-10-05T00:00:00Z", LAUNCH);
    expect(r).toMatchObject({ started: true, all_time: { demo_downloads: 0, purchases: 0 } });
  });

  it("an unparseable time is an error, not a skip", () => {
    expect(() => toLaunchNumbers([mail(DEMO_SUBJECTS[0], "not-a-date")], [], UNTIL, LAUNCH)).toThrow();
  });
});

describe("funnel-numbers passes launch through (and nulls a malformed one)", () => {
  const base: FunnelReport = {
    generated_at: "2026-10-06T12:00:00.000Z",
    muedsp_reachable: { count: 1100 },
    resend: { mued_sp_net_new_day: 3 },
    portal_registrations: { cumulative: 130 },
  };
  const meta = { trigger: "schedule", workflow_run: "https://example.test/run", source_report: "reports/plugin-funnel/x.json" };

  it("not started / started pass through; missing or malformed becomes null", () => {
    expect(toFunnelNumbers({ ...base, launch: { started: false, launch_at: null } }, meta).launch)
      .toEqual({ started: false, launch_at: null });
    const started = toLaunchNumbers([], [], UNTIL, LAUNCH);
    expect(toFunnelNumbers({ ...base, launch: started }, meta).launch).toEqual(started);
    expect(toFunnelNumbers(base, meta).launch).toBeNull();
    expect(toFunnelNumbers({ ...base, launch: { started: true, launch_at: LAUNCH } }, meta).launch).toBeNull();
    expect(toFunnelNumbers({ ...base, launch: { started: false, launch_at: LAUNCH } }, meta).launch).toBeNull();
  });
});

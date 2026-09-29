/**
 * Unit — the four numbers kimny's board shows, and the three things they must never do.
 *
 * ★This runs once a day, in CI, unattended. That is the shape of check nobody re-runs by hand, so the
 * derivation lives in a pure function and every branch is exercised here rather than discovered on
 * the morning the board is wrong.
 */
import { describe, it, expect } from "vitest";
import { toFunnelNumbers, NORTH_STAR_TARGET, type FunnelReport } from "@/lib/funnel/numbers";
import type { Newsletter } from "@/lib/funnel/newsletters";

/** Shaped from the real 2026-09-09 report, so the fixture cannot drift into a shape that never ships. */
const REPORT: FunnelReport = {
  generated_at: "2026-09-10T06:31:09.643Z",
  muedsp_reachable: { count: 814 },
  resend: { mued_sp_net_new_day: 8 },
  portal_registrations: { cumulative: 104 },
};
const META = {
  trigger: "schedule",
  workflow_run: "https://github.com/kimny1143/mued_v2/actions/runs/34445453455",
  source_report: "reports/plugin-funnel/2026-09-09.json",
};

describe("funnel numbers for the PWA", () => {
  it("★carries the four measured values, with the North-Star population in the NAME", () => {
    const n = toFunnelNumbers(REPORT, META);
    expect(n.reachable_contacts).toBe(814);
    expect(n.net_new_day).toBe(8);
    expect(n.target).toBe(5000);
    expect(n.remaining_to_target).toBe(5000 - 814);
    expect(n.portal_registrations).toBe(104);
    // ★`reachable_contacts`, never `contacts`: the same report also carries
    //   resend.mued_sp_total_contacts = 832 (unsubscribed included). Two populations, one word — the
    //   ambiguity is closed by the key name, so a reader of the JSON alone cannot mix them up.
    expect(Object.keys(n)).toContain("reachable_contacts");
    expect(Object.keys(n)).not.toContain("contacts");
  });

  it("★★emits NO division — no rate, no projection, no days-to-target", () => {
    // ★The request originally included "days until 1,000". That is a forecast whose value is set by
    //   the window: ~23 days from a one-day rate here, and undefined on any day net_new is 0 — which
    //   the per-shelf numbers show is a real day (muedsat 0 on 2026-09-09). ★Moving the division to
    //   the screen would move the zero-division too, so it is nowhere. This test is what keeps it
    //   nowhere when someone helpfully adds it back.
    const n = toFunnelNumbers(REPORT, META) as Record<string, unknown>;
    for (const forbidden of ["days_to_1000", "days_remaining", "eta", "rate", "projection", "velocity"]) {
      expect(Object.keys(n)).not.toContain(forbidden);
    }
    // ★And no interpretation words either — the file states, it does not judge.
    expect(JSON.stringify(n)).not.toMatch(/順調|遅れ|good|behind|on track/i);
  });

  it("★remaining_to_target goes NEGATIVE past the target — clamping would hide the day worth seeing", () => {
    const n = toFunnelNumbers({ ...REPORT, muedsp_reachable: { count: 5042 } }, META);
    expect(n.remaining_to_target).toBe(NORTH_STAR_TARGET - 5042);
    expect(n.remaining_to_target).toBeLessThan(0);
  });

  it("★ships the target WITH the difference, so the board's label cannot disagree with the number", () => {
    const n = toFunnelNumbers(REPORT, META);
    expect(n.target).toBe(NORTH_STAR_TARGET);
    expect(n.target - n.reachable_contacts).toBe(n.remaining_to_target);
  });

  it("keeps the deprecated remaining_to_1000 against 1,000 until gw-dash switches (the board never goes blank)", () => {
    // ★Today's gw-dash requires this key; dropping it before gw-dash reads remaining_to_target would
    //   turn the whole numbers panel into an error. Remove together with this test after that lands.
    const n = toFunnelNumbers({ ...REPORT, muedsp_reachable: { count: 1034 } }, META);
    expect(n.remaining_to_1000).toBe(1000 - 1034);
  });

  it("★measured_at is the REPORT's generated_at — when it was measured, not when it was published", () => {
    // ★The board asks "how old is this number". Publish time answers a different question and is
    //   always slightly newer, which flatters the freshness. Passed through verbatim so it cannot
    //   drift from its source.
    expect(toFunnelNumbers(REPORT, META).measured_at).toBe("2026-09-10T06:31:09.643Z");
  });

  it("★provenance is carried so the board can say WHY it is stale, not only that it is", () => {
    const n = toFunnelNumbers(REPORT, META);
    expect(n.trigger).toBe("schedule");
    expect(n.workflow_run).toContain("/actions/runs/");
    expect(n.source_report).toBe("reports/plugin-funnel/2026-09-09.json");
  });

  describe("★★a missing input must not become a zero", () => {
    // ★0 on kimny's board is a claim — "nobody signed up". Absence is a different statement, and the
    //   two must not print the same. Throwing stops the publish (the step is `if: success()`), so
    //   yesterday's file stays and the board shows an OLD measured_at instead of a fresh-looking lie.
    it.each([
      ["muedsp_reachable.count", { ...REPORT, muedsp_reachable: {} }],
      ["resend.mued_sp_net_new_day", { ...REPORT, resend: {} }],
      ["portal_registrations.cumulative", { ...REPORT, portal_registrations: {} }],
      ["generated_at", { ...REPORT, generated_at: undefined }],
    ])("throws when %s is absent", (_label, broken) => {
      expect(() => toFunnelNumbers(broken as FunnelReport, META)).toThrow();
    });

    it("throws on a non-finite number rather than publishing NaN", () => {
      expect(() => toFunnelNumbers({ ...REPORT, muedsp_reachable: { count: NaN } }, META)).toThrow();
      expect(() => toFunnelNumbers({ ...REPORT, resend: { mued_sp_net_new_day: "8" } }, META)).toThrow();
    });

    it("★self-RED: the happy path does NOT throw — the assertions above are not vacuous", () => {
      expect(() => toFunnelNumbers(REPORT, META)).not.toThrow();
    });
  });
});

describe("optional newsletters in funnel numbers", () => {
  const newsletter: Newsletter = {
    id: "nl-1",
    name: "NL#1",
    sent_at: "2026-09-01T09:00:00.000Z",
    delivered: 866,
    unique_opened: 346,
    unique_clicked: 0,
    unsubscribed: 25,
    bounced: 0,
    complained: 0,
    open_tracked: true,
  };

  it("passes the newsletter array through unchanged, including unknown counts", () => {
    const newsletters = [newsletter, {
      ...newsletter,
      id: "nl-2",
      delivered: null,
      unique_opened: null,
      unique_clicked: null,
      unsubscribed: null,
      bounced: null,
      complained: null,
      open_tracked: null,
    }];
    expect(toFunnelNumbers({ ...REPORT, newsletters }, META).newsletters).toBe(newsletters);
  });

  it("preserves an empty successful collection", () => {
    expect(toFunnelNumbers({ ...REPORT, newsletters: [] }, META).newsletters).toEqual([]);
  });

  it("publishes all four numbers from an older report with no newsletters key", () => {
    expect(toFunnelNumbers(REPORT, META)).toMatchObject({
      reachable_contacts: 814,
      net_new_day: 8,
      remaining_to_target: 5000 - 814,
      portal_registrations: 104,
      newsletters: null,
    });
  });

  it.each([undefined, null])("treats explicit %s as null without changing other values", (newsletters) => {
    expect(toFunnelNumbers({ ...REPORT, newsletters }, META)).toEqual(toFunnelNumbers(REPORT, META));
  });

  it.each([
    { label: "object", value: {} },
    { label: "string", value: "newsletters" },
    { label: "null item", value: [null] },
    { label: "primitive item", value: [42] },
    { label: "array item", value: [[]] },
    { label: "missing identity", value: [{}] },
    { label: "numeric id", value: [{ ...newsletter, id: 1 }] },
    { label: "missing name", value: [{ ...newsletter, name: undefined }] },
    { label: "null sent_at", value: [{ ...newsletter, sent_at: null }] },
    { label: "mixed valid and invalid", value: [newsletter, {}] },
  ])("treats malformed newsletters ($label) as null", ({ value }) => {
    expect(toFunnelNumbers({ ...REPORT, newsletters: value }, META)).toEqual(toFunnelNumbers(REPORT, META));
  });
});

describe("optional download_link_emails in funnel numbers", () => {
  const emptyStats = {
    sent: 0, bounced: 0, reached: 0, clicked: 0, opened: 0, delivered: 0, complained: 0, other: 0,
    unique_recipients: 0, unique_clicked_recipients: 0, unique_opened_or_clicked_recipients: 0,
  };
  const win = { from: "2026-09-23T06:51:00.000Z", until: "2026-09-27T12:31:00.000Z", total: emptyStats, by_product: {} };
  const value = { since: "2026-09-23T06:51:00.000Z", all_time: win, last_24h: win };

  it("passes a well-formed object through unchanged", () => {
    expect(toFunnelNumbers({ ...REPORT, download_link_emails: value }, META).download_link_emails).toBe(value);
  });

  it("is null for an older report without the key, and the four numbers still publish", () => {
    expect(toFunnelNumbers(REPORT, META)).toMatchObject({ reachable_contacts: 814, download_link_emails: null });
  });

  it.each([
    { label: "null", value: null },
    { label: "array", value: [] },
    { label: "missing since", value: { ...value, since: undefined } },
    { label: "missing last_24h", value: { ...value, last_24h: undefined } },
    { label: "string sent", value: { ...value, all_time: { ...win, total: { ...emptyStats, sent: "3" } } } },
    { label: "missing by_product", value: { ...value, all_time: { ...win, by_product: undefined } } },
  ])("treats malformed download_link_emails ($label) as null", ({ value: v }) => {
    expect(toFunnelNumbers({ ...REPORT, download_link_emails: v }, META)).toEqual(toFunnelNumbers(REPORT, META));
  });
});

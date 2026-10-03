/**
 * G4 (sales-path guard): the morning-after alert when new sign-ups fall below half of their recent average.
 * ★Positive control = the real series from data/plugin-funnel-reports (resend.mued_sp_net_new_day): the opt-in box
 *   (#1166, 9/30) took new contacts to 0, and this alert fires on 10/2 — it was found on 10/2 only by chance.
 */
import { describe, expect, it } from "vitest";
import { denominatorTrend, DENOMINATOR_ALERT_RATIO, type DailyNetNew } from "@/lib/funnel/denominator-trend";

// Measured 2026-10-04 from data/plugin-funnel-reports (UTC report days).
const REAL: DailyNetNew[] = Object.entries({
  "2026-09-07": 17, "2026-09-08": 7, "2026-09-09": 8, "2026-09-10": 6, "2026-09-11": 13, "2026-09-12": 14,
  "2026-09-13": 9, "2026-09-14": 31, "2026-09-15": 22, "2026-09-16": 14, "2026-09-17": 14, "2026-09-18": 15,
  "2026-09-19": 13, "2026-09-20": 12, "2026-09-21": 7, "2026-09-22": 14, "2026-09-23": 11, "2026-09-24": 8,
  "2026-09-25": 9, "2026-09-26": 10, "2026-09-27": 12, "2026-09-28": 9, "2026-09-29": 13, "2026-09-30": 0,
  "2026-10-01": 0, "2026-10-02": 1,
}).map(([date, netNew]) => ({ date, netNew }));

describe("denominatorTrend — the real reports", () => {
  it("★fires on 2026-10-02: 7-day avg 6.43 vs prior-14 avg 13.79 → 0.47 < 0.5", () => {
    const t = denominatorTrend(REAL, "2026-10-02");
    expect(t).toMatchObject({ last7_avg: 6.43, prior14_avg: 13.79, ratio: 0.47, alert: true, missing: [] });
  });

  it("was quiet before the drop (2026-09-29: steady)", () => {
    const t = denominatorTrend(REAL, "2026-09-29");
    expect(t.alert).toBe(false);
    expect(t.ratio).toBeGreaterThanOrEqual(DENOMINATOR_ALERT_RATIO);
  });
});

describe("denominatorTrend — the rule", () => {
  const flat = (n: number, end = "2026-10-21"): DailyNetNew[] =>
    Array.from({ length: 21 }, (_, i) => {
      const d = new Date(`${end}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - (20 - i));
      return { date: d.toISOString().slice(0, 10), netNew: n };
    });

  it("steady → ratio 1, no alert", () => {
    expect(denominatorTrend(flat(10), "2026-10-21")).toMatchObject({ ratio: 1, alert: false });
  });

  it("exactly half is not an alert (strictly below 0.5)", () => {
    const s = flat(10).map((d, i) => (i >= 14 ? { ...d, netNew: 5 } : d));
    expect(denominatorTrend(s, "2026-10-21")).toMatchObject({ ratio: 0.5, alert: false });
  });

  it("★a missing day is not 0: ratio null, alert false, the day is named", () => {
    const s = flat(10).filter((d) => d.date !== "2026-10-15");
    expect(denominatorTrend(s, "2026-10-21")).toMatchObject({ ratio: null, alert: false, missing: ["2026-10-15"] });
  });

  it("an unreadable day (null) counts as missing", () => {
    const s = flat(10).map((d) => (d.date === "2026-10-20" ? { ...d, netNew: null } : d));
    expect(denominatorTrend(s, "2026-10-21").missing).toEqual(["2026-10-20"]);
  });

  it("a prior average of 0 gives no ratio (no division by zero)", () => {
    const s = flat(0).map((d, i) => (i >= 14 ? { ...d, netNew: 3 } : d));
    expect(denominatorTrend(s, "2026-10-21")).toMatchObject({ prior14_avg: 0, ratio: null, alert: false });
  });
});

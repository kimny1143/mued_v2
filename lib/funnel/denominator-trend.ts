/**
 * G4 of the sales-path guard (kimny 2026-10-04「反省文は必要ないから仕組みを作ってくれ」・Chief brief
 * `brief-sales-path-guard-20261004.md`): show the morning after if new sign-ups fall off a cliff.
 *
 *   ratio = average new contacts per day over the last 7 days ÷ the average over the 14 days before them
 *   alert = ratio < 0.5  (one threshold, not tuned)
 *
 * The daily figure is `resend.mued_sp_net_new_day` — new contacts on the MUEDsp list, the number that went to
 * 0 when the opt-in box was added (#1166, 9/30) and was only noticed on 10/2 by chance. On the real reports this
 * alert fires on 10/2 (7-day avg 6.4 vs 13.8 → 0.47).
 *
 * ★A missing day is not 0: if any of the 21 days is absent or unreadable the result says so (`ratio: null` +
 *   `missing`), never a number computed from a partial window.
 */
export const DENOMINATOR_ALERT_RATIO = 0.5;
/**
 * ★The cliff rule (CCO #1225): the ratio alone is too slow for a drop to zero — 14 → 0 every day gives
 *   0.86 / 0.71 / 0.57 and first fires on the 4th day. So also: if the prior 14 days averaged at least this many
 *   new contacts a day and the report day itself has 0, alert that morning. On the real reports this fires on
 *   9/30 (prior avg ≈ 13, then 0) — i.e. the morning of 10/1, the day after #1166.
 */
export const CLIFF_MIN_PRIOR_AVG = 5;

export interface DailyNetNew {
  date: string; // YYYY-MM-DD (UTC day of the report)
  netNew: number | null;
}

export interface DenominatorTrend {
  /** The report day the window ends on (inclusive). */
  as_of: string;
  last7_avg: number | null;
  prior14_avg: number | null;
  ratio: number | null;
  alert: boolean;
  /** Which rule raised the alert ("ratio" | "cliff"), or null. */
  reason: "ratio" | "cliff" | null;
  threshold: number;
  /** Days in the 21-day window with no readable figure — when non-empty, ratio is null. */
  missing: string[];
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;

export function denominatorTrend(series: readonly DailyNetNew[], asOf: string): DenominatorTrend {
  const byDate = new Map(series.map((d) => [d.date, d.netNew]));
  const days = Array.from({ length: 21 }, (_, i) => addDays(asOf, i - 20)); // oldest → asOf
  const missing = days.filter((d) => {
    const v = byDate.get(d);
    return typeof v !== "number" || !Number.isFinite(v);
  });
  if (missing.length > 0) {
    // ★Not 0 and not "fine": the reader shows `missing` as unknown (yellow), so a gap is visible, not silent.
    return { as_of: asOf, last7_avg: null, prior14_avg: null, ratio: null, alert: false, reason: null, threshold: DENOMINATOR_ALERT_RATIO, missing };
  }
  const values = days.map((d) => byDate.get(d) as number);
  const prior14 = avg(values.slice(0, 14));
  const last7 = avg(values.slice(14));
  const ratio = prior14 > 0 ? Math.round((last7 / prior14) * 100) / 100 : null;
  const cliff = prior14 >= CLIFF_MIN_PRIOR_AVG && values[20] === 0;
  const low = ratio !== null && ratio < DENOMINATOR_ALERT_RATIO;
  return {
    as_of: asOf,
    last7_avg: last7,
    prior14_avg: prior14,
    ratio,
    alert: cliff || low,
    reason: cliff ? "cliff" : low ? "ratio" : null,
    threshold: DENOMINATOR_ALERT_RATIO,
    missing: [],
  };
}

//
// ★The four numbers kimny's PWA shows, derived from the daily funnel report — and nothing else.
//
// ★WHY THIS EXISTS (conductor, 2026-09-11; kimny: 「PWAまだ集計見れないね」). gw-dash can only read
// the conductor repo (`functions/api/conductor.ts` hardcodes REPO and whitelists paths "to prevent
// arbitrary path fetch via the PAT"), and the funnel numbers are not there. Rather than teach the
// dashboard a second repo — which would weaken that boundary — the collector publishes one more file
// to the orphan branch it ALREADY pushes to, and the existing cowork aggregation carries it across.
// ★No new credential: this repo's workflow holds only the default GITHUB_TOKEN, scoped to this repo
// (measured — the only secrets are CLOUDFLARE_*, DATABASE_URL*, GITHUB_TOKEN, RESEND_API_KEY).
//
// ★★WHAT IS DELIBERATELY NOT HERE: a division.
//
// The original request included "days remaining until 1,000". ★That is not a measurement, it is a
// forecast, and its value is decided by the window you pick: the 2026-09-09 report gives ~23 days
// from a one-day rate, and the per-shelf net-new that same day was muedsat 0 / muedlim 7 /
// muedrive 1 — ★so a zero-division day is not hypothetical. Emitting `remaining` and `net_new`
// separately and letting the SCREEN divide only moves that division somewhere else; it does not
// remove it. ★conductor's ruling: put the division nowhere. kimny can divide 186 by 8 in his head,
// and doing it that way he also sees how rough the number is.
//
// ★★AND WHY THE KEY IS `reachable_contacts` AND NOT `contacts`: the report carries two populations
// that both sound like "contacts" —
//     muedsp_reachable.count            = 814  ← the North Star denominator (subscribed, unique)
//     resend.mued_sp_total_contacts     = 832  ← includes unsubscribed; billing exposure
// ★"The same word pointing at two populations" is a shape this org has hit repeatedly, so it is
// closed in the NAME rather than in a comment nobody reads at the call site.
//

import type { Newsletter } from "./newsletters";
import type { DownloadLinkEmails } from "./download-link-emails";

/** The shape this reads out of `reports/plugin-funnel/<date>.json`. Only these fields are used. */
export interface FunnelReport {
  muedsp_reachable?: { count?: unknown };
  resend?: { mued_sp_net_new_day?: unknown };
  portal_registrations?: { cumulative?: unknown };
  generated_at?: unknown;
  newsletters?: unknown;
  download_link_emails?: unknown;
}

export interface FunnelNumbersMeta {
  /** `schedule` | `workflow_dispatch` — provenance, so a hand-run publish is not recorded as automated. */
  trigger: string;
  /** Link to the run that produced this, so "why is it stale" is answerable from the board. */
  workflow_run: string;
  /** The report this was derived from, e.g. `reports/plugin-funnel/2026-09-09.json`. */
  source_report: string;
}

export interface FunnelNumbers {
  reachable_contacts: number;
  net_new_day: number;
  remaining_to_1000: number;
  portal_registrations: number;
  measured_at: string;
  trigger: string;
  workflow_run: string;
  source_report: string;
  newsletters: Newsletter[] | null;
  download_link_emails: DownloadLinkEmails | null;
}

/** The North Star target the `remaining_to_1000` difference is taken against (kimny, 2026-07-18). */
export const NORTH_STAR_TARGET = 1000;

/**
 * ★Absence must not become a zero. A missing field means "this report could not tell us", and a 0 on
 * kimny's board is a claim — "nobody signed up" — not a gap. ★Throwing stops the publish step (it is
 * `if: success()`), so the PREVIOUS file stays: the board then shows an old `measured_at` rather than
 * a fresh-looking lie. ★Stale is recoverable; wrong is not noticed.
 */
function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `[funnel-numbers] ${path} is ${JSON.stringify(value)} — refusing to publish a number nobody measured`,
    );
  }
  return value;
}

export function toFunnelNumbers(report: FunnelReport, meta: FunnelNumbersMeta): FunnelNumbers {
  const reachable = requireNumber(report.muedsp_reachable?.count, "muedsp_reachable.count");
  const netNew = requireNumber(report.resend?.mued_sp_net_new_day, "resend.mued_sp_net_new_day");
  const portal = requireNumber(report.portal_registrations?.cumulative, "portal_registrations.cumulative");

  // ★`measured_at` is the report's own `generated_at` — WHEN THE NUMBERS WERE MEASURED, not when they
  //   were published. They differ by the length of the publish step (~1s today), and the board is
  //   asking "how old is this number", so the measurement time is the honest one. ★Passed through
  //   verbatim rather than re-formatted, so it cannot drift from the report it came from.
  const measuredAt = report.generated_at;
  if (typeof measuredAt !== "string" || !measuredAt) {
    throw new Error("[funnel-numbers] report has no generated_at — the freshness field would be a guess");
  }

  return {
    reachable_contacts: reachable,
    net_new_day: netNew,
    // ★A difference, not a rate — and NOT clamped at 0. Passing 1,000 is the goal; a negative here
    //   means it was passed, and clamping would hide exactly the day worth seeing.
    remaining_to_1000: NORTH_STAR_TARGET - reachable,
    portal_registrations: portal,
    measured_at: measuredAt,
    trigger: meta.trigger,
    workflow_run: meta.workflow_run,
    source_report: meta.source_report,
    // Older reports and failed collections still publish the four required numbers.
    newsletters: Array.isArray(report.newsletters) && report.newsletters.every((item) =>
      item !== null && typeof item === "object" && !Array.isArray(item) &&
      typeof item.id === "string" && typeof item.name === "string" && typeof item.sent_at === "string",
    ) ? report.newsletters as Newsletter[] : null,
    // Same rule: an older report, or a day the collector could not list back far enough, is null.
    download_link_emails: isDownloadLinkEmails(report.download_link_emails) ? report.download_link_emails : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDownloadLinkEmails(value: unknown): value is DownloadLinkEmails {
  if (!isRecord(value) || typeof value.since !== "string") return false;
  return [value.all_time, value.last_24h].every((w) =>
    isRecord(w) && isRecord(w.total) && typeof w.total.sent === "number" && isRecord(w.by_product),
  );
}

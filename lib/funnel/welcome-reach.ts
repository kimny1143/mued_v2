//
// ★Did the welcome email reach the people who signed up? — the collector's per-shelf anomaly check.
//
// ★WHY THIS MOVED OFF `delivered` (conductor, 2026-09-27). Resend keeps ONE status per mail, its
// latest event. Until click tracking was switched on (2026-09-23 15:51 JST) a reached mail mostly
// stayed `delivered`, so "db_net_new > delivered" meant "a welcome did not arrive". ★After it, a
// reached mail that was opened or clicked is no longer `delivered` — the better the email works, the
// smaller `delivered` gets — and the check fired every day on mail that had arrived (run 36323824708:
// muedsat db 4 > delivered 0, with all 4 clicked).
//
// ★`email_delivered` keeps its meaning (last status is exactly `delivered`) so nobody downstream
// reads a changed number under an unchanged name. The check reads the new `email_reached`.
//

/**
 * Latest statuses that mean the mail reached the inbox. ★`complained` is included: a spam report can
 * only come from a mail that arrived. ★This is the SAME set as `reached` in download_link_emails
 * (lib/funnel/download-link-emails.ts) so one report does not use "reached" for two populations
 * (CCO #1137). Without it, a complained welcome would raise a false 未達 line.
 */
export const REACHED_EVENTS: ReadonlySet<string> = new Set(["delivered", "opened", "clicked", "complained"]);

export function isReached(lastEvent: string | null | undefined): boolean {
  return REACHED_EVENTS.has(lastEvent ?? "");
}

/** One anomaly line per product whose sign-ups outnumber the welcome mails that reached anyone. */
export function welcomeReachAnomalies<K extends string>(
  keys: readonly K[],
  dbNetNew: Record<K, number>,
  emailReached: Record<K, number>,
): string[] {
  return keys
    .filter((k) => dbNetNew[k] > emailReached[k])
    .map((k) => `${k}: db_net_new(${dbNetNew[k]}) > email_reached(${emailReached[k]}) — welcome email未達の疑い`);
}

/**
 * ★Self-check, run by the collector every time. ★Scope: it exercises isReached and
 * welcomeReachAnomalies — the pure functions. It does NOT see the collector's own loop; that the loop
 * counts reach through isReached is pinned by the source-shape test in
 * tests/unit/funnel-welcome-reach.test.ts, not by this check (CCO #1137).
 * The check must FIRE on a case that really was not
 * reached, and must NOT fire on one that was reached only by a click — the case that used to fire.
 * A check that can no longer fire looks exactly like a quiet day.
 */
export function welcomeReachCheckHealthy(): boolean {
  const keys = ["p"] as const;
  const counted = (events: string[]) => ({ p: events.filter(isReached).length });
  const firesOnUnreached = welcomeReachAnomalies(keys, { p: 1 }, counted(["bounced"])).length === 1;
  const quietOnClicked = welcomeReachAnomalies(keys, { p: 1 }, counted(["clicked"])).length === 0;
  return firesOnUnreached && quietOnClicked;
}

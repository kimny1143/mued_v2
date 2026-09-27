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

/** Latest statuses that mean the mail reached the inbox. */
export const REACHED_EVENTS: ReadonlySet<string> = new Set(["delivered", "opened", "clicked"]);

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
 * ★Self-check, run by the collector every time. The check must FIRE on a case that really was not
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

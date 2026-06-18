/**
 * "Taking longer than usual" reassurance threshold per MUEDial render type.
 *
 * This is DISTINCT from DIAL_BACKSTOP_MS (lib/dial/task-timeout.ts), which is the last-resort
 * *fail* threshold. This threshold is the point past which a HEALTHY job is unusual-but-fine —
 * crossing it surfaces a reassuring "still working, it'll appear automatically" message, NEVER a
 * fail/abort (a too-eager abort here would re-introduce the false-fail regression that #434 fixed,
 * since real previews routinely run 8–22 min).
 *
 * Calibrated from the production completion distribution (kimny prod SELECT 2026-06-09, the same
 * source as DIAL_BACKSTOP_MS): preview p90 17.3 / final_advanced p90 13.6 / mastering_preview
 * max 15.2 (minutes). Thresholds sit near each type's p90 — so ~90% of healthy jobs finish before
 * the message ever shows, and only the genuine long tail (the users most likely to think it's
 * stuck and abandon) sees the reassurance.
 */
export const DIAL_LONG_WAIT_MS: Record<string, number> = {
  preview: 18 * 60_000,           // p90 17.3min
  mix_check: 5 * 60_000,          // max 2.3min — fast normally; >5min is unusual
  final: 15 * 60_000,            // generic "final" (mixGeneratingType) — track final_advanced
  final_basic: 12 * 60_000,       // n=1 at 4.8min — conservative
  final_advanced: 15 * 60_000,    // p90 13.6min (max 33.9min still well under the 120min backstop)
  mastering_preview: 16 * 60_000, // max 15.2min
  mastering: 5 * 60_000,          // max 0.1min — huge margin
};

/**
 * True when an active render of `activeType` has been processing past its "longer than usual"
 * threshold. An unknown/absent type returns false — we don't guess a threshold for a render type
 * we don't have prod timing for (better to stay silent than nag on a wrong estimate).
 */
export function isDialLongWait(
  activeType: string | null | undefined,
  elapsedSeconds: number,
): boolean {
  if (!activeType) return false;
  const thresholdMs = DIAL_LONG_WAIT_MS[activeType];
  if (thresholdMs === undefined) return false;
  return elapsedSeconds * 1000 > thresholdMs;
}

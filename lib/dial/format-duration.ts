/**
 * Format a take's generation duration (createdAt → completedAt) for persistent display in the
 * player's Take History, so the time each render took stays visible after the live timer clears.
 *
 * Returns null when there's no completedAt (still processing, or legacy rows with no completed_at)
 * or the interval is invalid — callers hide the label in that case (never crash). Format:
 *   < 60s  → "37秒で完了"
 *   ≥ 60s  → "1分49秒で完了"  (or "2分で完了" when the seconds are zero)
 */
export function formatTakeDuration(
  createdAt: string,
  completedAt?: string | null,
): string | null {
  if (!completedAt) return null;
  const start = new Date(createdAt).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const sec = Math.round((end - start) / 1000);
  if (sec < 0) return null;
  if (sec < 60) return `${sec}秒で完了`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}分で完了` : `${m}分${s}秒で完了`;
}

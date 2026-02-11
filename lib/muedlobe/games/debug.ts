/**
 * MUEDlobe Game Debug Utility
 *
 * Development-only logging for game events.
 * No-op in production.
 */

const DEBUG =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_GAME_DEBUG === '1';

export function gameLog(game: string, event: string, data?: Record<string, unknown>) {
  if (!DEBUG) return;
  console.log(`[MUEDlobe:${game}] ${event}`, data ?? '');
}

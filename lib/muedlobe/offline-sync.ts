/**
 * MUEDlobe - Offline Sync
 *
 * Saves game results to localStorage when offline,
 * syncs them to the server when connectivity is restored.
 */

import type { GameType } from "@/types/muedlobe";

const STORAGE_KEY = "muedlobe_pending_results";
const MAX_PENDING_RESULTS = 50;

interface PendingResult {
  gameType: GameType;
  rawData: Record<string, unknown>;
  calculatedScore: Record<string, unknown>;
  savedAt: string;
}

export function savePendingResult(
  gameType: GameType,
  rawData: Record<string, unknown>,
  calculatedScore: Record<string, unknown>,
): void {
  const pending = getPendingResults();
  if (pending.length >= MAX_PENDING_RESULTS) {
    // Drop oldest to stay within limit
    pending.shift();
  }
  pending.push({
    gameType,
    rawData,
    calculatedScore,
    savedAt: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export function getPendingResults(): PendingResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPendingResults(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Sync all pending results to the server.
 * Returns the count of successfully synced results.
 * Keeps failed results in the queue for retry.
 */
export async function syncPendingResults(): Promise<number> {
  const pending = getPendingResults();
  if (pending.length === 0) return 0;

  const failed: PendingResult[] = [];
  let synced = 0;

  for (const result of pending) {
    try {
      const res = await fetch("/api/lobe/measurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: result.gameType,
          rawData: result.rawData,
          calculatedScore: result.calculatedScore,
        }),
      });

      if (res.status === 401) {
        // Auth expired - keep in queue for retry after re-auth
        failed.push(result);
      } else if (res.ok) {
        synced++;
      } else {
        failed.push(result);
      }
    } catch {
      // Network error - keep in queue
      failed.push(result);
    }
  }

  if (failed.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(failed));
  } else {
    clearPendingResults();
  }

  return synced;
}

import type { TakeEntry } from '@/components/dial/unified-session-player';

/**
 * Pure builder for the v2 player's ordered take list (RAW → MIXED newest-first → MASTERED).
 *
 * Extracted from app/dial/session/[id]/page.tsx so the take/URL wiring is unit-testable.
 *
 * Correctness fix (PR-A, 2026-06-12): each MIXED take now gets its OWN task's stem URLs
 * (taskId-scoped via `stemStreamUrlByTask`). Previously all MIXED takes shared one session-scoped
 * proxy (`stemStreamUrl(sessionId, …)`), and /api/dial/download resolved `sessionId+stemKey` to the
 * FIRST preview task — so e.g. the "Preview 2" take actually played "Preview 1"'s stems.
 * A take falls back to the session-scoped proxy only when its own task has no stems yet (poll
 * desync), which preserves the prior B1 fix (FinalMix generation null-ing older takes' stem panels).
 */

/** Minimal track shape needed to build takes (subset of the page's Track). */
export interface SessionTakeTrack {
  id: string;
  originalFilename: string;
  r2Url?: string | null;
}

/** Minimal task shape needed to build takes (subset of the page's Task). */
export interface SessionTakeTask {
  id: string;
  taskType: string;
  status: string;
  previewUrl: string | null;
  finalUrl: string | null;
  stemsUrls: Record<string, string> | null;
  createdAt: string;
}

export interface SessionTakeInput {
  id: string;
  tracks: SessionTakeTrack[];
  tasks: SessionTakeTask[];
}

/** Stream a task's main mix/master through our API (avoids GCS presigned URL length/CORS). */
export function taskStreamUrl(taskId: string): string {
  return `/api/dial/download?taskId=${taskId}&inline=1`;
}

/** Session-scoped stem proxy — server resolves to the best available task. Used only as a fallback
 *  for takes whose own task's stems are not yet populated (poll desync / B1 null-panel). */
export function stemStreamUrl(sessionId: string, stemKey: string, token?: string | null): string {
  const base = `/api/dial/download?sessionId=${sessionId}&stemKey=${encodeURIComponent(stemKey)}&inline=1`;
  return token ? `${base}&token=${encodeURIComponent(token)}` : base;
}

/** Take-scoped stem proxy — resolves to THIS task's stems, so each MIXED take plays its own stems
 *  instead of the first preview task's (the Preview2-plays-Preview1 reference bug). */
export function stemStreamUrlByTask(taskId: string, stemKey: string, token?: string | null): string {
  const base = `/api/dial/download?taskId=${taskId}&stemKey=${encodeURIComponent(stemKey)}&inline=1`;
  return token ? `${base}&token=${encodeURIComponent(token)}` : base;
}

const hasStems = (t: SessionTakeTask): boolean =>
  !!t.stemsUrls && Object.keys(t.stemsUrls).length > 0;

/** Real stem keys, excluding RoEx effect-return entries (reverb_send*). */
const stemKeysOf = (urls: Record<string, string>): string[] =>
  Object.keys(urls).filter((k) => !k.startsWith('reverb_send'));

export function buildSessionTakes(
  session: SessionTakeInput,
  guestToken?: string | null,
): TakeEntry[] {
  // Session-scoped fallback stems (server resolves to best task). Only used when a MIXED take's
  // own task has no stems yet — preserves the B1 fix without sharing one task's stems across takes.
  const stemTaskForKeys = session.tasks.find(hasStems);
  const sessionStems = stemTaskForKeys
    ? Object.fromEntries(
        stemKeysOf(stemTaskForKeys.stemsUrls!).map((k) => [k, stemStreamUrl(session.id, k, guestToken)]),
      )
    : null;

  const perTakeStems = (task: SessionTakeTask): Record<string, string> | null =>
    hasStems(task)
      ? Object.fromEntries(
          stemKeysOf(task.stemsUrls!).map((k) => [k, stemStreamUrlByTask(task.id, k, guestToken)]),
        )
      : sessionStems;

  const takes: TakeEntry[] = [];

  const mixFinalTask = session.tasks.find(
    (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
  );
  const masteringFinalTask = session.tasks.find((t) => t.taskType === 'mastering' && t.finalUrl);

  // RAW: enabled once stems are uploaded. Key = originalFilename (human-readable in StemPanel).
  const rawStemEntries = session.tracks
    .filter((t) => !!t.r2Url)
    .map((t) => [(t.originalFilename ?? t.id), t.r2Url as string] as const);
  if (rawStemEntries.length > 0) {
    takes.push({
      id: `raw-${session.id}`,
      label: 'RAW',
      url: rawStemEntries[0][1],
      stemsUrls: Object.fromEntries(rawStemEntries),
      createdAt: mixFinalTask?.createdAt ?? masteringFinalTask?.createdAt ?? '',
      enabled: true,
    });
  }

  // MIXED: completed finals > mix_checks > previews. Numbered chronologically (oldest = #1).
  const completedPreviews = [...session.tasks]
    .filter((t) => t.taskType === 'preview' && t.status === 'completed' && !!(t.previewUrl || t.finalUrl))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const completedMixChecks = [...session.tasks]
    .filter((t) => t.taskType === 'mix_check' && t.status === 'completed' && !!(t.previewUrl || t.finalUrl))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const completedFinals = session.tasks.filter(
    (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.status === 'completed' && !!t.finalUrl,
  );

  // All completed MIXED takes, newest first for display.
  const allCompletedMix = [
    ...completedFinals.map((t) => ({ task: t, sublabel: 'Final Mix' })),
    ...completedMixChecks.map((t, i) => ({ task: t, sublabel: `Mix Check ${i + 1}` })),
    ...completedPreviews.map((t, i) => ({ task: t, sublabel: `Preview ${i + 1}` })),
  ].sort((a, b) => new Date(b.task.createdAt).getTime() - new Date(a.task.createdAt).getTime());

  allCompletedMix.forEach(({ task, sublabel }) => {
    takes.push({
      id: task.id,
      label: 'MIXED',
      sublabel,
      url: taskStreamUrl(task.id),
      stemsUrls: perTakeStems(task),
      createdAt: task.createdAt,
      enabled: true,
    });
  });

  // Processing MIXED task (disabled pill) — only when no completed takes exist yet.
  const processingMix = session.tasks.find(
    (t) =>
      (t.taskType === 'preview' || t.taskType === 'mix_check' ||
        t.taskType === 'final_basic' || t.taskType === 'final_advanced') &&
      (t.status === 'processing' || t.status === 'pending'),
  );
  if (processingMix && allCompletedMix.length === 0) {
    takes.push({
      id: processingMix.id,
      label: 'MIXED',
      sublabel: 'Processing…',
      url: '',
      stemsUrls: null,
      createdAt: processingMix.createdAt,
      enabled: false,
    });
  }

  // MASTERED: final > preview > processing(disabled).
  const masteringFinalOrProcessingTask =
    masteringFinalTask ??
    session.tasks.find((t) => t.taskType === 'mastering' && (t.status === 'processing' || t.status === 'pending'));
  if (masteringFinalOrProcessingTask) {
    const isMasteredEnabled =
      masteringFinalOrProcessingTask.status === 'completed' && !!masteringFinalOrProcessingTask.finalUrl;
    takes.push({
      id: masteringFinalOrProcessingTask.id,
      label: 'MASTERED',
      sublabel: 'Final',
      url: taskStreamUrl(masteringFinalOrProcessingTask.id),
      stemsUrls: null,
      createdAt: masteringFinalOrProcessingTask.createdAt,
      enabled: isMasteredEnabled,
    });
  } else {
    const masteringPreviewPlayable = session.tasks.find(
      (t) => t.taskType === 'mastering_preview' && t.status === 'completed' && !!t.previewUrl,
    );
    if (masteringPreviewPlayable) {
      takes.push({
        id: masteringPreviewPlayable.id,
        label: 'MASTERED',
        sublabel: 'Preview',
        url: taskStreamUrl(masteringPreviewPlayable.id),
        stemsUrls: null,
        createdAt: masteringPreviewPlayable.createdAt,
        enabled: true,
      });
    }
  }

  return takes;
}

/**
 * MUEDial ⑤ dialogue-iteration correctness — pure client-orchestration helpers.
 *
 * Background: RoEx `/retrievefinalmix` is task-level idempotent — a 2nd effects-apply on the SAME
 * preview task returns the CACHED first render (the ⑤ bug: adjustments don't take). The fix mints a
 * FRESH preview per render. But `/retrievefinalmix` requires the base preview to be RENDERED first
 * (8-22min), so it can't be done synchronously in `/api/dial/final`; the client orchestrates it by
 * re-running the existing async `/preview` then `/final`. See
 * docs/dial-iteration-correctness-implementation-plan.md + memory
 * reference-roex-retrievefinalmix-needs-ready-preview.
 *
 * Extracted here as pure functions so the orchestration decisions are unit-testable.
 */

/** Minimal task shape needed by the orchestration helpers. */
export interface IterTask {
  id: string;
  taskType: string;
  status: string;
  previewUrl: string | null;
  finalUrl: string | null;
  createdAt: string;
}

/** Render task types that "consume" a preview (each is a `/retrievefinalmix` charge). */
const RENDER_TYPES = new Set(['mix_check', 'final_basic', 'final_advanced']);

const ms = (iso: string): number => new Date(iso).getTime();

/** True when `task` is a render (mix_check / final) created at-or-after `sinceMs`. */
function hasRenderAtOrAfter(tasks: IterTask[], sinceMs: number): boolean {
  return tasks.some((t) => RENDER_TYPES.has(t.taskType) && ms(t.createdAt) >= sinceMs);
}

/**
 * The latest completed preview that has NOT yet been used for a render. Its first
 * `/retrievefinalmix` is a fresh (un-cached) render, so it is SAFE to render on exactly once —
 * meaning the very first mix_check/final after a preview keeps today's fast path (no fresh mint).
 *
 * Returns null when the latest preview was already rendered → the caller must mint a fresh preview
 * (the ⑤ fix path for the 2nd+ iteration).
 */
export function getUnusedCompletedPreview<T extends IterTask>(tasks: T[]): T | null {
  const completedPreviews = tasks
    .filter((t) => t.taskType === 'preview' && t.status === 'completed' && !!(t.previewUrl || t.finalUrl))
    .sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  const latest = completedPreviews[0];
  if (!latest) return null;
  return hasRenderAtOrAfter(tasks, ms(latest.createdAt)) ? null : latest;
}

/**
 * True when a preview task is superseded by a later render (mix_check/final) and should be HIDDEN
 * from the take list as an intermediate. The initial preview stays visible until the first
 * mix_check; the fresh previews minted per iteration never clutter the list.
 */
export function isSupersededPreview<T extends IterTask>(preview: T, tasks: T[]): boolean {
  if (preview.taskType !== 'preview') return false;
  return hasRenderAtOrAfter(tasks, ms(preview.createdAt));
}

/** Drop superseded intermediate previews from a task list (preserves all other tasks/order). */
export function withoutIntermediatePreviews<T extends IterTask>(tasks: T[]): T[] {
  return tasks.filter((t) => !isSupersededPreview(t, tasks));
}

/**
 * Order-stable signature of Hoo parameter changes for detect-and-regen. Two renders with the same
 * signature would produce the same effects, so re-rendering an unchanged signature is a wasted
 * charge — the caller returns the existing take instead. '' for empty/none.
 *
 * NOTE: client-side detect-and-regen is fail-SAFE — a missed match only falls back to the existing
 * (bounded by baseCycleLimit) re-render; it can never CAUSE an extra charge beyond the baseline.
 */
export function paramsSignature(paramChanges: unknown): string {
  if (paramChanges == null) return '';
  return stableStringify(paramChanges);
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

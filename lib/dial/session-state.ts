/**
 * MUEDial explicit session state machine (Tier3 Phase 1).
 *
 * Source of truth for workflow phase, replacing the task-inference in lib/dial/phase.ts
 * (detectPhase / isMasteringPhase). Backed by dial_sessions.state (migration 0054).
 *
 * Canonical transitions (docs/dial/tier3-statemachine-billing-plan-20260617.md §2, with kimny's
 * simplified rollback): rollback to mix is allowed ONLY from pre-master-commit states (free); once
 * the master is committed (`mastered_final`), redoing it is a NEW mastering-only session — there is
 * no `mastered_final → mix` edge. Every transition is validated; invalid transitions throw rather
 * than silently fall back (the §2 "no silent fallback" invariant).
 *
 * This module is pure (no DB / Stripe / RoEx) so the graph is fully unit-testable. The DB write
 * (applyTransition) and tool-gating (selectToolsByState) compose on top in the route/prompt layers.
 */

export type DialState =
  | 'uploading'
  | 'previewing'
  | 'mix_review'
  | 'mix_final'
  | 'mastering_review'
  | 'mastered_final'
  | 'settling'
  | 'delivered';

export const DIAL_STATES: readonly DialState[] = [
  'uploading',
  'previewing',
  'mix_review',
  'mix_final',
  'mastering_review',
  'mastered_final',
  'settling',
  'delivered',
] as const;

/**
 * Allowed target states from each state (the §2 transition table).
 * - mix_review → previewing : re-adjust the mix
 * - mix_final → mix_review : pre-master rollback (free; master not yet committed)
 * - mastering_review → mix_review : rollback to mix (free; master not yet committed)
 * - mastering_review → mastered_final : approve master (220cr fires here)
 * - mastered_final → settling | delivered : download (unsettled > 0 settles first; = 0 delivers)
 * - settling → delivered : payment confirmed ; settling → mastered_final : payment cancel/fail
 * - mastered_final has NO edge back to mix (kimny: re-master = new mastering-only session)
 */
export const DIAL_STATE_TRANSITIONS: Record<DialState, readonly DialState[]> = {
  uploading: ['previewing'],
  previewing: ['mix_review'],
  mix_review: ['previewing', 'mix_final'],
  mix_final: ['mastering_review', 'mix_review'],
  mastering_review: ['mastered_final', 'mix_review'],
  mastered_final: ['settling', 'delivered'],
  settling: ['delivered', 'mastered_final'],
  delivered: [],
};

export class InvalidDialTransitionError extends Error {
  constructor(public readonly from: DialState, public readonly to: DialState) {
    super(`Invalid MUEDial state transition: ${from} → ${to}`);
    this.name = 'InvalidDialTransitionError';
  }
}

/** True if `from → to` is a permitted transition. */
export function canTransition(from: DialState, to: DialState): boolean {
  return DIAL_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throw on an invalid transition (no silent fallback — §2 invariant). */
export function assertTransition(from: DialState, to: DialState): void {
  if (!canTransition(from, to)) throw new InvalidDialTransitionError(from, to);
}

// ─── Pure phase predicates (replace detectPhase / isMasteringPhase reads) ──────────────────────

/** Hoo mix-change tools (adjust_preview / request_mix_check / set_reverb / faders) are allowed. */
export function isMixEditable(state: DialState): boolean {
  return state === 'previewing' || state === 'mix_review';
}

/** Mastering phase (preview-review or committed). Mirrors the old isMasteringPhase=true intent. */
export function isMasteringState(state: DialState): boolean {
  return state === 'mastering_review' || state === 'mastered_final';
}

/** Mix is locked: changes require an explicit rollback (mix_final onward). (Y-06) */
export function isMixLocked(state: DialState): boolean {
  return !isMixEditable(state) && state !== 'uploading';
}

/** Rollback to mix is offered (free) — only from pre-master-commit states. (kimny) */
export function canRollbackToMix(state: DialState): boolean {
  return state === 'mix_final' || state === 'mastering_review';
}

/** Terminal state (clean deliverable downloadable). */
export function isTerminal(state: DialState): boolean {
  return state === 'delivered';
}

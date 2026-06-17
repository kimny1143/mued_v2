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
 * - uploading → mastering_review : mastering-only session (session.mode = null) skips the mix phase
 *
 * The graph is structural (mode-agnostic). Mode-specific validity (a mix-flow session can't jump
 * uploading→mastering_review; a mastering-only session has no mix states/rollback) is enforced by
 * the optional `masteringOnly` arg on canTransition/assertTransition. (product review 2026-06-17)
 */
export const DIAL_STATE_TRANSITIONS: Record<DialState, readonly DialState[]> = {
  uploading: ['previewing', 'mastering_review'],
  previewing: ['mix_review'],
  mix_review: ['previewing', 'mix_final'],
  mix_final: ['mastering_review', 'mix_review'],
  mastering_review: ['mastered_final', 'mix_review'],
  mastered_final: ['settling', 'delivered'],
  settling: ['delivered', 'mastered_final'],
  delivered: [],
};

/** Edges valid ONLY in the mix flow (session.mode set) — forbidden for mastering-only sessions. */
const MIX_FLOW_ONLY_EDGES: ReadonlySet<string> = new Set([
  'uploading→previewing',
  'previewing→mix_review',
  'mix_review→previewing',
  'mix_review→mix_final',
  'mix_final→mastering_review',
  'mix_final→mix_review',
  'mastering_review→mix_review',
]);

/** Edges valid ONLY in the mastering-only flow (session.mode = null) — forbidden for mix-flow. */
const MASTERING_ONLY_EDGES: ReadonlySet<string> = new Set(['uploading→mastering_review']);

export class InvalidDialTransitionError extends Error {
  constructor(public readonly from: DialState, public readonly to: DialState) {
    super(`Invalid MUEDial state transition: ${from} → ${to}`);
    this.name = 'InvalidDialTransitionError';
  }
}

/**
 * True if `from → to` is a permitted transition.
 *
 * Pass `opts.masteringOnly` to additionally apply mode-specific gating:
 *   - masteringOnly=true  (session.mode = null): mix-flow edges are forbidden (uploading enters
 *     mastering_review directly; no mix states / no mix rollback).
 *   - masteringOnly=false (session.mode set): the mastering-only entry edge is forbidden (must go
 *     through the mix phase).
 * Omit `opts` for a structural-only check (mode-agnostic).
 */
export function canTransition(
  from: DialState,
  to: DialState,
  opts?: { masteringOnly?: boolean },
): boolean {
  if (!(DIAL_STATE_TRANSITIONS[from]?.includes(to) ?? false)) return false;
  if (opts?.masteringOnly === undefined) return true;
  const edge = `${from}→${to}`;
  return opts.masteringOnly ? !MIX_FLOW_ONLY_EDGES.has(edge) : !MASTERING_ONLY_EDGES.has(edge);
}

/** Throw on an invalid transition (no silent fallback — §2 invariant). */
export function assertTransition(
  from: DialState,
  to: DialState,
  opts?: { masteringOnly?: boolean },
): void {
  if (!canTransition(from, to, opts)) throw new InvalidDialTransitionError(from, to);
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

/**
 * Linear progress rank of each state. Used by route lifecycle writes to advance `state`
 * MONOTONICALLY — a render/approval event sets the state forward but a late or duplicate task
 * event (e.g. a webhook arriving after the user already advanced) must never regress it.
 * Backward moves (rollback) and the settle/deliver branch are decision-driven (Phase 2/3), not
 * lifecycle writes, so a strict forward rank is the right guard for Phase 1b's write-side.
 */
const STATE_RANK: Record<DialState, number> = {
  uploading: 0,
  previewing: 1,
  mix_review: 2,
  mix_final: 3,
  mastering_review: 4,
  mastered_final: 5,
  settling: 6,
  delivered: 7,
};

/** True iff `to` is strictly forward of `from` (for monotonic lifecycle advances). */
export function isForwardState(from: DialState, to: DialState): boolean {
  return STATE_RANK[to] > STATE_RANK[from];
}

/** The forward-most of two states (the state a lifecycle write should leave the session in). */
export function maxState(a: DialState, b: DialState): DialState {
  return STATE_RANK[a] >= STATE_RANK[b] ? a : b;
}

/**
 * The session state a *completed* task of the given type implies — the render/approval lifecycle
 * point routes/webhook advance to (forward-only via advanceDialSessionState). Independent of
 * session.mode: a mastering-only session's first completed task is mastering_preview, which advances
 * uploading→mastering_review directly. Returns null for task types that don't move the session state.
 *
 * Note: a completed `final_*` task means the mix is finalized → mix_final. Whether mastering follows
 * is driven by the separate mastering tasks (→ mastering_review / mastered_final), not by this mix
 * completion — so masteringMode is irrelevant here (unlike the legacy `status` mapping).
 */
export function sessionStateForCompletedTask(taskType: string): DialState | null {
  switch (taskType) {
    case 'preview':
      return 'previewing';
    case 'mix_check':
      return 'mix_review';
    case 'final_basic':
    case 'final_advanced':
      return 'mix_final';
    case 'mastering_preview':
      return 'mastering_review';
    case 'mastering':
      return 'mastered_final';
    default:
      return null;
  }
}

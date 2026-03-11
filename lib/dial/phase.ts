/**
 * MUEDial Phase Detection & Tool Selection
 *
 * Pure functions extracted from app/api/dial/chat/route.ts for testability.
 */

import {
  DIAL_MIX_ACTION_TOOL,
  DIAL_SET_STYLE_TOOL,
  DIAL_OMAKASE_MIX_ACTION_TOOL,
  DIAL_MASTERING_ACTION_TOOL,
} from '@/lib/ai/prompts/dial';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TaskRecord {
  taskType: string;
  status: string;
  finalUrl?: string | null;
}

export interface SessionState {
  mode: string | null;
  masteringMode: string | null;
  mixCheckCount: number;
  previewCount: number;
}

export interface PhaseResult {
  phase: 1 | 2 | 3;
  isMasteringPhase: boolean;
  hasMixCheck: boolean;
  hasMixFinal: boolean;
  hasMasteringPreview: boolean;
  hasMasteringFinal: boolean;
  masteringPreviewCount: number;
  mixFinalTask: TaskRecord | undefined;
}

// ─── Phase Detection ────────────────────────────────────────────────────────

/**
 * Determine the current phase and mastering state from session + tasks.
 */
export function detectPhase(session: SessionState, tasks: TaskRecord[]): PhaseResult {
  const isMasteringOnly = !session.mode && !!session.masteringMode;
  const isOmakase = session.mode === 'omakase';

  const hasMixCheck = session.mixCheckCount > 0;
  const hasMixFinal = tasks.some(
    (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
  );
  const hasMasteringPreview = tasks.some(
    (t) => t.taskType === 'mastering_preview' && t.status === 'completed',
  );
  const hasMasteringFinal = tasks.some(
    (t) => t.taskType === 'mastering' && t.finalUrl,
  );
  const masteringPreviewCount = tasks.filter(
    (t) => t.taskType === 'mastering_preview',
  ).length;
  const mixFinalTask = tasks.find(
    (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
  );

  // Mastering phase: mastering-only (always until done), or mix+mastering (after mix final)
  const isMasteringPhase = isMasteringOnly
    ? !hasMasteringFinal
    : (!!session.masteringMode && hasMixFinal && !hasMasteringFinal);

  // Phase detection
  let phase: 1 | 2 | 3;
  if (isOmakase) {
    phase = hasMixFinal ? 3 : 1; // omakase has no Phase 2
  } else if (hasMixFinal) {
    phase = 3;
  } else if (hasMixCheck) {
    phase = 2;
  } else {
    phase = 1;
  }

  return {
    phase,
    isMasteringPhase,
    hasMixCheck,
    hasMixFinal,
    hasMasteringPreview,
    hasMasteringFinal,
    masteringPreviewCount,
    mixFinalTask,
  };
}

// ─── Tool Selection ─────────────────────────────────────────────────────────

/**
 * Select the appropriate tools based on mode and mastering state.
 */
export function selectTools(opts: {
  isMasteringPhase: boolean;
  isOmakase: boolean;
}) {
  if (opts.isMasteringPhase) {
    return [DIAL_MASTERING_ACTION_TOOL, DIAL_SET_STYLE_TOOL];
  }
  if (opts.isOmakase) {
    return [DIAL_OMAKASE_MIX_ACTION_TOOL];
  }
  return [DIAL_MIX_ACTION_TOOL, DIAL_SET_STYLE_TOOL];
}

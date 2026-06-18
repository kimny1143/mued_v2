import { describe, it, expect } from 'vitest';
import {
  type DialState,
  DIAL_STATES,
  canTransition,
  assertTransition,
  InvalidDialTransitionError,
  isMixEditable,
  isMasteringState,
  isMixLocked,
  canRollbackToMix,
  isTerminal,
  isForwardState,
  maxState,
  sessionStateForCompletedTask,
  isMasteringToolPhase,
} from '@/lib/dial/session-state';

describe('dial session state machine — transitions (§2)', () => {
  it('allows the happy-path forward transitions', () => {
    expect(canTransition('uploading', 'previewing')).toBe(true);
    expect(canTransition('previewing', 'mix_review')).toBe(true);
    expect(canTransition('mix_review', 'mix_final')).toBe(true);
    expect(canTransition('mix_final', 'mastering_review')).toBe(true);
    expect(canTransition('mastering_review', 'mastered_final')).toBe(true);
    expect(canTransition('mastered_final', 'delivered')).toBe(true);
    expect(canTransition('mastered_final', 'settling')).toBe(true);
    expect(canTransition('settling', 'delivered')).toBe(true);
  });

  it('allows re-adjust (mix_review → previewing) and payment cancel (settling → mastered_final)', () => {
    expect(canTransition('mix_review', 'previewing')).toBe(true);
    expect(canTransition('settling', 'mastered_final')).toBe(true);
  });

  it('allows free rollback to mix ONLY from pre-master-commit states (kimny)', () => {
    expect(canTransition('mix_final', 'mix_review')).toBe(true);
    expect(canTransition('mastering_review', 'mix_review')).toBe(true);
  });

  it('FORBIDS mastered_final → mix_review (abolished; re-master = new session)', () => {
    // kimny decision 2026-06-17: once the master is committed (220cr), there is no rollback to mix.
    expect(canTransition('mastered_final', 'mix_review')).toBe(false);
    expect(canTransition('mastered_final', 'previewing')).toBe(false);
    expect(canTransition('mastered_final', 'mix_final')).toBe(false);
  });

  it('forbids skips and backward jumps', () => {
    expect(canTransition('uploading', 'mix_final')).toBe(false);
    expect(canTransition('previewing', 'mastering_review')).toBe(false);
    expect(canTransition('mix_review', 'mastered_final')).toBe(false);
    expect(canTransition('delivered', 'mastered_final')).toBe(false);
  });

  it('delivered is terminal (no outgoing transitions)', () => {
    for (const to of DIAL_STATES) {
      expect(canTransition('delivered', to)).toBe(false);
    }
    expect(isTerminal('delivered')).toBe(true);
    expect(isTerminal('mastered_final')).toBe(false);
  });

  it('assertTransition throws InvalidDialTransitionError on an invalid edge, passes on a valid one', () => {
    expect(() => assertTransition('mastered_final', 'mix_review')).toThrow(InvalidDialTransitionError);
    expect(() => assertTransition('uploading', 'delivered')).toThrow(/uploading → delivered/);
    expect(() => assertTransition('mix_review', 'mix_final')).not.toThrow();
  });
});

describe('dial session state machine — phase predicates', () => {
  it('isMixEditable only in previewing / mix_review', () => {
    const editable: DialState[] = ['previewing', 'mix_review'];
    for (const s of DIAL_STATES) {
      expect(isMixEditable(s)).toBe(editable.includes(s));
    }
  });

  it('isMasteringState in mastering_review / mastered_final', () => {
    expect(isMasteringState('mastering_review')).toBe(true);
    expect(isMasteringState('mastered_final')).toBe(true);
    expect(isMasteringState('mix_final')).toBe(false);
    expect(isMasteringState('previewing')).toBe(false);
  });

  it('isMixLocked from mix_final onward (not while editable or uploading)', () => {
    expect(isMixLocked('uploading')).toBe(false);
    expect(isMixLocked('previewing')).toBe(false);
    expect(isMixLocked('mix_review')).toBe(false);
    expect(isMixLocked('mix_final')).toBe(true);
    expect(isMixLocked('mastering_review')).toBe(true);
    expect(isMixLocked('mastered_final')).toBe(true);
    expect(isMixLocked('delivered')).toBe(true);
  });

  it('canRollbackToMix only from pre-master-commit (mix_final / mastering_review)', () => {
    expect(canRollbackToMix('mix_final')).toBe(true);
    expect(canRollbackToMix('mastering_review')).toBe(true);
    expect(canRollbackToMix('mastered_final')).toBe(false);
    expect(canRollbackToMix('mix_review')).toBe(false);
    expect(canRollbackToMix('delivered')).toBe(false);
  });
});

describe('dial session state machine — mode-aware transitions (mastering-only vs mix-flow)', () => {
  it('structural (no opts): both uploading→previewing and uploading→mastering_review are valid edges', () => {
    expect(canTransition('uploading', 'previewing')).toBe(true);
    expect(canTransition('uploading', 'mastering_review')).toBe(true);
  });

  it('mastering-only (mode=null): enters mastering_review directly, mix-flow edges forbidden', () => {
    expect(canTransition('uploading', 'mastering_review', { masteringOnly: true })).toBe(true);
    expect(canTransition('mastering_review', 'mastered_final', { masteringOnly: true })).toBe(true);
    // mix-flow edges are not available to a mastering-only session
    expect(canTransition('uploading', 'previewing', { masteringOnly: true })).toBe(false);
    expect(canTransition('mastering_review', 'mix_review', { masteringOnly: true })).toBe(false);
  });

  it('mix-flow (mode set): must enter via the mix phase — direct uploading→mastering_review forbidden', () => {
    expect(canTransition('uploading', 'mastering_review', { masteringOnly: false })).toBe(false);
    expect(canTransition('uploading', 'previewing', { masteringOnly: false })).toBe(true);
    expect(canTransition('mix_final', 'mastering_review', { masteringOnly: false })).toBe(true);
    expect(canTransition('mastering_review', 'mix_review', { masteringOnly: false })).toBe(true);
  });

  it('shared edges (master approve / download / settle) are valid in both modes', () => {
    for (const masteringOnly of [true, false]) {
      expect(canTransition('mastering_review', 'mastered_final', { masteringOnly })).toBe(true);
      expect(canTransition('mastered_final', 'delivered', { masteringOnly })).toBe(true);
      expect(canTransition('mastered_final', 'settling', { masteringOnly })).toBe(true);
      expect(canTransition('settling', 'delivered', { masteringOnly })).toBe(true);
    }
  });

  it('assertTransition honors the mode gate', () => {
    expect(() => assertTransition('uploading', 'mastering_review', { masteringOnly: false })).toThrow(InvalidDialTransitionError);
    expect(() => assertTransition('uploading', 'mastering_review', { masteringOnly: true })).not.toThrow();
  });
});

describe('dial session state machine — forward-only lifecycle advance (write-side guard)', () => {
  it('isForwardState: strictly forward by rank', () => {
    expect(isForwardState('uploading', 'previewing')).toBe(true);
    expect(isForwardState('uploading', 'mastering_review')).toBe(true); // mastering-only jump
    expect(isForwardState('mix_review', 'mix_final')).toBe(true);
    expect(isForwardState('mastered_final', 'delivered')).toBe(true);
    // not forward (equal or backward) — guards late/duplicate task events from regressing state
    expect(isForwardState('mix_final', 'mix_final')).toBe(false);
    expect(isForwardState('mastered_final', 'previewing')).toBe(false);
    expect(isForwardState('mastering_review', 'mix_review')).toBe(false);
  });

  it('maxState returns the forward-most state', () => {
    expect(maxState('previewing', 'mix_review')).toBe('mix_review');
    expect(maxState('mastered_final', 'previewing')).toBe('mastered_final');
    expect(maxState('uploading', 'uploading')).toBe('uploading');
  });
});

describe('sessionStateForCompletedTask — task completion → target state (write-side mapping)', () => {
  it('maps each completed task type to the state it implies', () => {
    expect(sessionStateForCompletedTask('preview')).toBe('previewing');
    expect(sessionStateForCompletedTask('mix_check')).toBe('mix_review');
    expect(sessionStateForCompletedTask('final_basic')).toBe('mix_final');
    expect(sessionStateForCompletedTask('final_advanced')).toBe('mix_final');
    expect(sessionStateForCompletedTask('mastering_preview')).toBe('mastering_review');
    expect(sessionStateForCompletedTask('mastering')).toBe('mastered_final');
  });

  it('returns null for unknown / non-advancing task types', () => {
    expect(sessionStateForCompletedTask('unknown')).toBeNull();
    expect(sessionStateForCompletedTask('')).toBeNull();
  });

  it('mastering-only entry: a completed mastering_preview advances uploading→mastering_review (forward)', () => {
    const target = sessionStateForCompletedTask('mastering_preview')!;
    expect(target).toBe('mastering_review');
    expect(isForwardState('uploading', target)).toBe(true);
  });
});

describe('isMasteringToolPhase — read-side mastering-tool gate (replaces isMasteringPhase)', () => {
  it('mix-only session (no masteringMode): never the mastering tool phase', () => {
    for (const s of DIAL_STATES) {
      expect(isMasteringToolPhase(s, 'dialogue', null)).toBe(false);
    }
  });

  it('mastering-only session (mode=null): any pre-commit state, off once committed', () => {
    expect(isMasteringToolPhase('uploading', null, 'dialogue')).toBe(true);
    expect(isMasteringToolPhase('mastering_review', null, 'dialogue')).toBe(true);
    expect(isMasteringToolPhase('mastered_final', null, 'dialogue')).toBe(false);
    expect(isMasteringToolPhase('settling', null, 'dialogue')).toBe(false);
    expect(isMasteringToolPhase('delivered', null, 'dialogue')).toBe(false);
  });

  it('mix+master session: only AFTER the mix is finalized (mix_final / mastering_review)', () => {
    // still mixing → no mastering tool
    expect(isMasteringToolPhase('uploading', 'dialogue', 'dialogue')).toBe(false);
    expect(isMasteringToolPhase('previewing', 'dialogue', 'dialogue')).toBe(false);
    expect(isMasteringToolPhase('mix_review', 'dialogue', 'dialogue')).toBe(false);
    // mix finalized → mastering tool live
    expect(isMasteringToolPhase('mix_final', 'dialogue', 'dialogue')).toBe(true);
    expect(isMasteringToolPhase('mastering_review', 'dialogue', 'dialogue')).toBe(true);
    // master committed → off
    expect(isMasteringToolPhase('mastered_final', 'dialogue', 'dialogue')).toBe(false);
    expect(isMasteringToolPhase('delivered', 'dialogue', 'dialogue')).toBe(false);
  });

  it('TRAP 1: NOT equal to isMasteringState — diverges at mix_final and mastered_final', () => {
    // mix_final: tool phase TRUE (handoff) but isMasteringState FALSE → naive swap would regress
    expect(isMasteringToolPhase('mix_final', 'dialogue', 'dialogue')).toBe(true);
    expect(isMasteringState('mix_final')).toBe(false);
    // mastered_final: tool phase FALSE (committed) but isMasteringState TRUE → naive swap over-exposes
    expect(isMasteringToolPhase('mastered_final', 'dialogue', 'dialogue')).toBe(false);
    expect(isMasteringState('mastered_final')).toBe(true);
  });
});

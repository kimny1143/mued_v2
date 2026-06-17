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

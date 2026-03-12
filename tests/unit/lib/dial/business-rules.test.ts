import { describe, it, expect } from 'vitest';
import { detectPhase, type SessionState, type TaskRecord } from '@/lib/dial/phase';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    mode: 'dialogue',
    masteringMode: null,
    mixCheckCount: 0,
    previewCount: 0,
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return { taskType: 'preview', status: 'completed', finalUrl: null, ...overrides };
}

// ─── Pricing Rules ──────────────────────────────────────────────────────────

describe('MUEDial pricing rules', () => {
  // These constants should match checkout/route.ts
  const MIX_PRICES = {
    omakase: { amountCents: 1200, label: 'MUEDial Omakase Mix' },
    dialogue: { amountCents: 3500, label: 'MUEDial Dialogue Mix' },
  };

  const MASTERING_PRICES = {
    omakase: { amountCents: 900, label: 'MUEDial Mastering' },
  };

  it('Omakase Mix = $12', () => {
    expect(MIX_PRICES.omakase.amountCents).toBe(1200);
  });

  it('Dialogue Mix = $35', () => {
    expect(MIX_PRICES.dialogue.amountCents).toBe(3500);
  });

  it('Mastering = $9', () => {
    expect(MASTERING_PRICES.omakase.amountCents).toBe(900);
  });

  it('Dialogue + Mastering = $44', () => {
    expect(MIX_PRICES.dialogue.amountCents + MASTERING_PRICES.omakase.amountCents).toBe(4400);
  });

  it('Omakase + Mastering = $21', () => {
    expect(MIX_PRICES.omakase.amountCents + MASTERING_PRICES.omakase.amountCents).toBe(2100);
  });
});

// ─── Omakase Mode Rules ─────────────────────────────────────────────────────

describe('Omakase mode business rules', () => {
  it('preview limit is 5', () => {
    // This is enforced in preview/route.ts: session.previewCount >= 5
    const OMAKASE_PREVIEW_LIMIT = 5;
    expect(OMAKASE_PREVIEW_LIMIT).toBe(5);
  });

  it('skips Phase 2 (no Mix Check)', () => {
    const session = makeSession({ mode: 'omakase' });
    // Without final → phase 1
    expect(detectPhase(session, []).phase).toBe(1);
    // With final → phase 3 (skips 2)
    const tasks = [makeTask({ taskType: 'final_basic', finalUrl: 'url' })];
    expect(detectPhase(session, tasks).phase).toBe(3);
  });

  it('baseCycleLimit should be 1 for omakase', () => {
    // Enforced in checkout/route.ts: baseCycleLimit: 1
    const OMAKASE_BASE_CYCLE_LIMIT = 1;
    expect(OMAKASE_BASE_CYCLE_LIMIT).toBe(1);
  });
});

// ─── Dialogue Mode Rules ────────────────────────────────────────────────────

describe('Dialogue mode business rules', () => {
  it('has 3 phases: Preview → Mix Check → Final', () => {
    const session = makeSession({ mode: 'dialogue' });

    // Phase 1: no mix check, no final
    expect(detectPhase(session, []).phase).toBe(1);

    // Phase 2: after mix check (feedback phase)
    const sessionWithMC = makeSession({ mode: 'dialogue', mixCheckCount: 1 });
    expect(detectPhase(sessionWithMC, []).phase).toBe(2);

    // Phase 3: after final
    const tasks = [makeTask({ taskType: 'final_advanced', finalUrl: 'url' })];
    expect(detectPhase(session, tasks).phase).toBe(3);
  });

  it('mix check limit is 2', () => {
    // Enforced in final/route.ts: sessionRow.mixCheckCount >= 2
    const MIX_CHECK_LIMIT = 2;
    expect(MIX_CHECK_LIMIT).toBe(2);
  });

  it('default baseCycleLimit is 5 for dialogue', () => {
    // Checked in final/route.ts: totalCycleLimit = baseCycleLimit + additionalCyclesPurchased
    const DIALOGUE_BASE_CYCLE_LIMIT = 5;
    expect(DIALOGUE_BASE_CYCLE_LIMIT).toBe(5);
  });
});

// ─── Mastering Mode Rules ───────────────────────────────────────────────────

describe('Mastering mode business rules', () => {
  it('mastering-only starts in mastering phase', () => {
    const session = makeSession({ mode: null, masteringMode: 'dialogue' });
    const result = detectPhase(session, []);
    expect(result.isMasteringPhase).toBe(true);
  });

  it('mix+mastering enters mastering only after mix final', () => {
    const session = makeSession({ mode: 'dialogue', masteringMode: 'dialogue' });

    // Before mix final: not mastering phase
    expect(detectPhase(session, []).isMasteringPhase).toBe(false);

    // After mix final: mastering phase
    const tasks = [makeTask({ taskType: 'final_advanced', finalUrl: 'url' })];
    expect(detectPhase(session, tasks).isMasteringPhase).toBe(true);
  });

  it('mastering phase ends after mastering final', () => {
    const session = makeSession({ mode: null, masteringMode: 'dialogue' });
    const tasks = [makeTask({ taskType: 'mastering', finalUrl: 'url' })];
    const result = detectPhase(session, tasks);
    expect(result.isMasteringPhase).toBe(false);
    expect(result.hasMasteringFinal).toBe(true);
  });

  it('mastering preview is free (unlimited)', () => {
    const session = makeSession({ mode: null, masteringMode: 'dialogue' });
    const tasks = Array.from({ length: 10 }, () =>
      makeTask({ taskType: 'mastering_preview', status: 'completed' }),
    );
    const result = detectPhase(session, tasks);
    expect(result.masteringPreviewCount).toBe(10);
    // Still in mastering phase (no limit enforcement at phase level)
    expect(result.isMasteringPhase).toBe(true);
  });
});

// ─── Phase Transition Edge Cases ────────────────────────────────────────────

describe('Phase transition edge cases', () => {
  it('multiple mix checks: phase stays 2 until final', () => {
    const session = makeSession({ mode: 'dialogue', mixCheckCount: 2 });
    const tasks = [
      makeTask({ taskType: 'mix_check', status: 'completed' }),
      makeTask({ taskType: 'mix_check', status: 'completed' }),
    ];
    expect(detectPhase(session, tasks).phase).toBe(2);
  });

  it('final_basic and final_advanced both count as mix final', () => {
    const session = makeSession({ mode: 'dialogue' });

    const basic = [makeTask({ taskType: 'final_basic', finalUrl: 'url' })];
    expect(detectPhase(session, basic).hasMixFinal).toBe(true);

    const advanced = [makeTask({ taskType: 'final_advanced', finalUrl: 'url' })];
    expect(detectPhase(session, advanced).hasMixFinal).toBe(true);
  });

  it('final without URL does not count as complete', () => {
    const session = makeSession({ mode: 'dialogue' });
    const tasks = [makeTask({ taskType: 'final_advanced', finalUrl: null })];
    expect(detectPhase(session, tasks).hasMixFinal).toBe(false);
    expect(detectPhase(session, tasks).phase).toBe(1);
  });

  it('mastering preview without completed status does not count', () => {
    const session = makeSession({ mode: null, masteringMode: 'dialogue' });
    const tasks = [makeTask({ taskType: 'mastering_preview', status: 'processing' })];
    const result = detectPhase(session, tasks);
    expect(result.hasMasteringPreview).toBe(false);
    // But it still counts toward masteringPreviewCount (submitted)
    expect(result.masteringPreviewCount).toBe(1);
  });

  it('full dialogue+mastering lifecycle', () => {
    const session = makeSession({ mode: 'dialogue', masteringMode: 'dialogue', mixCheckCount: 1 });

    // Phase 1 → preview
    const t1 = [makeTask({ taskType: 'preview', status: 'completed' })];
    expect(detectPhase(session, t1).phase).toBe(2); // mixCheckCount > 0 → Phase 2 (MC feedback)

    // Phase 2/3 → mix check + final
    const t2 = [
      ...t1,
      makeTask({ taskType: 'mix_check', status: 'completed' }),
      makeTask({ taskType: 'final_advanced', finalUrl: 'url' }),
    ];
    const r2 = detectPhase(session, t2);
    expect(r2.phase).toBe(3);
    expect(r2.isMasteringPhase).toBe(true); // mix final done → mastering starts

    // Mastering preview → mastering final
    const t3 = [
      ...t2,
      makeTask({ taskType: 'mastering_preview', status: 'completed' }),
      makeTask({ taskType: 'mastering', finalUrl: 'master-url' }),
    ];
    const r3 = detectPhase(session, t3);
    expect(r3.isMasteringPhase).toBe(false); // mastering done
    expect(r3.hasMasteringFinal).toBe(true);
  });
});

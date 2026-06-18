import { describe, it, expect } from 'vitest';
import { detectPhase, type TaskRecord, type SessionState } from '@/lib/dial/phase';
import {
  DIAL_MIX_ACTION_TOOL,
  DIAL_SET_STYLE_TOOL,
  DIAL_OMAKASE_MIX_ACTION_TOOL,
  DIAL_MASTERING_ACTION_TOOL,
  selectToolsByState,
} from '@/lib/ai/prompts/dial';

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
  return {
    taskType: 'preview',
    status: 'completed',
    finalUrl: null,
    ...overrides,
  };
}

// ─── detectPhase ────────────────────────────────────────────────────────────

describe('detectPhase', () => {
  describe('Dialogue mode', () => {
    it('returns phase 1 with no tasks', () => {
      const result = detectPhase(makeSession(), []);
      expect(result.phase).toBe(1);
      expect(result.isMasteringPhase).toBe(false);
    });

    it('returns phase 1 with only preview tasks', () => {
      const tasks = [makeTask({ taskType: 'preview', status: 'completed' })];
      const result = detectPhase(makeSession(), tasks);
      expect(result.phase).toBe(1);
    });

    it('returns phase 2 after mix check', () => {
      const session = makeSession({ mixCheckCount: 1 });
      const tasks = [makeTask({ taskType: 'mix_check', status: 'completed' })];
      const result = detectPhase(session, tasks);
      expect(result.phase).toBe(2);
      expect(result.hasMixCheck).toBe(true);
    });

    it('returns phase 3 after final', () => {
      const tasks = [makeTask({ taskType: 'final_advanced', status: 'completed', finalUrl: 'https://example.com/final.wav' })];
      const result = detectPhase(makeSession(), tasks);
      expect(result.phase).toBe(3);
      expect(result.hasMixFinal).toBe(true);
    });
  });

  describe('Omakase mode', () => {
    it('returns phase 1 with no final', () => {
      const session = makeSession({ mode: 'omakase' });
      const result = detectPhase(session, []);
      expect(result.phase).toBe(1);
    });

    it('skips phase 2 — goes from 1 to 3 on final', () => {
      const session = makeSession({ mode: 'omakase' });
      const tasks = [makeTask({ taskType: 'final_basic', finalUrl: 'https://example.com/final.wav' })];
      const result = detectPhase(session, tasks);
      expect(result.phase).toBe(3);
    });
  });

  describe('Mastering phase detection', () => {
    it('mastering-only session is in mastering phase', () => {
      const session = makeSession({ mode: null, masteringMode: 'dialogue' });
      const result = detectPhase(session, []);
      expect(result.isMasteringPhase).toBe(true);
    });

    it('mastering-only session exits mastering phase after final', () => {
      const session = makeSession({ mode: null, masteringMode: 'dialogue' });
      const tasks = [makeTask({ taskType: 'mastering', finalUrl: 'https://example.com/master.wav' })];
      const result = detectPhase(session, tasks);
      expect(result.isMasteringPhase).toBe(false);
      expect(result.hasMasteringFinal).toBe(true);
    });

    it('mix+mastering enters mastering phase after mix final', () => {
      const session = makeSession({ mode: 'dialogue', masteringMode: 'dialogue' });
      const tasks = [makeTask({ taskType: 'final_advanced', finalUrl: 'https://example.com/final.wav' })];
      const result = detectPhase(session, tasks);
      expect(result.isMasteringPhase).toBe(true);
    });

    it('mix+mastering is NOT in mastering phase before mix final', () => {
      const session = makeSession({ mode: 'dialogue', masteringMode: 'dialogue' });
      const result = detectPhase(session, []);
      expect(result.isMasteringPhase).toBe(false);
    });

    it('counts mastering previews', () => {
      const session = makeSession({ mode: null, masteringMode: 'dialogue' });
      const tasks = [
        makeTask({ taskType: 'mastering_preview', status: 'completed' }),
        makeTask({ taskType: 'mastering_preview', status: 'completed' }),
      ];
      const result = detectPhase(session, tasks);
      expect(result.masteringPreviewCount).toBe(2);
      expect(result.hasMasteringPreview).toBe(true);
    });
  });

  describe('mixFinalTask', () => {
    it('returns the final task when it exists', () => {
      const tasks = [
        makeTask({ taskType: 'preview', status: 'completed' }),
        makeTask({ taskType: 'final_advanced', finalUrl: 'https://example.com/final.wav' }),
      ];
      const result = detectPhase(makeSession(), tasks);
      expect(result.mixFinalTask).toBeDefined();
      expect(result.mixFinalTask!.taskType).toBe('final_advanced');
    });

    it('returns undefined when no final task', () => {
      const tasks = [makeTask({ taskType: 'preview', status: 'completed' })];
      const result = detectPhase(makeSession(), tasks);
      expect(result.mixFinalTask).toBeUndefined();
    });
  });
});

// ─── selectToolsByState (Phase 1b read-side — the sole tool gate) ─────────────

describe('selectToolsByState', () => {
  it('mastering tool-phase → set_style + mastering tool', () => {
    const tools = selectToolsByState({ state: 'mastering_review', mode: 'dialogue', masteringMode: 'dialogue' });
    expect(tools).toEqual([DIAL_SET_STYLE_TOOL, DIAL_MASTERING_ACTION_TOOL]);
  });

  it('omakase mode (mix phase) → set_style + omakase tool', () => {
    const tools = selectToolsByState({ state: 'previewing', mode: 'omakase', masteringMode: null });
    expect(tools).toEqual([DIAL_SET_STYLE_TOOL, DIAL_OMAKASE_MIX_ACTION_TOOL]);
  });

  it('mix dialogue phase → set_style + mix tool, and NO mastering tool (TRAP 2 / getDialTools :1389 fix)', () => {
    const tools = selectToolsByState({ state: 'mix_review', mode: 'dialogue', masteringMode: null });
    expect(tools).toEqual([DIAL_SET_STYLE_TOOL, DIAL_MIX_ACTION_TOOL]);
    expect(tools).not.toContain(DIAL_MASTERING_ACTION_TOOL);
  });

  it('mix+master at mix_final → mastering tool live (handoff); at mix_review → still mix tool', () => {
    expect(selectToolsByState({ state: 'mix_final', mode: 'dialogue', masteringMode: 'dialogue' }))
      .toEqual([DIAL_SET_STYLE_TOOL, DIAL_MASTERING_ACTION_TOOL]);
    expect(selectToolsByState({ state: 'mix_review', mode: 'dialogue', masteringMode: 'dialogue' }))
      .toEqual([DIAL_SET_STYLE_TOOL, DIAL_MIX_ACTION_TOOL]);
  });

  it('locale=en returns the EN tool variants (distinct objects)', () => {
    const ja = selectToolsByState({ state: 'mix_review', mode: 'dialogue', masteringMode: null, locale: 'ja' });
    const en = selectToolsByState({ state: 'mix_review', mode: 'dialogue', masteringMode: null, locale: 'en' });
    expect(en).not.toEqual(ja);
    expect(en).not.toContain(DIAL_MIX_ACTION_TOOL); // EN variant is a different object
  });
});

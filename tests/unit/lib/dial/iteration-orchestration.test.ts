import { describe, it, expect } from 'vitest';
import {
  getUnusedCompletedPreview,
  isSupersededPreview,
  withoutIntermediatePreviews,
  paramsSignature,
  type IterTask,
} from '@/lib/dial/iteration-orchestration';

// Helper: build a task with sane defaults.
function task(p: Partial<IterTask> & { id: string; taskType: string; createdAt: string }): IterTask {
  return {
    status: 'completed',
    previewUrl: null,
    finalUrl: null,
    ...p,
  };
}

const preview = (id: string, createdAt: string, status = 'completed'): IterTask =>
  task({ id, taskType: 'preview', createdAt, status, previewUrl: status === 'completed' ? 'u' : null });
const mixCheck = (id: string, createdAt: string): IterTask =>
  task({ id, taskType: 'mix_check', createdAt, finalUrl: 'u' });
const finalAdv = (id: string, createdAt: string): IterTask =>
  task({ id, taskType: 'final_advanced', createdAt, finalUrl: 'u' });

describe('getUnusedCompletedPreview', () => {
  it('returns null when there are no previews', () => {
    expect(getUnusedCompletedPreview([])).toBeNull();
    expect(getUnusedCompletedPreview([mixCheck('m1', '2026-01-01T00:00:00Z')])).toBeNull();
  });

  it('returns a lone completed preview that has no render after it (first render reuses it)', () => {
    const p = preview('p1', '2026-01-01T00:00:00Z');
    expect(getUnusedCompletedPreview([p])).toBe(p);
  });

  it('returns null when the latest preview was already rendered (must mint fresh)', () => {
    const tasks = [
      preview('p1', '2026-01-01T00:00:00Z'),
      mixCheck('m1', '2026-01-01T00:10:00Z'),
    ];
    expect(getUnusedCompletedPreview(tasks)).toBeNull();
  });

  it('returns the freshly-minted (latest) preview that has no render after it yet', () => {
    // p1 used by m1; then p2 minted fresh and just completed (no render after it) → render on p2.
    const p2 = preview('p2', '2026-01-01T00:20:00Z');
    const tasks = [
      preview('p1', '2026-01-01T00:00:00Z'),
      mixCheck('m1', '2026-01-01T00:10:00Z'),
      p2,
    ];
    expect(getUnusedCompletedPreview(tasks)).toBe(p2);
  });

  it('ignores still-processing previews', () => {
    const tasks = [preview('p1', '2026-01-01T00:00:00Z', 'processing')];
    expect(getUnusedCompletedPreview(tasks)).toBeNull();
  });

  it('treats a render at the exact same timestamp as consuming the preview', () => {
    const tasks = [
      preview('p1', '2026-01-01T00:00:00Z'),
      mixCheck('m1', '2026-01-01T00:00:00Z'),
    ];
    expect(getUnusedCompletedPreview(tasks)).toBeNull();
  });
});

describe('isSupersededPreview / withoutIntermediatePreviews', () => {
  it('keeps the initial preview until the first mix_check', () => {
    const p1 = preview('p1', '2026-01-01T00:00:00Z');
    expect(isSupersededPreview(p1, [p1])).toBe(false);
    expect(withoutIntermediatePreviews([p1])).toEqual([p1]);
  });

  it('hides an intermediate preview superseded by a later render', () => {
    const p1 = preview('p1', '2026-01-01T00:00:00Z');
    const p2 = preview('p2', '2026-01-01T00:20:00Z');
    const m1 = mixCheck('m1', '2026-01-01T00:10:00Z');
    const f1 = finalAdv('f1', '2026-01-01T00:30:00Z');
    const tasks = [p1, m1, p2, f1];
    // p1 superseded by m1; p2 superseded by f1.
    expect(isSupersededPreview(p1, tasks)).toBe(true);
    expect(isSupersededPreview(p2, tasks)).toBe(true);
    expect(withoutIntermediatePreviews(tasks)).toEqual([m1, f1]);
  });

  it('never hides non-preview tasks', () => {
    const m1 = mixCheck('m1', '2026-01-01T00:10:00Z');
    expect(isSupersededPreview(m1, [m1])).toBe(false);
  });
});

describe('paramsSignature', () => {
  it('returns empty string for null/undefined', () => {
    expect(paramsSignature(null)).toBe('');
    expect(paramsSignature(undefined)).toBe('');
  });

  it('is stable across key order (same content → same signature)', () => {
    const a = [{ track: 'bass', changes: { gainDb: 2, panAngleDegrees: 10 } }];
    const b = [{ changes: { panAngleDegrees: 10, gainDb: 2 }, track: 'bass' }];
    expect(paramsSignature(a)).toBe(paramsSignature(b));
  });

  it('differs when content changes (detect-and-regen triggers a re-render)', () => {
    const a = [{ track: 'bass', changes: { gainDb: 2 } }];
    const b = [{ track: 'bass', changes: { gainDb: 3 } }];
    expect(paramsSignature(a)).not.toBe(paramsSignature(b));
  });

  it('distinguishes empty changes from a real adjustment', () => {
    expect(paramsSignature([])).not.toBe(paramsSignature([{ track: 'bass', changes: { gainDb: 1 } }]));
  });
});

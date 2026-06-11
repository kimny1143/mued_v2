/**
 * Merge gate for PR-A (take-unit URL separation).
 *
 * Core assertion: each MIXED take resolves to ITS OWN task's stems (taskId-scoped). The prior
 * shared session-scoped proxy made /api/dial/download pick the FIRST preview task, so "Preview 2"
 * played "Preview 1"'s stems. Falls back to the session-scoped proxy only when a take's own task
 * has no stems yet (preserves the B1 null-panel fix).
 *
 * @see project-dial-v2-player-decode-hang
 */
import { describe, it, expect } from 'vitest';
import { buildSessionTakes, type SessionTakeInput, type SessionTakeTask } from '@/lib/dial/session-takes';

function previewTask(id: string, createdAt: string, stemsUrls: Record<string, string> | null): SessionTakeTask {
  return { id, taskType: 'preview', status: 'completed', previewUrl: `gcs://${id}.mp3`, finalUrl: null, stemsUrls, createdAt };
}

describe('buildSessionTakes — take/URL wiring (PR-A)', () => {
  it('gives each MIXED take its OWN task stems — Preview 2 ≠ Preview 1 (the reference bug)', () => {
    const session: SessionTakeInput = {
      id: 'sess-1',
      tracks: [],
      tasks: [
        previewTask('p1', '2026-06-11T07:00:00Z', { vox: 'u1', drums: 'u2' }),
        previewTask('p2', '2026-06-11T08:00:00Z', { vox: 'u3', drums: 'u4' }),
      ],
    };
    const mixed = buildSessionTakes(session, 'tok').filter((t) => t.label === 'MIXED');
    expect(mixed).toHaveLength(2);
    expect(mixed[0].id).toBe('p2'); // newest first
    expect(mixed[1].id).toBe('p1');

    const p2stems = Object.values(mixed[0].stemsUrls!);
    const p1stems = Object.values(mixed[1].stemsUrls!);
    // Each take's stem URLs reference ITS OWN taskId — the fix.
    expect(p2stems.every((u) => u.includes('taskId=p2'))).toBe(true);
    expect(p1stems.every((u) => u.includes('taskId=p1'))).toBe(true);
    // The bug would have BOTH takes referencing the first preview task.
    expect(p2stems.some((u) => u.includes('taskId=p1'))).toBe(false);
    // Guest token forwarded.
    expect(p2stems[0]).toContain('token=tok');
  });

  it('falls back to session-scoped stems when a take task has no stems yet (B1 / poll desync)', () => {
    const session: SessionTakeInput = {
      id: 'sess-2',
      tracks: [],
      tasks: [
        previewTask('withstems', '2026-06-11T07:00:00Z', { vox: 'u' }),
        previewTask('nostems', '2026-06-11T08:00:00Z', null),
      ],
    };
    const takes = buildSessionTakes(session, null);
    // task w/o stems → session-scoped fallback (resolves to best task server-side)
    expect(Object.values(takes.find((t) => t.id === 'nostems')!.stemsUrls!)
      .every((u) => u.includes('sessionId=sess-2'))).toBe(true);
    // task w/ stems → its own taskId
    expect(Object.values(takes.find((t) => t.id === 'withstems')!.stemsUrls!)
      .every((u) => u.includes('taskId=withstems'))).toBe(true);
  });

  it('builds RAW from tracks with r2Url (direct, human-readable keys); excludes tracks without r2Url', () => {
    const session: SessionTakeInput = {
      id: 's',
      tracks: [
        { id: 't1', originalFilename: 'vocal.wav', r2Url: 'https://r2/vocal.wav' },
        { id: 't2', originalFilename: 'drums.wav', r2Url: null },
      ],
      tasks: [],
    };
    const raw = buildSessionTakes(session, null).find((t) => t.label === 'RAW')!;
    expect(raw).toBeTruthy();
    expect(Object.keys(raw.stemsUrls!)).toEqual(['vocal.wav']);
    expect(raw.url).toBe('https://r2/vocal.wav');
  });

  it('excludes reverb_send effect-return keys from MIXED stems', () => {
    const session: SessionTakeInput = {
      id: 's',
      tracks: [],
      tasks: [previewTask('p', '2026-06-11T07:00:00Z', { vox: 'u', reverb_send_1: 'r' })],
    };
    const mixed = buildSessionTakes(session, null).find((t) => t.label === 'MIXED')!;
    expect(Object.keys(mixed.stemsUrls!)).toEqual(['vox']);
  });

  it('adds a MASTERED preview take (null stems, taskId-scoped url)', () => {
    const session: SessionTakeInput = {
      id: 's',
      tracks: [],
      tasks: [
        { id: 'mp', taskType: 'mastering_preview', status: 'completed', previewUrl: 'x', finalUrl: null, stemsUrls: null, createdAt: '2026-06-11T07:00:00Z' },
      ],
    };
    const mastered = buildSessionTakes(session, null).find((t) => t.label === 'MASTERED')!;
    expect(mastered.sublabel).toBe('Preview');
    expect(mastered.stemsUrls).toBeNull();
    expect(mastered.url).toContain('taskId=mp');
  });

  it('orders takes RAW → MIXED(newest-first) → MASTERED', () => {
    const session: SessionTakeInput = {
      id: 's',
      tracks: [{ id: 't1', originalFilename: 'a.wav', r2Url: 'https://r2/a.wav' }],
      tasks: [
        previewTask('old', '2026-06-11T07:00:00Z', { vox: 'u' }),
        previewTask('new', '2026-06-11T09:00:00Z', { vox: 'u' }),
        { id: 'mp', taskType: 'mastering_preview', status: 'completed', previewUrl: 'x', finalUrl: null, stemsUrls: null, createdAt: '2026-06-11T10:00:00Z' },
      ],
    };
    const labels = buildSessionTakes(session, null).map((t) => `${t.label}:${t.id}`);
    expect(labels).toEqual(['RAW:raw-s', 'MIXED:new', 'MIXED:old', 'MASTERED:mp']);
  });
});

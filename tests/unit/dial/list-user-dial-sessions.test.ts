import { describe, it, expect } from 'vitest';
import { mapDialSessionsToUnified } from '@/lib/dial/list-user-dial-sessions';

// Fixed "now" so the daysRemaining (R2 download-expiry countdown) is deterministic.
const NOW = new Date('2026-06-18T00:00:00.000Z');

function task(over: Partial<{
  id: string; taskType: string; status: string; r2FinalUrl: string | null; r2ExpiresAt: Date | null;
}> = {}) {
  return {
    id: 't1',
    taskType: 'final_advanced',
    status: 'completed',
    r2FinalUrl: 'https://r2/final.wav',
    r2ExpiresAt: new Date('2026-06-25T00:00:00.000Z'), // 7 days out
    ...over,
  };
}

function session(over: Partial<{
  id: string; mode: string | null; status: string; musicalStyle: string | null;
  title: string | null; createdAt: Date | null; tracks: { id: string }[]; tasks: ReturnType<typeof task>[];
}> = {}) {
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    mode: 'dialogue',
    status: 'completed',
    musicalStyle: 'pop',
    title: 'My Song',
    createdAt: new Date('2026-06-10T00:00:00.000Z'),
    tracks: [{ id: 'tr1' }, { id: 'tr2' }],
    tasks: [task()],
    ...over,
  };
}

describe('mapDialSessionsToUnified', () => {
  it('maps core fields to UnifiedSession with product=dial and a /dial/session href', () => {
    const [u] = mapDialSessionsToUnified([session()], NOW);
    expect(u.product).toBe('dial');
    expect(u.id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(u.status).toBe('completed');
    expect(u.href).toBe('/dial/session/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(u.displayName).toBe('My Song');
  });

  it('displayName falls back title → musicalStyle → de-hyphenated id slice', () => {
    expect(mapDialSessionsToUnified([session({ title: null })], NOW)[0].displayName).toBe('pop');
    expect(mapDialSessionsToUnified([session({ title: null, musicalStyle: null })], NOW)[0].displayName)
      .toBe('aaaaaaaa'); // id.replace(/-/g,'').slice(0,8)
  });

  it('marks hasDownload + computes daysRemaining from a downloadable completed task', () => {
    const [u] = mapDialSessionsToUnified([session()], NOW); // expiry 7d out
    expect(u.hasDownload).toBe(true);
    expect(u.daysRemaining).toBe(7);
  });

  it('uses the EARLIEST expiry across multiple downloadable tasks', () => {
    const s = session({
      tasks: [
        task({ id: 'a', r2ExpiresAt: new Date('2026-06-25T00:00:00.000Z') }), // 7d
        task({ id: 'b', taskType: 'mastering', r2ExpiresAt: new Date('2026-06-21T00:00:00.000Z') }), // 3d
      ],
    });
    expect(mapDialSessionsToUnified([s], NOW)[0].daysRemaining).toBe(3);
  });

  it('ignores non-downloadable tasks (wrong type / not completed / no r2 url)', () => {
    const s = session({
      tasks: [
        task({ taskType: 'preview' }),                 // not a final/mastering type
        task({ status: 'processing' }),                // not completed
        task({ r2FinalUrl: null }),                    // no download url
        task({ r2ExpiresAt: null }),                   // no expiry
      ],
    });
    const [u] = mapDialSessionsToUnified([s], NOW);
    expect(u.hasDownload).toBe(false);
    expect(u.daysRemaining).toBeNull();
  });

  it('preserves input order (helper queries newest-first) and handles empty/null edges', () => {
    const out = mapDialSessionsToUnified(
      [session({ id: 'id-1' }), session({ id: 'id-2', createdAt: null, tasks: [] })],
      NOW,
    );
    expect(out.map((u) => u.id)).toEqual(['id-1', 'id-2']);
    expect(out[1].createdAt).toBeNull();
    expect(out[1].hasDownload).toBe(false);
    expect(out[1].daysRemaining).toBeNull();
  });
});

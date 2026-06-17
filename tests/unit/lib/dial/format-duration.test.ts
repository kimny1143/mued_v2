import { describe, it, expect } from 'vitest';
import { formatTakeDuration } from '@/lib/dial/format-duration';

describe('formatTakeDuration', () => {
  const t = (iso: string) => iso;

  it('formats < 60s as "N秒で完了"', () => {
    expect(formatTakeDuration(t('2026-06-16T18:29:38.000Z'), t('2026-06-16T18:30:15.000Z'))).toBe('37秒で完了');
    expect(formatTakeDuration(t('2026-06-16T21:42:29.000Z'), t('2026-06-16T21:42:33.000Z'))).toBe('4秒で完了');
  });

  it('formats >= 60s as "M分S秒で完了"', () => {
    // 112.6s → rounds to 113s → 1分53秒
    expect(formatTakeDuration(t('2026-06-16T21:37:04.000Z'), t('2026-06-16T21:38:57.000Z'))).toBe('1分53秒で完了');
  });

  it('drops the seconds when they are zero ("M分で完了")', () => {
    expect(formatTakeDuration(t('2026-06-16T00:00:00.000Z'), t('2026-06-16T00:02:00.000Z'))).toBe('2分で完了');
  });

  it('returns null when completedAt is missing (processing / legacy rows)', () => {
    expect(formatTakeDuration(t('2026-06-16T18:29:38.000Z'), null)).toBeNull();
    expect(formatTakeDuration(t('2026-06-16T18:29:38.000Z'), undefined)).toBeNull();
  });

  it('returns null for invalid / negative intervals (no crash)', () => {
    expect(formatTakeDuration('not-a-date', '2026-06-16T18:30:00.000Z')).toBeNull();
    expect(formatTakeDuration('2026-06-16T18:30:00.000Z', '2026-06-16T18:29:00.000Z')).toBeNull();
  });
});

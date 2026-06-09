import { describe, it, expect } from 'vitest';
import {
  isDialSessionTrackEditable,
  dialTrackLockReason,
} from '@/lib/dial/session-edit-lock';

describe('isDialSessionTrackEditable', () => {
  it('is editable while uploading or previewing (pre-final)', () => {
    expect(isDialSessionTrackEditable('uploading')).toBe(true);
    expect(isDialSessionTrackEditable('previewing')).toBe(true);
  });

  it('is locked once a paid final / mastering has started or finished', () => {
    for (const s of ['mixing', 'mastering', 'completed', 'archived']) {
      expect(isDialSessionTrackEditable(s)).toBe(false);
    }
  });

  it('is locked (fail-safe) for null / undefined / unknown statuses', () => {
    expect(isDialSessionTrackEditable(null)).toBe(false);
    expect(isDialSessionTrackEditable(undefined)).toBe(false);
    expect(isDialSessionTrackEditable('totally-unknown')).toBe(false);
  });
});

describe('dialTrackLockReason', () => {
  it('returns null when editable', () => {
    expect(dialTrackLockReason('uploading')).toBeNull();
    expect(dialTrackLockReason('previewing')).toBeNull();
  });

  it('returns a SESSION_LOCKED code + message when locked', () => {
    const r = dialTrackLockReason('completed');
    expect(r).not.toBeNull();
    expect(r!.code).toBe('SESSION_LOCKED');
    expect(typeof r!.message).toBe('string');
  });
});

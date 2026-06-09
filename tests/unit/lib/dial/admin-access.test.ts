import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDialAdminEmails, isDialSessionAdmin } from '@/lib/dial/admin-access';

const saved: string | undefined = process.env.DIAL_ADMIN_EMAILS;

beforeEach(() => { delete process.env.DIAL_ADMIN_EMAILS; });
afterEach(() => {
  if (saved === undefined) delete process.env.DIAL_ADMIN_EMAILS;
  else process.env.DIAL_ADMIN_EMAILS = saved;
});

describe('getDialAdminEmails', () => {
  it('returns [] when unset (fail-closed)', () => {
    expect(getDialAdminEmails()).toEqual([]);
  });
  it('returns [] when empty/whitespace', () => {
    process.env.DIAL_ADMIN_EMAILS = '  , ,';
    expect(getDialAdminEmails()).toEqual([]);
  });
  it('parses, trims, and lowercases a comma list', () => {
    process.env.DIAL_ADMIN_EMAILS = ' A@B.com , Kimny1143@Gmail.COM ';
    expect(getDialAdminEmails()).toEqual(['a@b.com', 'kimny1143@gmail.com']);
  });
});

describe('isDialSessionAdmin', () => {
  it('false when allow-list unset (fail-closed) even for a plausible email', () => {
    expect(isDialSessionAdmin('kimny1143@gmail.com')).toBe(false);
  });
  it('false for null/empty/undefined email', () => {
    process.env.DIAL_ADMIN_EMAILS = 'kimny1143@gmail.com';
    expect(isDialSessionAdmin(null)).toBe(false);
    expect(isDialSessionAdmin('')).toBe(false);
    expect(isDialSessionAdmin(undefined)).toBe(false);
  });
  it('true for an allow-listed email, case-insensitive + trimmed', () => {
    process.env.DIAL_ADMIN_EMAILS = 'kimny1143@gmail.com';
    expect(isDialSessionAdmin('kimny1143@gmail.com')).toBe(true);
    expect(isDialSessionAdmin('Kimny1143@Gmail.com')).toBe(true);
    expect(isDialSessionAdmin('  kimny1143@gmail.com  ')).toBe(true);
  });
  it('false for a non-listed email', () => {
    process.env.DIAL_ADMIN_EMAILS = 'kimny1143@gmail.com';
    expect(isDialSessionAdmin('someone-else@gmail.com')).toBe(false);
  });
});

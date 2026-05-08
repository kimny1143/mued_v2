import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.test/mix_diag_free/idx/test.json', pathname: 'mix_diag_free/idx/test.json' }),
  list: vi.fn(),
}));

import { put, list } from '@vercel/blob';
import { checkMixDiagnosisFreeUsed, markMixDiagnosisFreeUsed } from '@/lib/storage/mix-diagnosis-free';

const mockList = list as ReturnType<typeof vi.fn>;
const mockPut = put as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkMixDiagnosisFreeUsed', () => {
  it('returns false when no blob exists (first-time user)', async () => {
    mockList.mockResolvedValue({ blobs: [] });
    expect(await checkMixDiagnosisFreeUsed('user@example.com')).toBe(false);
  });

  it('returns true when blob exists (already used)', async () => {
    mockList.mockResolvedValue({ blobs: [{ pathname: 'mix_diag_free/idx/user_example_com.json' }] });
    expect(await checkMixDiagnosisFreeUsed('user@example.com')).toBe(true);
  });

  it('normalizes email to lowercase key for blob prefix', async () => {
    mockList.mockResolvedValue({ blobs: [] });
    await checkMixDiagnosisFreeUsed('User@Example.COM');
    expect(mockList).toHaveBeenCalledWith({ prefix: 'mix_diag_free/idx/user_example_com', limit: 1 });
  });

  it('uses limit:1 for O(1) check', async () => {
    mockList.mockResolvedValue({ blobs: [] });
    await checkMixDiagnosisFreeUsed('test@test.com');
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
  });
});

describe('markMixDiagnosisFreeUsed', () => {
  it('writes blob to correct path with normalized email key', async () => {
    await markMixDiagnosisFreeUsed('user@example.com');
    expect(mockPut).toHaveBeenCalledWith(
      'mix_diag_free/idx/user_example_com.json',
      expect.any(String),
      expect.objectContaining({ access: 'private', addRandomSuffix: false }),
    );
  });

  it('stores used_at timestamp in JSON payload', async () => {
    await markMixDiagnosisFreeUsed('user@example.com');
    const [, payload] = mockPut.mock.calls[0];
    const parsed = JSON.parse(payload as string);
    expect(parsed).toHaveProperty('used_at');
    expect(new Date(parsed.used_at).getTime()).toBeGreaterThan(0);
  });

  it('normalizes special characters in email to underscores', async () => {
    await markMixDiagnosisFreeUsed('user+tag@my-domain.co.jp');
    const [pathname] = mockPut.mock.calls[0] as [string, ...unknown[]];
    // Extract just the email key segment (strip prefix and .json suffix)
    const emailKey = pathname.replace('mix_diag_free/idx/', '').replace('.json', '');
    expect(emailKey).not.toMatch(/[@+.]/);
    expect(pathname).toContain('mix_diag_free/idx/');
  });
});

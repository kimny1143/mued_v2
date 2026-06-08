import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.test/dial_free_campaign_grant/idx/test.json', pathname: 'dial_free_campaign_grant/idx/test.json' }),
  list: vi.fn(),
}));

import { put, list } from '@vercel/blob';
import { checkFreeCampaignGrantUsed, markFreeCampaignGrantUsed } from '@/lib/storage/dial-free-campaign-grant';

const mockList = list as ReturnType<typeof vi.fn>;
const mockPut = put as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkFreeCampaignGrantUsed', () => {
  it('returns false when no blob exists (first-time user)', async () => {
    mockList.mockResolvedValue({ blobs: [] });
    expect(await checkFreeCampaignGrantUsed('user@example.com')).toBe(false);
  });

  it('returns true when blob exists (grant already claimed)', async () => {
    mockList.mockResolvedValue({ blobs: [{ pathname: 'dial_free_campaign_grant/idx/user_example_com.json' }] });
    expect(await checkFreeCampaignGrantUsed('user@example.com')).toBe(true);
  });

  it('normalizes email to lowercase key for blob prefix', async () => {
    mockList.mockResolvedValue({ blobs: [] });
    await checkFreeCampaignGrantUsed('User@Example.COM');
    expect(mockList).toHaveBeenCalledWith({ prefix: 'dial_free_campaign_grant/idx/user_example_com', limit: 1 });
  });

  it('uses limit:1 for O(1) check', async () => {
    mockList.mockResolvedValue({ blobs: [] });
    await checkFreeCampaignGrantUsed('test@test.com');
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
  });
});

describe('markFreeCampaignGrantUsed', () => {
  it('writes blob to correct path with normalized email key (idempotent: addRandomSuffix false)', async () => {
    await markFreeCampaignGrantUsed('user@example.com');
    expect(mockPut).toHaveBeenCalledWith(
      'dial_free_campaign_grant/idx/user_example_com.json',
      expect.any(String),
      expect.objectContaining({ access: 'private', addRandomSuffix: false }),
    );
  });

  it('stores used_at timestamp in JSON payload', async () => {
    await markFreeCampaignGrantUsed('user@example.com');
    const [, payload] = mockPut.mock.calls[0];
    const parsed = JSON.parse(payload as string);
    expect(parsed).toHaveProperty('used_at');
    expect(new Date(parsed.used_at).getTime()).toBeGreaterThan(0);
  });

  it('normalizes special characters in email to underscores', async () => {
    await markFreeCampaignGrantUsed('user+tag@my-domain.co.jp');
    const [pathname] = mockPut.mock.calls[0] as [string, ...unknown[]];
    const emailKey = pathname.replace('dial_free_campaign_grant/idx/', '').replace('.json', '');
    expect(emailKey).not.toMatch(/[@+.]/);
    expect(pathname).toContain('dial_free_campaign_grant/idx/');
  });
});

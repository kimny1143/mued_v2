/**
 * audience-sync unit tests — DB → Resend Audience projection for the self-owned list.
 *
 * The critical PR1 property is NO-OP SAFETY: with RESEND_MARKETING_AUDIENCE_ID unset (the
 * Audience hasn't been created yet) the sync does nothing and never throws — so PR1 ships and
 * runs BEFORE the Audience exists. The configured path is covered via a fresh import with env
 * set (the module reads env at load time).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/utils/logger', () => ({ logger: { warn: vi.fn() } }));

const mockContactsCreate = vi.fn().mockResolvedValue({});
const mockContactsUpdate = vi.fn().mockResolvedValue({});
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ contacts: { create: mockContactsCreate, update: mockContactsUpdate } })),
}));

import { isAudienceSyncEnabled, syncConsentToAudience } from '@/lib/marketing/audience-sync';

const ORIGINAL_AUDIENCE = process.env.RESEND_MARKETING_AUDIENCE_ID;
const ORIGINAL_KEY = process.env.RESEND_API_KEY;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  vi.clearAllMocks();
  restoreEnv('RESEND_MARKETING_AUDIENCE_ID', ORIGINAL_AUDIENCE);
  restoreEnv('RESEND_API_KEY', ORIGINAL_KEY);
});

describe('audience-sync — unconfigured (default)', () => {
  it('isAudienceSyncEnabled() is false when the Audience env is unset', () => {
    delete process.env.RESEND_MARKETING_AUDIENCE_ID;
    expect(isAudienceSyncEnabled()).toBe(false);
  });

  it('syncConsentToAudience is a no-op and never throws', async () => {
    delete process.env.RESEND_MARKETING_AUDIENCE_ID;
    await expect(
      syncConsentToAudience({ email: 'u@example.com', status: 'granted' }),
    ).resolves.toBeUndefined();
    expect(mockContactsCreate).not.toHaveBeenCalled();
    expect(mockContactsUpdate).not.toHaveBeenCalled();
  });
});

describe('audience-sync — configured', () => {
  async function freshConfiguredModule() {
    process.env.RESEND_MARKETING_AUDIENCE_ID = 'aud_test';
    process.env.RESEND_API_KEY = 're_test';
    vi.resetModules();
    return import('@/lib/marketing/audience-sync');
  }

  it('granted → contacts.create (subscribed)', async () => {
    const mod = await freshConfiguredModule();
    await mod.syncConsentToAudience({ email: 'u@example.com', name: 'Yuu', status: 'granted' });
    expect(mockContactsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceId: 'aud_test',
        email: 'u@example.com',
        unsubscribed: false,
        firstName: 'Yuu',
      }),
    );
  });

  it('withdrawn → contacts.update (unsubscribed)', async () => {
    const mod = await freshConfiguredModule();
    await mod.syncConsentToAudience({ email: 'u@example.com', status: 'withdrawn' });
    expect(mockContactsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ audienceId: 'aud_test', email: 'u@example.com', unsubscribed: true }),
    );
  });

  it('a Resend failure is swallowed (best-effort)', async () => {
    mockContactsCreate.mockRejectedValueOnce(new Error('resend 500'));
    const mod = await freshConfiguredModule();
    await expect(
      mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' }),
    ).resolves.toBeUndefined();
  });
});

/**
 * MUEDsat audience unit tests — email-capture → Resend Audience projection.
 *
 * The critical staged property is NO-OP SAFETY: with RESEND_MUEDSAT_AUDIENCE_ID unset (the audience
 * isn't provisioned yet) the subscribe helper does nothing, returns false, and never throws — so the
 * staged LP + /api/muedsat/subscribe ship and run BEFORE the audience exists. The configured path is
 * covered via a fresh import with env set (the module reads env at load time).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/utils/logger', () => ({ logger: { warn: vi.fn() } }));

const mockContactsCreate = vi.fn().mockResolvedValue({});
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ contacts: { create: mockContactsCreate } })),
}));

import { isMuedsatAudienceEnabled, addMuedsatSubscriber } from '@/lib/muedsat/audience';

const ORIGINAL_AUDIENCE = process.env.RESEND_MUEDSAT_AUDIENCE_ID;
const ORIGINAL_KEY = process.env.RESEND_API_KEY;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  vi.clearAllMocks();
  restoreEnv('RESEND_MUEDSAT_AUDIENCE_ID', ORIGINAL_AUDIENCE);
  restoreEnv('RESEND_API_KEY', ORIGINAL_KEY);
});

describe('muedsat/audience — unconfigured (staged default)', () => {
  it('isMuedsatAudienceEnabled() is false when the audience env is unset', () => {
    delete process.env.RESEND_MUEDSAT_AUDIENCE_ID;
    expect(isMuedsatAudienceEnabled()).toBe(false);
  });

  it('addMuedsatSubscriber is a no-op (returns false) and never throws', async () => {
    delete process.env.RESEND_MUEDSAT_AUDIENCE_ID;
    await expect(
      addMuedsatSubscriber({ email: 'producer@example.com', locale: 'en' }),
    ).resolves.toBe(false);
    expect(mockContactsCreate).not.toHaveBeenCalled();
  });
});

describe('muedsat/audience — configured', () => {
  async function freshConfiguredModule() {
    process.env.RESEND_MUEDSAT_AUDIENCE_ID = 'aud_muedsat_test';
    process.env.RESEND_API_KEY = 're_test';
    vi.resetModules();
    return import('@/lib/muedsat/audience');
  }

  it('subscribe → contacts.create (subscribed) with the dedicated audience id', async () => {
    const mod = await freshConfiguredModule();
    const result = await mod.addMuedsatSubscriber({ email: 'producer@example.com', locale: 'ja' });
    expect(result).toBe(true);
    expect(mockContactsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceId: 'aud_muedsat_test',
        email: 'producer@example.com',
        unsubscribed: false,
      }),
    );
  });

  it('a Resend failure (e.g. duplicate) is swallowed and returns false (best-effort)', async () => {
    mockContactsCreate.mockRejectedValueOnce(new Error('resend 409 duplicate'));
    const mod = await freshConfiguredModule();
    await expect(
      mod.addMuedsatSubscriber({ email: 'producer@example.com' }),
    ).resolves.toBe(false);
  });
});

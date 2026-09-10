/**
 * MUEDsat audience unit tests — email-capture → Resend Audience projection.
 *
 * The critical staged property is NO-OP SAFETY: with RESEND_MUEDSAT_AUDIENCE_ID unset (the audience
 * isn't provisioned yet) the subscribe helper does nothing, returns false, and never throws — so the
 * staged LP + /api/muedsat/subscribe ship and run BEFORE the audience exists. The configured path is
 * covered via a fresh import with env set (the module reads env at load time).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/utils/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

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
    // ★The SDK resolves `{ data, error }` — never a bare value. `mockReset: true` (vitest config)
    //   clears the module-level implementation between tests, so each case states its own.
    mockContactsCreate.mockResolvedValueOnce({ data: { id: 'con_1' }, error: null });
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

  it('a THROWN Resend failure is swallowed and returns false (best-effort)', async () => {
    mockContactsCreate.mockRejectedValueOnce(new Error('resend 409 duplicate'));
    const mod = await freshConfiguredModule();
    await expect(
      mod.addMuedsatSubscriber({ email: 'producer@example.com' }),
    ).resolves.toBe(false);
  });

  it('★★an API REJECTION returns false — the SDK resolves {data,error} instead of throwing', async () => {
    // ★★THE RED THIS FILE DID NOT HAVE. resend@6.12.4 does not throw on an API error: its
    //   fetchRequest catches a non-ok response and RETURNS `{ data: null, error }`. So the old
    //   `await …; return true;` inside try/catch reported SUCCESS for every rejection the API
    //   itself reported — the catch above was unreachable for exactly the failures that happen.
    //   ★The test above (a THROWN error) passed the whole time and covered none of this.
    mockContactsCreate.mockResolvedValueOnce({
      data: null,
      error: { name: 'validation_error', message: 'Contact already exists' },
    });
    const mod = await freshConfiguredModule();
    await expect(
      mod.addMuedsatSubscriber({ email: 'producer@example.com' }),
    ).resolves.toBe(false);
  });
});

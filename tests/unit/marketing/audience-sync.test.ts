/**
 * audience-sync unit tests — DB → Resend segment projection for the self-owned marketing list.
 *
 * Critical property is NO-OP SAFETY: with the segment env unset (segment not wired yet) the sync
 * does nothing and never throws — so capture + recordConsent run BEFORE the segment exists. The
 * configured path is covered via a fresh import with env set (the module reads env at load time).
 *
 * Resend migrated Audiences → Segments (audienceId === segmentId). The module reads
 * RESEND_MARKETING_SEGMENT_ID with RESEND_MARKETING_AUDIENCE_ID as a backward-compat fallback —
 * both are covered so a legacy-named env keeps working with no re-set.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/utils/logger', () => ({ logger: { warn: vi.fn() } }));

const mockContactsCreate = vi.fn().mockResolvedValue({});
const mockContactsUpdate = vi.fn().mockResolvedValue({});
const mockSegmentsAdd = vi.fn().mockResolvedValue({});
// ★The 1,000 window's trim is scheduled after a new contact is created (kimny 10/30).
const { mockScheduleTrim } = vi.hoisted(() => ({ mockScheduleTrim: vi.fn() }));
vi.mock('@/lib/marketing/list-window', () => ({ scheduleListTrim: mockScheduleTrim }));
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    contacts: {
      create: mockContactsCreate,
      update: mockContactsUpdate,
      segments: { add: mockSegmentsAdd },
    },
  })),
}));

import { isAudienceSyncEnabled, syncConsentToAudience } from '@/lib/marketing/audience-sync';
import { logger } from '@/lib/utils/logger';

const ORIGINAL_SEGMENT = process.env.RESEND_MARKETING_SEGMENT_ID;
const ORIGINAL_AUDIENCE = process.env.RESEND_MARKETING_AUDIENCE_ID;
const ORIGINAL_KEY = process.env.RESEND_API_KEY;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  vi.clearAllMocks();
  restoreEnv('RESEND_MARKETING_SEGMENT_ID', ORIGINAL_SEGMENT);
  restoreEnv('RESEND_MARKETING_AUDIENCE_ID', ORIGINAL_AUDIENCE);
  restoreEnv('RESEND_API_KEY', ORIGINAL_KEY);
});

describe('audience-sync — unconfigured (default)', () => {
  it('isAudienceSyncEnabled() is false when neither segment env is set', () => {
    delete process.env.RESEND_MARKETING_SEGMENT_ID;
    delete process.env.RESEND_MARKETING_AUDIENCE_ID;
    expect(isAudienceSyncEnabled()).toBe(false);
  });

  it('syncConsentToAudience is a no-op and never throws', async () => {
    delete process.env.RESEND_MARKETING_SEGMENT_ID;
    delete process.env.RESEND_MARKETING_AUDIENCE_ID;
    await expect(
      syncConsentToAudience({ email: 'u@example.com', status: 'granted' }),
    ).resolves.toBeUndefined();
    expect(mockContactsCreate).not.toHaveBeenCalled();
    expect(mockContactsUpdate).not.toHaveBeenCalled();
    expect(mockSegmentsAdd).not.toHaveBeenCalled();
  });
});

describe('audience-sync — configured', () => {
  async function freshModule(env: { segment?: string; audience?: string }) {
    delete process.env.RESEND_MARKETING_SEGMENT_ID;
    delete process.env.RESEND_MARKETING_AUDIENCE_ID;
    if (env.segment !== undefined) process.env.RESEND_MARKETING_SEGMENT_ID = env.segment;
    if (env.audience !== undefined) process.env.RESEND_MARKETING_AUDIENCE_ID = env.audience;
    process.env.RESEND_API_KEY = 're_test';
    vi.resetModules();
    return import('@/lib/marketing/audience-sync');
  }

  it('granted → contacts.create adds the contact to the segment (subscribed)', async () => {
    const mod = await freshModule({ segment: 'seg_test' });
    await mod.syncConsentToAudience({ email: 'u@example.com', name: 'Yuu', status: 'granted' });
    expect(mockContactsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'u@example.com',
        unsubscribed: false,
        firstName: 'Yuu',
        segments: [{ id: 'seg_test' }],
      }),
    );
  });

  it('★granted: a NEW contact (create succeeds) schedules the 1,000 trim; an existing one (create errors) does not', async () => {
    mockContactsCreate.mockResolvedValueOnce({ data: { id: 'c_1' }, error: null });
    const mod = await freshModule({ segment: 'seg_test' });
    await mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' });
    expect(mockScheduleTrim).toHaveBeenCalledWith('audience-sync');
    mockScheduleTrim.mockClear();
    mockContactsCreate.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: 'Contact already exists' } });
    await mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' });
    expect(mockScheduleTrim).not.toHaveBeenCalled();
  });

  it('withdrawn → contacts.update global unsubscribe (no audienceId)', async () => {
    const mod = await freshModule({ segment: 'seg_test' });
    await mod.syncConsentToAudience({ email: 'u@example.com', status: 'withdrawn' });
    expect(mockContactsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'u@example.com', unsubscribed: true }),
    );
    expect(mockContactsUpdate.mock.calls[0][0]).not.toHaveProperty('audienceId');
  });

  it('backward-compat: legacy RESEND_MARKETING_AUDIENCE_ID still enables + drives the segment', async () => {
    const mod = await freshModule({ audience: 'aud_legacy' });
    expect(mod.isAudienceSyncEnabled()).toBe(true);
    await mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' });
    expect(mockContactsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ segments: [{ id: 'aud_legacy' }] }),
    );
  });

  it('empty-string RESEND_MARKETING_SEGMENT_ID falls back to legacy audience (|| not ??)', async () => {
    // The .env.local.example ships `RESEND_MARKETING_SEGMENT_ID=` (empty). `??` would treat '' as a
    // real value and skip the legacy fallback → silent no-op. `||` treats '' as unset, so a legacy
    // RESEND_MARKETING_AUDIENCE_ID set at launch still drives the sync.
    const mod = await freshModule({ segment: '', audience: 'aud_legacy' });
    expect(mod.isAudienceSyncEnabled()).toBe(true);
    await mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' });
    expect(mockContactsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ segments: [{ id: 'aud_legacy' }] }),
    );
  });

  // ★2026-08-05 に契約を実 SDK に合わせた。以前は mockRejectedValueOnce を使っていたが、
  // ★resend は API エラーで throw せず `{ data, error }` を resolve する
  // （実測 resend@6.12.4: dist の `throw new Error` は2件だけで、どちらも この経路に無い）。
  // ★∴ 旧テストは「catch が書かれていること」を確かめており、「catch が到達すること」を
  //   確かめていなかった —— テストは緑、本番では再 grant 経路が一度も走らない。
  it('★re-grant: existing contact (create resolves an error) → segments.add + re-subscribe', async () => {
    mockContactsCreate.mockResolvedValueOnce({
      data: null,
      error: { name: 'validation_error', message: 'Contact already exists' },
    });
    const mod = await freshModule({ segment: 'seg_test' });
    await mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' });
    expect(mockSegmentsAdd).toHaveBeenCalledWith({ email: 'u@example.com', segmentId: 'seg_test' });
    expect(mockContactsUpdate).toHaveBeenCalledWith({ email: 'u@example.com', unsubscribed: false });
  });

  it('★create が成功した時は再 grant 経路へ行かない（error 分岐の陰性対照）', async () => {
    mockContactsCreate.mockResolvedValueOnce({ data: { id: 'c_1' }, error: null });
    const mod = await freshModule({ segment: 'seg_test' });
    await mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' });
    expect(mockSegmentsAdd).not.toHaveBeenCalled();
  });

  // ★product課 の観察 (2026-08-05) への回答をテストにした。`created?.error` と書くと
  // 「応答そのものが無かった」が undefined = falsy = ★成功と同じ側に畳まれ、再 grant されない
  // まま静かに通る。`.` にしてあるので TypeError が catch に落ち、best-effort ログに★出る。
  // ★分岐は増やさず、不定を「成功」でなく「ログ」へ倒したことを ここで固定する。
  it('★応答が無い場合は「成功」でなく ログに倒れる（?. で畳まない）', async () => {
    mockContactsCreate.mockResolvedValueOnce(undefined); // SDK が戻り形を変えた場合
    const mod = await freshModule({ segment: 'seg_test' });
    await expect(
      mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' }),
    ).resolves.toBeUndefined(); // best-effort は保つ（呼び出し側を壊さない）
    expect(logger.warn).toHaveBeenCalledWith(
      '[audience-sync] best-effort sync failed',
      expect.objectContaining({ err: expect.stringContaining('TypeError') }),
    );
    // ★陽性対照: 正常な応答なら このログは出ない（上の assert が「常に出る」でないこと）
    vi.mocked(logger.warn).mockClear();
    mockContactsCreate.mockResolvedValueOnce({ data: { id: 'c_2' }, error: null });
    const ok = await freshModule({ segment: 'seg_test' });
    await ok.syncConsentToAudience({ email: 'v@example.com', status: 'granted' });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('best-effort: create と fallback が両方 error を返しても resolve する', async () => {
    const err = { name: 'application_error', message: 'resend 500' };
    mockContactsCreate.mockResolvedValueOnce({ data: null, error: err });
    mockSegmentsAdd.mockResolvedValueOnce({ data: null, error: err });
    mockContactsUpdate.mockResolvedValueOnce({ data: null, error: err });
    const mod = await freshModule({ segment: 'seg_test' });
    await expect(
      mod.syncConsentToAudience({ email: 'u@example.com', status: 'granted' }),
    ).resolves.toBeUndefined();
  });
});

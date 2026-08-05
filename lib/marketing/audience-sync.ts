/**
 * DB → Resend marketing-list sync for the self-owned list (handoff Step 5).
 *
 * Resend migrated Audiences → Segments. The two are the SAME id space — GET /audiences and
 * GET /segments return identical ids (verified 2026-07-06) — so this module uses the segments-native
 * API. The env holds that segment id: RESEND_MARKETING_SEGMENT_ID (preferred), with the legacy
 * RESEND_MARKETING_AUDIENCE_ID as a backward-compat fallback so an already-set legacy env keeps
 * working with no re-set (the value is the same id). See:
 * https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments
 *
 * No-op-safe: when the segment id is not configured this does nothing — so PR1 (schema + capture +
 * recordConsent) can ship and run BEFORE the segment is wired. Once set, granted → contact added to
 * the segment (subscribed), withdrawn → contact globally unsubscribed (suppression preserved on re-grant).
 *
 * Always best-effort: every call is caught and logged. A sync failure must NEVER roll back the
 * consent ledger write or block the caller's response (the ledger in marketing_consents is the
 * source of truth; the segment membership is a downstream projection). Callers invoke this fire-and-forget.
 */
import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';

// audienceId === segmentId (same Resend id space). Prefer the new env name, fall back to the legacy
// one so a value already set under RESEND_MARKETING_AUDIENCE_ID keeps working without a re-set.
// `||` (not `??`): an empty-string RESEND_MARKETING_SEGMENT_ID (e.g. the empty line shipped in
// .env.local.example) must be treated as unset so the legacy fallback still fires — matching the
// `!SEGMENT_ID` no-op guard's empty-is-unset semantics.
const SEGMENT_ID = process.env.RESEND_MARKETING_SEGMENT_ID || process.env.RESEND_MARKETING_AUDIENCE_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!SEGMENT_ID || !RESEND_API_KEY) return null; // segment not configured → no-op
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

/** True when the Resend marketing segment is configured (env present) — sync will actually run. */
export function isAudienceSyncEnabled(): boolean {
  return !!SEGMENT_ID && !!RESEND_API_KEY;
}

export async function syncConsentToAudience(opts: {
  email: string;
  name?: string | null;
  status: 'granted' | 'withdrawn';
}): Promise<void> {
  const resend = getClient();
  if (!resend || !opts.email) return; // no-op when unconfigured

  // ★resend SDK は API エラーで throw しない —— `{ data, error }` を resolve する。
  // 実測 (resend@6.12.4 の dist/index.cjs): `throw new Error` は全体で2件だけで、
  //   ① @react-email/render の import 失敗  ② constructor の Missing API key
  // のどちらも この経路に無い (②は getClient() が先に null を返す)。
  // `fetchRequest` は `!response.ok` で `{ data: null, error }` を return する。
  // ∴ ★以前の try/catch は発火せず、catch の中の「再 grant 経路」は死にコードだった
  //   ——既存 contact が再 grant した時、segment に戻らず unsubscribed のまま残る。
  //   ledger は granted なのに配信対象に入らない (product課 検出 2026-08-05)。
  try {
    if (opts.status === 'granted') {
      // New contact → create it directly into the segment.
      const created = await resend.contacts.create({
        email: opts.email,
        unsubscribed: false,
        ...(opts.name ? { firstName: opts.name } : {}),
        segments: [{ id: SEGMENT_ID! }],
      });

      // ★create が失敗したら再 grant 経路へ。既に存在する contact は create が error を返すので、
      // segment への復帰と再購読を明示的にやる。★error を読まないとここへ来ない。
      if (created?.error) {
        const added = await resend.contacts.segments.add({ email: opts.email, segmentId: SEGMENT_ID! });
        const updated = await resend.contacts.update({ email: opts.email, unsubscribed: false });
        // ★best-effort だが「ログには残る」を成立させる。resolve された失敗は catch に来ないので、
        //   ここで見なければ どこにも出ない。
        if (added?.error || updated?.error) {
          logger.warn('[audience-sync] re-grant failed', {
            createError: String(created.error?.message ?? created.error),
            addError: added?.error ? String(added.error?.message ?? added.error) : null,
            updateError: updated?.error ? String(updated.error?.message ?? updated.error) : null,
            status: opts.status,
          });
        }
      }
    } else {
      // Withdrawn → global unsubscribe (keeps the contact but suppresses; preserves suppression on re-grant).
      const updated = await resend.contacts.update({ email: opts.email, unsubscribed: true });
      if (updated?.error) {
        logger.warn('[audience-sync] unsubscribe failed', {
          err: String(updated.error?.message ?? updated.error),
          status: opts.status,
        });
      }
    }
  } catch (err) {
    // ★到達しうるのはネットワーク層の例外など (fetch 自体が throw する場合) のみ。
    // API エラーは上の error 分岐で扱う。
    logger.warn('[audience-sync] best-effort sync failed', { err: String(err), status: opts.status });
  }
}

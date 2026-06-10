/**
 * MUEDial Audio Analysis API
 * POST /api/dial/analyze
 *
 * Runs RoEx Mix Analysis on the session's audio (2-mix or mix final).
 * Returns loudness, peak, stereo field, clipping, tonal profile.
 * Cost: ~10 credits per call.
 */

import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { checkRateLimit, rateLimit } from '@/lib/middleware/rate-limit';
import { recordDialEvent } from '@/lib/analytics/dial-events';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { createRoExClient, isRoExDevKey, analyzeMix, mapMusicalStyle } from '@/lib/roex';
import { isDialSessionTrackEditable, dialTrackLockReason } from '@/lib/dial/session-edit-lock';
import type { MusicalStyle } from '@/lib/roex';
import { db } from '@/db';
import { dialTasks, dialTracks, dialSessions } from '@/db/schema';
import { dialRepository } from '@/lib/repositories/dial.repository';

// Bounds the worst-case hold of the per-session advisory lock below (a slow /mixanalysis POST).
export const maxDuration = 60;

// Advisory-lock namespace for analyze submission (issue #441, PR#438-style). Two-key form
// pg_advisory_xact_lock(CLASS, hashtext(session_id)) serializes concurrent analyze POSTs for
// THIS session so check-then-charge(~10cr)-then-cache cannot double-charge. Distinct namespace
// from FREE_CAMPAIGN_LOCK_KEY(4926081) / MASTERING_LOCK_CLASS(4926082).
const ANALYZE_LOCK_CLASS = 4926083;

const analyzeSchema = z.object({
  sessionId: z.string().uuid(),
});

/** Dummy analysis data for dev key testing */
const DEV_ANALYSIS_RESULT = {
  loudnessLufs: -18.2,
  peakDbfs: -1.3,
  stereoField: 'wide',
  monoCompatible: true,
  clipping: false,
  tonalProfile: { low: 0.3, mid: 0.45, high: 0.25 },
  raw: {},
};

export const POST = withDialAuth(async (auth) => {
  try {
    // Rate limit: tier-aware daily + monthly caps
    const identifier = auth.userId ? `user:${auth.userId}` : `guest:${auth.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'}`;
    const activeSub = auth.userId
      ? await dialRepository.findActiveSubscriptionByUserId(auth.userId)
      : null;
    const isHooPass = activeSub?.tier === 'hoo_pass';
    const dailyPreset = isHooPass ? 'dial-hoo-pass-daily' : 'dial-analyze-daily';
    const dailyLimit = isHooPass ? 3 : 5;
    const [daily, monthly] = await Promise.all([
      checkRateLimit(dailyPreset, identifier),
      checkRateLimit('dial-analyze-monthly', identifier),
    ]);
    if (daily && !daily.success) {
      return apiError(`Daily analysis limit reached (${dailyLimit}/day)`, { code: 'RATE_LIMIT_DAILY', status: 429 });
    }
    if (monthly && !monthly.success) {
      return apiError('Monthly analysis limit reached (30/month)', { code: 'RATE_LIMIT_MONTHLY', status: 429 });
    }

    // Short-window guard against rapid double-submit (defense-in-depth on top of the per-session
    // advisory lock below). Same limiter final/mastering use for their RoEx credit operations.
    const processLimit = await rateLimit(auth.request, 'dial-process');
    if (processLimit) return processLimit;

    const body = await auth.request.json();
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId } = parsed.data;

    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Already analyzed — return cached result
    if (session.analysisResult) {
      recordDialEvent({
        sessionId, eventType: 'analyze', userId: auth.userId, guestToken: auth.guestToken,
        mode: session.mode ?? (session.masteringMode ? 'mastering' : null),
        metadata: { cached: true },
      });
      return apiSuccess({ analysisResult: session.analysisResult, cached: true });
    }

    // Don't spend credits on a FRESH analysis once the session's track set is locked
    // (final mix/master started). Cached results above always remain readable. The UI only
    // triggers analysis in the editable window, so this never blocks a legitimate flow.
    if (!isDialSessionTrackEditable(session.status)) {
      const lock = dialTrackLockReason(session.status)!;
      return apiError(lock.message, { code: lock.code, status: 409 });
    }

    // Find audio URL to analyze
    let audioUrl: string | null = null;
    const isMasteringOnly = !session.mode && !!session.masteringMode;

    if (isMasteringOnly) {
      // Mastering-only: use the first uploaded track (2-mix)
      const tracks = await db.query.dialTracks.findMany({
        where: eq(dialTracks.sessionId, sessionId),
      });
      if (tracks.length > 0) {
        audioUrl = tracks[0].roexUploadUrl;
      }
    } else {
      // Mix+mastering: use the completed mix final URL
      const allTasks = await db.query.dialTasks.findMany({
        where: eq(dialTasks.sessionId, sessionId),
        orderBy: [desc(dialTasks.createdAt)],
      });
      const finalTask = allTasks.find(
        (t) => (t.taskType === 'final_basic' || t.taskType === 'final_advanced') && t.finalUrl,
      );
      if (finalTask?.finalUrl) {
        audioUrl = finalTask.finalUrl;
      }
    }

    if (!audioUrl) {
      return apiError('No audio file available for analysis', { code: 'NO_TRACK', status: 400 });
    }

    // Dev key: return dummy data (no charge → no concurrency guard needed)
    if (isRoExDevKey()) {
      await db.update(dialSessions)
        .set({ analysisResult: DEV_ANALYSIS_RESULT, updatedAt: new Date() })
        .where(eq(dialSessions.id, sessionId));

      recordDialEvent({
        sessionId, eventType: 'analyze', userId: auth.userId, guestToken: auth.guestToken,
        mode: session.mode ?? (session.masteringMode ? 'mastering' : null),
        metadata: { cached: false, dev_key: true },
      });
      return apiSuccess({ analysisResult: DEV_ANALYSIS_RESULT, cached: false });
    }

    // Use OTHER for analysis — LUFS/peak/stereo are genre-independent
    const roexStyle = mapMusicalStyle(session.musicalStyle);

    // ─── Concurrency guard (issue #441): serialize concurrent analyze for THIS session ────────
    // analyze is check(cache)-then-charge(/mixanalysis ~10cr)-then-cache, non-atomic: two
    // simultaneous POSTs both read analysisResult=null and each charge ~10cr (same TOCTOU class
    // as final/mastering, PR#438). There is no task row to reserve here, and analysisResult is
    // read by the UI + Hoo prompt (a sentinel value there has blast radius), so we serialize with
    // a per-session advisory lock (2-key, hashtext(sessionId)) held across the single synchronous
    // /mixanalysis POST. The lock only blocks a concurrent analyze for the SAME session; a
    // concurrent loser blocks, re-reads the now-cached result under the lock, and returns it
    // WITHOUT charging. /mixanalysis is one bounded POST (not submit+poll), so the hold is short
    // (maxDuration bounds the worst case); no comm-timeout is added on the charge submit (a false
    // abort would risk a re-charge — see lib/roex/client.ts).
    const outcome = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${ANALYZE_LOCK_CLASS}, hashtext(${sessionId}))`);

      // Authoritative re-read under the lock: a concurrent analyze that won the race has already
      // written analysisResult by the time we hold the lock → return it, never double-charge.
      const [fresh] = await tx
        .select({ analysisResult: dialSessions.analysisResult })
        .from(dialSessions)
        .where(eq(dialSessions.id, sessionId))
        .limit(1);
      if (fresh?.analysisResult) {
        return { analysisResult: fresh.analysisResult, cached: true };
      }

      const client = createRoExClient();
      const result = await analyzeMix(client, {
        audioUrl,
        musicalStyle: roexStyle as MusicalStyle,
        isMaster: false,
      });

      await tx.update(dialSessions)
        .set({ analysisResult: result, updatedAt: new Date() })
        .where(eq(dialSessions.id, sessionId));

      return { analysisResult: result, cached: false };
    });

    recordDialEvent({
      sessionId, eventType: 'analyze', userId: auth.userId, guestToken: auth.guestToken,
      mode: session.mode ?? (session.masteringMode ? 'mastering' : null),
      metadata: { cached: outcome.cached, dev_key: false },
    });
    return apiSuccess({ analysisResult: outcome.analysisResult, cached: outcome.cached });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Analysis failed');
  }
});

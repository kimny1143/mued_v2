/**
 * MUEDial server-side event recording.
 * Records to dial_trial_events (DB) + sends GA4 Measurement Protocol.
 * Fire-and-forget: errors are swallowed, never throws.
 */
import { db } from '@/db';
import { dialTrialEvents } from '@/db/schema';
import { logger } from '@/lib/utils/logger';

export type DialEventType = 'analyze' | 'preview' | 'final' | 'checkout_view';

export interface RecordDialEventInput {
  sessionId: string;
  eventType: DialEventType;
  userId: string | null;
  guestToken: string | null;
  mode: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Record a MUEDial trial event to DB and GA4.
 * Returns immediately — all I/O runs in the background.
 */
export function recordDialEvent(input: RecordDialEventInput): void {
  void Promise.all([
    writeDbEvent(input).catch((err) => {
      logger.warn('[dial-events] DB write failed', { err: String(err) });
    }),
    sendGA4Event(input).catch((err) => {
      logger.warn('[dial-events] GA4 MP send failed', { err: String(err) });
    }),
  ]);
}

async function writeDbEvent(input: RecordDialEventInput): Promise<void> {
  await db.insert(dialTrialEvents).values({
    sessionId: input.sessionId,
    eventType: input.eventType,
    userId: input.userId,
    guestToken: input.guestToken,
    mode: input.mode,
    metadata: input.metadata ?? null,
  });
}

async function sendGA4Event(input: RecordDialEventInput): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return;

  const clientId = input.userId ?? input.guestToken ?? `session-${input.sessionId}`;
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      events: [{
        name: `dial_trial_${input.eventType}`,
        params: {
          session_id: input.sessionId,
          mode: input.mode ?? 'unknown',
          authenticated: input.userId ? 'true' : 'false',
          ...(input.metadata ?? {}),
        },
      }],
    }),
  });
}

/**
 * Research Waitlist Welcome Email API
 *
 * POST /api/email/welcome
 * Auth: X-Internal-API-Key (called from data課 batch scripts)
 *
 * Sends the MUEDial research beta waitlist welcome email to a qualified user.
 * Designed for data課's Phase 2 batch trigger (welcome_email_trigger.py).
 *
 * Payload:
 *   { userId?: string | null, email: string, readiness_score: number, triggered_at: string, locale?: 'ja' | 'en' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailService } from '@/lib/services/email.service';
import { logger } from '@/lib/utils/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const schema = z.object({
  userId: z.string().nullable().optional(),
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  readiness_score: z.number().int().min(0).max(100),
  triggered_at: z.string(),
  locale: z.enum(['ja', 'en']).default('ja'),
});

export async function POST(request: NextRequest) {
  // Verify internal API key
  const apiKey = request.headers.get('X-Internal-API-Key');
  if (!INTERNAL_API_KEY || apiKey !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { userId, email, readiness_score, triggered_at, locale } = parsed.data;

  if (!emailService.isConfigured()) {
    logger.warn('[email/welcome] Email service not configured — skipping send', { email });
    return NextResponse.json({ ok: true, skipped: true, reason: 'email_not_configured' });
  }

  const result = await emailService.sendResearchWaitlistWelcome(
    { email },
    { locale }
  );

  if (!result.success) {
    logger.error('[email/welcome] Failed to send welcome email', {
      error: result.error,
      email,
      userId,
      readiness_score,
    });
    return NextResponse.json(
      { ok: false, error: result.error ?? 'Send failed' },
      { status: 500 }
    );
  }

  logger.info('[email/welcome] Welcome email sent', {
    email,
    userId: userId ?? null,
    readiness_score,
    triggered_at,
    locale,
  });

  return NextResponse.json({ ok: true, email });
}

/**
 * glasswerks Inquiry Notification API
 *
 * POST /api/glasswerks/inquiry/notify
 * Auth: X-Internal-API-Key (called from Hoo MCP Worker)
 *
 * Sends two emails via Resend:
 *   1. Admin notification to GLASSWERKS_INQUIRY_EMAIL (kimny)
 *   2. User confirmation to the inquirer
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { emailService } from '@/lib/services/email.service';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const GLASSWERKS_INQUIRY_EMAIL = process.env.GLASSWERKS_INQUIRY_EMAIL;

interface NotifyRequestBody {
  inquiryId: string;
  inquiryNumber: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  serviceType: string;
  budgetRange: string;
  description: string;
  urgency: string;
  language: string;
}

export async function POST(request: NextRequest) {
  // Verify internal API key
  const apiKey = request.headers.get('X-Internal-API-Key');
  if (!INTERNAL_API_KEY || apiKey !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: NotifyRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { inquiryNumber, serviceType, budgetRange, description, urgency, language, userName, userEmail } = body;

  if (!inquiryNumber || !serviceType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const results: { admin?: boolean; user?: boolean } = {};

  // 1. Send admin notification
  if (GLASSWERKS_INQUIRY_EMAIL && emailService.isConfigured()) {
    const adminResult = await emailService.sendGlasswerksInquiryNotify(
      { email: GLASSWERKS_INQUIRY_EMAIL },
      {
        inquiryNumber,
        serviceType,
        budgetRange,
        description,
        urgency,
        language,
        userName,
        userEmail,
      }
    );
    results.admin = adminResult.success;

    if (!adminResult.success) {
      logger.error('[glasswerks/notify] Admin email failed', {
        error: adminResult.error,
        inquiryNumber,
      });
    }
  } else {
    logger.warn('[glasswerks/notify] Admin email skipped — GLASSWERKS_INQUIRY_EMAIL or Resend not configured');
  }

  // 2. Send user confirmation
  if (userEmail && emailService.isConfigured()) {
    const userResult = await emailService.sendGlasswerksInquiryConfirm(
      { email: userEmail, name: userName ?? undefined },
      {
        inquiryNumber,
        serviceType,
        userName,
        language,
      }
    );
    results.user = userResult.success;

    if (!userResult.success) {
      logger.error('[glasswerks/notify] User confirmation email failed', {
        error: userResult.error,
        inquiryNumber,
        userEmail,
      });
    }
  } else {
    logger.warn('[glasswerks/notify] User email skipped — no user email provided');
  }

  logger.info('[glasswerks/notify] Notification processed', {
    inquiryNumber,
    serviceType,
    results,
  });

  return NextResponse.json({ ok: true, results });
}

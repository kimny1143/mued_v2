/**
 * MUEDnote DAW Log API
 *
 * POST /api/muednote/daw-log - Create DAW log (single or batch)
 * GET  /api/muednote/daw-log - Get DAW logs by time range
 *
 * Authentication:
 * - X-DAW-API-Key header (development only, for testing)
 * - Bearer JWT (desktop app - Clerk OAuth)
 * - Clerk session cookie (web)
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { verifyToken } from '@clerk/backend';
import {
  dawLogsRepository,
  type CreateDawLogInput,
} from '@/lib/repositories/daw-logs.repository';
import type { DawType, DawAction } from '@/db/schema/muednote-daw-logs';
import { MIDI_ACTIONS, OSC_ACTIONS } from '@/db/schema/muednote-daw-logs';
import { getUserIdFromClerkId } from '@/lib/utils/auth-helpers';
import { trialService } from '@/lib/services/trial.service';
import { subscriptionRepository } from '@/lib/repositories/subscriptions.repository';

/** Source filter type for GET requests */
type SourceFilter = 'osc' | 'midi' | 'all';

// ========================================
// Environment Configuration
// ========================================

const DAW_API_KEY = process.env.DAW_HUB_API_KEY;
const DAW_USER_ID = process.env.DAW_HUB_USER_ID;

// ========================================
// Authentication
// ========================================

/**
 * DAW Hub Authentication
 * Priority order:
 * 1. X-DAW-API-Key: API key auth (development only, for testing)
 * 2. Bearer: JWT auth (desktop app)
 * 3. Cookie: Clerk session (web)
 */
async function getAuthUserId(req: Request): Promise<string | null> {
  // API Key authentication - DEVELOPMENT ONLY
  // In production, users must authenticate via JWT (Clerk OAuth)
  const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
  const apiKey = req.headers.get('X-DAW-API-Key');

  if (IS_DEVELOPMENT && apiKey && DAW_API_KEY && apiKey === DAW_API_KEY) {
    if (!DAW_USER_ID) {
      console.error('[DAW API] API key valid but DAW_HUB_USER_ID not set');
      return null;
    }
    return DAW_USER_ID;
  }

  // JWT authentication (future desktop app)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      if (payload?.sub) {
        return payload.sub;
      }
    } catch (error) {
      console.error('[DAW API] JWT verification failed:', error);
    }
  }

  // Cookie authentication (Web)
  const session = await auth();
  return session?.userId || null;
}

// ========================================
// Tier Check for DAW Logs (Basic+ or Trial)
// ========================================

/**
 * Check if user can use DAW log feature
 * Requires: Basic, Premium, or active Trial
 */
async function canUseDawLogs(clerkUserId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const internalUserId = await getUserIdFromClerkId(clerkUserId);
    if (!internalUserId) {
      return { allowed: false, reason: 'USER_NOT_FOUND' };
    }

    // Check subscription tier
    const subscription = await subscriptionRepository.findActiveByUserId(internalUserId);
    if (!subscription) {
      return { allowed: false, reason: 'NO_SUBSCRIPTION' };
    }

    const tier = subscription.tier;

    // Basic and Premium can always use DAW logs
    if (tier === 'basic' || tier === 'premium') {
      return { allowed: true };
    }

    // Free tier: check if in active trial
    if (tier === 'free') {
      const trialStatus = await trialService.getTrialStatus(internalUserId);
      if (trialStatus.isInTrial) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'FREE_TIER' };
    }

    return { allowed: false, reason: 'UNKNOWN_TIER' };
  } catch (error) {
    console.error('[canUseDawLogs] Error:', error);
    return { allowed: false, reason: 'CHECK_FAILED' };
  }
}

// ========================================
// Request Types
// ========================================

interface DawLogPostBody {
  timestamp: string;
  daw?: DawType;
  action?: DawAction;
  track_id: number;
  device_id: number;
  param_id: number;
  value: number;
  value_string: string;
  metadata?: Record<string, unknown>;
}

interface BatchDawLogPostBody {
  logs: DawLogPostBody[];
}

// ========================================
// Validation
// ========================================

function validateSingleLog(body: DawLogPostBody): string | null {
  if (!body.timestamp) return 'timestamp is required';
  if (body.track_id === undefined) return 'track_id is required';
  if (body.device_id === undefined) return 'device_id is required';
  if (body.param_id === undefined) return 'param_id is required';
  if (body.value === undefined) return 'value is required';
  if (!body.value_string) return 'value_string is required';
  return null;
}

function convertToInput(userId: string, body: DawLogPostBody): CreateDawLogInput {
  return {
    userId,
    ts: new Date(body.timestamp),
    daw: body.daw ?? 'ableton',
    action: body.action ?? 'parameter_change',
    trackId: body.track_id,
    deviceId: body.device_id,
    paramId: body.param_id,
    value: body.value,
    valueString: body.value_string,
    metadata: body.metadata,
  };
}

// ========================================
// POST /api/muednote/daw-log
// Create DAW log entry (single or batch)
// ========================================

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication required' },
        { status: 401 }
      );
    }

    // Check tier (Basic+ or Trial required)
    const tierCheck = await canUseDawLogs(userId);
    if (!tierCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Upgrade required',
          message: 'DAW log integration requires Basic plan or higher. Start a free trial or upgrade to access this feature.',
          code: tierCheck.reason,
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Check if batch request
    if (Array.isArray(body.logs)) {
      return handleBatchPost(userId, body as BatchDawLogPostBody);
    }

    // Single log request
    return handleSinglePost(userId, body as DawLogPostBody);
  } catch (error) {
    console.error('[POST /api/muednote/daw-log] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create DAW log' },
      { status: 500 }
    );
  }
}

async function handleSinglePost(userId: string, body: DawLogPostBody) {
  const validationError = validateSingleLog(body);
  if (validationError) {
    return NextResponse.json(
      { error: 'Validation error', message: validationError },
      { status: 400 }
    );
  }

  const input = convertToInput(userId, body);
  const newLog = await dawLogsRepository.create(input);

  return NextResponse.json({
    success: true,
    id: newLog.id,
  });
}

async function handleBatchPost(userId: string, body: BatchDawLogPostBody) {
  const { logs } = body;

  if (!logs || logs.length === 0) {
    return NextResponse.json(
      { error: 'Validation error', message: 'logs array is required and must not be empty' },
      { status: 400 }
    );
  }

  // Limit batch size to prevent abuse
  const MAX_BATCH_SIZE = 100;
  if (logs.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: 'Validation error', message: `Maximum batch size is ${MAX_BATCH_SIZE}` },
      { status: 400 }
    );
  }

  // Validate all logs
  const errors: string[] = [];
  for (let i = 0; i < logs.length; i++) {
    const error = validateSingleLog(logs[i]);
    if (error) {
      errors.push(`logs[${i}]: ${error}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Validation error', message: errors.join('; ') },
      { status: 400 }
    );
  }

  // Convert and insert
  const inputs = logs.map((log) => convertToInput(userId, log));
  const result = await dawLogsRepository.createBatch(inputs);

  return NextResponse.json({
    success: true,
    inserted: result.inserted,
  });
}

// ========================================
// GET /api/muednote/daw-log
// Get DAW logs by time range or session
// ========================================

export async function GET(req: Request) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication required' },
        { status: 401 }
      );
    }

    // Check tier (Basic+ or Trial required)
    const tierCheck = await canUseDawLogs(userId);
    if (!tierCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Upgrade required',
          message: 'DAW log integration requires Basic plan or higher. Start a free trial or upgrade to access this feature.',
          code: tierCheck.reason,
        },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const until = url.searchParams.get('until');
    const sessionId = url.searchParams.get('session_id');
    const source = (url.searchParams.get('source') || 'all') as SourceFilter;
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '100'),
      500
    );

    // Determine which actions to filter by source
    let actions: DawAction[] | undefined;
    if (source === 'midi') {
      actions = MIDI_ACTIONS;
    } else if (source === 'osc') {
      actions = OSC_ACTIONS;
    }

    // Build filters
    const filters = {
      userId,
      sessionId: sessionId ?? undefined,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
      actions,
      limit,
    };

    const logs = await dawLogsRepository.getLogs(filters);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        ts: log.ts,
        daw: log.daw,
        action: log.action,
        track_id: log.trackId,
        device_id: log.deviceId,
        param_id: log.paramId,
        value: log.value,
        value_string: log.valueString,
        metadata: log.metadata,
        created_at: log.createdAt,
      })),
      count: logs.length,
    });
  } catch (error) {
    console.error('[GET /api/muednote/daw-log] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch DAW logs' },
      { status: 500 }
    );
  }
}

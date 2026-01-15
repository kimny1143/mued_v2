/**
 * MUEDnote DAW Log API
 *
 * POST /api/muednote/daw-log - Create DAW log (single or batch)
 * GET  /api/muednote/daw-log - Get DAW logs by time range
 *
 * Authentication:
 * - X-DAW-API-Key header (CLI/Hub)
 * - Bearer JWT (future desktop app)
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

// ========================================
// Environment Configuration
// ========================================

const DAW_API_KEY = process.env.DAW_HUB_API_KEY;
const DAW_USER_ID = process.env.DAW_HUB_USER_ID;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Development fallbacks (only for local development)
const DEV_API_KEY = 'dev_daw_key_kimny';
const DEV_USER_ID = 'user_2wUoGVkTsBdFc0n2qIRxnAWa7Vy';

/**
 * Get effective API key (production requires env var)
 */
function getApiKey(): string | null {
  if (IS_PRODUCTION) {
    return DAW_API_KEY ?? null;
  }
  return DAW_API_KEY || DEV_API_KEY;
}

/**
 * Get effective user ID for API key auth
 */
function getApiUserId(): string | null {
  if (IS_PRODUCTION) {
    return DAW_USER_ID ?? null;
  }
  return DAW_USER_ID || DEV_USER_ID;
}

// ========================================
// Authentication
// ========================================

/**
 * DAW Hub Authentication
 * Priority order:
 * 1. X-DAW-API-Key: API key auth (CLI/Hub)
 * 2. Bearer: JWT auth (future desktop app)
 * 3. Cookie: Clerk session (web)
 */
async function getAuthUserId(req: Request): Promise<string | null> {
  // API Key authentication (CLI/Hub)
  const apiKey = req.headers.get('X-DAW-API-Key');
  const expectedKey = getApiKey();
  const apiUserId = getApiUserId();

  if (apiKey && expectedKey && apiKey === expectedKey) {
    if (!apiUserId) {
      console.error('[DAW API] API key valid but DAW_HUB_USER_ID not set');
      return null;
    }
    return apiUserId;
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

    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const until = url.searchParams.get('until');
    const sessionId = url.searchParams.get('session_id');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '100'),
      500
    );

    // Build filters
    const filters = {
      userId,
      sessionId: sessionId ?? undefined,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
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

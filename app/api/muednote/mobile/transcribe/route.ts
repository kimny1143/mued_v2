/**
 * MUEDnote Cloud Transcription API
 *
 * POST /api/muednote/mobile/transcribe
 * Proxies audio to OpenAI Whisper API for transcription.
 *
 * Authentication: Bearer JWT (Clerk) via withAuth
 * Rate limit: ai (10 req/min)
 * File limit: 4.5MB (Vercel serverless body limit)
 */

import { withAuth, type AuthContext } from '@/lib/middleware/with-auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { openai } from '@/lib/openai';
import { logger } from '@/lib/utils/logger';
import { toFile } from 'openai';

// Max file size: 4.5MB (Vercel body limit)
const MAX_FILE_SIZE = 4.5 * 1024 * 1024;

// Whisper API cost: $0.006 per minute
const WHISPER_COST_PER_MINUTE = 0.006;

// ========================================
// POST /api/muednote/mobile/transcribe
// ========================================

export const POST = withAuth(async ({ userId, request }: AuthContext) => {
  // Rate limit
  const rateLimitResponse = await rateLimit(request, 'ai');
  if (rateLimitResponse) return rateLimitResponse;

  // Parse FormData
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File | null;
  const language = (formData.get('language') as string) || 'ja';
  const chunkIndex = parseInt((formData.get('chunk_index') as string) || '0', 10);
  const chunkOffsetMs = parseInt((formData.get('chunk_offset_ms') as string) || '0', 10);

  if (!audioFile) {
    return apiError('audio file is required', { status: 400 });
  }

  if (audioFile.size > MAX_FILE_SIZE) {
    return apiError(
      `File too large: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      { status: 400 }
    );
  }

  logger.info(`[Transcribe] User: ${userId}, chunk: ${chunkIndex}, size: ${(audioFile.size / 1024).toFixed(0)}KB, lang: ${language}`);

  // Convert File to OpenAI-compatible format
  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const file = await toFile(buffer, audioFile.name || 'audio.m4a', {
    type: audioFile.type || 'audio/m4a',
  });

  // Call OpenAI Whisper API
  const startTime = Date.now();
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const elapsed = Date.now() - startTime;

  // Extract segments and apply chunk offset
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSegments = (transcription as any).segments || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segments = rawSegments.map((seg: any) => ({
    text: seg.text?.trim() || '',
    t0: Math.round((seg.start || 0) * 1000) + chunkOffsetMs,
    t1: Math.round((seg.end || 0) * 1000) + chunkOffsetMs,
  }));

  // Cost calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const durationSeconds = (transcription as any).duration || 0;
  const estimatedCost = (durationSeconds / 60) * WHISPER_COST_PER_MINUTE;

  logger.info(`[Transcribe] Done in ${elapsed}ms, duration: ${durationSeconds}s, cost: $${estimatedCost.toFixed(4)}, segments: ${segments.length}`);

  return apiSuccess({
    text: transcription.text,
    segments,
    usage: {
      duration_seconds: durationSeconds,
      estimated_cost: estimatedCost,
    },
  });
});

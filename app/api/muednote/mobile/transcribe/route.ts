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

// Hallucination filter thresholds
// Whisper verbose_json segments include no_speech_prob and compression_ratio.
// High no_speech_prob = silence filled with hallucinated text.
// High compression_ratio = repetitive text (e.g. "よし よし よし...").
const NO_SPEECH_PROB_THRESHOLD = 0.6;
const COMPRESSION_RATIO_THRESHOLD = 2.4;
const AVG_LOGPROB_THRESHOLD = -1.0;

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
  const prompt = (formData.get('prompt') as string) || undefined;
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

  logger.info(`[Transcribe] User: ${userId}, chunk: ${chunkIndex}, size: ${(audioFile.size / 1024).toFixed(0)}KB, lang: ${language}, type: ${audioFile.type}, name: ${audioFile.name}`);

  // Convert File to OpenAI-compatible format
  const buffer = Buffer.from(await audioFile.arrayBuffer());

  // Validate audio: M4A/MP4 files have 'ftyp' at byte offset 4
  const header = buffer.slice(0, 12);
  const headerHex = header.toString('hex');
  const ftypMarker = header.slice(4, 8).toString('ascii');
  logger.info(`[Transcribe] Audio header: ${headerHex}, ftyp check: "${ftypMarker}", buffer size: ${buffer.length}`);

  if (buffer.length < 100) {
    return apiError('Audio file is too small or empty', { status: 400 });
  }

  if (ftypMarker !== 'ftyp') {
    logger.warn(`[Transcribe] Invalid M4A: expected 'ftyp' at offset 4, got '${ftypMarker}'`);
    // Don't reject — Whisper can handle various formats — but log the warning
  }

  const file = await toFile(buffer, audioFile.name || 'audio.m4a', {
    type: 'audio/mp4',
  });

  // Call OpenAI Whisper API
  const startTime = Date.now();
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
    temperature: 0,
    ...(prompt ? { prompt } : {}),
  });

  const elapsed = Date.now() - startTime;

  // Extract segments, apply chunk offset, and filter hallucinations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSegments = (transcription as any).segments || [];
  let filteredCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segments = rawSegments.filter((seg: any) => {
    const noSpeechProb = seg.no_speech_prob ?? 0;
    const compressionRatio = seg.compression_ratio ?? 0;
    const avgLogprob = seg.avg_logprob ?? 0;

    // Filter: high no_speech_prob AND (high compression OR low confidence)
    // Both conditions together = almost certainly hallucination
    if (noSpeechProb > NO_SPEECH_PROB_THRESHOLD &&
        (compressionRatio > COMPRESSION_RATIO_THRESHOLD || avgLogprob < AVG_LOGPROB_THRESHOLD)) {
      filteredCount++;
      logger.info(`[Transcribe] Filtered hallucination: "${seg.text?.trim().slice(0, 40)}" (no_speech=${noSpeechProb.toFixed(2)}, cr=${compressionRatio.toFixed(2)}, logp=${avgLogprob.toFixed(2)})`);
      return false;
    }
    return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }).map((seg: any) => ({
    text: seg.text?.trim() || '',
    t0: Math.round((seg.start || 0) * 1000) + chunkOffsetMs,
    t1: Math.round((seg.end || 0) * 1000) + chunkOffsetMs,
  }));

  // Cost calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const durationSeconds = (transcription as any).duration || 0;
  const estimatedCost = (durationSeconds / 60) * WHISPER_COST_PER_MINUTE;

  logger.info(`[Transcribe] Done in ${elapsed}ms, duration: ${durationSeconds}s, cost: $${estimatedCost.toFixed(4)}, segments: ${segments.length} (filtered: ${filteredCount})`);

  // Rebuild text from filtered segments (original text may contain hallucinations)
  const filteredText = segments.map((s: { text: string }) => s.text).join(' ');

  return apiSuccess({
    text: filteredText,
    segments,
    usage: {
      duration_seconds: durationSeconds,
      estimated_cost: estimatedCost,
    },
  });
});

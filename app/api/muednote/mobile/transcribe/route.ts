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

// Hallucination filter thresholds (3-layer defense)
// Layer 1: Whisper metadata — no_speech_prob, compression_ratio, avg_logprob
// Layer 2: Repetition detection — same short phrase repeating = hallucination
// Layer 3: Final text cleanup — strip remaining repeated patterns
const NO_SPEECH_PROB_THRESHOLD = 0.5;
const COMPRESSION_RATIO_THRESHOLD = 2.0;
const AVG_LOGPROB_THRESHOLD = -1.0;

/**
 * Detect if segment text is repetitive hallucination.
 * Catches patterns like "はい、はい、はい、" or "よし よし よし"
 */
function isRepetitiveText(text: string): boolean {
  if (!text || text.length < 10) return false;
  const cleaned = text.trim();

  // Check if a short phrase (1-10 chars) repeats 3+ times
  for (let len = 1; len <= 10; len++) {
    const phrase = cleaned.slice(0, len);
    if (!phrase) continue;
    // Count how much of the text is this phrase repeated
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');
    const matches = cleaned.match(regex);
    if (matches && matches.length >= 3) {
      // If >60% of the text is this phrase repeated, it's hallucination
      const coverage = (matches.length * phrase.length) / cleaned.length;
      if (coverage > 0.6) return true;
    }
  }
  return false;
}

/**
 * Remove repeated phrases from final text.
 * Safety net for any hallucination that passes segment-level filters.
 */
function cleanRepetitiveText(text: string): string {
  if (!text) return text;
  // Match any short phrase (2-15 chars including punctuation) repeated 3+ times
  // e.g. "はい、はい、はい、はい、" → ""
  return text.replace(/(.{2,15}?)\1{2,}/g, '').trim();
}

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
    const text = seg.text?.trim() || '';

    // Layer 1: Metadata-based filter
    // High no_speech_prob alone (likely silence)
    if (noSpeechProb > NO_SPEECH_PROB_THRESHOLD) {
      filteredCount++;
      logger.info(`[Transcribe] Filtered (no_speech): "${text.slice(0, 40)}" (nsp=${noSpeechProb.toFixed(2)}, cr=${compressionRatio.toFixed(2)})`);
      return false;
    }

    // High compression ratio alone (repetitive text)
    if (compressionRatio > COMPRESSION_RATIO_THRESHOLD) {
      filteredCount++;
      logger.info(`[Transcribe] Filtered (compression): "${text.slice(0, 40)}" (cr=${compressionRatio.toFixed(2)}, nsp=${noSpeechProb.toFixed(2)})`);
      return false;
    }

    // Very low confidence
    if (avgLogprob < AVG_LOGPROB_THRESHOLD && noSpeechProb > 0.3) {
      filteredCount++;
      logger.info(`[Transcribe] Filtered (low_conf): "${text.slice(0, 40)}" (logp=${avgLogprob.toFixed(2)}, nsp=${noSpeechProb.toFixed(2)})`);
      return false;
    }

    // Layer 2: Text repetition detection (catches hallucination that metadata misses)
    if (isRepetitiveText(text)) {
      filteredCount++;
      logger.info(`[Transcribe] Filtered (repetitive): "${text.slice(0, 40)}" (nsp=${noSpeechProb.toFixed(2)}, cr=${compressionRatio.toFixed(2)})`);
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

  // Rebuild text from filtered segments, then apply Layer 3 text cleanup
  const rawFilteredText = segments.map((s: { text: string }) => s.text).join(' ');
  const filteredText = cleanRepetitiveText(rawFilteredText);

  if (rawFilteredText.length !== filteredText.length) {
    logger.info(`[Transcribe] Layer 3 cleanup removed ${rawFilteredText.length - filteredText.length} chars of repetition`);
  }

  return apiSuccess({
    text: filteredText,
    segments,
    usage: {
      duration_seconds: durationSeconds,
      estimated_cost: estimatedCost,
    },
  });
});

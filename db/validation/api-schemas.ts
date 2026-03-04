/**
 * API-specific Zod schemas for request validation.
 *
 * These are derived from the Drizzle table structure but use standard
 * zod for compatibility with API route validation patterns.
 * The base schemas in ./index.ts can be used for DB-level validation.
 */

import { z } from 'zod';

// ── POST /api/interview/answers ─────────────────────
export const saveAnswerRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  questionId: z.string().uuid('Invalid question ID format'),
  answerText: z.string().min(1, 'Answer cannot be empty').max(5000, 'Answer too long (max 5000 chars)'),
});

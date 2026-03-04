/**
 * Auto-generated Zod schemas from Drizzle table definitions.
 *
 * Usage:
 *   import { insertSessionSchema, selectSessionSchema } from '@/db/validation';
 *
 * These schemas stay in sync with the DB schema automatically.
 * For API-specific input shapes, see ./api-schemas.ts
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  sessions,
  interviewQuestions,
  interviewAnswers,
} from '@/db/schema/sessions';

// ── Sessions ────────────────────────────────────────
export const insertSessionSchema = createInsertSchema(sessions);
export const selectSessionSchema = createSelectSchema(sessions);

// ── Interview Questions ─────────────────────────────
export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestions);
export const selectInterviewQuestionSchema = createSelectSchema(interviewQuestions);

// ── Interview Answers ───────────────────────────────
export const insertInterviewAnswerSchema = createInsertSchema(interviewAnswers);
export const selectInterviewAnswerSchema = createSelectSchema(interviewAnswers);

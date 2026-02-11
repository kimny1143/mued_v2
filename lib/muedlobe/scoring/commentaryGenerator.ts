/**
 * Commentary Generator - Generate personalized AI commentary from cognitive profile
 *
 * Uses Claude Haiku to produce a natural-language interpretation of the user's
 * cognitive scores and detected patterns, spoken as Hoo (the owl companion).
 */

import { sendClaudeChat } from '@/lib/ai/providers/claude';
import type { Scores, SignificantPattern } from '@/types/muedlobe';
import type { Locale } from '@/lib/i18n/config';
import {
  buildCommentarySystemPrompt,
  buildCommentaryUserMessage,
} from '@/lib/ai/prompts/lobe-commentary';

/**
 * Generate AI commentary from cognitive profile scores and patterns.
 */
export async function generateCommentary(
  scores: Scores,
  patterns: SignificantPattern[],
  locale: Locale
): Promise<string> {
  const response = await sendClaudeChat(
    [{ role: 'user', content: buildCommentaryUserMessage(scores, patterns) }],
    {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 512,
      temperature: 0.7,
      systemPrompt: buildCommentarySystemPrompt(locale),
    }
  );

  return response.content;
}

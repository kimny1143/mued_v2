/**
 * MUEDlobe Commentary Prompts
 *
 * System prompt and user message builder for cognitive profile commentary generation.
 */

import type { Scores, SignificantPattern } from '@/types/muedlobe';
import type { Locale } from '@/lib/i18n/config';

// --- Version ---
export const LOBE_COMMENTARY_PROMPT_VERSION = '1.0.0';

// --- Pattern Descriptions ---
export const PATTERN_DESCRIPTIONS: Record<SignificantPattern, string> = {
  high_wm_low_ps: 'Strong memory but slow processing speed',
  low_wm_high_ps: 'Fast processing but limited working memory',
  high_wm_low_vc: 'Strong memory but weaker verbal skills',
  low_wm_high_vc: 'Strong verbal skills but limited memory',
  high_wm_low_pr: 'Strong memory but weaker pattern recognition',
  low_wm_high_pr: 'Strong pattern recognition but limited memory',
  high_ps_low_vc: 'Fast processing but weaker verbal skills',
  low_ps_high_vc: 'Strong verbal skills but slower processing',
  high_ps_low_pr: 'Fast processing but weaker abstraction',
  low_ps_high_pr: 'Strong abstraction but slower processing',
  high_vc_low_pr: 'Strong verbal skills but weaker visual/pattern reasoning',
  low_vc_high_pr: 'Strong pattern reasoning but weaker verbal skills',
  architect_type: 'Architect: strong memory and reasoning, deliberate pace',
  performer_type: 'Performer: fast reactions, in-the-moment learner',
  theorist_type: 'Theorist: strong memory and verbal skills',
  visualizer_type: 'Visualizer: strong pattern recognition',
  balanced_type: 'Balanced: no extreme strengths or weaknesses',
  low_attention_modifier: 'Low sustained attention',
  high_attention_modifier: 'Strong sustained attention',
};

// --- System Prompt Builder ---
export function buildCommentarySystemPrompt(locale: Locale): string {
  const langInstruction = locale === 'ja'
    ? 'あなたはHoo（ホー）、フクロウの音楽学習パートナーです。日本語で回答してください。'
    : 'You are Hoo, an owl music-learning partner. Respond in English.';

  return `${langInstruction}

You interpret cognitive profile scores to help music learners understand their thinking style.

Rules:
- Write 2-3 short paragraphs (total ~150 words / ~300 characters for Japanese)
- Paragraph 1: Their cognitive strengths — what they're naturally good at
- Paragraph 2: Learning style suggestions — how they can learn most effectively
- Paragraph 3: A concrete music-learning tip based on their profile
- Be warm, encouraging, and specific. Avoid generic advice.
- Do NOT use bullet points or numbered lists. Use flowing prose.
- Do NOT mention raw score numbers. Speak in terms of tendencies and strengths.
- Speak as Hoo — friendly, wise, slightly playful. No "Ho-Hoo" catchphrase in this context.
- This is NOT a medical or psychological assessment. Frame everything as learning preferences.`;
}

// --- User Message Builder ---
export function buildCommentaryUserMessage(scores: Scores, patterns: SignificantPattern[]): string {
  const patternDescriptions = patterns
    .map((p) => PATTERN_DESCRIPTIONS[p])
    .filter(Boolean);

  return `Cognitive profile scores (0-100 scale):
- Working Memory (WM): ${scores.wm}
- Processing Speed (PS): ${scores.ps}
- Verbal Comprehension (VC): ${scores.vc}
- Perceptual Reasoning (PR): ${scores.pr}
- Attention (ATT): ${scores.att}

Detected patterns: ${patternDescriptions.length > 0 ? patternDescriptions.join('; ') : 'None detected (balanced profile)'}

Generate a personalized commentary for this learner.`;
}

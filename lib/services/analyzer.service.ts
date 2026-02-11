/**
 * AnalyzerService - Session Analysis Service
 * Phase 2: MUEDnote AI Interview-driven Logging
 *
 * Analyzes user's short note and session context to infer:
 * - focusArea: Musical focus (harmony/melody/rhythm/mix/emotion/structure)
 * - intentHypothesis: User's intent hypothesis (e.g., "trying to calm down the chorus")
 *
 * MVP Version: Text-based inference using LLM
 * Future Version: MIDI/WAV analysis integration
 */

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai';
import { logger } from '@/lib/utils/logger';
import { isValidFocusArea } from '@/lib/constants/question-constants';
import { ANALYZER_SYSTEM_PROMPT } from '@/lib/ai/prompts/analyzer';

// ========================================
// Type Definitions
// ========================================

/**
 * Analyzer input schema
 */
export const analyzeSessionInputSchema = z.object({
  sessionType: z.enum(['composition', 'practice', 'mix', 'ear_training', 'listening', 'theory', 'other']),
  userShortNote: z.string().min(1, 'User note is required').max(500, 'Note must be less than 500 characters'),
  dawMeta: z.object({
    dawName: z.string().optional(),
    tempo: z.number().optional(),
    timeSignature: z.string().optional(),
    keyEstimate: z.string().optional(),
    barsTouched: z.object({
      from: z.number(),
      to: z.number(),
    }).optional(),
  }).optional(),
});

export type AnalyzeSessionInput = z.infer<typeof analyzeSessionInputSchema>;

/**
 * Analyzer output
 */
export interface AnalyzeSessionOutput {
  focusArea: 'harmony' | 'melody' | 'rhythm' | 'mix' | 'emotion' | 'image' | 'structure';
  intentHypothesis: string;
  confidence: number; // 0.0-1.0
  analysisMethod: 'text_inference';
}

// ========================================
// AnalyzerService Class
// ========================================

export class AnalyzerService {
  /**
   * Analyze session from user's short note (MVP version: text-based)
   */
  async analyzeSession(input: AnalyzeSessionInput): Promise<AnalyzeSessionOutput> {
    // Validate input
    const validatedInput = analyzeSessionInputSchema.parse(input);

    logger.info('[AnalyzerService] Starting analysis', {
      sessionType: validatedInput.sessionType,
      noteLength: validatedInput.userShortNote.length,
    });

    // Build user message with context
    const userMessage = this.buildUserMessage(validatedInput);

    try {
      // Call OpenAI GPT-4o-mini for text-based inference
      const { completion } = await createChatCompletion([
        { role: 'system', content: ANALYZER_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ], {
        model: 'gpt-4o-mini', // MVP: gpt-4o-mini for cost efficiency, upgrade to gpt-5-mini when available
        temperature: 0.3, // Lower temperature for consistent analysis
        maxTokens: 300,
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse JSON response with detailed error handling
      let analysisResult: AnalyzeSessionOutput;
      try {
        analysisResult = JSON.parse(responseText) as AnalyzeSessionOutput;
      } catch (parseError) {
        logger.error('[AnalyzerService] Failed to parse JSON response', {
          error: parseError,
          responsePreview: responseText.substring(0, 200), // First 200 chars for debugging
        });
        throw new Error(
          `Invalid JSON response from OpenAI: ${
            parseError instanceof Error ? parseError.message : 'Unknown parsing error'
          }`
        );
      }

      // Validate focusArea
      if (!isValidFocusArea(analysisResult.focusArea)) {
        logger.warn('[AnalyzerService] Invalid focusArea, defaulting to emotion', {
          receivedFocusArea: analysisResult.focusArea,
        });
        analysisResult.focusArea = 'emotion';
      }

      // Ensure confidence is within range
      if (analysisResult.confidence < 0 || analysisResult.confidence > 1) {
        analysisResult.confidence = Math.max(0, Math.min(1, analysisResult.confidence));
      }

      // Add analysis method
      analysisResult.analysisMethod = 'text_inference';

      logger.info('[AnalyzerService] Analysis completed', {
        focusArea: analysisResult.focusArea,
        confidence: analysisResult.confidence,
      });

      return analysisResult;

    } catch (error) {
      logger.error('[AnalyzerService] Analysis failed', { error });

      // Fallback: return conservative default
      return {
        focusArea: 'emotion',
        intentHypothesis: 'ユーザーの制作プロセスを記録しています（分析データ不足）',
        confidence: 0.3,
        analysisMethod: 'text_inference',
      };
    }
  }

  /**
   * Build user message with session context
   */
  private buildUserMessage(input: AnalyzeSessionInput): string {
    let message = `**セッションタイプ**: ${this.translateSessionType(input.sessionType)}\n\n`;
    message += `**ユーザーの記録**:\n${input.userShortNote}\n\n`;

    // Add DAW metadata if available
    if (input.dawMeta) {
      message += `**追加情報**:\n`;
      if (input.dawMeta.dawName) {
        message += `- DAW: ${input.dawMeta.dawName}\n`;
      }
      if (input.dawMeta.tempo) {
        message += `- テンポ: ${input.dawMeta.tempo} BPM\n`;
      }
      if (input.dawMeta.keyEstimate) {
        message += `- キー: ${input.dawMeta.keyEstimate}\n`;
      }
      if (input.dawMeta.barsTouched) {
        message += `- 操作した小節: ${input.dawMeta.barsTouched.from}-${input.dawMeta.barsTouched.to}\n`;
      }
    }

    message += `\n上記の情報から、focusArea と intentHypothesis を推定してください。`;

    return message;
  }

  /**
   * Translate session type to Japanese
   */
  private translateSessionType(type: string): string {
    const translations: Record<string, string> = {
      composition: '作曲',
      practice: '練習',
      mix: 'ミックス',
      ear_training: '耳トレーニング',
      listening: 'リスニング分析',
      theory: '音楽理論',
      other: 'その他',
    };
    return translations[type] || type;
  }
}

// ========================================
// Singleton Instance
// ========================================

/**
 * Singleton analyzer service instance
 */
export const analyzerService = new AnalyzerService();

/**
 * InterviewerService - AI Interview Question Generation Service
 * Phase 1.3: MUEDnote AI Interview-driven Logging
 *
 * Generates 2-3 follow-up questions based on:
 * - User's short note
 * - focusArea from AnalyzerService
 * - intentHypothesis
 * - Previous questions (to avoid repetition)
 *
 * IMPORTANT: Uses GPT-5-mini (NOT GPT-4o series)
 * Fallback strategy: AI → Template → Default
 */

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai';
import { logger } from '@/lib/utils/logger';
import { db } from '@/db';
import { questionTemplates } from '@/db/schema/question-templates';
import { eq, and, desc } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

/**
 * Focus areas for interview questions
 */
export const focusAreaSchema = z.enum([
  'harmony',
  'melody',
  'rhythm',
  'mix',
  'emotion',
  'image',
  'structure',
]);

/**
 * Question depth levels
 */
export const questionDepthSchema = z.enum(['shallow', 'medium', 'deep']);

/**
 * Input schema for generateQuestions
 */
export const GenerateQuestionsInputSchema = z.object({
  sessionId: z.string().uuid(),
  focusArea: focusAreaSchema,
  intentHypothesis: z.string().min(1),
  userShortNote: z.string().min(1),
  previousQuestions: z.array(z.string()).optional(),
});

/**
 * Interview question schema
 */
export const InterviewQuestionSchema = z.object({
  text: z.string().min(1),
  focus: focusAreaSchema,
  depth: questionDepthSchema,
  order: z.number().int().min(0),
});

/**
 * Output schema for generateQuestions
 */
export const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(InterviewQuestionSchema).min(2).max(3),
  confidence: z.number().min(0).max(1),
  generationMethod: z.enum(['ai', 'template', 'fallback']),
});

export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type FocusArea = z.infer<typeof focusAreaSchema>;
export type QuestionDepth = z.infer<typeof questionDepthSchema>;

// ========================================
// System Prompt for Interviewer LLM
// ========================================

const INTERVIEWER_SYSTEM_PROMPT = `あなたは音楽制作プロセスを深掘りするAIインタビュアーです。

**役割**:
ユーザーが記録した制作ログから、2〜3問の質問を生成してください。

**質問設計の原則**:
1. **focusAreaに沿った質問**:
   - harmony: コード進行、調性、和音の選択理由
   - melody: フレーズ、音域、メロディラインの意図
   - rhythm: グルーブ、リズムパターン、テンポの変更理由
   - mix: 音量バランス、EQ、エフェクトの狙い
   - emotion: 表現したい感情、雰囲気、聴き手の反応
   - image: 音像、空間、広がりのイメージ
   - structure: 構成、展開、セクション配置の意図

2. **深さのバランス**:
   - 1問目: shallow（事実確認）- 「何を変えたか」を具体的に聞く
   - 2問目: medium（意図確認）- 「なぜそうしたか」を聞く
   - 3問目: deep（哲学的問い）- 「それが表現したいものは何か」を聞く（オプション）

3. **自然な日本語**:
   - 親しみやすく、威圧的でない
   - 開かれた質問（Yes/Noで答えられない）
   - 具体的で、ユーザーの記録に基づいた質問

**出力形式**:
必ずJSON形式で以下を返してください：
{
  "questions": [
    {
      "text": "質問文",
      "focus": "harmony",
      "depth": "medium"
    }
  ]
}

**注意事項**:
- 質問は2〜3問に限定（1問や4問以上は不可）
- depth は shallow, medium, deep のみ使用
- focus は指定されたfocusAreaに合わせる
- 既に聞いた質問と重複しない`;

// ========================================
// Default Fallback Questions
// ========================================

/**
 * Default fallback questions by focusArea
 */
const DEFAULT_QUESTIONS: Record<FocusArea, InterviewQuestion[]> = {
  harmony: [
    {
      text: 'どのコードを使用しましたか？',
      focus: 'harmony',
      depth: 'shallow',
      order: 0,
    },
    {
      text: 'コード進行を変更した理由は何ですか？',
      focus: 'harmony',
      depth: 'medium',
      order: 1,
    },
  ],
  melody: [
    {
      text: 'メロディをどの音域に配置しましたか？',
      focus: 'melody',
      depth: 'shallow',
      order: 0,
    },
    {
      text: 'メロディラインを変更した意図は何ですか？',
      focus: 'melody',
      depth: 'medium',
      order: 1,
    },
  ],
  rhythm: [
    {
      text: 'どのリズムパターンを使用しましたか？',
      focus: 'rhythm',
      depth: 'shallow',
      order: 0,
    },
    {
      text: 'リズムを変更した理由は何ですか？',
      focus: 'rhythm',
      depth: 'medium',
      order: 1,
    },
  ],
  mix: [
    {
      text: 'どの楽器の音量を調整しましたか？',
      focus: 'mix',
      depth: 'shallow',
      order: 0,
    },
    {
      text: 'ミックスバランスを変更した狙いは何ですか？',
      focus: 'mix',
      depth: 'medium',
      order: 1,
    },
  ],
  emotion: [
    {
      text: 'どのような感情を表現したかったですか？',
      focus: 'emotion',
      depth: 'shallow',
      order: 0,
    },
    {
      text: 'その感情を表現するために何を変更しましたか？',
      focus: 'emotion',
      depth: 'medium',
      order: 1,
    },
  ],
  image: [
    {
      text: 'どのようなイメージを想起させたいですか？',
      focus: 'image',
      depth: 'shallow',
      order: 0,
    },
    {
      text: 'そのイメージを創り出すために何を追加しましたか？',
      focus: 'image',
      depth: 'medium',
      order: 1,
    },
  ],
  structure: [
    {
      text: '楽曲のどの部分を変更しましたか？',
      focus: 'structure',
      depth: 'shallow',
      order: 0,
    },
    {
      text: '楽曲構成を変更した理由は何ですか？',
      focus: 'structure',
      depth: 'medium',
      order: 1,
    },
  ],
};

// ========================================
// InterviewerService Class
// ========================================

export class InterviewerService {
  /**
   * Generate interview questions based on session analysis
   */
  async generateQuestions(
    input: GenerateQuestionsInput
  ): Promise<GenerateQuestionsOutput> {
    // 1. Validate input
    const validated = GenerateQuestionsInputSchema.parse(input);

    logger.info('[InterviewerService] Generating questions', {
      sessionId: validated.sessionId,
      focusArea: validated.focusArea,
      previousQuestions: validated.previousQuestions?.length || 0,
    });

    try {
      // 2. Try AI generation first (GPT-5-mini)
      const aiQuestions = await this.generateQuestionsWithAI(validated);

      // Validate AI response
      const validatedQuestions = this.validateAndNormalizeQuestions(
        aiQuestions,
        validated.focusArea
      );

      if (validatedQuestions.length >= 2 && validatedQuestions.length <= 3) {
        logger.info('[InterviewerService] AI generation successful', {
          questionCount: validatedQuestions.length,
        });

        return {
          questions: validatedQuestions,
          confidence: 0.85,
          generationMethod: 'ai',
        };
      }

      // AI returned invalid number of questions
      logger.warn('[InterviewerService] AI returned invalid question count', {
        count: validatedQuestions.length,
      });
      throw new Error('Invalid question count from AI');
    } catch (error) {
      logger.error('[InterviewerService] AI generation failed', { error });

      // 3. Fallback to default questions
      return this.generateFallbackQuestions(validated.focusArea);
    }
  }

  /**
   * Generate questions using GPT-5-mini
   */
  private async generateQuestionsWithAI(
    input: GenerateQuestionsInput
  ): Promise<InterviewQuestion[]> {
    const systemPrompt = INTERVIEWER_SYSTEM_PROMPT;
    const userPrompt = this.buildUserPrompt(input);

    // Call GPT-5-mini API (IMPORTANT: NOT GPT-4o)
    const { completion } = await createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'gpt-5-mini', // ← IMPORTANT: GPT-5-mini only
        temperature: 0.7, // Creative but focused
        maxTokens: 500, // Sufficient for 2-3 questions
      }
    );

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Empty response from GPT-5-mini');
    }

    // Parse JSON response
    let parsedResponse: { questions: unknown[] };
    try {
      parsedResponse = JSON.parse(responseText) as { questions: unknown[] };
    } catch (parseError) {
      logger.error('[InterviewerService] Failed to parse JSON response', {
        error: parseError,
        responsePreview: responseText.substring(0, 200),
      });
      throw new Error(
        `Invalid JSON response from GPT-5-mini: ${
          parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        }`
      );
    }

    // Convert to InterviewQuestion objects
    return parsedResponse.questions.map((q: any, index: number) => ({
      text: q.text || '',
      focus: q.focus || input.focusArea,
      depth: q.depth || 'medium',
      order: index,
    }));
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(input: GenerateQuestionsInput): string {
    let prompt = `## ユーザーの制作ログ\n${input.userShortNote}\n\n`;
    prompt += `## AIの分析結果\n`;
    prompt += `- **Focus Area**: ${input.focusArea}\n`;
    prompt += `- **意図の仮説**: ${input.intentHypothesis}\n\n`;

    // Add previous questions to avoid repetition
    if (input.previousQuestions && input.previousQuestions.length > 0) {
      prompt += `## 既に聞いた質問\n`;
      prompt += input.previousQuestions
        .map((q, i) => `${i + 1}. ${q}`)
        .join('\n');
      prompt += `\n\n`;
    }

    prompt += `上記を踏まえて、**${input.focusArea}**に焦点を当てた2〜3問の質問を生成してください。`;

    return prompt;
  }

  /**
   * Validate and normalize questions from AI
   */
  private validateAndNormalizeQuestions(
    questions: InterviewQuestion[],
    expectedFocus: FocusArea
  ): InterviewQuestion[] {
    const validFocusAreas: FocusArea[] = [
      'harmony',
      'melody',
      'rhythm',
      'mix',
      'emotion',
      'image',
      'structure',
    ];
    const validDepths: QuestionDepth[] = ['shallow', 'medium', 'deep'];

    return questions
      .filter((q) => {
        // Filter out invalid questions
        if (!q.text || q.text.trim().length === 0) {
          logger.warn('[InterviewerService] Skipping question with empty text');
          return false;
        }
        return true;
      })
      .map((q, index) => {
        // Normalize focus area
        let focus = q.focus;
        if (!validFocusAreas.includes(focus)) {
          logger.warn('[InterviewerService] Invalid focus area, using expected', {
            received: focus,
            expected: expectedFocus,
          });
          focus = expectedFocus;
        }

        // Normalize depth
        let depth = q.depth;
        if (!validDepths.includes(depth)) {
          logger.warn('[InterviewerService] Invalid depth, defaulting to medium', {
            received: depth,
          });
          depth = 'medium';
        }

        return {
          text: q.text.trim(),
          focus,
          depth,
          order: index,
        };
      });
  }

  /**
   * Get question templates from database
   */
  async getQuestionTemplates(
    focusArea: FocusArea,
    limit: number = 3
  ): Promise<InterviewQuestion[]> {
    try {
      logger.info('[InterviewerService] Fetching templates from database', {
        focusArea,
        limit,
      });

      const templates = await db
        .select()
        .from(questionTemplates)
        .where(
          and(
            eq(questionTemplates.focus, focusArea),
            eq(questionTemplates.enabled, true)
          )
        )
        .orderBy(desc(questionTemplates.priority))
        .limit(limit);

      logger.info('[InterviewerService] Templates fetched', {
        count: templates.length,
      });

      return templates.map((template, index) => ({
        text: template.templateText,
        focus: template.focus,
        depth: template.depth,
        order: index,
      }));
    } catch (error) {
      logger.error('[InterviewerService] Template fetch failed', { error });
      return [];
    }
  }

  /**
   * Substitute variables in template text
   * Example: "コード{chord}を使った理由は？" → "コードFメジャーを使った理由は？"
   */
  private substituteVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    return result;
  }

  /**
   * Fallback to database templates
   */
  private async fallbackToTemplates(
    focusArea: FocusArea
  ): Promise<GenerateQuestionsOutput> {
    logger.warn('[InterviewerService] Using template fallback', { focusArea });

    try {
      const templates = await this.getQuestionTemplates(focusArea, 3);

      if (templates.length > 0) {
        return {
          questions: templates,
          confidence: 0.5,
          generationMethod: 'template',
        };
      }
    } catch (error) {
      logger.error('[InterviewerService] Template fallback failed', { error });
    }

    // Final fallback: default questions
    return this.fallbackToDefault(focusArea);
  }

  /**
   * Final fallback: hardcoded default questions
   */
  private fallbackToDefault(focusArea: FocusArea): GenerateQuestionsOutput {
    logger.warn('[InterviewerService] Using default fallback', { focusArea });

    const questions = DEFAULT_QUESTIONS[focusArea];

    return {
      questions,
      confidence: 0.3, // Lowest confidence for hardcoded fallback
      generationMethod: 'fallback',
    };
  }

  /**
   * Generate fallback questions when AI fails (legacy method - now calls fallbackToTemplates)
   * @deprecated Use fallbackToTemplates() instead
   */
  private async generateFallbackQuestions(focusArea: FocusArea): Promise<GenerateQuestionsOutput> {
    // First try templates from database
    return await this.fallbackToTemplates(focusArea);
  }

  /**
   * Translate focusArea to Japanese for display
   */
  translateFocusArea(focusArea: FocusArea): string {
    const translations: Record<FocusArea, string> = {
      harmony: '和音・コード進行',
      melody: 'メロディ',
      rhythm: 'リズム・グルーブ',
      mix: 'ミックス・音響',
      emotion: '感情表現',
      image: '音像・イメージ',
      structure: '楽曲構成',
    };
    return translations[focusArea] || focusArea;
  }
}

// ========================================
// Singleton Instance
// ========================================

/**
 * Singleton interviewer service instance
 */
export const interviewerService = new InterviewerService();

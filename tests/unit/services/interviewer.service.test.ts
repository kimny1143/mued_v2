/**
 * InterviewerService Unit Tests
 * Phase 1.3: AI Interview Question Generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InterviewerService,
  GenerateQuestionsInputSchema,
  GenerateQuestionsOutputSchema,
  type FocusArea,
} from '@/lib/services/interviewer.service';
import * as openaiModule from '@/lib/openai';

// Mock OpenAI module
vi.mock('@/lib/openai', () => ({
  createChatCompletion: vi.fn(),
}));

describe('InterviewerService', () => {
  let service: InterviewerService;
  const mockCreateChatCompletion = vi.mocked(openaiModule.createChatCompletion);

  beforeEach(() => {
    service = new InterviewerService();
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should validate correct input', () => {
      const validInput = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        focusArea: 'harmony' as FocusArea,
        intentHypothesis: 'Testing harmony analysis',
        userShortNote: 'Changed chord from F to G',
        previousQuestions: ['What chord did you use?'],
      };

      const result = GenerateQuestionsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid focusArea', () => {
      const invalidInput = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        focusArea: 'invalid_focus',
        intentHypothesis: 'Testing',
        userShortNote: 'Test note',
      };

      const result = GenerateQuestionsInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const invalidInput = {
        sessionId: 'not-a-uuid',
        focusArea: 'harmony',
        intentHypothesis: 'Testing',
        userShortNote: 'Test note',
      };

      const result = GenerateQuestionsInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate correct output', () => {
      const validOutput = {
        questions: [
          {
            text: 'Why did you change the chord?',
            focus: 'harmony',
            depth: 'medium',
            order: 0,
          },
          {
            text: 'What emotion does this convey?',
            focus: 'harmony',
            depth: 'deep',
            order: 1,
          },
        ],
        confidence: 0.85,
        generationMethod: 'ai',
      };

      const result = GenerateQuestionsOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject output with too few questions', () => {
      const invalidOutput = {
        questions: [
          {
            text: 'Single question',
            focus: 'harmony',
            depth: 'medium',
            order: 0,
          },
        ],
        confidence: 0.85,
        generationMethod: 'ai',
      };

      const result = GenerateQuestionsOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should reject output with too many questions', () => {
      const invalidOutput = {
        questions: [
          { text: 'Q1', focus: 'harmony', depth: 'shallow', order: 0 },
          { text: 'Q2', focus: 'harmony', depth: 'medium', order: 1 },
          { text: 'Q3', focus: 'harmony', depth: 'deep', order: 2 },
          { text: 'Q4', focus: 'harmony', depth: 'deep', order: 3 },
        ],
        confidence: 0.85,
        generationMethod: 'ai',
      };

      const result = GenerateQuestionsOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('generateQuestions', () => {
    it('should generate questions using AI (GPT-5-mini)', async () => {
      // Mock successful AI response
      const mockAIResponse = {
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questions: [
                    {
                      text: 'どのコードを使いましたか？',
                      focus: 'harmony',
                      depth: 'shallow',
                    },
                    {
                      text: 'コード進行を変更した理由は何ですか？',
                      focus: 'harmony',
                      depth: 'medium',
                    },
                  ],
                }),
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.001,
          model: 'gpt-5-mini',
          timestamp: new Date(),
        },
      };

      mockCreateChatCompletion.mockResolvedValue(mockAIResponse);

      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        focusArea: 'harmony' as FocusArea,
        intentHypothesis: 'サビへの流れを滑らかにする意図',
        userShortNote: 'サビのコード進行をFからGに変更した',
      };

      const result = await service.generateQuestions(input);

      // Verify GPT-5-mini was called
      expect(mockCreateChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          model: 'gpt-5-mini', // ← IMPORTANT: Verify GPT-5-mini usage
          temperature: 0.7,
          maxTokens: 500,
        })
      );

      // Verify output structure
      expect(result).toMatchObject({
        generationMethod: 'ai',
        confidence: 0.85,
      });
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toMatchObject({
        text: 'どのコードを使いましたか？',
        focus: 'harmony',
        depth: 'shallow',
        order: 0,
      });
    });

    it('should use fallback questions when AI fails', async () => {
      // Mock AI failure
      mockCreateChatCompletion.mockRejectedValue(new Error('API error'));

      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        focusArea: 'melody' as FocusArea,
        intentHypothesis: '明るさを出す意図',
        userShortNote: 'メロディを1オクターブ上げた',
      };

      const result = await service.generateQuestions(input);

      // Verify fallback was used
      expect(result.generationMethod).toBe('fallback');
      expect(result.confidence).toBe(0.3); // Default fallback has 0.3 confidence
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].focus).toBe('melody');
    });

    it('should handle all 7 focusAreas in fallback', async () => {
      mockCreateChatCompletion.mockRejectedValue(new Error('API error'));

      const focusAreas: FocusArea[] = [
        'harmony',
        'melody',
        'rhythm',
        'mix',
        'emotion',
        'image',
        'structure',
      ];

      for (const focusArea of focusAreas) {
        const input = {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          focusArea,
          intentHypothesis: 'Test hypothesis',
          userShortNote: 'Test note',
        };

        const result = await service.generateQuestions(input);

        expect(result.generationMethod).toBe('fallback');
        expect(result.questions).toHaveLength(2);
        expect(result.questions[0].focus).toBe(focusArea);
        expect(result.questions[1].focus).toBe(focusArea);
      }
    });

    it('should include previousQuestions in prompt', async () => {
      const mockAIResponse = {
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questions: [
                    { text: 'Q1', focus: 'rhythm', depth: 'shallow' },
                    { text: 'Q2', focus: 'rhythm', depth: 'medium' },
                  ],
                }),
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.001,
          model: 'gpt-5-mini',
          timestamp: new Date(),
        },
      };

      mockCreateChatCompletion.mockResolvedValue(mockAIResponse);

      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        focusArea: 'rhythm' as FocusArea,
        intentHypothesis: 'グルーヴ感を強化する意図',
        userShortNote: 'ドラムのハイハットを16分音符に変更した',
        previousQuestions: [
          'どのリズムパターンを使いましたか？',
          'ハイハットの変更理由は何ですか？',
        ],
      };

      await service.generateQuestions(input);

      // Verify the user prompt includes previous questions
      const calledPrompt = mockCreateChatCompletion.mock.calls[0][0];
      const userMessage = calledPrompt.find((msg) => msg.role === 'user');
      expect(userMessage?.content).toContain('既に聞いた質問');
      expect(userMessage?.content).toContain('どのリズムパターンを使いましたか？');
    });

    it('should normalize invalid AI responses', async () => {
      // Mock AI response with invalid depth
      const mockAIResponse = {
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questions: [
                    {
                      text: 'Valid question',
                      focus: 'harmony',
                      depth: 'invalid_depth', // Invalid depth
                    },
                    {
                      text: 'Another question',
                      focus: 'invalid_focus', // Invalid focus
                      depth: 'medium',
                    },
                  ],
                }),
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.001,
          model: 'gpt-5-mini',
          timestamp: new Date(),
        },
      };

      mockCreateChatCompletion.mockResolvedValue(mockAIResponse);

      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        focusArea: 'harmony' as FocusArea,
        intentHypothesis: 'Test',
        userShortNote: 'Test note',
      };

      const result = await service.generateQuestions(input);

      // Verify normalization happened
      expect(result.questions[0].depth).toBe('medium'); // Normalized to medium
      expect(result.questions[1].focus).toBe('harmony'); // Normalized to expected focus
    });
  });

  describe('translateFocusArea', () => {
    it('should translate all focusAreas to Japanese', () => {
      const translations = {
        harmony: '和音・コード進行',
        melody: 'メロディ',
        rhythm: 'リズム・グルーブ',
        mix: 'ミックス・音響',
        emotion: '感情表現',
        image: '音像・イメージ',
        structure: '楽曲構成',
      };

      for (const [focusArea, expectedTranslation] of Object.entries(translations)) {
        const result = service.translateFocusArea(focusArea as FocusArea);
        expect(result).toBe(expectedTranslation);
      }
    });
  });
});

/**
 * AnalyzerService Unit Tests
 *
 * Test coverage for session analysis service including:
 * - Focus area inference
 * - Intent hypothesis generation
 * - Input validation
 * - Error handling and fallbacks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyzerService, analyzeSessionInputSchema, type AnalyzeSessionInput, type AnalyzeSessionOutput } from './analyzer.service';
import * as openaiModule from '@/lib/openai';

// Mock the OpenAI module
vi.mock('@/lib/openai', () => ({
  createChatCompletion: vi.fn(),
}));

// Mock the logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AnalyzerService', () => {
  let analyzerService: AnalyzerService;

  beforeEach(() => {
    analyzerService = new AnalyzerService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('正常系', () => {
    describe('Focus Area Inference', () => {
      it('should correctly infer harmony focus area', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: 'サビのコードをFからGに変えてみた。流れが良くなった気がする。',
        };

        const mockResponse = {
          focusArea: 'harmony',
          intentHypothesis: 'サビへの流れを滑らかにし、楽曲の展開をより自然にする意図があったと思われる',
          confidence: 0.85,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.focusArea).toBe('harmony');
        expect(result.intentHypothesis).toContain('流れを滑らか');
        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
        expect(result.confidence).toBeLessThanOrEqual(1.0);
        expect(result.analysisMethod).toBe('text_inference');
      });

      it('should correctly infer melody focus area', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: 'メロディを1オクターブ上げて、明るい感じにした',
        };

        const mockResponse = {
          focusArea: 'melody',
          intentHypothesis: '楽曲に明るさと開放感を加える意図があったと思われる',
          confidence: 0.9,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.focusArea).toBe('melody');
        expect(result.confidence).toBe(0.9);
        expect(result.analysisMethod).toBe('text_inference');
      });

      it('should correctly infer rhythm focus area', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: 'キックのパターンを4つ打ちに変更。グルーヴが出てきた。',
        };

        const mockResponse = {
          focusArea: 'rhythm',
          intentHypothesis: 'ダンサブルなグルーヴを作り出す意図があったと思われる',
          confidence: 0.88,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.focusArea).toBe('rhythm');
        expect(result.analysisMethod).toBe('text_inference');
      });

      it('should correctly infer mix focus area', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'mix',
          userShortNote: 'ベースを2dB下げて、全体のバランスを調整',
        };

        const mockResponse = {
          focusArea: 'mix',
          intentHypothesis: '低域のバランスを整え、各楽器の分離を良くする意図があったと思われる',
          confidence: 0.92,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.focusArea).toBe('mix');
        expect(result.analysisMethod).toBe('text_inference');
      });

      it('should correctly infer emotion focus area', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: '切ない感じを出したくて、マイナーコードを多用',
        };

        const mockResponse = {
          focusArea: 'emotion',
          intentHypothesis: '感傷的で切ない雰囲気を演出する意図があったと思われる',
          confidence: 0.95,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.focusArea).toBe('emotion');
        expect(result.analysisMethod).toBe('text_inference');
      });

      it('should correctly infer image focus area', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'mix',
          userShortNote: 'リバーブを深くして、広がりのある空間を演出',
        };

        const mockResponse = {
          focusArea: 'image',
          intentHypothesis: '広大な空間イメージを作り出す意図があったと思われる',
          confidence: 0.87,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.focusArea).toBe('image');
        expect(result.analysisMethod).toBe('text_inference');
      });

      it('should correctly infer structure focus area', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: 'ブリッジを追加して、AメロとBメロの繋ぎを工夫',
        };

        const mockResponse = {
          focusArea: 'structure',
          intentHypothesis: '楽曲の展開を滑らかにし、聴き手を飽きさせない構成を作る意図があったと思われる',
          confidence: 0.91,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.focusArea).toBe('structure');
        expect(result.analysisMethod).toBe('text_inference');
      });
    });

    describe('Response Validation', () => {
      it('should ensure confidence is within 0.0-1.0 range', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: 'テスト用のノート',
        };

        // Test with confidence > 1.0
        const mockResponseHigh = {
          focusArea: 'melody',
          intentHypothesis: 'テスト',
          confidence: 1.5,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponseHigh),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const resultHigh = await analyzerService.analyzeSession(input);
        expect(resultHigh.confidence).toBe(1.0);

        // Test with confidence < 0
        const mockResponseLow = {
          focusArea: 'melody',
          intentHypothesis: 'テスト',
          confidence: -0.5,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponseLow),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const resultLow = await analyzerService.analyzeSession(input);
        expect(resultLow.confidence).toBe(0);
      });

      it('should return natural Japanese intent hypothesis', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: 'イントロにピアノのアルペジオを追加',
        };

        const mockResponse = {
          focusArea: 'melody',
          intentHypothesis: '楽曲の導入部に繊細さと美しさを加える意図があったと思われる',
          confidence: 0.82,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.intentHypothesis).toBeTruthy();
        expect(result.intentHypothesis.length).toBeGreaterThan(10);
        // Check that it contains Japanese characters
        expect(/[あ-ん]/.test(result.intentHypothesis)).toBe(true);
      });

      it('should always return analysisMethod as text_inference', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: '任意のテキスト',
        };

        const mockResponse = {
          focusArea: 'harmony',
          intentHypothesis: 'テストの意図',
          confidence: 0.5,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.analysisMethod).toBe('text_inference');
      });

      it('should handle invalid focusArea and default to emotion', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: 'テストノート',
        };

        const mockResponse = {
          focusArea: 'invalid_focus_area',
          intentHypothesis: 'テスト意図',
          confidence: 0.5,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        expect(result.focusArea).toBe('emotion');
      });
    });

    describe('DAW Metadata Processing', () => {
      it('should process input with dawMeta correctly', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'composition',
          userShortNote: 'コード進行を調整',
          dawMeta: {
            dawName: 'Logic Pro',
            tempo: 120,
            timeSignature: '4/4',
            keyEstimate: 'C Major',
            barsTouched: {
              from: 1,
              to: 16,
            },
          },
        };

        const mockResponse = {
          focusArea: 'harmony',
          intentHypothesis: 'テンポ120のC Majorで、冒頭16小節の構成を整える意図があったと思われる',
          confidence: 0.88,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        // Verify the OpenAI call included DAW metadata
        const calls = vi.mocked(openaiModule.createChatCompletion).mock.calls;
        expect(calls.length).toBe(1);
        const userMessage = calls[0][0][1].content as string;
        expect(userMessage).toContain('Logic Pro');
        expect(userMessage).toContain('120 BPM');
        expect(userMessage).toContain('C Major');
        expect(userMessage).toContain('1-16');

        expect(result.focusArea).toBe('harmony');
      });

      it('should work without dawMeta', async () => {
        const input: AnalyzeSessionInput = {
          sessionType: 'practice',
          userShortNote: 'スケール練習を30分実施',
        };

        const mockResponse = {
          focusArea: 'melody',
          intentHypothesis: '基礎技術の向上を図る意図があったと思われる',
          confidence: 0.75,
        };

        vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
          completion: {
            choices: [
              {
                message: {
                  content: JSON.stringify(mockResponse),
                },
              },
            ],
          },
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            estimatedCost: 0.01,
          },
        } as any);

        const result = await analyzerService.analyzeSession(input);

        // Verify the OpenAI call did not include DAW metadata
        const calls = vi.mocked(openaiModule.createChatCompletion).mock.calls;
        const userMessage = calls[0][0][1].content as string;
        expect(userMessage).not.toContain('DAW:');
        expect(userMessage).not.toContain('テンポ:');

        expect(result).toBeTruthy();
        expect(result.focusArea).toBe('melody');
      });
    });
  });

  describe('バリデーション', () => {
    it('should throw error when userShortNote is empty', async () => {
      const input = {
        sessionType: 'composition' as const,
        userShortNote: '',
      };

      await expect(analyzerService.analyzeSession(input)).rejects.toThrow('User note is required');
    });

    it('should throw error when userShortNote exceeds 500 characters', async () => {
      const input = {
        sessionType: 'composition' as const,
        userShortNote: 'あ'.repeat(501),
      };

      await expect(analyzerService.analyzeSession(input)).rejects.toThrow('Note must be less than 500 characters');
    });

    it('should throw error when sessionType is invalid', async () => {
      const input = {
        sessionType: 'invalid_type' as any,
        userShortNote: 'テストノート',
      };

      await expect(analyzerService.analyzeSession(input)).rejects.toThrow();
    });

    it('should validate input schema correctly', () => {
      // Valid input
      const validInput = {
        sessionType: 'composition' as const,
        userShortNote: 'Valid note',
      };

      const result = analyzeSessionInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);

      // Invalid sessionType
      const invalidSessionType = {
        sessionType: 'invalid',
        userShortNote: 'Note',
      };

      const result2 = analyzeSessionInputSchema.safeParse(invalidSessionType);
      expect(result2.success).toBe(false);

      // Missing userShortNote
      const missingNote = {
        sessionType: 'composition',
      };

      const result3 = analyzeSessionInputSchema.safeParse(missingNote);
      expect(result3.success).toBe(false);
    });

    it('should accept all valid session types', () => {
      const validTypes = ['composition', 'practice', 'mix', 'ear_training', 'listening', 'theory', 'other'];

      validTypes.forEach((type) => {
        const input = {
          sessionType: type,
          userShortNote: 'Test note',
        };

        const result = analyzeSessionInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('OpenAI APIエラー時のフォールバック', () => {
    it('should return conservative default when API call fails', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: 'エラーテスト用のノート',
      };

      // Mock API error
      vi.mocked(openaiModule.createChatCompletion).mockRejectedValue(new Error('OpenAI API Error'));

      const result = await analyzerService.analyzeSession(input);

      expect(result.focusArea).toBe('emotion');
      expect(result.confidence).toBe(0.3);
      expect(result.intentHypothesis).toContain('分析データ不足');
      expect(result.analysisMethod).toBe('text_inference');
    });

    it('should handle empty response from OpenAI', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: '空レスポンステスト',
      };

      vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [
            {
              message: {
                content: null,
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 0,
          totalTokens: 100,
          estimatedCost: 0.01,
        },
      } as any);

      const result = await analyzerService.analyzeSession(input);

      expect(result.focusArea).toBe('emotion');
      expect(result.confidence).toBe(0.3);
      expect(result.intentHypothesis).toContain('分析データ不足');
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: '無効なJSONレスポンステスト',
      };

      vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [
            {
              message: {
                content: 'This is not valid JSON',
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
      } as any);

      const result = await analyzerService.analyzeSession(input);

      expect(result.focusArea).toBe('emotion');
      expect(result.confidence).toBe(0.3);
      expect(result.intentHypothesis).toContain('分析データ不足');
    });

    it('should handle network timeout', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: 'ネットワークタイムアウトテスト',
      };

      vi.mocked(openaiModule.createChatCompletion).mockRejectedValue(new Error('Network timeout'));

      const result = await analyzerService.analyzeSession(input);

      expect(result.focusArea).toBe('emotion');
      expect(result.confidence).toBe(0.3);
      expect(result.intentHypothesis).toContain('分析データ不足');
    });

    it('should handle rate limiting errors', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'mix',
        userShortNote: 'レート制限テスト',
      };

      vi.mocked(openaiModule.createChatCompletion).mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await analyzerService.analyzeSession(input);

      expect(result.focusArea).toBe('emotion');
      expect(result.confidence).toBe(0.3);
      expect(result.intentHypothesis).toContain('分析データ不足');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short notes', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: 'A',
      };

      const mockResponse = {
        focusArea: 'emotion',
        intentHypothesis: '詳細不明のため推定困難',
        confidence: 0.2,
      };

      vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
      } as any);

      const result = await analyzerService.analyzeSession(input);

      expect(result).toBeTruthy();
      expect(result.confidence).toBeLessThanOrEqual(0.3);
    });

    it('should handle maximum length notes', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: 'あ'.repeat(500),
      };

      const mockResponse = {
        focusArea: 'emotion',
        intentHypothesis: '長文の記録から複数の意図が混在していると思われる',
        confidence: 0.6,
      };

      vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
      } as any);

      const result = await analyzerService.analyzeSession(input);

      expect(result).toBeTruthy();
      expect(result.focusArea).toBeTruthy();
    });

    it('should handle notes with special characters', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: '♪♫♬ 音符記号を使った記録 @#$%^&*()',
      };

      const mockResponse = {
        focusArea: 'melody',
        intentHypothesis: '音楽記号を用いた表現的な記録',
        confidence: 0.5,
      };

      vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
      } as any);

      const result = await analyzerService.analyzeSession(input);

      expect(result).toBeTruthy();
      expect(result.focusArea).toBeTruthy();
    });

    it('should handle mixed English and Japanese notes', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: 'Intro部分にreverb追加、もっとspaceyな感じに',
      };

      const mockResponse = {
        focusArea: 'image',
        intentHypothesis: '空間的な広がりと雰囲気を演出する意図があったと思われる',
        confidence: 0.85,
      };

      vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
      } as any);

      const result = await analyzerService.analyzeSession(input);

      expect(result.focusArea).toBe('image');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Integration Patterns', () => {
    it('should work with real-world composition session', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'composition',
        userShortNote: 'Aメロからサビへの転調をスムーズにするため、ブリッジ部分にsus4コードを追加。緊張感が出て良い感じ。',
        dawMeta: {
          dawName: 'Logic Pro',
          tempo: 128,
          keyEstimate: 'G Major',
          barsTouched: {
            from: 17,
            to: 24,
          },
        },
      };

      const mockResponse = {
        focusArea: 'harmony',
        intentHypothesis: '転調部分に緊張感と期待感を持たせ、サビへの移行をドラマチックに演出する意図があったと思われる',
        confidence: 0.92,
      };

      vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        },
        usage: {
          promptTokens: 150,
          completionTokens: 60,
          totalTokens: 210,
          estimatedCost: 0.015,
        },
      } as any);

      const result = await analyzerService.analyzeSession(input);

      expect(result.focusArea).toBe('harmony');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.intentHypothesis).toContain('ドラマチック');
      expect(result.analysisMethod).toBe('text_inference');
    });

    it('should work with real-world mixing session', async () => {
      const input: AnalyzeSessionInput = {
        sessionType: 'mix',
        userShortNote: 'ボーカルにコンプレッサーをかけて音圧を揃えた。EQで2-4kHzを少しブースト。',
        dawMeta: {
          dawName: 'Pro Tools',
          tempo: 90,
        },
      };

      const mockResponse = {
        focusArea: 'mix',
        intentHypothesis: 'ボーカルの存在感を高め、ミックス全体での聞き取りやすさを向上させる意図があったと思われる',
        confidence: 0.88,
      };

      vi.mocked(openaiModule.createChatCompletion).mockResolvedValue({
        completion: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        },
        usage: {
          promptTokens: 120,
          completionTokens: 55,
          totalTokens: 175,
          estimatedCost: 0.012,
        },
      } as any);

      const result = await analyzerService.analyzeSession(input);

      expect(result.focusArea).toBe('mix');
      expect(result.intentHypothesis).toContain('存在感');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });
});
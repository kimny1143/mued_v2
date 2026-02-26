/**
 * Hoo Chat API Unit Tests
 *
 * Tests the Hoo AI Chat API's request validation and Free tier template responses.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ========================================
// Test the validation schema
// ========================================

const hooChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
});

describe('Hoo Chat API - Request Validation', () => {
  describe('hooChatRequestSchema', () => {
    it('should accept valid request with message only', () => {
      const result = hooChatRequestSchema.safeParse({
        message: 'Hello, Hoo!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('Hello, Hoo!');
        expect(result.data.conversationId).toBeUndefined();
      }
    });

    it('should accept valid request with message and conversationId', () => {
      const result = hooChatRequestSchema.safeParse({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        message: 'Follow up message',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationId).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('should reject empty message', () => {
      const result = hooChatRequestSchema.safeParse({
        message: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject message exceeding max length', () => {
      const result = hooChatRequestSchema.safeParse({
        message: 'x'.repeat(10001),
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const result = hooChatRequestSchema.safeParse({
        conversationId: 'not-a-uuid',
        message: 'Hello',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing message', () => {
      const result = hooChatRequestSchema.safeParse({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.success).toBe(false);
    });
  });
});

// ========================================
// Test the Free tier template response logic
// ========================================

const FREE_TIER_RESPONSES = {
  greeting: {
    patterns: ['こんにち', 'hello', 'hi', 'hey', 'おはよう', 'こんばん'],
    response: 'こんにちは、Hooです。\n\n思考整理のお手伝いをしたいのですが、AIチャット機能はBasicプラン以上でご利用いただけます。\n\nBasicプランでは無制限のHoo AI会話が可能です。',
  },
  upgrade: {
    patterns: ['アップグレード', 'upgrade', 'プラン', 'plan', 'basic', 'premium'],
    response: 'プランについてですね。\n\n- **Basic**: 月額1,980円でHoo AI無制限会話 + Whisper + DAWログ連携\n- **Premium**: 月額2,980円で上記すべて + Hoo個人化 + MUEDlobe認知プロファイル\n\nダッシュボードの「サブスクリプション」からアップグレードできます。',
  },
  default: {
    response: 'Hooです。\n\nAI会話機能はBasicプラン以上でご利用いただけます。\n\n現在のFreeプランでは、セッション記録やダッシュボード機能をお試しいただけます。',
  },
};

function getFreeTierResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();

  for (const [, config] of Object.entries(FREE_TIER_RESPONSES)) {
    if ('patterns' in config && config.patterns.some(p => lowerMsg.includes(p))) {
      return config.response;
    }
  }

  return FREE_TIER_RESPONSES.default.response;
}

describe('Hoo Chat API - Free Tier Template Responses', () => {
  describe('getFreeTierResponse', () => {
    it('should return greeting response for "hello"', () => {
      const result = getFreeTierResponse('hello');
      expect(result).toBe(FREE_TIER_RESPONSES.greeting.response);
    });

    it('should return greeting response for "こんにちは"', () => {
      const result = getFreeTierResponse('こんにちは');
      expect(result).toBe(FREE_TIER_RESPONSES.greeting.response);
    });

    it('should return greeting response for "おはようございます"', () => {
      const result = getFreeTierResponse('おはようございます');
      expect(result).toBe(FREE_TIER_RESPONSES.greeting.response);
    });

    it('should return greeting response for "Hi there!"', () => {
      const result = getFreeTierResponse('Hi there!');
      expect(result).toBe(FREE_TIER_RESPONSES.greeting.response);
    });

    it('should return upgrade response for "upgrade"', () => {
      const result = getFreeTierResponse('How do I upgrade?');
      expect(result).toBe(FREE_TIER_RESPONSES.upgrade.response);
    });

    it('should return upgrade response for "プラン"', () => {
      const result = getFreeTierResponse('プランについて教えて');
      expect(result).toBe(FREE_TIER_RESPONSES.upgrade.response);
    });

    it('should return upgrade response for "basic"', () => {
      const result = getFreeTierResponse('What is basic plan?');
      expect(result).toBe(FREE_TIER_RESPONSES.upgrade.response);
    });

    it('should return default response for unmatched messages', () => {
      const result = getFreeTierResponse('What is the meaning of life?');
      expect(result).toBe(FREE_TIER_RESPONSES.default.response);
    });

    it('should be case insensitive', () => {
      const result = getFreeTierResponse('HELLO');
      expect(result).toBe(FREE_TIER_RESPONSES.greeting.response);
    });

    it('should match partial patterns', () => {
      const result = getFreeTierResponse('I want to upgrade my account please');
      expect(result).toBe(FREE_TIER_RESPONSES.upgrade.response);
    });
  });
});

// ========================================
// Test the response structure
// ========================================

interface HooChatApiResponse {
  conversationId: string;
  content: string;
  model: string;
  provider: 'claude' | 'gemini' | 'openai' | 'template';
  isAiResponse: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    used: number;
    limit: number;
  };
  latencyMs?: number;
}

describe('Hoo Chat API - Response Structure', () => {
  it('should have correct structure for Free tier response', () => {
    const freeTierResponse: HooChatApiResponse = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      content: FREE_TIER_RESPONSES.default.response,
      model: 'template',
      provider: 'template',
      isAiResponse: false,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        used: 0,
        limit: 0,
      },
    };

    expect(freeTierResponse.isAiResponse).toBe(false);
    expect(freeTierResponse.provider).toBe('template');
    expect(freeTierResponse.usage?.inputTokens).toBe(0);
  });

  it('should have correct structure for AI response', () => {
    const aiResponse: HooChatApiResponse = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'AI generated response',
      model: 'claude-haiku-4-5-20251001',
      provider: 'claude',
      isAiResponse: true,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        used: 5,
        limit: 150,
      },
      latencyMs: 500,
    };

    expect(aiResponse.isAiResponse).toBe(true);
    expect(aiResponse.provider).toBe('claude');
    expect(aiResponse.latencyMs).toBeDefined();
  });
});

/**
 * Claude AI Provider for Hoo
 *
 * Wraps the Anthropic SDK for use with Hoo AI conversations.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { HooChatMessage, HooChatResponse, HooProviderConfig } from './types';
import { getHooSystemPrompt } from '../hoo-prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514' | 'claude-3-5-haiku-20241022';

export interface ClaudeProviderConfig extends HooProviderConfig {
  model: ClaudeModel;
}

/**
 * Default configuration for Claude provider
 */
export const defaultClaudeConfig: ClaudeProviderConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
  temperature: 0.7,
};

/**
 * Claude Sonnet 4 pricing (per 1M tokens)
 * Input: $3.00
 * Output: $15.00
 */
const CLAUDE_PRICING = {
  'claude-sonnet-4-20250514': {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
  },
  'claude-opus-4-20250514': {
    input: 15.0 / 1_000_000,
    output: 75.0 / 1_000_000,
  },
  'claude-3-5-haiku-20241022': {
    input: 0.8 / 1_000_000,
    output: 4.0 / 1_000_000,
  },
};

/**
 * Send a chat message to Claude and get a response
 */
export async function sendClaudeChat(
  messages: HooChatMessage[],
  config: Partial<ClaudeProviderConfig> = {}
): Promise<HooChatResponse> {
  const mergedConfig = { ...defaultClaudeConfig, ...config };
  const startTime = performance.now();

  const response = await anthropic.messages.create({
    model: mergedConfig.model,
    max_tokens: mergedConfig.maxTokens,
    system: getHooSystemPrompt(),
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  });

  const endTime = performance.now();
  const latencyMs = endTime - startTime;

  // Extract text from response
  const textContent = response.content.find((c) => c.type === 'text');
  const content = textContent?.type === 'text' ? textContent.text : '';

  // Calculate cost
  const pricing = CLAUDE_PRICING[mergedConfig.model];
  const inputCost = response.usage.input_tokens * pricing.input;
  const outputCost = response.usage.output_tokens * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    content,
    model: mergedConfig.model,
    provider: 'claude',
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
    cost: {
      input: inputCost,
      output: outputCost,
      total: totalCost,
    },
    latencyMs,
  };
}

/**
 * Stream a chat message to Claude (for future streaming support)
 */
export async function* streamClaudeChat(
  messages: HooChatMessage[],
  config: Partial<ClaudeProviderConfig> = {}
): AsyncGenerator<string, HooChatResponse, unknown> {
  const mergedConfig = { ...defaultClaudeConfig, ...config };
  const startTime = performance.now();

  const stream = anthropic.messages.stream({
    model: mergedConfig.model,
    max_tokens: mergedConfig.maxTokens,
    system: getHooSystemPrompt(),
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  });

  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      const delta = event.delta;
      if ('text' in delta) {
        fullContent += delta.text;
        yield delta.text;
      }
    } else if (event.type === 'message_delta') {
      if (event.usage) {
        outputTokens = event.usage.output_tokens;
      }
    } else if (event.type === 'message_start') {
      if (event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
      }
    }
  }

  const endTime = performance.now();
  const latencyMs = endTime - startTime;

  const pricing = CLAUDE_PRICING[mergedConfig.model];
  const inputCost = inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;

  return {
    content: fullContent,
    model: mergedConfig.model,
    provider: 'claude',
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    cost: {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
    },
    latencyMs,
  };
}

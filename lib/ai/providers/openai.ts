/**
 * OpenAI Provider for Hoo
 *
 * Wraps the OpenAI SDK for use with Hoo AI conversations.
 */

import OpenAI from 'openai';
import type { HooChatMessage, HooChatResponse, HooProviderConfig } from './types';
import { getHooSystemPrompt } from '../hoo-prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type OpenAIModel = 'gpt-4.1-mini' | 'gpt-5-mini';

export interface OpenAIProviderConfig extends HooProviderConfig {
  model: OpenAIModel;
}

/**
 * Default configuration for OpenAI provider
 */
export const defaultOpenAIConfig: OpenAIProviderConfig = {
  model: 'gpt-4.1-mini',
  maxTokens: 1024,
  temperature: 0.7,
};

/**
 * OpenAI pricing (per 1M tokens)
 */
const OPENAI_PRICING = {
  'gpt-4.1-mini': {
    input: 0.4 / 1_000_000,
    output: 1.6 / 1_000_000,
  },
  'gpt-5-mini': {
    input: 0.25 / 1_000_000,
    output: 2.0 / 1_000_000,
  },
};

/**
 * Send a chat message to OpenAI and get a response
 */
export async function sendOpenAIChat(
  messages: HooChatMessage[],
  config: Partial<OpenAIProviderConfig> = {}
): Promise<HooChatResponse> {
  const mergedConfig = { ...defaultOpenAIConfig, ...config };
  const startTime = performance.now();

  const response = await openai.chat.completions.create({
    model: mergedConfig.model,
    max_completion_tokens: mergedConfig.maxTokens,
    messages: [
      { role: 'system', content: getHooSystemPrompt() },
      ...messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ],
  });

  const endTime = performance.now();
  const latencyMs = endTime - startTime;

  const content = response.choices[0]?.message?.content || '';

  // Get usage
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;

  // Calculate cost
  const pricing = OPENAI_PRICING[mergedConfig.model];
  const inputCost = inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    content,
    model: mergedConfig.model,
    provider: 'openai',
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    cost: {
      input: inputCost,
      output: outputCost,
      total: totalCost,
    },
    latencyMs,
  };
}

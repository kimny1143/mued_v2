/**
 * OpenAI Provider for Hoo
 *
 * Wraps the OpenAI SDK for use with Hoo AI conversations.
 */

import OpenAI from 'openai';
import { contentToString } from './types';
import type { HooChatMessage, HooChatResponse, HooProviderConfig } from './types';
import { getHooSystemPrompt } from '../hoo-prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type OpenAIModel = 'gpt-4.1-mini' | 'gpt-5-mini';

export interface OpenAIProviderConfig extends HooProviderConfig {
  model: OpenAIModel;
  systemPrompt?: string;
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

/** Timeout for AI requests (2 minutes) */
const AI_REQUEST_TIMEOUT_MS = 120_000;

/**
 * Send a chat message to OpenAI and get a response
 */
export async function sendOpenAIChat(
  messages: HooChatMessage[],
  config: Partial<OpenAIProviderConfig> = {}
): Promise<HooChatResponse> {
  const mergedConfig = { ...defaultOpenAIConfig, ...config };
  const startTime = performance.now();

  // Setup timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await openai.chat.completions.create({
      model: mergedConfig.model,
      max_completion_tokens: mergedConfig.maxTokens,
      messages: [
        { role: 'system', content: mergedConfig.systemPrompt ?? getHooSystemPrompt() },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: contentToString(msg.content),
        })),
      ],
    }, {
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI request timeout after 2 minutes');
    }
    throw error;
  }
  clearTimeout(timeoutId);

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

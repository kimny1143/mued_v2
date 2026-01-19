/**
 * Gemini AI Provider for Hoo
 *
 * Wraps the Google Generative AI SDK for use with Hoo AI conversations.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { HooChatMessage, HooChatResponse, HooProviderConfig } from './types';
import { getHooSystemPrompt } from '../hoo-prompt';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export type GeminiModel = 'gemini-2.0-flash' | 'gemini-2.5-flash-preview-05-20';

export interface GeminiProviderConfig extends HooProviderConfig {
  model: GeminiModel;
}

/**
 * Default configuration for Gemini provider
 */
export const defaultGeminiConfig: GeminiProviderConfig = {
  model: 'gemini-2.0-flash',
  maxTokens: 1024,
  temperature: 0.7,
};

/**
 * Gemini pricing (per 1M tokens)
 * Note: These are approximate - check official pricing for exact values
 */
const GEMINI_PRICING = {
  'gemini-2.0-flash': {
    input: 0.1 / 1_000_000,
    output: 0.4 / 1_000_000,
  },
  'gemini-2.5-flash-preview-05-20': {
    input: 0.15 / 1_000_000,
    output: 0.6 / 1_000_000,
  },
};

/**
 * Convert Hoo messages to Gemini format
 */
function convertToGeminiMessages(messages: HooChatMessage[]) {
  return messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

/**
 * Send a chat message to Gemini and get a response
 */
export async function sendGeminiChat(
  messages: HooChatMessage[],
  config: Partial<GeminiProviderConfig> = {}
): Promise<HooChatResponse> {
  const mergedConfig = { ...defaultGeminiConfig, ...config };
  const startTime = performance.now();

  const model = genAI.getGenerativeModel({
    model: mergedConfig.model,
    systemInstruction: getHooSystemPrompt(),
    generationConfig: {
      maxOutputTokens: mergedConfig.maxTokens,
      temperature: mergedConfig.temperature,
    },
  });

  const chat = model.startChat({
    history: convertToGeminiMessages(messages.slice(0, -1)),
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  const response = result.response;

  const endTime = performance.now();
  const latencyMs = endTime - startTime;

  const content = response.text();

  // Gemini provides usage metadata
  const usageMetadata = response.usageMetadata;
  const inputTokens = usageMetadata?.promptTokenCount || 0;
  const outputTokens = usageMetadata?.candidatesTokenCount || 0;

  // Calculate cost
  const pricing = GEMINI_PRICING[mergedConfig.model];
  const inputCost = inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    content,
    model: mergedConfig.model,
    provider: 'gemini',
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

/**
 * Stream a chat message to Gemini (for future streaming support)
 */
export async function* streamGeminiChat(
  messages: HooChatMessage[],
  config: Partial<GeminiProviderConfig> = {}
): AsyncGenerator<string, HooChatResponse, unknown> {
  const mergedConfig = { ...defaultGeminiConfig, ...config };
  const startTime = performance.now();

  const model = genAI.getGenerativeModel({
    model: mergedConfig.model,
    systemInstruction: getHooSystemPrompt(),
    generationConfig: {
      maxOutputTokens: mergedConfig.maxTokens,
      temperature: mergedConfig.temperature,
    },
  });

  const chat = model.startChat({
    history: convertToGeminiMessages(messages.slice(0, -1)),
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessageStream(lastMessage.content);

  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullContent += text;
    yield text;

    // Update usage from final chunk
    if (chunk.usageMetadata) {
      inputTokens = chunk.usageMetadata.promptTokenCount || 0;
      outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
    }
  }

  const endTime = performance.now();
  const latencyMs = endTime - startTime;

  const pricing = GEMINI_PRICING[mergedConfig.model];
  const inputCost = inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;

  return {
    content: fullContent,
    model: mergedConfig.model,
    provider: 'gemini',
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

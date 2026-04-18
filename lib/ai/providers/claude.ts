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

export type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514' | 'claude-haiku-4-5-20251001';

export interface AdvisorConfig {
  model: ClaudeModel;
  maxUses?: number;
}

export interface ClaudeProviderConfig extends HooProviderConfig {
  model: ClaudeModel;
  systemPrompt?: string;
  advisor?: AdvisorConfig;
}

/**
 * Default configuration for Claude provider
 */
export const defaultClaudeConfig: ClaudeProviderConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
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
  'claude-haiku-4-5-20251001': {
    input: 1.0 / 1_000_000,
    output: 5.0 / 1_000_000,
  },
};

/** Timeout for AI requests (2 minutes) */
const AI_REQUEST_TIMEOUT_MS = 120_000;

/**
 * Send a chat message to Claude and get a response
 */
export async function sendClaudeChat(
  messages: HooChatMessage[],
  config: Partial<ClaudeProviderConfig> = {}
): Promise<HooChatResponse> {
  const mergedConfig = { ...defaultClaudeConfig, ...config };
  const startTime = performance.now();

  // Setup timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  // Build request params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestParams: any = {
    model: mergedConfig.model,
    max_tokens: mergedConfig.maxTokens,
    system: mergedConfig.systemPrompt ?? getHooSystemPrompt(),
    // content is passed as-is: string for simple messages, block array for tool_use/tool_result turns
    messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
  };

  // Build tools array
  const tools = [...(mergedConfig.tools ?? [])];

  // Add advisor tool if configured
  if (mergedConfig.advisor) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const advisorTool: any = {
      type: 'advisor_20260301',
      name: 'advisor',
      model: mergedConfig.advisor.model,
    };
    if (mergedConfig.advisor.maxUses) {
      advisorTool.max_uses = mergedConfig.advisor.maxUses;
    }
    tools.push(advisorTool);
  }

  if (tools.length > 0) {
    requestParams.tools = tools;
  }

  let response;
  try {
    if (mergedConfig.advisor) {
      // Use beta API for advisor support
      response = await anthropic.beta.messages.create(
        {
          ...requestParams,
          betas: ['advisor-tool-2026-03-01'],
        },
        { signal: controller.signal }
      );
    } else {
      response = await anthropic.messages.create(requestParams, {
        signal: controller.signal,
      });
    }
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

  // Extract text from response
  const textContent = response.content.find((c) => c.type === 'text');
  const content = textContent?.type === 'text' ? textContent.text : '';

  // Extract tool calls — id is required for tool_result pairing in history reconstruction
  const toolCalls = response.content
    .filter((c) => c.type === 'tool_use')
    .map((c) => {
      if (c.type === 'tool_use') {
        return { id: c.id, name: c.name, input: c.input };
      }
      return null;
    })
    .filter(Boolean) as { id: string; name: string; input: unknown }[];

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
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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

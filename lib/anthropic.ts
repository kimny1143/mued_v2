import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/**
 * Anthropic Claude Client Wrapper with Cost Tracking
 *
 * Features:
 * - Cost tracking for API calls
 * - Error handling and retries
 * - Model selection strategy
 * - Token usage monitoring
 */

// Environment variable validation
const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(), // Optional to allow build, but required at runtime
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4.5-20250929'), // Latest Sonnet 4.5
  ANTHROPIC_MAX_TOKENS: z.coerce.number().default(8192),
});

const env = envSchema.parse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_MAX_TOKENS: process.env.ANTHROPIC_MAX_TOKENS,
});

// Lazy initialization - only create client when needed (runtime)
let _anthropicClient: Anthropic | null = null;

export const anthropic = new Proxy({} as Anthropic, {
  get(target, prop: keyof Anthropic) {
    if (!_anthropicClient) {
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is required at runtime');
      }
      _anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return _anthropicClient[prop];
  },
});

// Model pricing (per 1M tokens) - as of 2025-11
export const MODEL_PRICING = {
  // Claude 4 series (2025)
  'claude-sonnet-4.5-20250929': { input: 3.0, output: 15.0 }, // Sept 2025 - Best for coding
  'claude-haiku-4.5-20251015': { input: 1.0, output: 5.0 }, // Oct 2025 - Fast, low-cost
  'claude-opus-4.1-20250805': { input: 15.0, output: 75.0 }, // Aug 2025 - Agentic tasks
  'claude-sonnet-4-20250522': { input: 3.0, output: 15.0 }, // May 2025
  'claude-opus-4-20250522': { input: 15.0, output: 75.0 }, // May 2025
  // Claude 3.5 series (2024-10) - Legacy
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
  // Claude 3 series - Legacy
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  // Shorter aliases (use latest versions)
  'claude-sonnet-4.5': { input: 3.0, output: 15.0 },
  'claude-haiku-4.5': { input: 1.0, output: 5.0 },
  'claude-opus-4.1': { input: 15.0, output: 75.0 },
} as const;

export type ClaudeModelName = keyof typeof MODEL_PRICING;

// Cost tracking types
export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  timestamp: Date;
}

export interface MessageOptions {
  model?: ClaudeModelName;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

/**
 * Calculate estimated cost based on token usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Try to find exact model match
  if (model in MODEL_PRICING) {
    const pricing = MODEL_PRICING[model as ClaudeModelName];
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  // Fallback: try to infer pricing from model name
  if (model.includes('sonnet')) {
    const pricing = MODEL_PRICING['claude-sonnet-4.5-20250929'];
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  } else if (model.includes('haiku')) {
    const pricing = MODEL_PRICING['claude-haiku-4.5-20251015'];
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  // Default fallback to Sonnet 4.5 pricing
  console.warn(`Unknown model for cost calculation: ${model}, using Sonnet 4.5 pricing`);
  const pricing = MODEL_PRICING['claude-sonnet-4.5-20250929'];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Create message completion with cost tracking
 */
export async function createMessage(
  messages: Anthropic.MessageParam[],
  options: MessageOptions = {}
): Promise<{
  message: Anthropic.Message;
  usage: UsageMetrics;
}> {
  const model = options.model || (env.ANTHROPIC_MODEL as ClaudeModelName);
  const maxTokens = options.maxTokens || env.ANTHROPIC_MAX_TOKENS;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages,
    });

    const usage = message.usage;
    const metrics: UsageMetrics = {
      promptTokens: usage.input_tokens,
      completionTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
      estimatedCost: calculateCost(
        model,
        usage.input_tokens,
        usage.output_tokens
      ),
      model,
      timestamp: new Date(),
    };

    return { message, usage: metrics };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API Error:', {
        status: error.status,
        message: error.message,
      });
      throw new Error(`Anthropic API Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create streaming message completion with cost tracking
 */
export async function createStreamingMessage(
  messages: Anthropic.MessageParam[],
  options: MessageOptions = {}
): Promise<{
  stream: AsyncIterable<Anthropic.MessageStreamEvent>;
  // Note: Usage metrics will be in the final message_stop event for streaming
}> {
  const model = options.model || (env.ANTHROPIC_MODEL as ClaudeModelName);
  const maxTokens = options.maxTokens || env.ANTHROPIC_MAX_TOKENS;

  try {
    const stream = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages,
      stream: true,
    });

    return { stream };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API Error:', {
        status: error.status,
        message: error.message,
      });
      throw new Error(`Anthropic API Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Helper function to extract text content from message
 */
export function extractTextContent(message: Anthropic.Message): string {
  const textBlocks = message.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  return textBlocks.map(block => block.text).join('\n');
}

/**
 * Model selection strategy based on task complexity
 */
export function selectModel(taskComplexity: 'simple' | 'medium' | 'complex'): ClaudeModelName {
  switch (taskComplexity) {
    case 'simple':
      return 'claude-haiku-4.5-20251015'; // Fast, cheap, good for simple tasks ($1/$5)
    case 'medium':
      return 'claude-sonnet-4.5-20250929'; // Balanced performance and cost ($3/$15)
    case 'complex':
      return 'claude-opus-4.1-20250805'; // Best reasoning for complex tasks ($15/$75)
    default:
      return 'claude-sonnet-4.5-20250929';
  }
}

/**
 * Validate model name
 */
export function isValidModel(model: string): model is ClaudeModelName {
  return model in MODEL_PRICING;
}

/**
 * Convert OpenAI-style messages to Claude format
 * Useful for migration from OpenAI to Claude
 */
export function convertOpenAIMessages(
  openaiMessages: Array<{ role: string; content: string }>
): { system?: string; messages: Anthropic.MessageParam[] } {
  const systemMessages = openaiMessages.filter(m => m.role === 'system');
  const system = systemMessages.map(m => m.content).join('\n\n');

  const messages = openaiMessages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }));

  return { system: system || undefined, messages };
}

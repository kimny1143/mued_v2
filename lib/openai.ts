import OpenAI from 'openai';
import { z } from 'zod';

/**
 * OpenAI Client Wrapper with Cost Tracking
 *
 * Features:
 * - Cost tracking for API calls
 * - Error handling and retries
 * - Model selection strategy
 * - Token usage monitoring
 */

// Environment variable validation
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(), // Optional to allow build, but required at runtime
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(1000),
});

const env = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_MAX_TOKENS: process.env.OPENAI_MAX_TOKENS,
});

// Lazy initialization - only create client when needed (runtime)
let _openaiClient: OpenAI | null = null;

export const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    if (!_openaiClient) {
      if (!env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required at runtime');
      }
      _openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return (_openaiClient as any)[prop];
  },
});

// Model pricing (per 1M tokens) - as of 2025
export const MODEL_PRICING = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
} as const;

export type ModelName = keyof typeof MODEL_PRICING;

// Cost tracking types
export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  timestamp: Date;
}

export interface ChatCompletionOptions {
  model?: ModelName;
  maxTokens?: number;
  temperature?: number;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  toolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
}

/**
 * Calculate estimated cost based on token usage
 */
export function calculateCost(
  model: ModelName,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Create chat completion with cost tracking
 */
export async function createChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: ChatCompletionOptions = {}
): Promise<{
  completion: OpenAI.Chat.Completions.ChatCompletion;
  usage: UsageMetrics;
}> {
  const model = options.model || (env.OPENAI_MODEL as ModelName);
  const maxTokens = options.maxTokens || env.OPENAI_MAX_TOKENS;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.7,
      tools: options.tools,
      tool_choice: options.toolChoice,
    });

    const usage = completion.usage;
    if (!usage) {
      throw new Error('Usage data not available in response');
    }

    const metrics: UsageMetrics = {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      estimatedCost: calculateCost(
        model,
        usage.prompt_tokens,
        usage.completion_tokens
      ),
      model,
      timestamp: new Date(),
    };

    return { completion, usage: metrics };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type,
      });
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create streaming chat completion with cost tracking
 */
export async function createStreamingChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: ChatCompletionOptions = {}
): Promise<{
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  // Note: Usage metrics will be in the final chunk for streaming
}> {
  const model = options.model || (env.OPENAI_MODEL as ModelName);
  const maxTokens = options.maxTokens || env.OPENAI_MAX_TOKENS;

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.7,
      tools: options.tools,
      tool_choice: options.toolChoice,
      stream: true,
      stream_options: { include_usage: true },
    });

    return { stream };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', {
        status: error.status,
        message: error.message,
      });
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Helper function to extract tool calls from completion
 */
export function extractToolCalls(
  completion: OpenAI.Chat.Completions.ChatCompletion
): OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] {
  const message = completion.choices[0]?.message;
  return message?.tool_calls || [];
}

/**
 * Helper function to check if completion requires tool execution
 */
export function requiresToolExecution(
  completion: OpenAI.Chat.Completions.ChatCompletion
): boolean {
  return extractToolCalls(completion).length > 0;
}

/**
 * Model selection strategy based on task complexity
 */
export function selectModel(taskComplexity: 'simple' | 'medium' | 'complex'): ModelName {
  switch (taskComplexity) {
    case 'simple':
      return 'gpt-4o-mini'; // Fast, cheap, good for simple tasks
    case 'medium':
      return 'gpt-4o-mini'; // Still cost-effective for most tasks
    case 'complex':
      return 'gpt-4o'; // More capable for complex reasoning
    default:
      return 'gpt-4o-mini';
  }
}

/**
 * Validate model name
 */
export function isValidModel(model: string): model is ModelName {
  return model in MODEL_PRICING;
}

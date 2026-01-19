/**
 * Shared types for AI providers
 */

/**
 * Message format for Hoo chat
 */
export interface HooChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Usage statistics
 */
export interface HooUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Cost breakdown
 */
export interface HooCostStats {
  input: number;
  output: number;
  total: number;
}

/**
 * Response from a chat completion
 */
export interface HooChatResponse {
  content: string;
  model: string;
  provider: 'claude' | 'gemini' | 'openai';
  usage: HooUsageStats;
  cost: HooCostStats;
  latencyMs: number;
}

/**
 * Base configuration for providers
 */
export interface HooProviderConfig {
  maxTokens: number;
  temperature?: number;
}

/**
 * Available model identifiers for the PoC
 */
export type HooModelId = 'claude-sonnet-4' | 'claude-haiku' | 'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gpt-4.1-mini' | 'gpt-5-mini';

/**
 * Model metadata for UI display
 */
export interface HooModelInfo {
  id: HooModelId;
  name: string;
  provider: 'claude' | 'gemini' | 'openai';
  description: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

/**
 * All available models for the PoC
 */
export const HOO_MODELS: HooModelInfo[] = [
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'claude',
    description: 'Balanced performance and cost',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    provider: 'claude',
    description: 'Fast and affordable',
    inputCostPer1M: 1.0,
    outputCostPer1M: 5.0,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Fast and cost-effective',
    inputCostPer1M: 0.1,
    outputCostPer1M: 0.4,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Latest Gemini with improved reasoning',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    description: 'Fast and efficient',
    inputCostPer1M: 0.4,
    outputCostPer1M: 1.6,
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'Reasoning model',
    inputCostPer1M: 0.25,
    outputCostPer1M: 2.0,
  },
];

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
  provider: 'claude' | 'gemini';
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
export type HooModelId = 'claude-sonnet-4' | 'gemini-2.0-flash' | 'gemini-2.5-flash';

/**
 * Model metadata for UI display
 */
export interface HooModelInfo {
  id: HooModelId;
  name: string;
  provider: 'claude' | 'gemini';
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
];

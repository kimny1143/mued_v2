/**
 * OpenAI API Type Definitions
 * https://platform.openai.com/docs/api-reference
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export type OpenAIMessage = ChatCompletionMessageParam;

export interface OpenAICompletionParams {
  model: string;
  messages: OpenAIMessage[];
  max_completion_tokens?: number;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: {
    type: 'text' | 'json_object';
  };
}

export interface OpenAICompletionChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAICompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

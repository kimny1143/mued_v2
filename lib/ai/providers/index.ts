/**
 * AI Providers Index
 *
 * Unified interface for Hoo AI providers.
 */

export * from './types';
export * from './claude';
export * from './gemini';
export * from './openai';

import type { HooChatMessage, HooChatResponse, HooModelId } from './types';
import { sendClaudeChat } from './claude';
import { sendGeminiChat } from './gemini';
import { sendOpenAIChat } from './openai';
import {
  CONVERSATION_TITLE_SYSTEM_PROMPT,
  buildConversationTitleUserPrompt,
} from '@/lib/ai/prompts/conversation-title';

/**
 * Generate a short, descriptive title for a conversation
 * Uses Claude Haiku for cost efficiency (~0.01 yen per call)
 *
 * @param firstUserMessage - First user message in conversation
 * @param firstAiResponse - First AI response
 * @param lastUserMessage - Optional: Last user message (for longer conversations)
 * @param lastAiResponse - Optional: Last AI response (often contains summary)
 */
export async function generateConversationTitle(
  firstUserMessage: string,
  firstAiResponse: string,
  lastUserMessage?: string,
  lastAiResponse?: string
): Promise<string> {
  try {
    const result = await sendClaudeChat(
      [
        {
          role: 'user',
          content: buildConversationTitleUserPrompt(
            firstUserMessage,
            firstAiResponse,
            lastUserMessage,
            lastAiResponse
          ),
        },
      ],
      {
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 50,
        systemPrompt: CONVERSATION_TITLE_SYSTEM_PROMPT,
      }
    );
    const title = result.content.trim().slice(0, 50);
    // Return default if empty
    return title || 'New conversation';
  } catch {
    // If title generation fails, return a default
    return 'New conversation';
  }
}

/**
 * Options for sendHooChat
 */
export interface HooChatOptions {
  systemPrompt?: string;
}

/**
 * Send a chat message using the specified model
 */
export async function sendHooChat(
  modelId: HooModelId,
  messages: HooChatMessage[],
  options?: HooChatOptions
): Promise<HooChatResponse> {
  switch (modelId) {
    case 'claude-sonnet-4':
      return sendClaudeChat(messages, {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: options?.systemPrompt,
      });

    case 'claude-haiku':
      return sendClaudeChat(messages, {
        model: 'claude-haiku-4-5-20251001',
        systemPrompt: options?.systemPrompt,
      });

    case 'gemini-2.0-flash':
      return sendGeminiChat(messages, {
        model: 'gemini-2.0-flash',
        systemPrompt: options?.systemPrompt,
      });

    case 'gemini-2.5-flash':
      return sendGeminiChat(messages, {
        model: 'gemini-2.5-flash',
        systemPrompt: options?.systemPrompt,
      });

    case 'gpt-4.1-mini':
      return sendOpenAIChat(messages, {
        model: 'gpt-4.1-mini',
        systemPrompt: options?.systemPrompt,
      });

    case 'gpt-5-mini':
      return sendOpenAIChat(messages, {
        model: 'gpt-5-mini',
        systemPrompt: options?.systemPrompt,
      });

    default:
      throw new Error(`Unknown model: ${modelId}`);
  }
}

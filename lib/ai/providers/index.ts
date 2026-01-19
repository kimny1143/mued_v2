/**
 * AI Providers Index
 *
 * Unified interface for Hoo AI providers.
 */

export * from './types';
export * from './claude';
export * from './gemini';

import type { HooChatMessage, HooChatResponse, HooModelId } from './types';
import { sendClaudeChat } from './claude';
import { sendGeminiChat, type GeminiModel } from './gemini';

/**
 * Send a chat message using the specified model
 */
export async function sendHooChat(
  modelId: HooModelId,
  messages: HooChatMessage[]
): Promise<HooChatResponse> {
  switch (modelId) {
    case 'claude-sonnet-4':
      return sendClaudeChat(messages, { model: 'claude-sonnet-4-20250514' });

    case 'gemini-2.0-flash':
      return sendGeminiChat(messages, { model: 'gemini-2.0-flash' });

    case 'gemini-2.5-flash':
      return sendGeminiChat(messages, {
        model: 'gemini-2.5-flash',
      });

    default:
      throw new Error(`Unknown model: ${modelId}`);
  }
}

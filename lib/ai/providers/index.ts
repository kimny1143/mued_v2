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
    // Build context based on available messages
    let conversationContext: string;
    const hasEndContext = lastUserMessage && lastAiResponse && lastUserMessage !== firstUserMessage;

    if (hasEndContext) {
      // Include both start and end for better context
      conversationContext = `【会話の最初】
User: "${firstUserMessage}"
Assistant: "${firstAiResponse.slice(0, 150)}"

【会話の最後】
User: "${lastUserMessage}"
Assistant: "${lastAiResponse.slice(0, 250)}"`;
    } else {
      // Only first exchange available
      conversationContext = `User: "${firstUserMessage}"
Assistant: "${firstAiResponse.slice(0, 200)}"`;
    }

    const result = await sendClaudeChat(
      [
        {
          role: 'user',
          content: `この会話のタイトルを生成してください（最大50文字）。

ルール:
- 挨拶（こんにちは等）は無視し、本題を捉える
- 会話の結論や成果があればそれを反映
- ユーザーの言語でタイトルを書く
- タイトルのみ出力、説明不要

${conversationContext}

タイトル:`,
        },
      ],
      {
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 50,
        systemPrompt: 'タイトル生成専門。挨拶を無視し本題を捉える。タイトルのみ出力。例: "作曲アイデアの整理", "音楽制作の方向性", "Workflow optimization"',
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

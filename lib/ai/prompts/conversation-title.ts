/**
 * Conversation Title Generation Prompts
 *
 * System prompt and user message builder for generating short conversation titles.
 */

// --- Version ---
export const CONVERSATION_TITLE_PROMPT_VERSION = '1.0.0';

// --- System Prompt ---
export const CONVERSATION_TITLE_SYSTEM_PROMPT =
  'タイトル生成専門。挨拶を無視し本題を捉える。タイトルのみ出力。例: "作曲アイデアの整理", "音楽制作の方向性", "Workflow optimization"';

// --- User Message Builder ---
export function buildConversationTitleUserPrompt(
  firstUserMessage: string,
  firstAiResponse: string,
  lastUserMessage?: string,
  lastAiResponse?: string
): string {
  const hasEndContext = lastUserMessage && lastAiResponse && lastUserMessage !== firstUserMessage;

  let conversationContext: string;
  if (hasEndContext) {
    conversationContext = `【会話の最初】
User: "${firstUserMessage}"
Assistant: "${firstAiResponse.slice(0, 150)}"

【会話の最後】
User: "${lastUserMessage}"
Assistant: "${lastAiResponse.slice(0, 250)}"`;
  } else {
    conversationContext = `User: "${firstUserMessage}"
Assistant: "${firstAiResponse.slice(0, 200)}"`;
  }

  return `この会話のタイトルを生成してください（最大50文字）。

ルール:
- 挨拶（こんにちは等）は無視し、本題を捉える
- 会話の結論や成果があればそれを反映
- ユーザーの言語でタイトルを書く
- タイトルのみ出力、説明不要

${conversationContext}

タイトル:`;
}

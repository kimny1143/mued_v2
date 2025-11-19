'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useEffect, useRef, useState } from 'react';

/**
 * Parse AI response to extract structured data
 * Expected format:
 * 【整形後】
 * <formatted text>
 *
 * 【タグ】
 * #tag1 #tag2 #tag3
 *
 * 【コメント】
 * <comment>
 */
function parseAIResponse(aiText: string): {
  formatted: string;
  tags: string[];
  comment: string;
} {
  const result = {
    formatted: '',
    tags: [] as string[],
    comment: '',
  };

  try {
    // Extract formatted text
    const formattedMatch = aiText.match(/【整形後】\s*([\s\S]*?)(?=【タグ】|$)/);
    if (formattedMatch) {
      result.formatted = formattedMatch[1].trim();
    }

    // Extract tags
    const tagsMatch = aiText.match(/【タグ】\s*([\s\S]*?)(?=【コメント】|$)/);
    if (tagsMatch) {
      const tagText = tagsMatch[1].trim();
      result.tags = tagText
        .split(/\s+/)
        .filter((tag) => tag.startsWith('#'))
        .map((tag) => tag.trim());
    }

    // Extract comment
    const commentMatch = aiText.match(/【コメント】\s*([\s\S]*?)$/);
    if (commentMatch) {
      result.comment = commentMatch[1].trim();
    }

    // Fallback: if parsing fails, use the raw text
    if (!result.formatted && !result.tags.length && !result.comment) {
      result.formatted = aiText;
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    result.formatted = aiText; // Fallback to raw text
  }

  return result;
}

/**
 * ChatContainer - MUEDnote のメインチャットコンテナ
 *
 * UX心理学の原則:
 * - 認知負荷削減: シンプルなメッセージリストと入力フィールドのみ
 * - ドハティの閾値: Vercel AI SDK のストリーミングで0.4秒以内の応答開始
 * - 美的ユーザビリティ効果: クリーンで読みやすいレイアウト
 */
export function ChatContainer() {
  // AI SDK v5: 入力状態を自分で管理
  const [input, setInput] = useState('');

  const { messages, status, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/muednote/chat',
    }),
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: async (event) => {
      // AI応答完了後にDBに保存
      try {
        const userMessage = event.messages[event.messages.length - 2]; // User message
        const aiMessage = event.messages[event.messages.length - 1]; // AI message

        if (userMessage && aiMessage) {
          const userText = userMessage.parts
            .filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join('');

          const aiText = aiMessage.parts
            .filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join('');

          // Parse AI response for structured data
          const parsed = parseAIResponse(aiText);

          // Save to database
          await fetch('/api/muednote/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userMessage: userText,
              aiResponse: aiText,
              formatted: parsed.formatted,
              tags: parsed.tags,
              comment: parsed.comment,
            }),
          });
        }
      } catch (saveError) {
        console.error('Failed to save chat entry:', saveError);
        // Don't block user experience if save fails
      }
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI SDK v5: sendMessage() を使用
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === 'submitted' || status === 'streaming') {
      return;
    }

    await sendMessage({ text: input }); // AI SDK v5: シンプルなtext形式
    setInput(''); // 送信後に入力をクリア
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background border rounded-lg shadow-sm">
      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">今日の音楽活動を記録しましょう</p>
              <p className="text-sm">
                練習したこと、気づいたこと、アイデアなど、自由に書いてください
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 入力フィールド */}
      <div className="border-t p-4 bg-muted/30">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

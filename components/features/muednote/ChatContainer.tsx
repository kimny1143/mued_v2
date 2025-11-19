'use client';

import { useChat } from 'ai';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useEffect, useRef } from 'react';

/**
 * ChatContainer - MUEDnote のメインチャットコンテナ
 *
 * UX心理学の原則:
 * - 認知負荷削減: シンプルなメッセージリストと入力フィールドのみ
 * - ドハティの閾値: Vercel AI SDK のストリーミングで0.4秒以内の応答開始
 * - 美的ユーザビリティ効果: クリーンで読みやすいレイアウト
 */
export function ChatContainer() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: '/api/muednote/chat',
      onError: (error) => {
        console.error('Chat error:', error);
      },
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

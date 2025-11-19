'use client';

import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: UIMessage;
}

/**
 * ChatMessage - MUEDnote のチャットメッセージコンポーネント
 *
 * UX心理学の原則:
 * - 視覚的階層: ユーザーとAIのメッセージを明確に区別
 * - 美的ユーザビリティ効果: アイコンと色でロール を視覚的に表現
 * - 労働の錯覚: AIアイコンで「処理している」感を演出
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // AI SDK v5: UIMessage.parts から text を抽出
  const messageText = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');

  return (
    <div
      className={cn(
        'flex gap-3 items-start',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* アバター */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      {/* メッセージ本体 */}
      <div
        className={cn(
          'flex-1 space-y-2 px-4 py-3 rounded-lg max-w-[80%]',
          isUser
            ? 'bg-primary text-primary-foreground ml-auto'
            : 'bg-muted text-foreground'
        )}
      >
        <div className="whitespace-pre-wrap break-words">{messageText}</div>

        {/* TODO: Phase 1.1 で追加予定 - タグ表示 */}
        {/* {message.metadata?.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.metadata.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-1 bg-background/20 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
}

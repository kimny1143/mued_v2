'use client';

import { FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

/**
 * ChatInput - MUEDnote のチャット入力コンポーネント
 *
 * UX心理学の原則:
 * - 認知負荷削減: シンプルなテキストエリアと送信ボタンのみ
 * - 親近性バイアス: 慣れ親しんだチャットUIパターン
 * - プライミング効果: プレースホルダーでポジティブな入力を促す
 * - ナッジ効果: Enter キーで送信可能（Shift+Enter で改行）
 */
export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter キーで送信（Shift+Enter は改行）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input?.trim() && !isLoading) {
        // フォームの submit イベントをトリガー
        const form = e.currentTarget.form;
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={input || ''}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="今日はコード進行の練習をした..."
        disabled={isLoading}
        className="min-h-[60px] max-h-[200px] resize-none"
        rows={2}
      />
      <Button
        type="submit"
        disabled={isLoading || !input?.trim()}
        className="h-[60px] w-[60px] shrink-0 p-0"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </form>
  );
}

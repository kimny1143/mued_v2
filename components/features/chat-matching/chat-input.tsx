/**
 * Chat Input Component
 * Expandable textarea with send button and quick actions
 *
 * Japanese IME対応: 変換中はEnterで送信しない
 * IME変換後は1回Enterで送信
 */

'use client';

import { useState, useRef, useEffect, KeyboardEvent, CompositionEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { ChatInputProps } from '@/types/chat-matching';

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isDisabled = false,
  placeholder = 'メッセージを入力...',
  quickActions = [],
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(1);
  const [isComposing, setIsComposing] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newRows = Math.min(Math.max(Math.ceil(scrollHeight / 24), 1), 5);
      setRows(newRows);
    }
  }, [value]);

  // IME composition handlers
  const handleCompositionStart = (_e: CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (_e: CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中は何もしない（変換確定のEnterを無視）
    if (isComposing) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      if (!value.trim() || isDisabled) {
        return;
      }

      // IME変換後は1回Enterで送信
      onSubmit();
    }
  };

  const handleQuickActionClick = (actionValue: string) => {
    onChange(actionValue);
    // Auto-submit quick actions after a short delay
    setTimeout(() => {
      onSubmit();
    }, 100);
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Quick Action Buttons */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickActionClick(action.value)}
              disabled={isDisabled}
              className="text-sm"
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={rows}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="メッセージ入力"
        />
        <Button
          onClick={onSubmit}
          disabled={!value.trim() || isDisabled}
          variant="primary"
          size="md"
          className="h-10 px-6"
          aria-label="送信"
        >
          送信
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-2">
        Enterで送信、Shift+Enterで改行
      </p>
    </div>
  );
}

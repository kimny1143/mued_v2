/**
 * Typing Indicator Component
 * Animated typing dots with optional context message
 */

'use client';

import type { TypingIndicatorProps } from '@/types/chat-matching';

export function TypingIndicator({ isVisible, contextMessage }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="flex items-start gap-3 mb-4">
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
        AI
      </div>

      {/* Typing Animation */}
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
        {contextMessage && (
          <p className="text-xs text-gray-500 mt-1">{contextMessage}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Chat Message Component
 * Renders individual messages with support for text, mentor suggestions, and quick replies
 */

'use client';

import { formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MentorSuggestionCard } from './mentor-suggestion-card';
import type { ChatMessageProps } from '@/types/chat-matching';

export function ChatMessage({ message, onQuickReplyClick, onMentorSelect }: ChatMessageProps) {
  const { role, content, timestamp } = message;
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  // System messages (hidden from UI, used for context only)
  if (role === 'system') {
    return null;
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      role="article"
      aria-label={`${isUser ? 'あなた' : 'AI'}のメッセージ`}
    >
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {isAssistant && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            AI
          </div>
        )}

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Text Content - show for both 'text' and 'quick_replies' types */}
          {(content.type === 'text' || content.type === 'quick_replies') && content.text && (
            <div
              className={`rounded-2xl px-4 py-2.5 ${
                isUser
                  ? 'bg-[var(--color-brand-green)] text-white rounded-tr-sm'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {content.text}
              </p>
            </div>
          )}

          {/* Quick Reply Buttons - show below text when type is 'quick_replies' */}
          {content.type === 'quick_replies' && content.quickReplies && content.quickReplies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {content.quickReplies.map((reply) => (
                <Button
                  key={reply.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickReplyClick?.(reply)}
                  className="text-sm border-[var(--color-brand-green)] text-[var(--color-brand-green)] hover:bg-green-50"
                >
                  {reply.icon && <span className="mr-1">{reply.icon}</span>}
                  {reply.label}
                </Button>
              ))}
            </div>
          )}

          {/* Mentor Suggestions */}
          {content.type === 'mentor_suggestions' && content.mentorSuggestions && (
            <div className="space-y-3">
              {content.mentorSuggestions.map((suggestion) => (
                <MentorSuggestionCard
                  key={suggestion.mentor.id}
                  suggestion={suggestion}
                  onSelect={(mentor) => onMentorSelect?.(mentor)}
                  isCompact={content.mentorSuggestions!.length > 2}
                  showDetailedScore={false}
                />
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div
            className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}
            aria-label={`送信時刻: ${formatTime(timestamp)}`}
          >
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}

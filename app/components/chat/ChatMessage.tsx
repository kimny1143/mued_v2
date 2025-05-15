import { ChatMessage as ChatMessageType } from '@lib/types';
import { useRef } from 'react';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwnMessage: boolean;
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  // date-fnsの代わりにJavaScriptのIntl.DateTimeFormatを使用
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  });

  // YouTubeリンクの埋め込み処理を完全に除去し、リンクのまま表示する

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[70%] p-4 rounded-lg ${
          isOwnMessage
            ? 'bg-blue-500 text-white'
            : 'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
        }`}
      >
        <div 
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
        
        {message.files && message.files.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.files.map((file) => (
              <a
                key={file.id}
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center p-2 rounded ${
                  isOwnMessage
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                } transition-colors`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm truncate">{file.file_name}</span>
              </a>
            ))}
          </div>
        )}
        
        <div className="text-xs mt-2 opacity-70">{formattedTime}</div>
      </div>
    </div>
  );
} 
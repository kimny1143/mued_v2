import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { PaperclipIcon, Send } from 'lucide-react';
import { RichTextEditor } from '@/app/components/RichTextEditor';

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // メッセージ送信処理
  const handleSendMessage = () => {
    if (message.trim() || selectedFiles.length > 0) {
      onSendMessage(message, selectedFiles.length ? selectedFiles : undefined);
      setMessage('');
      setSelectedFiles([]);
    }
  };

  // エンターキーでメッセージ送信
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ファイル選択処理
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  // 選択したファイルの削除
  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-4">
      {/* 選択ファイル表示 */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center bg-gray-100 dark:bg-gray-800 rounded px-2 py-1"
            >
              <span className="text-xs truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* リッチテキストエディタ */}
      <RichTextEditor content={message} onChange={setMessage} />

      {/* ファイル選択・送信ボタン */}
      <div className="flex items-center gap-2 mt-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          multiple
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <PaperclipIcon className="h-4 w-4" />
        </Button>
        <Button
          className="ml-auto"
          onClick={handleSendMessage}
          disabled={isLoading || (!message.trim() && selectedFiles.length === 0)}
        >
          <Send className="h-4 w-4 mr-2" />
          送信
        </Button>
      </div>
    </Card>
  );
} 
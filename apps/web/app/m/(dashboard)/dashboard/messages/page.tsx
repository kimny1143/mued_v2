'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import React from "react";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";

import { ChatMessage, ChatInput } from "@/app/components/chat";
import { chatMessagesApi } from "@/lib/apiClient";
import { useChatMessages } from "@/lib/hooks/useSupabaseChannel";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import { Button } from "@ui/button";

// UUIDの代替関数（バンドルサイズ削減のため）
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // フォールバック: タイムスタンプベースのID
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ダミーの現在ユーザーID（本番では認証ユーザーから取得）
const CURRENT_USER_ID = "current-user-id";
// ダミールームID（本番では動的に取得）
const ROOM_ID = "default-room";
// 表示するメッセージの最大数 (パフォーマンス向上のため)
const MAX_VISIBLE_MESSAGES = 50;

// パフォーマンス向上のため、個別メッセージをメモ化したコンポーネントに分離
const MemoizedChatMessage = React.memo(
  ({ message, isOwnMessage }: { message: ChatMessageType; isOwnMessage: boolean }) => (
    <ChatMessage message={message} isOwnMessage={isOwnMessage} />
  ),
  (prev, next) => prev.message.id === next.message.id // IDが同じなら再レンダリングしない
);
MemoizedChatMessage.displayName = 'MemoizedChatMessage';

export default function MobileMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);
  const shouldScrollRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  
  // 重い処理を行わないようにするフラグ
  const isLowPerformanceMode = true; // パフォーマンス重視モード固定

  // パフォーマンス向上のため、表示するメッセージを制限
  const visibleMessages = useMemo(() => {
    if (messages.length <= MAX_VISIBLE_MESSAGES) return messages;
    return messages.slice(messages.length - MAX_VISIBLE_MESSAGES);
  }, [messages.length]); // messagesオブジェクト自体ではなく長さだけに依存

  // スクロール位置を監視して、自動スクロールするか決定
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 20;
  }, []);

  // メッセージ一覧の取得
  useEffect(() => {
    if (initialLoadRef.current || hasError) return;
    initialLoadRef.current = true;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await chatMessagesApi.getMessages(ROOM_ID);
        setMessages(response.messages);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setHasError(true);
        // ダミーメッセージを表示（YouTubeは単なるリンクとして表示）
        setMessages([
          {
            id: "1",
            content: "こんにちは！何かお手伝いできることはありますか？",
            sender_id: "instructor-1",
            sender_type: "instructor",
            room_id: ROOM_ID,
            timestamp: new Date().toISOString(),
          },
          {
            id: "2",
            content: 'こちらの動画も参考にしてみてください：<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">楽曲分析の基本</a>',
            sender_id: "instructor-1",
            sender_type: "instructor",
            room_id: ROOM_ID,
            timestamp: new Date().toISOString(),
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [hasError]);

  // 新しいメッセージを受信したときの処理を最適化
  const handleNewMessage = useCallback((newMessage: ChatMessageType) => {
    if (newMessage.sender_id !== CURRENT_USER_ID) {
      setMessages((prevMessages) => {
        const isDuplicate = prevMessages.some(msg => msg.id === newMessage.id);
        if (isDuplicate) return prevMessages;
        return [...prevMessages, newMessage];
      });
    }
  }, []);

  // Supabaseリアルタイムチャネルの購読
  useChatMessages<ChatMessageType>(ROOM_ID, handleNewMessage);

  // 新しいメッセージが追加されたら自動スクロール（条件付き）
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && shouldScrollRef.current) {
      // アニメーション無しで直接スクロール
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // スクロールイベントの設定
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // メッセージ送信処理
  const handleSendMessage = useCallback(async (content: string, files?: File[]) => {
    try {
      setIsLoading(true);
      shouldScrollRef.current = true;

      // メッセージをUIに表示（楽観的UI更新）
      const tempId = generateId();
      const newMessage: ChatMessageType = {
        id: tempId,
        content,
        sender_id: CURRENT_USER_ID,
        sender_type: "student",
        room_id: ROOM_ID,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, newMessage]);

      // APIが利用可能な場合のみAPIを呼び出す
      if (!hasError) {
        try {
          if (files && files.length > 0) {
            await chatMessagesApi.sendMessageWithFiles({
              content,
              room_id: ROOM_ID,
              files,
            });
          } else {
            await chatMessagesApi.sendMessage({
              content,
              room_id: ROOM_ID,
            });
          }
        } catch (error) {
          console.error("Failed to send message:", error);
          setHasError(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasError]);

  // モバイル専用のシンプルなメッセージ送信
  const handleSendSimpleMessage = useCallback(() => {
    if (!messageText.trim() || isLoading) return;
    
    handleSendMessage(messageText);
    setMessageText('');
  }, [messageText, isLoading, handleSendMessage]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">メッセージ</h1>
          <div className="w-8"></div>
        </div>
      </header>

      {/* Error Message */}
      {hasError && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mx-4 mt-4">
          <p className="text-xs text-amber-700">
            APIサーバーに接続できないため、デモモードで動作しています。
            メッセージはローカルのみに保存され、サーバーには送信されません。
          </p>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 flex flex-col min-h-0">
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {messages.length > MAX_VISIBLE_MESSAGES && (
            <div className="text-center text-xs text-gray-500 mb-2">
              過去のメッセージは省略されています ({messages.length - MAX_VISIBLE_MESSAGES}件)
            </div>
          )}
          
          {visibleMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === CURRENT_USER_ID ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[280px] rounded-lg px-3 py-2 ${
                  msg.sender_id === CURRENT_USER_ID
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border'
                }`}
              >
                <div 
                  className="text-sm break-words"
                  dangerouslySetInnerHTML={{ __html: msg.content }}
                />
                <div className={`text-xs mt-1 ${
                  msg.sender_id === CURRENT_USER_ID ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t px-4 py-3 safe-area-inset-bottom">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendSimpleMessage();
                  }
                }}
                placeholder="メッセージを入力..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
              >
                <Paperclip className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
            <Button
              onClick={handleSendSimpleMessage}
              disabled={!messageText.trim() || isLoading}
              size="sm"
              className="rounded-full h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
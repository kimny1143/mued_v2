'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChatMessage, ChatInput } from "@/app/components/chat";
import { chatMessagesApi } from "@/lib/apiClient";
import { useChatMessages } from "@/lib/hooks/useSupabaseChannel";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@ui/use-toast";
import React from "react";

// ダミーの現在ユーザーID（本番では認証ユーザーから取得）
const CURRENT_USER_ID = "current-user-id";
// ダミールームID（本番では動的に取得）
const ROOM_ID = "default-room";
// 表示するメッセージの最大数 (パフォーマンス向上のため)
const MAX_VISIBLE_MESSAGES = 20;

// パフォーマンス向上のため、個別メッセージをメモ化したコンポーネントに分離
const MemoizedChatMessage = React.memo(
  ({ message, isOwnMessage }: { message: ChatMessageType; isOwnMessage: boolean }) => (
    <ChatMessage message={message} isOwnMessage={isOwnMessage} />
  ),
  (prev, next) => prev.message.id === next.message.id // IDが同じなら再レンダリングしない
);

// メッセージ入力も再レンダリングを最小化
const MemoizedChatInput = React.memo(ChatInput);

export default function Page() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
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
        toast({
          title: "メッセージの読み込みに失敗しました",
          variant: "destructive",
        });
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
  }, [toast, hasError]);

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
      const tempId = uuidv4();
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
          toast({
            title: "メッセージの送信に失敗しました（デモモードで動作中）",
            variant: "destructive",
          });
          setHasError(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasError, toast]);

  // デバイスの性能に応じてパフォーマンス設定を調整
  useEffect(() => {
    console.log(`メッセージページ: 低パフォーマンスモード=${isLowPerformanceMode}`);
  }, []);

  return (
    <>
      {hasError && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                APIサーバーに接続できないため、デモモードで動作しています。
                メッセージはローカルのみに保存され、サーバーには送信されません。
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col h-[calc(100vh-14rem)]">
        {/* メッセージ一覧 */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto mb-6 space-y-4 p-4"
        >
          {messages.length > MAX_VISIBLE_MESSAGES && (
            <div className="text-center text-sm text-gray-500 mb-4">
              過去のメッセージは省略されています ({messages.length - MAX_VISIBLE_MESSAGES}件)
            </div>
          )}
          
          {visibleMessages.map((msg) => (
            <MemoizedChatMessage
              key={msg.id}
              message={msg}
              isOwnMessage={msg.sender_id === CURRENT_USER_ID}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* メッセージ入力 */}
        <MemoizedChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}
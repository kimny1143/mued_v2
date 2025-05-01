import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { ChatMessage, ChatInput } from "../../components/Chat";
import { chatMessagesApi } from "../../lib/apiClient";
import { useChatMessages } from "../../lib/hooks/useSupabaseChannel";
import { ChatMessage as ChatMessageType } from "../../lib/types";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "../../components/ui/use-toast";

// ダミーの現在ユーザーID（本番では認証ユーザーから取得）
const CURRENT_USER_ID = "current-user-id";
// ダミールームID（本番では動的に取得）
const ROOM_ID = "default-room";

export function MessagesPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // メッセージ一覧の取得
  useEffect(() => {
    // エラーが既に発生している場合は再リクエストしない
    if (hasError) return;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await chatMessagesApi.getMessages(ROOM_ID);
        setMessages(response.messages);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setHasError(true); // エラーフラグをセット
        toast({
          title: "メッセージの読み込みに失敗しました",
          variant: "destructive",
        });
        // ダミーメッセージを表示
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
            content: '<div data-youtube-video><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen="true" class="w-full aspect-video"></iframe></div>',
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

  // Supabaseリアルタイムチャネルの購読
  useChatMessages<ChatMessageType>(ROOM_ID, (newMessage) => {
    // メッセージが自分のものでない場合のみ追加（送信時には既に追加済み）
    if (newMessage.sender_id !== CURRENT_USER_ID) {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    }
  });

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // メッセージ送信処理
  const handleSendMessage = async (content: string, files?: File[]) => {
    try {
      setIsLoading(true);

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
      
      setMessages((prevMessages) => [...prevMessages, newMessage]);

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
          // エラーが発生しても、UIには既にメッセージが表示されているので
          // ユーザー体験を損なわない
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Messages">
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
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 p-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isOwnMessage={msg.sender_id === CURRENT_USER_ID}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* メッセージ入力 */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </DashboardLayout>
  );
}
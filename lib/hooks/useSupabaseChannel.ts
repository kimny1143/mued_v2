'use client';

import { useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface UseSupabaseChannelOptions<T extends Record<string, any>> {
  schema?: string;
  table: string;
  event?: PostgresChangeEvent;
  filter?: string;
  onEvent?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/**
 * Supabaseのリアルタイムチャネルを購読するためのカスタムフック
 * パフォーマンス最適化版
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSupabaseChannel<T extends Record<string, any>>(
  channelName: string,
  options: UseSupabaseChannelOptions<T>
) {
  // useRefを使用して最小限の再レンダリングでデータを保持
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);
  const optionsRef = useRef(options);

  // 最新のオプションを常に参照できるように
  optionsRef.current = options;

  useEffect(() => {
    const { schema = 'public', table, event = '*', filter } = options;

    // チャネルを作成
    const newChannel = supabaseBrowser.channel(channelName);

    // PostgreSQL変更をサブスクライブ
    // @ts-expect-error - Supabaseの型定義が不完全なためここでは無視
    newChannel
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          // 常に最新のコールバックを使用
          if (optionsRef.current.onEvent) {
            optionsRef.current.onEvent(payload);
          }
        }
      )
      .subscribe((status) => {
        isConnectedRef.current = status === 'SUBSCRIBED';
      });

    channelRef.current = newChannel;

    // クリーンアップ
    return () => {
      newChannel.unsubscribe();
      isConnectedRef.current = false;
      channelRef.current = null;
    };
  }, [channelName]); // オプションへの依存を削除

  // 状態を返さずにrefを直接返す
  return {
    get channel() { return channelRef.current; },
    get isConnected() { return isConnectedRef.current; }
  };
}

/**
 * チャットメッセージのリアルタイム更新を監視するためのカスタムフック
 * パフォーマンス最適化版
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useChatMessages<T extends Record<string, any>>(
  roomId: string,
  onNewMessage: (message: T) => void
) {
  // デバウンスされたコールバックのために前回のメッセージIDを追跡
  const lastMessageIdRef = useRef<string | null>(null);
  
  // 高頻度の更新を防ぐためのデバウンス処理付きコールバック
  const debouncedCallback = (payload: RealtimePostgresChangesPayload<T>) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const newMessage = payload.new as T;
      // @ts-expect-error - メッセージにはidがあることを前提
      const messageId = newMessage.id;
      
      // 同じメッセージの重複処理を防止
      if (messageId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = messageId;
        onNewMessage(newMessage);
      }
    }
  };

  return useSupabaseChannel<T>(`chat-room-${roomId}`, {
    table: 'messages',
    event: 'INSERT',
    filter: `room_id=eq.${roomId}`,
    onEvent: debouncedCallback
  });
} 
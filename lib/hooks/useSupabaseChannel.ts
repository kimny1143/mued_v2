import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSupabaseChannel<T extends Record<string, any>>(
  channelName: string,
  options: UseSupabaseChannelOptions<T>
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const { schema = 'public', table, event = '*', filter, onEvent } = options;

    // チャネルを作成
    const newChannel = supabase.channel(channelName);

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
          if (onEvent) {
            onEvent(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    setChannel(newChannel);

    // クリーンアップ
    return () => {
      newChannel.unsubscribe();
      setIsConnected(false);
    };
  }, [channelName, options]);

  return { channel, isConnected };
}

/**
 * チャットメッセージのリアルタイム更新を監視するためのカスタムフック
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useChatMessages<T extends Record<string, any>>(
  roomId: string,
  onNewMessage: (message: T) => void
) {
  return useSupabaseChannel<T>(`chat-room-${roomId}`, {
    table: 'messages',
    event: 'INSERT',
    filter: `room_id=eq.${roomId}`,
    onEvent: (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        onNewMessage(payload.new as T);
      }
    },
  });
} 
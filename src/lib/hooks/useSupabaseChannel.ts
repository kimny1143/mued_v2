import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

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
      .on(
        'system',
        (payload) => {
          console.log('System event:', payload);
          if (payload.event === 'connected') {
            setIsConnected(true);
          }
        }
      )
      .subscribe();

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
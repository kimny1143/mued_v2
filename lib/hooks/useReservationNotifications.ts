'use client';

import { useCallback } from 'react';
import { useSupabaseChannel } from './useSupabaseChannel';
import { useToast } from '@ui/use-toast';
import { useUser } from './use-user';
import { ReservationStatus } from '@prisma/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface ReservationNotification {
  id: string;
  status: ReservationStatus;
  studentId: string;
  mentorId: string;
  lessonSlot: {
    users: {
      name: string;
    };
  };
  bookedStartTime: string;
  bookedEndTime: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface UseReservationNotificationsOptions {
  enabled?: boolean;
  onStatusChange?: (reservation: ReservationNotification) => void;
}

/**
 * 予約承認フローのリアルタイム通知を管理するカスタムフック
 * 
 * 機能:
 * - メンター承認/拒否の通知
 * - 決済完了の通知
 * - 予約状態変更の通知
 * - ユーザーロール別の通知フィルタリング
 */
export function useReservationNotifications(options: UseReservationNotificationsOptions = {}) {
  const { enabled = true, onStatusChange } = options;
  const { toast } = useToast();
  const { user } = useUser();

  // 予約状態変更時のコールバック
  const handleReservationUpdate = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    if (!payload.new || !user) return;

    const reservation = payload.new as Record<string, unknown>;
    const oldReservation = payload.old as Record<string, unknown>;

    // 状態が変更されていない場合は処理しない
    if (oldReservation?.status === reservation.status) return;

    // ユーザーに関連する予約のみ処理
    const isStudentReservation = reservation.studentId === user.id;
    const isMentorReservation = reservation.mentorId === user.id;
    
    if (!isStudentReservation && !isMentorReservation) return;

    // 状態別の通知処理
    switch (reservation.status) {
      case 'APPROVED':
        if (isStudentReservation) {
          toast({
            title: '予約が承認されました！',
            description: 'メンターが予約を承認しました。決済手続きを完了してください。',
            variant: 'default',
          });
        }
        break;

      case 'REJECTED':
        if (isStudentReservation) {
          const reason = (reservation.rejectionReason as string) || '理由が指定されていません';
          toast({
            title: '予約が拒否されました',
            description: `理由: ${reason}`,
            variant: 'destructive',
          });
        }
        break;

      case 'CONFIRMED':
        if (isStudentReservation) {
          toast({
            title: '決済が完了しました！',
            description: 'レッスン予約が確定しました。',
            variant: 'default',
          });
        } else if (isMentorReservation) {
          toast({
            title: '新しい予約が確定しました',
            description: '生徒の決済が完了し、レッスン予約が確定しました。',
            variant: 'default',
          });
        }
        break;

      case 'PENDING_APPROVAL':
        if (isMentorReservation) {
          const startTime = reservation.bookedStartTime 
            ? new Date(reservation.bookedStartTime as string).toLocaleString('ja-JP', {
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '時間未定';
          toast({
            title: '新しい予約リクエスト',
            description: `${startTime}のレッスンに予約リクエストが届きました。`,
            variant: 'default',
          });
        }
        break;

      default:
        console.log('未処理の予約状態:', reservation.status);
    }

    // カスタムコールバックを実行
    if (onStatusChange) {
      onStatusChange(reservation as unknown as ReservationNotification);
    }
  }, [user, toast, onStatusChange]);

  // Supabaseリアルタイムチャネルの設定
  useSupabaseChannel('reservation-notifications', {
    table: 'reservations',
    event: 'UPDATE',
    filter: user ? `or(student_id.eq.${user.id},lesson_slots.teacher_id.eq.${user.id})` : undefined,
    onEvent: enabled ? handleReservationUpdate : undefined,
  });

  // 決済完了通知用の別チャネル
  useSupabaseChannel('payment-notifications', {
    table: 'payments',
    event: 'UPDATE',
    filter: user ? `user_id.eq.${user.id}` : undefined,
    onEvent: enabled ? (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const newPayment = payload.new as Record<string, unknown>;
      const oldPayment = payload.old as Record<string, unknown>;
      if (newPayment?.status === 'SUCCEEDED' && oldPayment?.status !== 'SUCCEEDED') {
        toast({
          title: '決済が完了しました',
          description: '予約が確定されました。詳細はダッシュボードでご確認ください。',
          variant: 'default',
        });
      }
    } : undefined,
  });

  return {
    // 通知システムの状態を返す（必要に応じて拡張）
    isEnabled: enabled && !!user,
  };
}

/**
 * メンター専用の承認待ち予約通知フック
 */
export function useMentorApprovalNotifications() {
  const { user } = useUser();
  const { toast } = useToast();

  return useReservationNotifications({
    enabled: user?.roleId === 'mentor',
    onStatusChange: (reservation) => {
      if (reservation.status === 'PENDING_APPROVAL' && reservation.mentorId === user?.id) {
        // メンター承認ページへのリンク付き通知
        toast({
          title: '新しい予約リクエスト',
          description: '承認が必要な予約があります。',
        });
        // 別途ナビゲーション処理
        setTimeout(() => {
          if (confirm('承認ページに移動しますか？')) {
            window.location.href = '/dashboard/mentor-approvals';
          }
        }, 1000);
      }
    },
  });
}

/**
 * 生徒専用の予約状態通知フック
 */
export function useStudentReservationNotifications() {
  const { user } = useUser();

  return useReservationNotifications({
    enabled: user?.roleId === 'student',
    onStatusChange: (reservation) => {
      if (reservation.status === 'APPROVED' && reservation.studentId === user?.id) {
        // 決済ページへのリダイレクト案内
        setTimeout(() => {
          if (confirm('予約が承認されました。決済手続きを開始しますか？')) {
            window.location.href = `/dashboard/booking-calendar?payment_pending=${reservation.id}`;
          }
        }, 2000);
      }
    },
  });
} 
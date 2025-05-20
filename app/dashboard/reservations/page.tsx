'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useReservations, Reservation, LessonSlot } from '@/lib/hooks/queries/useReservations';
import { ReservationCard } from './_components/ReservationCard';
import { LessonSlotCard } from './_components/LessonSlotCard';
import { ReservationSkeleton } from './_components/ReservationSkeleton';

export default function ReservationsPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [processingSlotId, setProcessingSlotId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // React Queryを使用して予約データを取得
  const reservationsOptions = useMemo(() => ({ includeAll: true }), []);

  const { 
    data: reservationsData,
    isLoading: isLoadingReservations,
    error: reservationsError
  } = useReservations(reservationsOptions);

  // React Queryを使用してレッスンスロットを取得
  const { 
    data: slotsData,
    isLoading: isLoadingSlots,
    error: slotsError
  } = useQuery<LessonSlot[]>({
    queryKey: ['lessonSlots'],
    queryFn: async () => {
      const response = await fetch('/api/lesson-slots');
      if (!response.ok) {
        throw new Error('レッスンスロットの取得に失敗しました');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュを新鮮と見なす
  });

  // 予約キャンセルのミューテーション
  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('予約のキャンセルに失敗しました');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('予約をキャンセルしました');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // 予約作成のミューテーション
  const createReservationMutation = useMutation({
    mutationFn: async (slotId: string) => {
      // Supabase セッションからアクセストークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ slotId }),
      });
      if (!response.ok) {
        throw new Error('予約の作成に失敗しました');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const redirectUrl = data.checkoutUrl || data.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        queryClient.invalidateQueries({ queryKey: ['reservations', 'lessonSlots'] });
        toast.success('予約が完了しました');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // エラー処理
  useEffect(() => {
    if (reservationsError) {
      setError(reservationsError.message);
    }
    if (slotsError) {
      setError(slotsError.message);
    }
  }, [reservationsError, slotsError]);

  // 予約キャンセルハンドラー
  const handleCancelReservation = async (reservationId: string) => {
    try {
      await cancelReservationMutation.mutateAsync(reservationId);
    } catch (error) {
      console.error('予約キャンセルエラー:', error);
    }
  };

  // レッスン予約ハンドラー
  const handleReserveLesson = async (slotId: string) => {
    if (processingSlotId) return;        // 連打防止
    setProcessingSlotId(slotId);         // どのボタンが進行中か記録
    try {
      await createReservationMutation.mutateAsync(slotId);
    } finally {
      setProcessingSlotId(null);         // 完了したらリセット
    }
  };

  // ローディング中はSkeletonを表示
  if (isLoadingReservations || isLoadingSlots) {
    return <ReservationSkeleton />;
  }

  // エラー表示
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
        <Button
          variant="outline"
          onClick={() => router.refresh()}
          className="mt-4"
        >
          再読み込み
        </Button>
      </div>
    );
  }

  // データが完全に取得済みで、どちらも 0 件の場合のみ空メッセージ
  if (
    reservationsData &&
    slotsData &&
    reservationsData.length === 0 &&
    slotsData.length === 0
  ) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">予約可能なレッスン枠がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Toaster />
      
      {/* 予約済みレッスン */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">予約済みレッスン</h2>
        {reservationsData && reservationsData.length > 0 ? (
          <div className="grid gap-4">
            {reservationsData.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onCancel={handleCancelReservation}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">予約済みのレッスンはありません</p>
        )}
      </div>

      {/* 予約可能なレッスン */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">予約可能なレッスン</h2>
        {slotsData && slotsData.length > 0 ? (
          <div className="grid gap-4">
            {slotsData.map((slot: LessonSlot) => (
              <LessonSlotCard
                key={slot.id}
                slot={slot}
                onReserve={handleReserveLesson}
                isProcessing={processingSlotId === slot.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">予約可能なレッスン枠はありません</p>
        )}
      </div>
    </div>
  );
} 
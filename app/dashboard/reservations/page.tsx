'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  CheckCircleIcon, 
  XIcon,
  FilterIcon,
  PlusCircleIcon,
  Loader2Icon
} from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { User } from '@supabase/supabase-js';
import useSWR from 'swr';
import { useSupabaseChannel } from '@/lib/hooks/useSupabaseChannel';

// 予約データの型定義
interface Reservation {
  id: string;
  slotId: string;
  studentId: string;
  status: 'CONFIRMED' | 'COMPLETED';
  paymentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  slot: {
    id: string;
    startTime: string;
    endTime: string;
    teacherId: string;
    isAvailable: boolean;
    teacher?: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  };
  student: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

// レッスンスロットの型定義
interface LessonSlot {
  id: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  isAvailable: boolean;
  price?: number;
  currency?: string;
  mentorName?: string;
  teacher?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  reservations?: Reservation[];
}

// Loading Skeletonコンポーネント
const ReservationSkeleton = () => (
  <div className="space-y-4">
    <div className="h-8 bg-gray-200 rounded animate-pulse" />
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  </div>
);

// データ取得用のfetcher関数
const fetcher = async (url: string) => {
  // Supabaseのアクセストークンを取得
  const { data: sessionData } = await supabaseBrowser.auth.getSession();
  const token = sessionData?.session?.access_token;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('データの取得に失敗しました');
  }
  return response.json();
};

export default function ReservationsPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // useSWRを使用してデータを取得
  const { data: reservationsData, error: reservationsError, isLoading: isLoadingReservations, mutate: mutateReservations } = useSWR<Reservation[]>(
    '/api/reservations',
    fetcher,
    {
      revalidateOnFocus: false,
      errorRetryCount: 0,
      dedupingInterval: 5000,
    }
  );

  const { data: slotsData, error: slotsError, isLoading: isLoadingSlots, mutate: mutateSlots } = useSWR<LessonSlot[]>(
    '/api/lesson-slots',
    fetcher,
    {
      revalidateOnFocus: false,
      errorRetryCount: 0,
      dedupingInterval: 5000,
    }
  );

  // 予約データのリアルタイム更新
  useSupabaseChannel<Reservation>('reservations', {
    table: 'reservations',
    event: '*',
    onEvent: (payload) => {
      console.log('予約データが更新されました:', payload);
      mutateReservations();
    }
  });

  // レッスンスロットのリアルタイム更新
  useSupabaseChannel<LessonSlot>('lesson-slots', {
    table: 'lesson_slots',
    event: '*',
    onEvent: (payload) => {
      console.log('レッスンスロットが更新されました:', payload);
      mutateSlots();
    }
  });

  // エラー状態の管理
  useEffect(() => {
    if (reservationsError || slotsError) {
      setError('データの取得に失敗しました。時間をおいて再読み込みしてください。');
    }
  }, [reservationsError, slotsError]);

  // 予約処理
  const handleBooking = async (slotId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slotId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '予約処理中にエラーが発生しました');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.success('レッスンの予約が完了しました！');
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予約処理中にエラーが発生しました';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
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

  // データがない場合
  if (!reservationsData?.length && !slotsData?.length) {
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
      {reservationsData && reservationsData.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">予約済みレッスン</h2>
          <div className="grid gap-4">
            {reservationsData.map((reservation: Reservation) => (
              <Card key={reservation.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {reservation.slot.teacher?.name || '講師情報なし'}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(reservation.slot.startTime), 'yyyy年M月d日', { locale: ja })}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ClockIcon className="h-3 w-3" />
                      {format(new Date(reservation.slot.startTime), 'HH:mm', { locale: ja })} - 
                      {format(new Date(reservation.slot.endTime), 'HH:mm', { locale: ja })}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {reservation.status === 'CONFIRMED' ? '予約済み' : '完了'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 予約可能なレッスン */}
      {slotsData && slotsData.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">予約可能なレッスン</h2>
          <div className="grid gap-4">
            {slotsData.map((slot: LessonSlot) => (
              <Card key={slot.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {slot.teacher?.name || slot.mentorName || '講師情報なし'}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(slot.startTime), 'yyyy年M月d日', { locale: ja })}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ClockIcon className="h-3 w-3" />
                      {format(new Date(slot.startTime), 'HH:mm', { locale: ja })} - 
                      {format(new Date(slot.endTime), 'HH:mm', { locale: ja })}
                    </div>
                    <div className="text-sm mt-1">
                      {slot.price ? `¥${slot.price.toLocaleString()}` : '¥5,000'}
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      予約可能
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleBooking(slot.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        処理中...
                      </>
                    ) : (
                      '予約する'
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
// app/dashboard/reservations/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import { format } from 'date-fns';
//import { ja } from 'date-fns/locale';
//import { Clock, ChevronRight } from 'lucide-react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { ReservationModal, TimeSlot } from '@/app/dashboard/reservations/_components/ReservationModal';
import { LessonSlotCard } from '@/app/dashboard/reservations/_components/LessonSlotCard';
import { LessonSlot, convertToLessonSlotType } from '@/app/dashboard/reservations/_components/ReservationTable';
import { StudentPaymentPendingCard } from '@/app/dashboard/reservations/_components/StudentPaymentPendingCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { Toaster } from 'sonner';
import type { ReservationStatus } from '@prisma/client';
import { generateAvailableTimeSlots } from '@/lib/utils';
import { CancelReason } from '@/lib/types/reservation';

// シンプルで明確な型定義
type TeacherInfo = {
  id: string;
  name: string;
  image: string | null;
}

type LessonSlotData = {
  id: string;
  startTime: string;
  endTime: string;
  teacher: TeacherInfo;
}

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
} | null;

type Reservation = {
  id: string;
  status: ReservationStatus;
  lessonSlot: LessonSlotData;
  bookedStartTime: string;
  bookedEndTime: string;
  payment: Payment;
  createdAt: string;
  updatedAt: string;
}

// リクエストデータの型定義
interface ReservationRequestData {
  slotId: string;
  hoursBooked: number;
  bookedStartTime?: string;
  bookedEndTime?: string;
}

// 通貨フォーマット関数（コンポーネントの外でも問題ない純関数）
function formatCurrency(amount: number, currency = 'usd'): string {
  if (!amount) return '0';
  
  // 日本円の場合は分割しない、その他の通貨は100で割る
  const actualAmount = currency.toLowerCase() === 'jpy' ? amount : amount / 100;
  
  // 通貨シンボルの設定
  const currencySymbols: Record<string, string> = {
    usd: '$',
    jpy: '¥',
    eur: '€',
    gbp: '£',
  };
  
  const symbol = currencySymbols[currency.toLowerCase()] || currency.toUpperCase();
  
  // 通貨記号と金額を結合して返す
  return `${symbol}${actualAmount.toLocaleString()}`;
}

export const ReservationPage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedSlot, setSelectedSlot] = useState<LessonSlot | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isSmallScreen = useMediaQuery({ maxWidth: 1024 });
  
  // 予約一覧を保持する単純なステート
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);

  // 決済を開始する関数
  const startPayment = useCallback(async (reservationId: string) => {
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/reservations/${reservationId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '決済の開始に失敗しました');
      }

      const result = await response.json();
      
      if (result.checkoutUrl) {
        // Stripeのチェックアウトページにリダイレクト
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('決済URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('決済開始エラー:', error);
      throw error;
    }
  }, []);

  // APIからレッスンスロットを取得する関数
  const fetchLessonSlots = useCallback(async () => {
    try {
      setError(null);

      // Supabaseのアクセストークンを取得（Authorizationヘッダー用）
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      // APIの必須クエリパラメータ（期間指定）を生成
      const fromDate = new Date();
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 30); // デフォルトで30日先まで取得

      const queryString = new URLSearchParams({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      }).toString();

      console.log('API通信開始 - 認証トークン:', token ? 'あり' : 'なし');
      
      // APIからレッスンスロット一覧を取得
      const response = await fetch(`/api/lesson-slots?${queryString}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorResponse = await response.json();
        console.error('APIエラーレスポンス:', errorResponse);
        
        throw new Error(
          errorResponse.error || 
          `API通信エラー: ${response.status} ${response.statusText}`
        );
      }
      
      const data: LessonSlot[] = await response.json();
      
      console.log(`取得したレッスンスロット: ${data.length}件`);
      
      // スロットの可用性をチェック - すでに予約があるものは除外
      const availableSlots = data.filter(slot => {
        // isAvailableフラグがfalseなら確実に予約不可
        if (!slot.isAvailable) return false;
        
        // 予約がある場合は、状態によって判断
        if (slot.reservations && slot.reservations.length > 0) {
          // すでに確定済みの予約がある場合は予約不可
          if (slot.reservations.some(res => res.status === 'CONFIRMED')) {
            return false;
          }
        }
        
        return true;
      });
      
      // 日付でグループ化する前に、スロットを日付でソート
      const sortedSlots = availableSlots.sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
      
      // 表示用にスロットを日付ごとにグループ化
      return sortedSlots.reduce((groups: Record<string, LessonSlot[]>, slot) => {
        const date = new Date(slot.startTime).toLocaleDateString('ja-JP', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          weekday: 'long'
        });
        
        if (!groups[date]) {
          groups[date] = [];
        }
        
        groups[date].push(slot);
        return groups;
      }, {});
    } catch (error) {
      console.error('レッスンスロット取得エラー:', error);
      setError(error as Error);
      return {};
    }
  }, []);

  // 予約を作成する関数
  const createReservation = useCallback(async (data: {
    slotId: string;
    hoursBooked?: number;
    timeSlot?: TimeSlot | null;
  }) => {
    if (!user) {
      setError(new Error('ログインが必要です。'));
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // 選択された時間帯がある場合は、その時間を使用
      const requestData: ReservationRequestData = {
        slotId: data.slotId,
        hoursBooked: data.hoursBooked || 1,
      };
      
      // 選択された時間帯があれば追加
      if (data.timeSlot) {
        requestData.bookedStartTime = data.timeSlot.startTime.toISOString();
        requestData.bookedEndTime = data.timeSlot.endTime.toISOString();
        
        // デバッグ情報を追加
        console.log('=== 予約データ送信デバッグ ===');
        console.log('選択されたTimeSlot:', data.timeSlot);
        console.log('startTime (Date):', data.timeSlot.startTime);
        console.log('startTime (ISO):', data.timeSlot.startTime.toISOString());
        console.log('endTime (Date):', data.timeSlot.endTime);
        console.log('endTime (ISO):', data.timeSlot.endTime.toISOString());
        console.log('送信予定データ:', requestData);
      }
      
      // トークンを取得してヘッダーに含める
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      // APIを呼び出して予約を作成
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });

      const result = await response.json();

      // エラーレスポンスの場合
      if (!response.ok) {
        console.error('予約APIエラー:', result);
        throw new Error(result.error || '予約の作成に失敗しました');
      }

      console.log('予約作成成功:', result);
      
      // 新しいフロー: 予約申請完了メッセージを表示
      toast.success('予約申請を送信しました！メンターの承認をお待ちください。');
      setIsModalOpen(false);
      
      // レッスンスロット一覧を再読み込み
      queryClient.invalidateQueries({ queryKey: ['lessonSlots'] });
      
      // 予約一覧も更新
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
    } catch (error) {
      console.error('予約処理エラー:', error);
      toast.error(`予約に失敗しました: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [user, queryClient]);

  // 予約の作成をmutationとして定義
  const reserveMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      // 成功時の処理は不要（createReservation内でリダイレクト）
    },
    onError: (error) => {
      toast.error(`予約処理エラー: ${error.message}`);
    }
  });

  // 予約キャンセル関数
  const cancelReservation = useCallback(async (reservationId: string, reason: CancelReason, notes?: string) => {
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, notes }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'キャンセル処理に失敗しました');
      }

      toast.success('レッスンをキャンセルしました');
      
      // 予約一覧を再読み込み
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      
      // レッスンスロット一覧も更新
      queryClient.invalidateQueries({ queryKey: ['lessonSlots'] });
      
      return result;
    } catch (error) {
      console.error('キャンセル処理エラー:', error);
      toast.error(`キャンセルに失敗しました: ${(error as Error).message}`);
      throw error;
    }
  }, [queryClient]);

  // ユーザー情報の取得
  useEffect(() => {
    const getUser = async () => {
      try {
        // Supabaseからセッションを取得
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        
        if (session) {
          setUser(session.user);
          setAccessToken(session.access_token);
          
          // ログイン中のユーザーの予約一覧を取得
          try {
            const response = await fetch('/api/my-reservations', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              setMyReservations(data);
            }
          } catch (reservationError) {
            console.error('予約一覧取得エラー:', reservationError);
          }
        }
      } catch (error) {
        console.error('認証エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [router]);
  
  // React Queryを使ってレッスンスロットを取得
  const { data: lessonSlots = {}, isLoading: isLoadingSlots, error: queryError } = useQuery({
    queryKey: ['lessonSlots'],
    queryFn: fetchLessonSlots,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュを有効にする
  });
  
  // 認証状態チェック
  if (loading) {
    return <div className="flex justify-center items-center h-64">読み込み中...</div>;
  }

  // レッスンスロットを選択し、予約モーダルを開く
  const handleBooking = (slot: LessonSlot, hoursBooked?: number, timeSlot?: TimeSlot) => {
    // スロットをDateに変換
    const updatedSlot = {
      ...slot,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      hoursBooked: hoursBooked || slot.hoursBooked || 1
    };
    
    setSelectedSlot(updatedSlot);
    
    // 利用可能な時間帯を生成
    if (!timeSlot) {
      // 時間枠を自動生成
      const slotForUtil = convertToLessonSlotType(updatedSlot);
      const availableSlots = generateAvailableTimeSlots(slotForUtil);
      setAvailableTimeSlots(availableSlots);
      
      // 最初の時間帯を選択
      if (availableSlots.length > 0) {
        setSelectedTimeSlot(availableSlots[0]);
      } else {
        setSelectedTimeSlot(null);
      }
    } else {
      // すでに選択されている時間枠がある場合
      setSelectedTimeSlot(timeSlot);
      setAvailableTimeSlots([timeSlot]);
    }
    
    setIsModalOpen(true);
  };
  
  // 時間帯が選択されたときのハンドラー
  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };
  
  // 予約確定ボタンが押されたときの処理
  const handleConfirmBooking = async () => {
    if (selectedSlot && selectedTimeSlot) {
      // 選択された時間帯と枠数を使って予約APIを呼び出す
      await reserveMutation.mutateAsync({
        slotId: selectedSlot.id,
        hoursBooked: selectedTimeSlot.hours,
        timeSlot: selectedTimeSlot
      });
    }
  };

  if (isLoadingSlots) {
    return <div className="flex justify-center items-center h-64">読み込み中...</div>;
  }

  if (queryError) {
    console.error("API エラー詳細:", queryError);
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-500">{(queryError as Error).message}</p>
        <p className="text-sm text-red-400">ブラウザコンソールで詳細エラーを確認してください</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['lessonSlots'] })} className="mt-2">
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">レッスン予約</h1>
        <p className="mt-2 text-gray-600">
          予約可能なレッスン枠から、ご希望の日時を選択してください。
        </p>
      </header>

      {/* デスクトップ表示 */}
      <div className="hidden lg:block">
        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日時
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  講師
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  料金
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">予約</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(lessonSlots).map(([date, slots]) => (
                <React.Fragment key={date}>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-sm font-semibold bg-gray-50">
                      {date}
                    </td>
                  </tr>
                  {slots.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {format(new Date(lesson.startTime), 'HH:mm')} - {format(new Date(lesson.endTime), 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lesson.teacher?.name || lesson.mentorName || '講師未登録'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            lesson.isAvailable
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {lesson.isAvailable ? '予約可能' : '予約済み'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(lesson.hourlyRate || 5000, lesson.currency || 'jpy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleBooking(lesson)}
                          disabled={!lesson.isAvailable || !user}
                        >
                          {user ? '予約する' : 'ログインして予約'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {Object.keys(lessonSlots).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    現在予約可能なレッスンはありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* モバイル表示 */}
      <div className="lg:hidden space-y-4">
        {Object.entries(lessonSlots).map(([date, slots]) => (
          <div key={date}>
            <h3 className="font-semibold mb-2 text-sm bg-gray-50 p-2 rounded">
              {date}
            </h3>
            <div className="space-y-3">
              {slots.map((lesson) => (
                <LessonSlotCard 
                  key={lesson.id}
                  slot={{
                    ...lesson,
                    startTime: new Date(lesson.startTime),
                    endTime: new Date(lesson.endTime),
                  }}
                  onReserve={(slotId, hoursBooked, timeSlot) => 
                    handleBooking({...lesson, id: slotId}, hoursBooked, timeSlot)
                  }
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          </div>
        ))}
        {Object.keys(lessonSlots).length === 0 && (
          <div className="text-center p-4 text-gray-500 bg-gray-50 rounded">
            現在予約可能なレッスンはありません
          </div>
        )}
      </div>

      {/* Reservation Modal - 利用可能な時間帯情報を渡す */}
      {user && selectedSlot && (
        <ReservationModal
          slot={selectedSlot}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmBooking}
          isLoading={isProcessing}
          selectedTimeSlot={selectedTimeSlot}
          availableTimeSlots={availableTimeSlots}
          onTimeSlotSelect={handleTimeSlotSelect}
        />
      )}

      {/* 予約済み一覧 */}
      {user && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">あなたの予約一覧</h2>
          {myReservations.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">まだ予約はありません</p>
              <p className="text-sm text-gray-400 mt-1">上記から予約を申請してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myReservations.map((reservation) => {
                // 予約データを新しいコンポーネント用の形式に変換
                const transformedReservation = {
                  id: reservation.id,
                  status: reservation.status,
                  bookedStartTime: reservation.bookedStartTime,
                  bookedEndTime: reservation.bookedEndTime,
                  totalAmount: reservation.payment?.amount || 0,
                  notes: null, // 既存データにnotesがない場合
                  durationMinutes: null, // 既存データにdurationMinutesがない場合
                  createdAt: reservation.createdAt,
                  approvedAt: null, // 既存データにapprovedAtがない場合
                  teacher: {
                    id: reservation.lessonSlot.teacher.id,
                    name: reservation.lessonSlot.teacher.name,
                    email: null // 既存データにemailがない場合
                  }
                };

                return (
                  <StudentPaymentPendingCard
                    key={reservation.id}
                    reservation={transformedReservation}
                    onStartPayment={startPayment}
                    isLoading={isProcessing}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      <Toaster position="bottom-center" />
    </div>
  );
};

export default function ReservationPageWrapper() {
  return <ReservationPage />;
} 
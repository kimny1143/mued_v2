// app/dashboard/reservations/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import type { ReservationStatus } from '@prisma/client';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

import { StudentPaymentPendingCard } from '@/app/dashboard/reservations/_components/StudentPaymentPendingCard';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { CancelReason } from '@/lib/types/reservation';
import { Button } from '@ui/button';

// 予約データの型定義
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

const ReservationPage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'mentor' | 'admin'>('student');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
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

      // 🚨 古いAPIルートは廃止されました - Setup Intentフローを使用
      const response = await fetch(`/api/reservations/${reservationId}/setup-payment`, {
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
          
          // ユーザーロールを取得
          try {
            const roleResponse = await fetch('/api/user', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            
            if (roleResponse.ok) {
              const userData = await roleResponse.json();
              setUserRole(userData.role || 'student');
            }
          } catch (roleError) {
            console.error('ユーザーロール取得エラー:', roleError);
            setUserRole('student'); // デフォルトは生徒
          }
          
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
  
  // 認証状態チェック
  if (loading) {
    return <div className="flex justify-center items-center h-64">読み込み中...</div>;
  }

  return (
    <div className="py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">予約管理</h1>
        <p className="mt-2 text-gray-600">
          あなたの予約一覧を確認し、キャンセルやリスケジュールを行えます。
        </p>
      </header>

      {/* 新規予約へのリンク */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-blue-900">新しいレッスンを予約</h3>
            <p className="text-sm text-blue-700 mt-1">
              利用可能なレッスン枠から新しい予約を作成できます。
            </p>
          </div>
          <Button 
            onClick={() => router.push('/dashboard/booking-calendar')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            予約カレンダーへ
          </Button>
        </div>
      </div>

            {/* 予約一覧 */}
      {user && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">予約一覧</h2>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['myReservations'] })}
              variant="outline"
              size="sm"
            >
              更新
            </Button>
          </div>
          
          {myReservations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">予約がありません</h3>
                <p className="text-gray-500 mb-6">
                  まだレッスンの予約がありません。<br />
                  予約カレンダーから新しい予約を作成してください。
                </p>
                <Button 
                  onClick={() => router.push('/dashboard/booking-calendar')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  予約カレンダーへ
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {myReservations
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((reservation) => {
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
                      onCancel={cancelReservation}
                      userRole={userRole}
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
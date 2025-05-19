'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import { format } from 'date-fns';
//import { ja } from 'date-fns/locale';
//import { Clock, ChevronRight } from 'lucide-react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { ReservationModal } from '@/app/reservation/_components/ReservationModal';
import { LessonSlot } from '@/app/reservation/_components/ReservationTable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { Toaster } from 'sonner';

// 通貨フォーマット関数（コンポーネントの外でも問題ない純関数）
function formatCurrency(amount: number, currency = 'usd'): string {
  if (!amount) return '0';
  
  // 単位を修正（セント -> 実際の通貨単位）
  const actualAmount = amount / 100;
  
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
  const [loading, setLoading] = useState(true);
  
  const [selectedSlot, setSelectedSlot] = useState<LessonSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isSmallScreen = useMediaQuery({ maxWidth: 1024 });
  
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
  const createReservation = useCallback(async (slotId: string) => {
    if (!user) {
      setError(new Error('ログインが必要です。'));
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'レッスン予約に失敗しました');
      }
      
      // 予約成功
      if (data.checkoutUrl) {
        // Stripeのチェックアウトページに遷移
        window.location.href = data.checkoutUrl;
        return data;
      } else {
        // 予約は作成されたがチェックアウトURLがない場合
        // レッスンスロット一覧を再取得して最新の状態を表示
        await fetchLessonSlots();
        setIsModalOpen(false);
        toast.success('レッスンの予約が完了しました！');
        return data;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '予約処理中にエラーが発生しました';
      setError(new Error(errorMessage));
      console.error('予約エラー:', error);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [user, fetchLessonSlots]);

  // Supabase認証状態を確認
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabaseBrowser.auth.getSession();
        if (error) console.error("認証エラー:", error);
        console.log("認証セッション:", data.session ? "あり" : "なし", data.session?.user?.email);
        
        setUser(data.session?.user || null);
        setLoading(false);
        
        if (!data.session) {
          // ログインページにリダイレクトする前にエラーログ
          console.log("未認証状態 - ログインが必要です");
          router.push('/login');
        }
      } catch (err) {
        console.error("セッション取得エラー:", err);
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
    // ユーザーが認証されている場合のみクエリを実行
    enabled: !!user,
  });
  
  // 予約作成のミューテーション
  const reserveMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (data) => {
      toast.success('レッスンの予約が完了しました');
      queryClient.invalidateQueries({ queryKey: ['lessonSlots'] });
      setIsModalOpen(false);
      
      // 新しいリダイレクト処理
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data?.redirectUrl) {
        router.push(data.redirectUrl);
      }
    },
    onError: (error: Error) => {
      toast.error(`予約エラー: ${error.message}`);
    },
  });

  // 認証状態チェック
  if (loading) {
    return <div className="flex justify-center items-center h-64">認証情報を確認中...</div>;
  }

  // 未ログインの場合はログインページにリダイレクト
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-center">レッスンを予約するにはログインが必要です。</p>
        <Button onClick={() => router.push('/login')}>
          ログインページへ
        </Button>
      </div>
    );
  }

  const handleBooking = (slot: LessonSlot) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };
  
  const handleConfirmBooking = async () => {
    if (selectedSlot) {
      await reserveMutation.mutateAsync(selectedSlot.id);
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
                        {lesson.teacher ? lesson.teacher.name : lesson.mentorName}
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
                        {formatCurrency(lesson.price || 5000, lesson.currency || 'usd')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleBooking(lesson)}
                          disabled={!lesson.isAvailable}
                        >
                          予約する
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
                <Card key={lesson.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(lesson.startTime), 'HH:mm')} - {format(new Date(lesson.endTime), 'HH:mm')}
                    </div>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lesson.isAvailable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {lesson.isAvailable ? '予約可能' : '予約済み'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        {lesson.teacher ? lesson.teacher.name : lesson.mentorName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(lesson.price || 5000, lesson.currency || 'usd')}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleBooking(lesson)}
                      disabled={!lesson.isAvailable}
                      size="sm"
                    >
                      予約する
                    </Button>
                  </div>
                </Card>
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

      {/* Reservation Modal */}
      <ReservationModal
        slot={selectedSlot}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmBooking}
        isLoading={isProcessing}
      />
      <Toaster />
    </div>
  );
};

// App Routerのページエクスポート
export default function ReservationPageWrapper() {
  return <ReservationPage />;
} 
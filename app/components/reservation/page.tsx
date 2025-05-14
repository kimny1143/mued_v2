'use client';

import React, { useState, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Clock, ChevronRight } from 'lucide-react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { ReservationModal } from './_components/ReservationModal';
import { LessonSlot } from './_components/ReservationTable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// APIからレッスンスロットを取得する関数
const fetchLessonSlots = async () => {
  // Supabaseセッションを取得してAuthヘッダーに含める
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  
  // リクエストヘッダーを設定（認証トークンを含める）
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // ログを追加
  console.log('API通信開始 - 認証トークン:', token ? '有効' : '無効');
  
  const res = await fetch('/api/lesson-slots', { headers });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('APIエラーレスポンス:', errorText);
    throw new Error('レッスン枠の取得に失敗しました');
  }
  return res.json();
};

// 予約を作成する関数
const createReservation = async (slotId: string) => {
  // Supabaseセッションを取得してAuthヘッダーに含める
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  
  // リクエストヘッダーを設定
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch('/api/reservations', {
    method: 'POST',
    headers,
    body: JSON.stringify({ slotId }),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'レッスンの予約に失敗しました');
  }
  
  return res.json();
};

export const ReservationPage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedLesson, setSelectedLesson] = useState<LessonSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // レスポンシブ対応のための画面幅チェック
  const isMobile = useMediaQuery({ maxWidth: 768 });
  
  // Supabase認証状態を確認
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
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
  const { data: lessonSlots, isLoading: isLoadingSlots, error } = useQuery({
    queryKey: ['lessonSlots'],
    queryFn: fetchLessonSlots,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュを有効にする
    // ユーザーが認証されている場合のみクエリを実行
    enabled: !!user,
    retry: 3, // リトライ回数を設定
    onError: (err) => {
      console.error("レッスンスロット取得エラー詳細:", err);
    }
  });
  
  // 予約作成のミューテーション
  const reserveMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      toast.success('レッスンの予約が完了しました');
      queryClient.invalidateQueries({ queryKey: ['lessonSlots'] });
      setIsModalOpen(false);
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

  const handleBooking = (lesson: LessonSlot) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };
  
  const handleConfirmReservation = async () => {
    if (selectedLesson) {
      reserveMutation.mutate(selectedLesson.id);
    }
  };

  if (isLoadingSlots) {
    return <div className="flex justify-center items-center h-64">読み込み中...</div>;
  }

  if (error) {
    console.error("API エラー詳細:", error);
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-500">{(error as Error).message}</p>
        <p className="text-sm text-red-400">ブラウザコンソールで詳細エラーを確認してください</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['lessonSlots'] })} className="mt-2">
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">レッスン予約</h1>
      
      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  講師
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  料金
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  予約
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lessonSlots && lessonSlots.map((lesson: LessonSlot) => (
                <tr key={lesson.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {format(new Date(lesson.startTime), 'yyyy年MM月dd日', { locale: ja })}
                    </div>
                    <div className="text-gray-500">
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
                    ¥{(lesson.price || 5000).toLocaleString()}
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
              {lessonSlots && lessonSlots.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    現在予約可能なレッスン枠はありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden space-y-4">
        {lessonSlots && lessonSlots.map((lesson: LessonSlot) => (
          <Card key={lesson.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-900">
                {format(new Date(lesson.startTime), 'yyyy年MM月dd日', { locale: ja })}
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
            <div className="flex items-center text-gray-500 text-sm mb-2">
              <Clock className="w-4 h-4 mr-1" />
              {format(new Date(lesson.startTime), 'HH:mm')} - {format(new Date(lesson.endTime), 'HH:mm')}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{lesson.teacher ? lesson.teacher.name : lesson.mentorName}</div>
                <div className="text-sm text-gray-500">
                  ¥{(lesson.price || 5000).toLocaleString()}
                </div>
              </div>
              <Button
                onClick={() => handleBooking(lesson)}
                disabled={!lesson.isAvailable}
                className="flex items-center"
              >
                予約する
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>
        ))}
        {lessonSlots && lessonSlots.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            現在予約可能なレッスン枠はありません
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        slot={selectedLesson}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmReservation}
        isLoading={reserveMutation.isPending}
      />
    </div>
  );
};

// App Routerのページエクスポート
export default function ReservationPageWrapper() {
  return <ReservationPage />;
} 
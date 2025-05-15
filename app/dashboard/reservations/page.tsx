'use client';

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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { User } from '@supabase/supabase-js';

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

// データ取得の再試行処理を行う関数
const fetchWithRetry = async (url: string, token: string, maxRetries = 3) => {
  let lastError;
  let waitTime = 2000; // 初回待機時間：2秒
  
  // 指数バックオフを実装（最大10秒まで）
  const getNextWaitTime = (current: number) => Math.min(current * 1.5, 10000);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`${url} - 取得試行 ${attempt + 1}/${maxRetries}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP エラー ${response.status}: ${await response.text()}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`${url} - 取得エラー (試行 ${attempt + 1}/${maxRetries}):`, error);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        // 指数バックオフで待機時間を増加
        await new Promise(resolve => setTimeout(resolve, waitTime));
        waitTime = getNextWaitTime(waitTime);
      }
    }
  }
  
  throw lastError;
};

export default function ReservationsPage() {
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [lessonSlots, setLessonSlots] = useState<LessonSlot[]>([]);
  const [dataFetchAttempt, setDataFetchAttempt] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // 認証状態の確認とデータ取得
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. 認証チェック
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError || !authData.session) {
          console.log("認証エラーまたは未ログイン:", authError);
          router.push('/login');
          return;
        }
        
        setUser(authData.session.user);
        
        // 2. データ取得準備のため待機（Supabase接続安定化）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          // 3. 予約とレッスンスロットを並行で取得（リトライ機能付き）
          const [reservationsData, slotsData] = await Promise.all([
            fetchWithRetry('/api/reservations', authData.session.access_token, 5),
            fetchWithRetry('/api/lesson-slots', authData.session.access_token, 5)
          ]);
          
          // デバッグ: APIから取得したデータをログ出力
          console.log("APIから取得したレッスンスロット:", {
            total: slotsData.length,
            items: slotsData.map((slot: LessonSlot) => ({
              id: slot.id,
              teacherId: slot.teacherId,
              teacherName: slot.teacher?.name || slot.mentorName,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isAvailable: slot.isAvailable,
              hasReservations: (slot.reservations && slot.reservations.length > 0) || false,
              reservationStatus: slot.reservations?.map((r: Reservation) => r.status)
            }))
          });
          
          // 4. レッスンスロットの処理（利用可能なもののみ）
          const activeReservations = useMemo(() => {
            return reservationsData.filter((res: Reservation) => 
              res.status === 'CONFIRMED' || res.status === 'COMPLETED');
          }, [reservationsData]);
          
          const availableSlots = useMemo(() => {
            return slotsData.filter((slot: LessonSlot) => 
              slot.isAvailable && !slot.reservations?.some((res: any) => 
                res.status === 'CONFIRMED' || res.status === 'COMPLETED')
            );
          }, [slotsData]);
          
          // デバッグ: フィルタリング後のデータをログ出力
          console.log("フィルタリング後の表示可能レッスンスロット:", {
            total: availableSlots.length,
            items: availableSlots.map((slot: LessonSlot) => ({
              id: slot.id,
              teacherId: slot.teacherId,
              teacherName: slot.teacher?.name || slot.mentorName,
              startTime: slot.startTime,
              endTime: slot.endTime
            }))
          });
          
          // 5. 状態を更新
          // フィルタリング条件の簡素化（キャンセル済みステータスは新スキーマには存在しないため）
          const filteredReservations = activeReservations;
          
          console.log("表示する予約（フィルタリング後）:", {
            total: filteredReservations.length,
            filtered: reservationsData.length - filteredReservations.length,
            items: filteredReservations.map((res: Reservation) => ({
              id: res.id,
              status: res.status,
              paymentStatus: res.paymentStatus,
            }))
          });
          
          setReservations(filteredReservations);
          setLessonSlots(availableSlots);
          setError(null);
        } catch (fetchError) {
          console.error("データ取得エラー:", fetchError);
          
          // エラー発生時も空配列でUIを表示（ユーザーに操作できるようにする）
          setReservations([]);
          setLessonSlots([]);
          setError('データの取得に失敗しました。時間をおいて再読み込みしてください。');
        }
        
        setLoading(false);
        setInitialLoading(false);
        
      } catch (error) {
        console.error("データ初期化エラー:", error);
        setError(error instanceof Error ? error.message : '不明なエラー');
        
        // エラー時は空の配列で表示
        setReservations([]);
        setLessonSlots([]);
        setLoading(false);
        setInitialLoading(false);
      }
    };
    
    initializeData();
  }, [router, dataFetchAttempt]);
  
  // レッスン予約処理
  const handleBooking = (slotId: string) => {
    router.push(`/dashboard/reservations/book?slotId=${slotId}`);
  };
  
  // ステータスに応じたバッジのスタイルを返す関数
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">予約確定</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">完了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // データ初回読み込み中の表示
  if (initialLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh]">
        <div className="text-center">
          <Loader2Icon className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <h3 className="text-lg font-medium mb-2">データ読み込み中...</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            予約情報とレッスン枠を読み込んでいます。この処理には数秒かかることがあります。
          </p>
        </div>
      </div>
    );
  }

  // データロード完了後の表示
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">レッスン予約管理</h1>
        <p className="mt-2 text-gray-600">
          レッスンの予約状況確認と新規予約ができます。
          {loading && <span className="ml-2 text-xs text-blue-500">更新中...</span>}
        </p>
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <div className="flex items-center">
              <XIcon className="h-4 w-4 mr-2" />
              <span>{error}</span>
            </div>
            <Button 
              onClick={() => setDataFetchAttempt(prev => prev + 1)} 
              variant="outline" 
              size="sm" 
              className="mt-2 text-xs"
            >
              再読み込み
            </Button>
          </div>
        )}
      </header>

      {/* マイ予約一覧セクション */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <span>予約済みレッスン</span>
          </div>
        </h2>

        {reservations.length > 0 ? (
          <>
            {/* デスクトップ表示 */}
            <div className="hidden lg:block">
              <div className="shadow overflow-hidden border border-gray-200 sm:rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">日時</TableHead>
                      <TableHead>講師</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">アクション</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {format(new Date(reservation.slot.startTime), 'yyyy年M月d日', { locale: ja })}
                            </span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(reservation.slot.startTime), 'HH:mm', { locale: ja })} - 
                              {format(new Date(reservation.slot.endTime), 'HH:mm', { locale: ja })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {reservation.slot.teacher?.name || '講師情報なし'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(reservation.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/reservations/${reservation.id}`)}
                          >
                            詳細
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* モバイル表示 */}
            <div className="lg:hidden space-y-4">
              {reservations.map((reservation) => (
                <Card key={reservation.id} className="p-4">
                  <div className="mb-2 flex justify-between items-start">
                    <div>
                      <div className="font-medium">{reservation.slot.teacher?.name || '講師情報なし'}</div>
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
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(reservation.status)}
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/reservations/${reservation.id}`)}
                    >
                      詳細
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg mb-8">
            <div className="flex justify-center mb-4">
              <CalendarIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">予約がありません</h3>
            <p className="text-gray-500 mb-4">
              現在予約中のレッスンはありません。下記から新しいレッスンを予約してみましょう。
            </p>
          </div>
        )}
      </section>

      {/* レッスン予約セクション */}
      <section>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">
          <div className="flex items-center gap-2">
            <PlusCircleIcon className="h-5 w-5" />
            <span>予約可能なレッスン</span>
          </div>
        </h2>

        {lessonSlots.length > 0 ? (
          <>
            {/* デスクトップ表示 */}
            <div className="hidden lg:block">
              <div className="shadow overflow-hidden border border-gray-200 sm:rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">日時</TableHead>
                      <TableHead>講師</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>料金</TableHead>
                      <TableHead className="text-right">アクション</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessonSlots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {format(new Date(slot.startTime), 'yyyy年M月d日', { locale: ja })}
                            </span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(slot.startTime), 'HH:mm', { locale: ja })} - 
                              {format(new Date(slot.endTime), 'HH:mm', { locale: ja })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {slot.teacher?.name || slot.mentorName || '講師情報なし'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            予約可能
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {slot.price ? `¥${slot.price.toLocaleString()}` : '¥5,000'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleBooking(slot.id)}
                          >
                            予約する
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* モバイル表示 */}
            <div className="lg:hidden space-y-4">
              {lessonSlots.map((slot) => (
                <Card key={slot.id} className="p-4">
                  <div className="mb-2 flex justify-between items-start">
                    <div>
                      <div className="font-medium">{slot.teacher?.name || slot.mentorName || '講師情報なし'}</div>
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
                    >
                      予約する
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-4">
              <CalendarIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">予約可能なレッスンがありません</h3>
            <p className="text-gray-500 mb-4">
              現在予約可能なレッスン枠はありません。しばらく経ってから再度確認してください。
            </p>
            {loading ? (
              <div className="flex justify-center">
                <Loader2Icon className="h-6 w-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              <Button onClick={() => {
                setDataFetchAttempt(prev => prev + 1);
                toast.info("データを再読み込みしています...");
              }}>
                再読み込み
              </Button>
            )}
          </div>
        )}
      </section>
      <Toaster />
    </>
  );
} 
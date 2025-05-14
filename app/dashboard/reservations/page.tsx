'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  PlusCircleIcon
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/app/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { User } from '@supabase/supabase-js';

// 予約データの型定義
interface Reservation {
  id: string;
  slotId: string;
  studentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentStatus?: 'UNPAID' | 'PROCESSING' | 'PAID' | 'REFUNDED' | 'FAILED'; 
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

export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState('my-bookings');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Supabase認証状態を確認
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("認証エラー:", error);
        
        if (!data.session) {
          console.log("未認証状態 - ログインが必要です");
          router.push('/login');
          return;
        }
        
        setUser(data.session.user);
        setLoading(false);
      } catch (err) {
        console.error("セッション取得エラー:", err);
        setLoading(false);
      }
    };
    
    getUser();
  }, [router]);

  // 予約一覧を取得する関数
  const fetchReservations = useCallback(async () => {
    try {
      // 認証トークンを取得
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('認証セッション取得エラー:', sessionError);
        throw new Error('認証情報の取得に失敗しました');
      }
      
      if (!sessionData.session) {
        throw new Error('ログインが必要です');
      }
      
      const token = sessionData.session.access_token;
      
      // テスト用にランダムなクエリパラメータを追加して、キャッシュを回避
      const timestamp = new Date().getTime();
      const randomParam = Math.floor(Math.random() * 1000);
      
      // APIから予約一覧を取得（明示的に認証トークンを含める）
      const response = await fetch(`/api/reservations?nocache=${timestamp}-${randomParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('APIエラーレスポンス:', errorData);
        throw new Error(errorData.error || '予約一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      console.log('取得した予約データ:', data);
      
      return data;
    } catch (err) {
      console.error('予約取得エラー:', err);
      throw err;
    }
  }, []);

  // レッスンスロットを取得する関数
  const fetchLessonSlots = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('ログインが必要です');
      }
      
      const token = sessionData.session.access_token;
      
      // APIからレッスンスロット一覧を取得
      const response = await fetch('/api/lesson-slots', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'レッスンスロットの取得に失敗しました');
      }
      
      const data = await response.json();
      
      // スロットの可用性をチェック - すでに予約があるものは除外
      const availableSlots = data.filter((slot: LessonSlot) => {
        if (!slot.isAvailable) return false;
        
        if (slot.reservations && slot.reservations.length > 0) {
          if (slot.reservations.some(res => 
            res.status === 'CONFIRMED' || 
            res.paymentStatus === 'PAID')) {
            return false;
          }
        }
        
        return true;
      });
      
      // 日付でソート
      return availableSlots.sort((a: LessonSlot, b: LessonSlot) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
    } catch (err) {
      console.error('レッスンスロット取得エラー:', err);
      throw err;
    }
  }, []);

  // 予約一覧のクエリ
  const { 
    data: reservations = [], 
    isLoading: reservationsLoading,
    error: reservationsError,
    refetch: refetchReservations
  } = useQuery({
    queryKey: ['reservations'],
    queryFn: fetchReservations,
    enabled: !!user,
  });

  // レッスンスロットのクエリ
  const {
    data: lessonSlots = [],
    isLoading: slotsLoading,
    error: slotsError,
    refetch: refetchSlots
  } = useQuery({
    queryKey: ['lessonSlots'],
    queryFn: fetchLessonSlots,
    enabled: !!user && activeTab === 'book-lesson',
  });

  // ステータスに応じたバッジのスタイルを返す関数
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">予約確定</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">支払い待ち</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">キャンセル済み</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">完了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 支払いステータスに応じたバッジのスタイルを返す関数
  const getPaymentStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'PAID':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">支払い完了</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">処理中</Badge>;
      case 'UNPAID':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">未払い</Badge>;
      case 'REFUNDED':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">返金済み</Badge>;
      case 'FAILED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">失敗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // 予約ボタンがクリックされたときの処理
  const handleBooking = (slotId: string) => {
    router.push(`/dashboard/reservations/book?slotId=${slotId}`);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-center">
          <CalendarIcon className="h-10 w-10 mx-auto mb-4 text-gray-400" />
          <p>認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">レッスン予約管理</h1>
        <p className="mt-2 text-gray-600">
          レッスンの予約・確認ができます。新規予約はBook Lessonタブから、予約済みレッスンはMy Bookingsタブから確認できます。
        </p>
      </header>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="my-bookings" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>My Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="book-lesson" className="flex items-center gap-2">
            <PlusCircleIcon className="h-4 w-4" />
            <span>Book Lesson</span>
          </TabsTrigger>
        </TabsList>

        {/* マイ予約一覧タブ */}
        <TabsContent value="my-bookings">
          {reservationsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse text-center">
                <CalendarIcon className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                <p>予約情報を読み込み中...</p>
              </div>
            </div>
          ) : reservationsError ? (
            <div className="p-6 border border-red-300 bg-red-50 rounded-md">
              <div className="flex items-start">
                <XIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-red-700 mb-1">予約データの取得に失敗しました</h3>
                  <p className="text-red-600 mb-4">{(reservationsError as Error).message}</p>
                  <div className="flex space-x-3">
                    <Button onClick={() => refetchReservations()} variant="outline">
                      再取得
                    </Button>
                    <Button onClick={() => router.push('/dashboard')} variant="ghost">
                      ダッシュボードへ戻る
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : reservations.length > 0 ? (
            <>
              {/* デスクトップ表示 */}
              <div className="hidden lg:block">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">日時</TableHead>
                        <TableHead>講師</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>支払い状況</TableHead>
                        <TableHead className="text-right">アクション</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map((reservation: Reservation) => (
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
                          <TableCell>
                            {getPaymentStatusBadge(reservation.paymentStatus)}
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
                {reservations.map((reservation: Reservation) => (
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
                        {getPaymentStatusBadge(reservation.paymentStatus)}
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
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <div className="flex justify-center mb-4">
                <CalendarIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">予約がありません</h3>
              <p className="text-gray-500 mb-4">
                現在予約中のレッスンはありません。新しいレッスンを予約しましょう。
              </p>
              <Button onClick={() => setActiveTab('book-lesson')}>
                レッスンを予約する
              </Button>
            </div>
          )}
        </TabsContent>

        {/* レッスン予約タブ */}
        <TabsContent value="book-lesson">
          {slotsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse text-center">
                <CalendarIcon className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                <p>レッスン枠を読み込み中...</p>
              </div>
            </div>
          ) : slotsError ? (
            <div className="p-6 border border-red-300 bg-red-50 rounded-md">
              <div className="flex items-start">
                <XIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-red-700 mb-1">レッスン枠の取得に失敗しました</h3>
                  <p className="text-red-600 mb-4">{(slotsError as Error).message}</p>
                  <div className="flex space-x-3">
                    <Button onClick={() => refetchSlots()} variant="outline">
                      再取得
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : lessonSlots.length > 0 ? (
            <>
              {/* デスクトップ表示 */}
              <div className="hidden lg:block">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
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
                      {lessonSlots.map((slot: LessonSlot) => (
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
                {lessonSlots.map((slot: LessonSlot) => (
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
              <Button onClick={() => refetchSlots()}>
                再読み込み
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <Toaster />
    </>
  );
} 
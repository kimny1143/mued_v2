'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ClockIcon, UserIcon, CheckCircleIcon, XIcon } from 'lucide-react';
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
import { useUser } from '@/lib/hooks/use-user';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

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

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useUser();

  // 予約一覧を取得する関数
  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // APIから予約一覧を取得
      const response = await fetch('/api/reservations?status=CONFIRMED');
      
      if (!response.ok) {
        throw new Error('予約一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      console.log('取得した予約データ:', data);
      
      setReservations(data);
    } catch (err) {
      console.error('予約取得エラー:', err);
      setError(err instanceof Error ? err.message : '予約一覧の取得中にエラーが発生しました');
      toast.error('予約一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // コンポーネントマウント時に予約一覧を取得
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
        return;
      }
      
      fetchReservations();
    };
    
    checkAuth();
  }, [router]);

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
  
  if (loading) {
    return <div className="flex justify-center items-center h-64">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchReservations} className="mt-2">再読み込み</Button>
      </div>
    );
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">マイ予約一覧</h1>
        <p className="mt-2 text-gray-600">
          予約済みのレッスン一覧です。レッスン開始時間に間に合うようご準備ください。
        </p>
      </header>

      {reservations.length > 0 ? (
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
          <Button onClick={() => router.push('/reservations')}>
            レッスンを予約する
          </Button>
        </div>
      )}
      <Toaster />
    </>
  );
} 
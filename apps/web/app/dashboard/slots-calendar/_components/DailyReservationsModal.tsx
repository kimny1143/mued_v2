'use client';

import { ReservationStatus } from '@prisma/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar,
  MoreHorizontal
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { api, ApiError } from '@/lib/api-client';
import { CancelReason } from '@/lib/types/reservation';


// 予約データの型定義
interface DailyReservation {
  id: string;
  status: ReservationStatus;
  bookedStartTime: Date;
  bookedEndTime: Date;
  totalAmount: number;
  notes?: string;
  student: {
    id: string;
    name: string | null;
    email: string;
  };
  teacher: {
    id: string;
    name: string | null;
  };
}

interface DailyReservationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  userRole: 'student' | 'mentor' | 'admin';
  onReservationsUpdate: () => void; // 予約更新後のコールバック
}

export const DailyReservationsModal: React.FC<DailyReservationsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  userRole,
  onReservationsUpdate,
}) => {
  const [reservations, setReservations] = useState<DailyReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 操作中の予約ID

  // 日付のフォーマット
  const formattedDate = format(selectedDate, 'yyyy年M月d日(E)', { locale: ja });

  // その日の予約を取得
  const fetchDailyReservations = async () => {
    if (!isOpen) return;

    try {
      setLoading(true);
      setError(null);

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const reservationsData = await api.get(`/api/reservations?date=${dateStr}`) as DailyReservation[];
      
      console.log('日付別予約取得:', { date: dateStr, count: reservationsData.length });
      setReservations(reservationsData);
    } catch (err) {
      console.error('日付別予約取得エラー:', err);
      if (err instanceof ApiError) {
        setError(`予約の取得に失敗しました (${err.status}): ${err.message}`);
      } else {
        setError('予約の取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  // モーダルが開いたときに予約を取得
  useEffect(() => {
    fetchDailyReservations();
  }, [isOpen, selectedDate]);

  // 予約承認
  const handleApprove = async (reservationId: string) => {
    try {
      setActionLoading(reservationId);
      
      await api.post(`/api/reservations/${reservationId}/approve`);
      
      toast.success('予約を承認しました');
      await fetchDailyReservations(); // 一覧を更新
      onReservationsUpdate(); // 親コンポーネントも更新
    } catch (error) {
      console.error('承認エラー:', error);
      if (error instanceof ApiError) {
        toast.error(`承認に失敗しました: ${error.message}`);
      } else {
        toast.error('承認に失敗しました');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // 予約キャンセル
  const handleCancel = async (reservationId: string, reason: CancelReason) => {
    try {
      setActionLoading(reservationId);
      
      await api.post(`/api/reservations/${reservationId}/cancel`, {
        reason: reason,
        notes: `${userRole}によるキャンセル`
      });
      
      toast.success('予約をキャンセルしました');
      await fetchDailyReservations(); // 一覧を更新
      onReservationsUpdate(); // 親コンポーネントも更新
    } catch (error) {
      console.error('キャンセルエラー:', error);
      if (error instanceof ApiError) {
        toast.error(`キャンセルに失敗しました: ${error.message}`);
      } else {
        toast.error('キャンセルに失敗しました');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // 操作ボタンの表示判定
  const canApprove = (reservation: DailyReservation) => {
    return userRole === 'mentor' && reservation.status === 'PENDING_APPROVAL';
  };

  const canCancel = (reservation: DailyReservation) => {
    return (userRole === 'mentor' || userRole === 'admin') && 
           ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED'].includes(reservation.status);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            {formattedDate} の予約一覧
          </DialogTitle>
          <DialogDescription>
            この日の予約を管理します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">読み込み中...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500">{error}</div>
              <Button 
                variant="outline" 
                onClick={fetchDailyReservations}
                className="mt-2"
              >
                再試行
              </Button>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <div className="text-gray-500">この日に予約はありません</div>
            </div>
          ) : (
            <div className="space-y-2">
              {reservations.map((reservation) => (
                <div 
                  key={reservation.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {reservation.student.name || reservation.student.email}
                    </span>
                  </div>

                  {/* 操作ボタン */}
                  <div className="flex gap-2">
                    {canApprove(reservation) && (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(reservation.id)}
                        disabled={actionLoading === reservation.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {actionLoading === reservation.id ? '承認中...' : '承認'}
                      </Button>
                    )}

                    {canCancel(reservation) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(reservation.id, 
                          userRole === 'mentor' ? CancelReason.MENTOR_REQUEST : CancelReason.ADMIN_REQUEST
                        )}
                        disabled={actionLoading === reservation.id}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        {actionLoading === reservation.id ? 'キャンセル中...' : 'キャンセル'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button onClick={fetchDailyReservations} disabled={loading}>
            <MoreHorizontal className="h-4 w-4 mr-1" />
            更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
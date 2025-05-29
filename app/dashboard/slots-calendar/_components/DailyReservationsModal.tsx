'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { ReservationStatus } from '@prisma/client';
import { CancelReason } from '@/lib/types/reservation';
import { api, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

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

// 操作の種類
type ReservationAction = 'approve' | 'reject' | 'cancel' | 'view';

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
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null); // 拒否フォーム表示中の予約ID

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

  // 予約拒否
  const handleReject = async (reservationId: string) => {
    if (!rejectReason.trim()) {
      toast.error('拒否理由を入力してください');
      return;
    }

    try {
      setActionLoading(reservationId);
      
      await api.post(`/api/reservations/${reservationId}/reject`, {
        reason: rejectReason
      });
      
      toast.success('予約を拒否しました');
      setShowRejectForm(null);
      setRejectReason('');
      await fetchDailyReservations(); // 一覧を更新
      onReservationsUpdate(); // 親コンポーネントも更新
    } catch (error) {
      console.error('拒否エラー:', error);
      if (error instanceof ApiError) {
        toast.error(`拒否に失敗しました: ${error.message}`);
      } else {
        toast.error('拒否に失敗しました');
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

  // ステータスバッジの取得
  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">承認待ち</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">決済待ち</Badge>;
      case 'CONFIRMED':
        return <Badge variant="outline" className="text-green-600 border-green-300">確定</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="text-red-600 border-red-300">拒否</Badge>;
      case 'CANCELED':
        return <Badge variant="outline" className="text-gray-600 border-gray-300">キャンセル</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="text-purple-600 border-purple-300">完了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 操作ボタンの表示判定
  const canApprove = (reservation: DailyReservation) => {
    return userRole === 'mentor' && reservation.status === 'PENDING_APPROVAL';
  };

  const canReject = (reservation: DailyReservation) => {
    return userRole === 'mentor' && reservation.status === 'PENDING_APPROVAL';
  };

  const canCancel = (reservation: DailyReservation) => {
    return (userRole === 'mentor' || userRole === 'admin') && 
           ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED'].includes(reservation.status);
  };

  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            {formattedDate} の予約一覧
          </DialogTitle>
          <DialogDescription>
            この日の予約を一覧で確認し、必要に応じて承認・拒否・キャンセルを行えます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <div className="space-y-3">
              {reservations.map((reservation) => (
                <div 
                  key={reservation.id} 
                  className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 予約基本情報 */}
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {format(reservation.bookedStartTime, 'HH:mm')} - 
                          {format(reservation.bookedEndTime, 'HH:mm')}
                        </span>
                        {getStatusBadge(reservation.status)}
                      </div>

                      {/* 生徒情報 */}
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {reservation.student.name || reservation.student.email}
                        </span>
                      </div>

                      {/* 料金情報 */}
                      <div className="text-sm text-gray-600 mb-2">
                        料金: <span className="font-medium">{formatCurrency(reservation.totalAmount)}</span>
                      </div>

                      {/* メモ */}
                      {reservation.notes && (
                        <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded mt-2">
                          <strong>メモ:</strong> {reservation.notes}
                        </div>
                      )}

                      {/* 拒否理由入力フォーム */}
                      {showRejectForm === reservation.id && (
                        <div className="mt-3 p-3 border border-red-200 rounded-lg bg-red-50">
                          <Label htmlFor={`reject-reason-${reservation.id}`} className="text-sm font-medium">
                            拒否理由 *
                          </Label>
                          <Textarea
                            id={`reject-reason-${reservation.id}`}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="予約を拒否する理由を入力してください..."
                            className="mt-1"
                            rows={2}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(reservation.id)}
                              disabled={!rejectReason.trim() || actionLoading === reservation.id}
                            >
                              {actionLoading === reservation.id ? '処理中...' : '拒否実行'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowRejectForm(null);
                                setRejectReason('');
                              }}
                            >
                              キャンセル
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 操作ボタン */}
                    <div className="flex flex-col gap-2 ml-4">
                      {canApprove(reservation) && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(reservation.id)}
                          disabled={actionLoading === reservation.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {actionLoading === reservation.id ? '処理中...' : '承認'}
                        </Button>
                      )}

                      {canReject(reservation) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setShowRejectForm(reservation.id)}
                          disabled={actionLoading === reservation.id}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          拒否
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
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {actionLoading === reservation.id ? '処理中...' : 'キャンセル'}
                        </Button>
                      )}
                    </div>
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
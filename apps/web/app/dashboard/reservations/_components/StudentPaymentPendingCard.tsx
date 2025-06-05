'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import { Clock, User, Calendar, DollarSign, CreditCard, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { CancelReservationModal } from './CancelReservationModal';
import { CancelReason } from '@/lib/types/reservation';

interface Teacher {
  id: string;
  name: string | null;
  email: string | null;
}

interface Reservation {
  id: string;
  status: string;
  bookedStartTime: string;
  bookedEndTime: string;
  totalAmount: number;
  notes: string | null;
  durationMinutes: number | null;
  createdAt: string;
  approvedAt: string | null;
  teacher: Teacher;
}

interface StudentPaymentPendingCardProps {
  reservation: Reservation;
  onStartPayment: (reservationId: string) => Promise<void>;
  onCancel?: (reservationId: string, reason: CancelReason, notes?: string) => Promise<void>;
  userRole?: 'student' | 'mentor' | 'admin';
  isLoading?: boolean;
}

export const StudentPaymentPendingCard: React.FC<StudentPaymentPendingCardProps> = ({
  reservation,
  onStartPayment,
  onCancel,
  userRole = 'student',
  isLoading = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleStartPayment = async () => {
    try {
      setIsProcessing(true);
      await onStartPayment(reservation.id);
    } catch (error) {
      toast.error('決済の開始に失敗しました');
      console.error('決済開始エラー:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelClick = () => {
    setIsCancelModalOpen(true);
  };

  const handleCancelConfirm = async (reason: CancelReason, notes?: string) => {
    if (!onCancel) return;
    
    try {
      setIsCanceling(true);
      await onCancel(reservation.id, reason, notes);
      setIsCancelModalOpen(false);
    } catch (error) {
      console.error('キャンセル処理エラー:', error);
    } finally {
      setIsCanceling(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'M月d日(E) HH:mm', { locale: ja });
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">承認待ち</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">決済待ち</Badge>;
      case 'CONFIRMED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">確定済み</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">拒否済み</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return {
          icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
          title: 'メンターの承認をお待ちください',
          description: 'メンターが予約を確認中です。承認されましたら決済手続きをご案内いたします。'
        };
      case 'APPROVED':
        return {
          icon: <CreditCard className="h-5 w-5 text-blue-500" />,
          title: '決済手続きを完了してください',
          description: 'メンターが予約を承認しました。下記ボタンから決済を完了してレッスンを確定してください。'
        };
      case 'CONFIRMED':
        return {
          icon: <CreditCard className="h-5 w-5 text-green-500" />,
          title: 'レッスンが確定しました',
          description: '決済が完了し、レッスンが確定しました。当日をお楽しみに！'
        };
      case 'REJECTED':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          title: '予約が拒否されました',
          description: 'メンターにより予約が拒否されました。別の時間帯でお試しください。'
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-gray-500" />,
          title: '状態を確認中',
          description: '予約の状態を確認しています。'
        };
    }
  };

  const statusInfo = getStatusMessage(reservation.status);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {reservation.teacher.name || '名前未設定'}先生とのレッスン
          </CardTitle>
          {getStatusBadge(reservation.status)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ステータスメッセージ */}
        <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
          {statusInfo.icon}
          <div>
            <h4 className="font-medium text-sm">{statusInfo.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{statusInfo.description}</p>
          </div>
        </div>

        {/* 予約詳細 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              {formatDateTime(reservation.bookedStartTime)} - {format(new Date(reservation.bookedEndTime), 'HH:mm')}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{reservation.durationMinutes || 60}分</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{reservation.teacher.name || '名前未設定'}先生</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{formatCurrency(reservation.totalAmount)}</span>
          </div>
        </div>

        {/* あなたのメモ */}
        {reservation.notes && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-600 font-medium mb-1">あなたのメッセージ:</p>
            <p className="text-sm">{reservation.notes}</p>
          </div>
        )}

        {/* 承認日時 */}
        {reservation.approvedAt && (
          <div className="text-xs text-gray-500">
            承認日時: {format(new Date(reservation.approvedAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
          </div>
        )}

        {/* 申請日時 */}
        <div className="text-xs text-gray-500">
          申請日時: {format(new Date(reservation.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
        </div>

        {/* アクションボタン */}
        <div className="pt-4 space-y-3">
          {/* 決済ボタン */}
          {reservation.status === 'APPROVED' && (
            <Button
              onClick={handleStartPayment}
              disabled={isLoading || isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isProcessing ? '決済ページを準備中...' : '決済手続きを開始する'}
            </Button>
          )}

          {/* キャンセルボタン */}
          {onCancel && ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED'].includes(reservation.status) && (
            <Button
              variant="outline"
              onClick={handleCancelClick}
              disabled={isLoading || isProcessing || isCanceling}
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              {isCanceling ? 'キャンセル中...' : 'レッスンをキャンセル'}
            </Button>
          )}
        </div>

        {/* キャンセルモーダル */}
        {onCancel && (
          <CancelReservationModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            onConfirm={handleCancelConfirm}
            reservation={{
              id: reservation.id,
              bookedStartTime: new Date(reservation.bookedStartTime),
              bookedEndTime: new Date(reservation.bookedEndTime),
              totalAmount: reservation.totalAmount,
              teacher: {
                name: reservation.teacher.name || '名前未設定',
              },
            }}
            userRole={userRole}
            isLoading={isCanceling}
          />
        )}
      </CardContent>
    </Card>
  );
}; 
'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import { Textarea } from '@ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog';
import { Clock, User, Calendar, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
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
  student: Student;
}

interface MentorApprovalCardProps {
  reservation: Reservation;
  onApprove: (reservationId: string) => Promise<void>;
  onReject: (reservationId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export const MentorApprovalCard: React.FC<MentorApprovalCardProps> = ({
  reservation,
  onApprove,
  onReject,
  isLoading = false
}) => {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await onApprove(reservation.id);
      toast.success('予約を承認しました');
    } catch (error) {
      toast.error('承認に失敗しました');
      console.error('承認エラー:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('拒否理由を入力してください');
      return;
    }

    try {
      setIsProcessing(true);
      await onReject(reservation.id, rejectionReason);
      toast.success('予約を拒否しました');
      setIsRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('拒否に失敗しました');
      console.error('拒否エラー:', error);
    } finally {
      setIsProcessing(false);
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
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">承認済み</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">拒否済み</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {reservation.student.name || '名前未設定'}さんからの予約申請
          </CardTitle>
          {getStatusBadge(reservation.status)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
            <span className="text-sm">{reservation.student.email}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{formatCurrency(reservation.totalAmount)}</span>
          </div>
        </div>

        {/* 生徒からのメモ */}
        {reservation.notes && (
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600 font-medium mb-1">生徒からのメッセージ:</p>
            <p className="text-sm">{reservation.notes}</p>
          </div>
        )}

        {/* 申請日時 */}
        <div className="text-xs text-gray-500">
          申請日時: {format(new Date(reservation.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
        </div>

        {/* 承認・拒否ボタン */}
        {reservation.status === 'PENDING_APPROVAL' && (
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleApprove}
              disabled={isLoading || isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              承認する
            </Button>
            
            <Button
              variant="outline"
              disabled={isLoading || isProcessing}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setIsRejectDialogOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              拒否する
            </Button>
            
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>予約を拒否する</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    拒否理由を入力してください。生徒に通知されます。
                  </p>
                  
                  <Textarea
                    placeholder="例: スケジュールの都合により、この時間帯でのレッスンが困難です。"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                  />
                  
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsRejectDialogOpen(false)}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                    
                    <Button
                      onClick={handleReject}
                      disabled={isProcessing || !rejectionReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      拒否する
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
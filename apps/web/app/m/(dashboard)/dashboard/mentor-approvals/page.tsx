'use client';

// このページは動的である必要があります（認証チェックのため）
export const dynamic = 'force-dynamic';

import { User } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Clock, ArrowLeft, Calendar, User as UserIcon, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ui/dialog';
import { Textarea } from '@ui/textarea';
import { Label } from '@ui/label';

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

export default function MobileMentorApprovalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // ユーザー情報の取得
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (session) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('認証エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  // 承認待ち予約を取得する関数
  const fetchPendingReservations = async (): Promise<Reservation[]> => {
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch('/api/reservations?status=PENDING_APPROVAL', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予約の取得に失敗しました');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('承認待ち予約取得エラー:', error);
      throw error;
    }
  };

  // 予約を承認する関数
  const approveReservation = async (reservationId: string): Promise<void> => {
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/reservations/${reservationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '承認に失敗しました');
      }

      const result = await response.json();
      console.log('承認成功:', result);
    } catch (error) {
      console.error('承認エラー:', error);
      throw error;
    }
  };

  // 予約を拒否する関数
  const rejectReservation = async (reservationId: string, reason: string): Promise<void> => {
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/reservations/${reservationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '拒否に失敗しました');
      }

      const result = await response.json();
      console.log('拒否成功:', result);
    } catch (error) {
      console.error('拒否エラー:', error);
      throw error;
    }
  };

  // React Queryを使って承認待ち予約を取得
  const { 
    data: pendingReservations = [], 
    isLoading: isLoadingReservations, 
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['pendingReservations'],
    queryFn: fetchPendingReservations,
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2分間キャッシュ
  });

  // 承認のmutation
  const approveMutation = useMutation({
    mutationFn: approveReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingReservations'] });
      toast.success('予約を承認しました');
    },
    onError: (error) => {
      toast.error(`承認に失敗しました: ${error.message}`);
    }
  });

  // 拒否のmutation
  const rejectMutation = useMutation({
    mutationFn: ({ reservationId, reason }: { reservationId: string; reason: string }) => 
      rejectReservation(reservationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingReservations'] });
      toast.success('予約を拒否しました');
      setRejectDialog(false);
      setRejectReason('');
      setSelectedReservation(null);
    },
    onError: (error) => {
      toast.error(`拒否に失敗しました: ${error.message}`);
    }
  });

  const handleApprove = async (reservationId: string) => {
    await approveMutation.mutateAsync(reservationId);
  };

  const handleReject = async () => {
    if (!selectedReservation || !rejectReason.trim()) return;
    await rejectMutation.mutateAsync({ 
      reservationId: selectedReservation.id, 
      reason: rejectReason 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">予約承認管理</h1>
            <div className="w-8"></div>
          </div>
        </header>
        <main className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm">読み込み中...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">予約承認管理</h1>
            <div className="w-8"></div>
          </div>
        </header>
        <main className="flex justify-center items-center h-64">
          <p className="text-red-500 text-sm">ログインが必要です</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">予約承認管理</h1>
          <Button
            onClick={() => refetch()}
            disabled={isLoadingReservations}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingReservations ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-4">
        
        {/* Info Banner */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h2 className="font-medium text-blue-900 mb-1 text-sm">
            承認待ちの予約: {pendingReservations.length}件
          </h2>
          <p className="text-xs text-blue-700">
            各予約を確認し、承認または拒否してください。承認後、生徒に決済案内が送信されます。
          </p>
        </Card>

        {isLoadingReservations ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm">承認待ち予約を読み込み中...</p>
            </div>
          </div>
        ) : queryError ? (
          <Card className="p-4 border-red-300 bg-red-50">
            <p className="text-red-500 text-sm">{(queryError as Error).message}</p>
            <Button onClick={() => refetch()} className="mt-2" variant="outline" size="sm">
              再読み込み
            </Button>
          </Card>
        ) : pendingReservations.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">承認待ちの予約はありません</h3>
            <p className="text-gray-600 text-sm">新しい予約申請があると、ここに表示されます。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingReservations.map((reservation) => (
              <Card key={reservation.id} className="p-4 active:scale-95 transition-transform">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">
                        {reservation.student.name || reservation.student.email}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {reservation.student.email && reservation.student.name 
                          ? reservation.student.email 
                          : ''}
                      </p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      承認待ち
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(reservation.bookedStartTime)} {formatTime(reservation.bookedStartTime)} - {formatTime(reservation.bookedEndTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <UserIcon className="w-4 h-4" />
                      <span>{reservation.durationMinutes}分 / ¥{reservation.totalAmount.toLocaleString()}</span>
                    </div>
                    {reservation.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <strong>備考:</strong> {reservation.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApprove(reservation.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      承認
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedReservation(reservation);
                        setRejectDialog(true);
                      }}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      拒否
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">予約を拒否</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              拒否理由を入力してください。この理由は生徒に通知されます。
            </p>
            <div className="space-y-2">
              <Label htmlFor="reject-reason" className="text-sm">拒否理由</Label>
              <Textarea
                id="reject-reason"
                placeholder="例：その時間は既に他の予約が入っています"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button 
              onClick={handleReject} 
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              variant="destructive"
              className="w-full"
            >
              {rejectMutation.isPending ? '処理中...' : '拒否する'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setRejectDialog(false);
                setRejectReason('');
                setSelectedReservation(null);
              }}
              className="w-full"
            >
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
'use client';

// このページは動的である必要があります（認証チェックのため）
export const dynamic = 'force-dynamic';

import { User } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { MentorApprovalCard } from '@/app/dashboard/reservations/_components/MentorApprovalCard';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button } from '@ui/button';

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

export default function MentorApprovalsPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    },
    onError: (error) => {
      toast.error(`拒否に失敗しました: ${error.message}`);
    }
  });

  const handleApprove = async (reservationId: string) => {
    await approveMutation.mutateAsync(reservationId);
  };

  const handleReject = async (reservationId: string, reason: string) => {
    await rejectMutation.mutateAsync({ reservationId, reason });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">ログインが必要です</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <header className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">予約承認管理</h1>
            <p className="text-gray-600 mt-1">生徒からの予約申請を確認し、承認または拒否してください</p>
          </div>
          
          <Button
            onClick={() => refetch()}
            disabled={isLoadingReservations}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingReservations ? 'animate-spin' : ''}`} />
            更新
          </Button>
        </div>
      </header>

      {isLoadingReservations ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>承認待ち予約を読み込み中...</p>
          </div>
        </div>
      ) : queryError ? (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <p className="text-red-500">{(queryError as Error).message}</p>
          <Button onClick={() => refetch()} className="mt-2" variant="outline">
            再読み込み
          </Button>
        </div>
      ) : pendingReservations.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">承認待ちの予約はありません</h3>
          <p className="text-gray-600">新しい予約申請があると、ここに表示されます。</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-medium text-blue-900 mb-1">
              承認待ちの予約: {pendingReservations.length}件
            </h2>
            <p className="text-sm text-blue-700">
              各予約を確認し、承認または拒否してください。承認後、生徒に決済案内が送信されます。
            </p>
          </div>

          <div className="grid gap-6">
            {pendingReservations.map((reservation) => (
              <MentorApprovalCard
                key={reservation.id}
                reservation={reservation}
                onApprove={handleApprove}
                onReject={handleReject}
                isLoading={approveMutation.isPending || rejectMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
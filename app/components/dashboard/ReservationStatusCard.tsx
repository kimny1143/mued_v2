"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { CheckCircleIcon, AlertCircleIcon, ClockIcon } from "lucide-react";
import { ReservationStatusData, DashboardCardProps } from "./types";
import { supabaseBrowser } from '@/lib/supabase-browser';

// APIレスポンス用の型定義
interface Reservation {
  id: string;
  status: string;
  studentId?: string;
  mentorId?: string;
}

export const ReservationStatusCard: React.FC<DashboardCardProps> = ({ userRole, userId }) => {
  const [statusData, setStatusData] = useState<ReservationStatusData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservationStatus = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);
        console.log('予約状況取得開始:', { userRole, userId });

        // 認証トークンを取得
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        
        if (!token) {
          throw new Error('認証が必要です。ログインしてください。');
        }

        const response = await fetch(`/api/reservations`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`API通信エラー: ${response.status}`);
        }

        const reservations: Reservation[] = await response.json();
        console.log('取得した予約一覧:', reservations);
        
        // ステータス別に集計
        const pendingApproval = reservations.filter((res: Reservation) => res.status === 'PENDING_APPROVAL').length;
        const approved = reservations.filter((res: Reservation) => res.status === 'APPROVED').length;
        const confirmed = reservations.filter((res: Reservation) => res.status === 'CONFIRMED').length;
        
        setStatusData({
          pendingApproval,
          approved,
          confirmed
        });
      } catch (err) {
        console.error('予約状況取得エラー:', err);
        setError(err instanceof Error ? err.message : '予約状況の取得に失敗しました');
        setStatusData({ pendingApproval: 0, approved: 0, confirmed: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchReservationStatus();
  }, [userRole, userId]);

  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="flex items-center mb-4">
          <ClockIcon className="h-5 w-5 mr-2 text-green-500" />
          <h3 className="font-semibold">予約状況</h3>
        </div>
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <p className="text-sm text-gray-500">読み込み中...</p>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center mb-4">
        <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
        <h3 className="font-semibold">予約状況</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircleIcon className="h-4 w-4 mr-2 text-yellow-500" />
            <span className="text-sm text-gray-600">
              {userRole === 'mentor' ? '承認待ち' : '承認待ち'}
            </span>
          </div>
          <span className="text-lg font-semibold text-yellow-600">{statusData.pendingApproval || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-2 text-blue-500" />
            <span className="text-sm text-gray-600">
              {userRole === 'mentor' ? '承認済み' : '決済待ち'}
            </span>
          </div>
          <span className="text-lg font-semibold text-blue-600">{statusData.approved || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
            <span className="text-sm text-gray-600">確定済み</span>
          </div>
          <span className="text-lg font-semibold text-green-600">{statusData.confirmed || 0}</span>
        </div>
      </div>
    </Card>
  );
}; 
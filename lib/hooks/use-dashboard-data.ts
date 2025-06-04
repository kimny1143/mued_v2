'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { initializeAuth, getAuthState } from '@/lib/auth-singleton';

export interface DashboardData {
  user: {
    id: string;
    email: string;
    name?: string;
    role_id: string;
    roleName?: string;
    image?: string;
    roleCache?: string[];
  };
  subscription: {
    priceId: string | null;
    status: string;
    currentPeriodEnd: number | null;
  };
  dashboard: {
    todaySchedule: Array<{
      id: string;
      startTime: string;
      endTime: string;
      actorName: string;
      status: string;
    }>;
    reservationStats: {
      pendingApproval: number;
      approved: number;
      confirmed: number;
    };
    totalReservations: number;
  };
}

export function useDashboardData() {
  // 認証を初期化
  useEffect(() => {
    initializeAuth();
  }, []);

  return useQuery<DashboardData>({
    queryKey: ['dashboard', 'unified'],
    queryFn: async () => {
      // 認証状態を確認
      const authState = getAuthState();
      if (!authState.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/dashboard/unified', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🚀 統合ダッシュボードデータ取得完了:', {
        userId: data.user?.id,
        role: data.user?.role_id,
        todayScheduleCount: data.dashboard?.todaySchedule?.length || 0,
        totalReservations: data.dashboard?.totalReservations || 0
      });

      return data;
    },
    enabled: true,
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分
    retry: (failureCount, error) => {
      // 認証エラーの場合はリトライしない
      if (error instanceof Error && error.message === 'Unauthorized') {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });
}
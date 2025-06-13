'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, isPast, isFuture } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createBrowserClient } from '@supabase/ssr';
import { formatJst } from '@/lib/utils/timezone';
// Tabs component removed to avoid import issues

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MobileReservationsClientProps {
  reservations: any[];
  isMentor: boolean;
  userId: string;
}

export default function MobileReservationsClient({ 
  reservations: initialReservations, 
  isMentor, 
  userId 
}: MobileReservationsClientProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialReservations);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(false);

  // 予約をフィルタリング
  const upcomingReservations = reservations.filter(r => 
    isFuture(new Date(r.booked_start_time)) || 
    r.status === 'PENDING_APPROVAL' || 
    r.status === 'APPROVED'
  );
  
  const pastReservations = reservations.filter(r => 
    isPast(new Date(r.booked_start_time)) && 
    (r.status === 'COMPLETED' || r.status === 'CANCELLED')
  );

  // リアルタイム更新
  useEffect(() => {
    const channel = supabase
      .channel('reservation-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations',
          filter: isMentor ? undefined : `student_id=eq.${userId}`
        },
        async () => {
          // 予約データを再取得
          const response = await fetch('/api/reservations');
          const data = await response.json();
          if (data.reservations) {
            setReservations(data.reservations);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isMentor]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING_APPROVAL: { label: '承認待ち', className: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: '承認済み', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: '却下', className: 'bg-red-100 text-red-800' },
      CANCELLED: { label: 'キャンセル', className: 'bg-gray-100 text-gray-800' },
      COMPLETED: { label: '完了', className: 'bg-blue-100 text-blue-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING_APPROVAL;

    return (
      <span className={`text-xs px-2 py-1 rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const handleAction = async (reservationId: string, action: 'approve' | 'reject' | 'cancel') => {
    if (!confirm(`この予約を${action === 'approve' ? '承認' : action === 'reject' ? '却下' : 'キャンセル'}しますか？`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Supabaseセッションを取得
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('ログインが必要です');
        return;
      }
      
      const response = await fetch(`/api/reservations/${reservationId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        // 予約データを再取得
        const res = await fetch('/api/reservations', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setReservations(data);
        } else if (data.reservations) {
          setReservations(data.reservations);
        }
        
        // 成功メッセージ
        alert(action === 'approve' ? '予約を承認しました' : action === 'reject' ? '予約を却下しました' : '予約をキャンセルしました');
      } else {
        const error = await response.json();
        alert(error.error || '処理に失敗しました');
      }
    } catch (error) {
      console.error('Action error:', error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const renderReservationCard = (reservation: any) => {
    const mentorName = reservation.lesson_slots?.users?.name || reservation.lesson_slots?.users?.email?.split('@')[0];
    const studentName = reservation.users?.name || reservation.users?.email?.split('@')[0];
    // Zサフィックスを追加してUTCとして解釈
    const startTimeStr = reservation.booked_start_time.endsWith('Z') ? reservation.booked_start_time : reservation.booked_start_time + 'Z';
    const endTimeStr = reservation.booked_end_time.endsWith('Z') ? reservation.booked_end_time : reservation.booked_end_time + 'Z';
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    return (
      <div key={reservation.id} className="bg-white rounded-lg shadow-sm p-4 mb-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium">
              {isMentor ? studentName : mentorName}
              <span className="text-sm text-gray-500 ml-1">
                {isMentor ? '生徒' : '先生'}
              </span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {formatJst(startTime, 'yyyy年M月d日(E)')}
            </p>
            <p className="text-sm text-gray-600">
              {formatJst(startTime, 'HH:mm')} - {formatJst(endTime, 'HH:mm')}
              <span className="ml-2">({reservation.duration_minutes}分)</span>
            </p>
          </div>
          {getStatusBadge(reservation.status)}
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t">
          <span className="text-sm font-medium">
            ¥{reservation.total_amount.toLocaleString()}
          </span>
          
          {/* アクションボタン */}
          <div className="flex gap-2">
            {isMentor && reservation.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  onClick={() => handleAction(reservation.id, 'approve')}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded-md disabled:opacity-50"
                >
                  承認
                </button>
                <button
                  onClick={() => handleAction(reservation.id, 'reject')}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-md disabled:opacity-50"
                >
                  却下
                </button>
              </>
            )}
            
            {!isMentor && reservation.status === 'PENDING_APPROVAL' && (
              <button
                onClick={() => handleAction(reservation.id, 'cancel')}
                disabled={loading}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md disabled:opacity-50"
              >
                キャンセル
              </button>
            )}

            <button
              onClick={() => router.push(`/m/dashboard/reservations/${reservation.id}`)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              詳細
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">予約一覧</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* タブ */}
      <div className="bg-white border-b">
        <div className="px-4 py-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'upcoming' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              今後の予約 ({upcomingReservations.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'past' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              過去の予約 ({pastReservations.length})
            </button>
          </div>
        </div>
      </div>

      {/* 予約リスト */}
      <main className="p-4 pb-20">
        {activeTab === 'upcoming' ? (
          upcomingReservations.length > 0 ? (
            upcomingReservations.map(renderReservationCard)
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">予約はありません</p>
              <button
                onClick={() => router.push('/m/dashboard/booking-calendar')}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md text-sm"
              >
                {isMentor ? 'スロットを作成' : '予約する'}
              </button>
            </div>
          )
        ) : (
          pastReservations.length > 0 ? (
            pastReservations.map(renderReservationCard)
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">過去の予約はありません</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}
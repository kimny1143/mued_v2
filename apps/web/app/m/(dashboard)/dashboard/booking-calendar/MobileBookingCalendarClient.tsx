'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import MobileCalendarView from './_components/MobileCalendarView';
import MobileBookingModal from './_components/MobileBookingModal';
import type { LessonSlot, Reservation } from './_types/calendar';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MobileBookingCalendarClientProps {
  userId: string;
  isMentor: boolean;
}

export default function MobileBookingCalendarClient({ userId, isMentor }: MobileBookingCalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessonSlots, setLessonSlots] = useState<LessonSlot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<LessonSlot | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  // データ取得
  const fetchData = useCallback(async () => {
    console.log('🔥 Mobile fetchData STARTED');
    try {
      setLoading(true);
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      // Supabaseセッションからトークンを取得
      console.log('📱 Getting Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📱 Session:', session ? 'Found' : 'Not found');
      
      if (!session) {
        setLoading(false);
        return;
      }

      // レッスンスロット取得
      const slotsUrl = isMentor 
        ? `/api/lesson-slots?startDate=${startDate}&endDate=${endDate}&viewMode=own`
        : `/api/lesson-slots?startDate=${startDate}&endDate=${endDate}&viewMode=all`;
      console.log('📱 Fetching from:', slotsUrl);
      
      const slotsResponse = await fetch(slotsUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      console.log('📱 Slots response status:', slotsResponse.status);
      if (!slotsResponse.ok) {
        console.log('📱 Slots response failed');
        setLessonSlots([]);
        return;
      }
      const slotsData = await slotsResponse.json();
      console.log('📱 Slots data received:', slotsData.length || 'not array');
      
      // APIは配列を直接返すので、そのまま設定
      if (Array.isArray(slotsData)) {
        setLessonSlots(slotsData);
        // デバッグ: スロット内の予約情報を確認
        const slotsWithReservations = slotsData.filter((s: any) => s.reservations && s.reservations.length > 0);
        if (slotsWithReservations.length > 0) {
          console.log('📱 スロット内予約情報:', 
            slotsWithReservations.map((s: any) => ({
              slotId: s.id,
              teacherId: s.teacherId,
              reservationCount: s.reservations.length,
              reservations: s.reservations
            }))
          );
        }
      } else if (slotsData.lessonSlots) {
        // 後方互換性のため
        setLessonSlots(slotsData.lessonSlots);
      } else {
        setLessonSlots([]);
      }

      // 予約情報取得
      console.log('📱 Fetching reservations...');
      const reservationsResponse = await fetch(`/api/reservations?startDate=${startDate}&endDate=${endDate}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      console.log('📱 Reservations response status:', reservationsResponse.status);
      if (!reservationsResponse.ok) {
        console.log('📱 Reservations response failed');
        setReservations([]);
        return;
      }
      const reservationsData = await reservationsResponse.json();
      console.log('📱 Reservations data received:', reservationsData.length || 'not array');
      
      // APIは配列を直接返すので、そのまま設定
      if (Array.isArray(reservationsData)) {
        setReservations(reservationsData);
        console.log('📱 予約データ取得:', {
          count: reservationsData.length,
          sample: reservationsData.slice(0, 3).map((r: any) => ({
            id: r.id,
            slotId: r.slotId,
            status: r.status,
            bookedTime: `${r.bookedStartTime} - ${r.bookedEndTime}`
          }))
        });
      } else if (reservationsData.reservations) {
        // 後方互換性のため
        setReservations(reservationsData.reservations);
      } else {
        setReservations([]);
      }
    } catch (error) {
      console.error('📱 Error fetching data:', error);
    } finally {
      console.log('📱 Mobile fetchData COMPLETED');
      setLoading(false);
    }
  }, [currentDate, isMentor]);

  // 初回読み込みと成功/キャンセル処理
  useEffect(() => {
    fetchData();

    // URLパラメータチェック
    const success = searchParams.get('success');
    const setupSuccess = searchParams.get('setup_success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      // 成功通知（実際のトースト実装は省略）
    } else if (setupSuccess === 'true') {
      // Setup完了通知
      // データを再取得して最新の予約を表示
      fetchData();
    } else if (canceled === 'true') {
      // キャンセル通知
    }
  }, [fetchData, searchParams]);

  // リアルタイム更新
  useEffect(() => {
    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_slots' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleSlotSelect = (slot: LessonSlot) => {
    setSelectedSlot(slot);
    setIsBookingModalOpen(true);
  };

  const handleBookingComplete = () => {
    setIsBookingModalOpen(false);
    setSelectedSlot(null);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-lg font-semibold">
            {isMentor ? 'スロット管理' : '予約カレンダー'}
          </h1>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 -mr-2"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* ビューモード切替 */}
        <div className="px-4 pb-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              月表示
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'day' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              日表示
            </button>
          </div>
        </div>
      </header>

      {/* カレンダー本体 */}
      <main className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <MobileCalendarView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            lessonSlots={lessonSlots}
            reservations={reservations}
            onSlotSelect={handleSlotSelect}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isMentor={isMentor}
          />
        )}
      </main>

      {/* 予約モーダル */}
      {selectedSlot && !isMentor && (
        <MobileBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedSlot(null);
          }}
          slot={selectedSlot}
          onComplete={handleBookingComplete}
        />
      )}

      {/* メンター用フローティングアクションボタン */}
      {isMentor && (
        <button
          onClick={() => router.push('/m/dashboard/slots/new')}
          className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}
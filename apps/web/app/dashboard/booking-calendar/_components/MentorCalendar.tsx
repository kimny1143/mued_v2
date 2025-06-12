'use client';

import { startOfDay } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { isDebugMode, debugLog, verboseDebugLog } from '@/lib/debug';
import type { LessonSlot, Reservation } from '@/lib/types';

import type { ExtendedTimeSlot, OtherReservation, TimeSlot } from '../_types/calendar.js';

import { BookingModal } from './BookingModal';
import { CalendarNavigation } from './CalendarNavigation';
import { DayView } from './DayView';
import { Mentor } from './MentorList';
import { MonthView } from './MonthView';


// デバッグモード（環境変数ベース）
const DEBUG = true; // 一時的にデバッグ有効化

interface MentorCalendarProps {
  mentors: Mentor[];
  isLoading?: boolean;
  onDateSelect?: (selectedDates: Date[]) => void;
  onTimeSlotSelect?: (slot: TimeSlot) => void;
  onRefreshData?: () => void;
  myReservations?: Array<{
    id: string;
    slotId: string;
    studentId: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'APPROVED' | 'PENDING_APPROVAL';
    bookedStartTime: string;
    bookedEndTime: string;
    createdAt: string;
    slot?: {
      id: string;
      teacherId: string;
      teacher?: {
        id: string;
        name: string | null;
      };
    };
  }>;
}

export const MentorCalendar: React.FC<MentorCalendarProps> = ({
  mentors,
  isLoading: propsIsLoading = false,
  onDateSelect,
  onTimeSlotSelect,
  onRefreshData,
  myReservations = [],
}) => {
  // 現在表示中の日付
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // ビュー管理
  const [currentView, setCurrentView] = useState<'month' | 'day' | 'week'>('month');
  const [selectedDateForDay, setSelectedDateForDay] = useState<Date | null>(null);
  
  // 統合された予約時間枠（全メンター）
  const [allTimeSlots, setAllTimeSlots] = useState<ExtendedTimeSlot[]>([]);
  
  // 他の予約情報（プライバシー保護のため時間のみ）
  const [otherReservations, setOtherReservations] = useState<OtherReservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  
  // 選択された日付
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // モーダル関連のstate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSelectedDate, setModalSelectedDate] = useState<Date | null>(null);
  const [modalSelectedSlot, setModalSelectedSlot] = useState<ExtendedTimeSlot | null>(null);
  const [modalSelectedMentor, setModalSelectedMentor] = useState<Mentor | null>(null);

  // コンポーネント初期化時のデバッグ
  debugLog('🔵 MentorCalendar コンポーネント初期化（新設計）');
  debugLog('mentors props:', mentors);
  debugLog('mentors.length:', mentors?.length);
  
  if (mentors && mentors.length > 0) {
    verboseDebugLog('最初のメンター:', mentors[0]);
    verboseDebugLog('最初のメンターのavailableSlots:', mentors[0].availableSlots);
  }

  // 特定の日付の全ての予約情報を取得する関数
  const fetchReservationsForDate = async (date: Date) => {
    setIsLoadingReservations(true);
    try {
      const response = await fetch('/api/reservations?includeAll=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('予約情報の取得に失敗しました');
      }

      const allReservations: Array<{
        id: string;
        slotId: string;
        status: string;
        bookedStartTime: string;
        bookedEndTime: string;
        studentId: string;
      }> = await response.json();
      
      debugLog('📅 API応答:', allReservations);
      
      // 指定された日付の予約のみをフィルタリング
      const dateReservations = allReservations.filter((reservation) => {
        const reservationDate = new Date(reservation.bookedStartTime);
        return (
          reservationDate.getFullYear() === date.getFullYear() &&
          reservationDate.getMonth() === date.getMonth() &&
          reservationDate.getDate() === date.getDate()
        );
      });

      debugLog('📅 日付フィルタ後:', dateReservations);

      // 自分の予約以外をフィルタリング（プライバシー保護）
      const otherReservationsForDate = dateReservations.filter((reservation) => {
        return !myReservations.some(myRes => myRes.id === reservation.id);
      }).map((reservation) => ({
        id: reservation.id,
        slotId: reservation.slotId,
        status: reservation.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'APPROVED' | 'PENDING_APPROVAL',
        bookedStartTime: reservation.bookedStartTime,
        bookedEndTime: reservation.bookedEndTime,
        studentId: reservation.studentId, // プライバシー保護のため表示には使用しない
      }));

      debugLog('📅 取得した他の予約情報:', otherReservationsForDate);
      setOtherReservations(otherReservationsForDate);
      
    } catch (error) {
      console.error('予約情報取得エラー:', error);
      setOtherReservations([]);
    } finally {
      setIsLoadingReservations(false);
    }
  };

  // 全メンターの時間枠を統合して取得
  useEffect(() => {
    debugLog('🔴 useEffect実行開始（全メンター統合 + 予約状況分析）');
    verboseDebugLog('mentors:', mentors);
    debugLog('mentors.length:', mentors?.length);
    
    if (!mentors || mentors.length === 0) {
      debugLog('🔴 mentorsが空のため終了');
      setAllTimeSlots([]);
      return;
    }
    
    try {
      // 全メンターの空き時間を統合
      const allSlots: ExtendedTimeSlot[] = [];
      
      mentors.forEach(mentor => {
        if (mentor.availableSlots && mentor.availableSlots.length > 0) {
          const mentorSlots = mentor.availableSlots
            .filter((slot: LessonSlot) => slot.id) // idが存在するもののみ
            .map((slot: LessonSlot) => {
              // 予約状況の分析
              const slotStart = new Date(slot.startTime).getTime();
              const slotEnd = new Date(slot.endTime).getTime();
              const slotDuration = slotEnd - slotStart;
              
              let bookedTime = 0;
              let reservationCount = 0;
              
              if (slot.reservations && slot.reservations.length > 0) {
                // アクティブな予約（スロットの空き状況に影響する全ての予約ステータス）を取得
                const activeReservations = slot.reservations.filter(
                  (res: Reservation) => res.status === 'CONFIRMED' || res.status === 'PENDING' || res.status === 'APPROVED' || res.status === 'PENDING_APPROVAL'
                );
                
                reservationCount = activeReservations.length;
                
                console.log(`🔍 スロット ${slot.id} の予約分析:`, {
                  slotId: slot.id,
                  totalReservations: slot.reservations.length,
                  activeReservations: activeReservations.length,
                  reservationStatuses: slot.reservations.map(r => r.status),
                  activeStatuses: activeReservations.map(r => r.status)
                });
                
                // 予約済み時間を計算
                activeReservations.forEach((reservation: Reservation) => {
                  if (reservation.bookedStartTime && reservation.bookedEndTime) {
                    const bookStart = new Date(reservation.bookedStartTime).getTime();
                    const bookEnd = new Date(reservation.bookedEndTime).getTime();
                    
                    const effectiveStart = Math.max(bookStart, slotStart);
                    const effectiveEnd = Math.min(bookEnd, slotEnd);
                    
                    if (effectiveStart < effectiveEnd) {
                      bookedTime += effectiveEnd - effectiveStart;
                    }
                  }
                });
              }
              
              const availableTime = slotDuration - bookedTime;
              const bookingRate = bookedTime / slotDuration;
          
              // 予約状況のカテゴリ判定
              let bookingStatus: 'available' | 'partial' | 'full' | 'unavailable';
              if (!slot.isAvailable) {
                bookingStatus = 'unavailable';
              } else if (bookingRate === 0) {
                bookingStatus = 'available';
              } else if (bookingRate >= 0.9) {
                bookingStatus = 'full';
              } else {
                bookingStatus = 'partial';
              }
              
              console.log(`📊 スロット ${slot.id} の最終分析結果:`, {
                slotId: slot.id,
                slotDuration: Math.round(slotDuration / (60 * 1000)) + '分',
                bookedTime: Math.round(bookedTime / (60 * 1000)) + '分',
                availableTime: Math.round(availableTime / (60 * 1000)) + '分',
                bookingRate: Math.round(bookingRate * 100) + '%',
                決定されたステータス: bookingStatus
              });
              
              return {
                id: slot.id!,
                startTime: slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime),
                endTime: slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime),
                isAvailable: slot.isAvailable !== false,
                hourlyRate: slot.hourlyRate || 5000,
                reservations: slot.reservations || [],
                // メンター情報も保持
                mentorId: mentor.id,
                mentorName: mentor.name,
                // 予約状況情報を追加
                bookingStatus,
                reservationCount,
                bookedTime: Math.round(bookedTime / (60 * 1000)), // 分単位
                availableTime: Math.round(availableTime / (60 * 1000)), // 分単位
                bookingRate: Math.round(bookingRate * 100) // パーセント
              } as ExtendedTimeSlot;
            });
          
          allSlots.push(...mentorSlots);
        }
      });
      
      debugLog('📊 統合後の全timeSlots（予約状況付き）:', allSlots);
      debugLog('📊 統合後の全timeSlots数:', allSlots.length);
      
      // 予約状況の統計
      const statusCounts = allSlots.reduce((acc, slot) => {
        acc[slot.bookingStatus] = (acc[slot.bookingStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      verboseDebugLog('📈 予約状況統計:', statusCounts);
      
      setAllTimeSlots(allSlots);
      
      } catch (err) {
      console.error('時間枠統合エラー:', err);
        setError('予約可能な時間枠の取得に失敗しました。');
      }
  }, [mentors]);

  // 日表示に切り替わった時に予約情報を取得
  useEffect(() => {
    if (currentView === 'day' && selectedDateForDay) {
      fetchReservationsForDate(selectedDateForDay);
    }
  }, [currentView, selectedDateForDay, myReservations]);

  // 日表示でのリアルタイム更新を設定
  useEffect(() => {
    let dayViewSubscription: ReturnType<typeof import('@/lib/supabase-browser').supabaseBrowser.channel> | null = null;

    const setupDayViewRealtimeSubscription = async () => {
      // 日表示でない場合はリアルタイム監視をスキップ
      if (currentView !== 'day' || !selectedDateForDay) {
        return;
      }

      try {
        // 認証されたユーザーの情報を取得
        const { data: sessionData } = await import('@/lib/supabase-browser').then(m => m.supabaseBrowser.auth.getSession());
        if (!sessionData.session?.user?.id) {
          console.log('認証されていないため、日表示リアルタイム監視をスキップ');
          return;
        }

        const userId = sessionData.session.user.id;
        console.log('🔴 日表示リアルタイム監視を開始:', userId, selectedDateForDay);

        // reservationsテーブルの変更を監視（日表示専用）
        dayViewSubscription = (await import('@/lib/supabase-browser')).supabaseBrowser
          .channel(`day-view-reservations-${selectedDateForDay.toISOString().split('T')[0]}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'reservations',
            },
            (payload) => {
              console.log('📝 日表示reservationsリアルタイム更新を受信:', payload);
              
              // 選択された日付の予約情報を再取得
              setTimeout(() => {
                console.log('🔄 日表示reservations変更によるデータ再取得');
                if (selectedDateForDay) {
                  fetchReservationsForDate(selectedDateForDay);
                }
              }, 500);
            }
          )
          .subscribe((status) => {
            console.log('日表示reservationsリアルタイム監視状態:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ 日表示reservationsリアルタイム監視が開始されました');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ 日表示reservationsリアルタイム監視でエラーが発生しました:', status);
            }
          });

      } catch (error) {
        console.error('日表示リアルタイム監視の設定エラー:', error);
      }
    };

    setupDayViewRealtimeSubscription();

    // クリーンアップ
    return () => {
      if (dayViewSubscription) {
        console.log('日表示reservationsリアルタイム監視を停止');
        import('@/lib/supabase-browser').then(m => m.supabaseBrowser.removeChannel(dayViewSubscription!));
      }
    };
  }, [currentView, selectedDateForDay]);
  
  // 予約可能な日付リスト（月表示で色付けするため）
  const availableDays = Array.from(new Set(
    allTimeSlots
      .filter(slot => slot.isAvailable)
      .map(slot => startOfDay(new Date(slot.startTime)).getTime())
  )).map(timestamp => new Date(timestamp));

  // 日付選択時の処理（ビュー切り替え対応）
  const handleDateClick = (date: Date) => {
      // 日表示に切り替え
      setCurrentView('day');
      setSelectedDateForDay(date);
      setSelectedDates([date]);
    
    if (onDateSelect) {
        onDateSelect([date]);
    }
  };

  // ビュー切り替え処理
  const handleViewChange = (view: 'month' | 'day' | 'week') => {
    if (view === 'week') {
      // 週表示は月表示として扱う
      setCurrentView('month');
    } else {
      setCurrentView(view);
    }
    
    if (view === 'month' || view === 'week') {
      setSelectedDateForDay(null);
      setSelectedDates([]);
      setOtherReservations([]); // 月表示に戻る時は他の予約情報をクリア
    }
  };

  // 日表示で日付を変更する処理
  const handleDayNavigation = (date: Date) => {
    setSelectedDateForDay(date);
    setCurrentDate(date);
  };

  // スロットクリック時の処理
  const handleSlotClick = (date: Date, slot: ExtendedTimeSlot, mentor: Mentor | null) => {
    setModalSelectedDate(date);
    setModalSelectedSlot(slot);
    setModalSelectedMentor(mentor);
    setIsModalOpen(true);
  };

  // 日表示でのスロットクリック処理
  const handleDaySlotClick = (slot: ExtendedTimeSlot, mentor: Mentor | null) => {
    setModalSelectedDate(selectedDateForDay);
    setModalSelectedSlot(slot);
    setModalSelectedMentor(mentor);
    setIsModalOpen(true);
  };

  // モーダルを閉じる処理
  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalSelectedDate(null);
    setModalSelectedSlot(null);
    setModalSelectedMentor(null);
  };

  // 予約完了時の処理
  const handleBookingComplete = () => {
    setIsModalOpen(false);
    setModalSelectedDate(null);
    setModalSelectedSlot(null);
    setModalSelectedMentor(null);
    setSelectedDates([]);
    
    // 予約完了後、日表示の場合は予約情報を再取得
    if (currentView === 'day' && selectedDateForDay) {
      fetchReservationsForDate(selectedDateForDay);
    }
    
    // 親コンポーネントのデータも再取得
    if (onRefreshData) {
      console.log('🔄 予約完了後のデータ再取得を実行');
      onRefreshData();
    }
  };

  // 日付ナビゲーションの処理
  const handleDateNavigation = (date: Date) => {
    setCurrentDate(date);
  };

  return (
    <div className="flex flex-col space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg flex items-center mb-4" role="alert">
          <AlertCircle className="h-4 w-4 mr-2" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      
      {DEBUG && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-semibold mb-2 text-blue-900">📊 カレンダー情報</h3>
          <div className="text-xs space-y-1 text-blue-800">
            <p>• 総スロット数: <span className="font-medium">{allTimeSlots.length}</span></p>
            <p>• 予約可能日: <span className="font-medium">{availableDays.length}日</span></p>
            <p>• 選択中メンター: <span className="font-medium">{mentors.length > 0 ? mentors[0].name : '未選択'}</span></p>
            {currentView === 'day' && (
              <p>• 他の予約数: <span className="font-medium">{otherReservations.length}件</span></p>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* 全メンター情報表示 - モバイル最適化 */}
        {mentors.length > 0 && (
          <div className="py-4 sm:py-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">利用可能なメンター</h3>
              <div className="text-xs sm:text-sm text-gray-500">
                {mentors.length}人のメンターが利用可能
              </div>
            </div>
            
            {/* メンター一覧 - モバイル対応 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {mentors.map((mentor) => (
                <div key={mentor.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg border border-gray-200">
                  {mentor.image ? (
                    <img
                      src={mentor.image}
                      alt={mentor.name || ''}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium flex-shrink-0 text-xs sm:text-sm">
                      {mentor.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate text-sm sm:text-base">{mentor.name}</div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      {mentor.availableSlotsCount || 0}スロット利用可能
                    </div>
                    {mentor.specialties && mentor.specialties.length > 0 && (
                      <div className="text-xs text-gray-400 mt-1 hidden sm:block">
                        {mentor.specialties.slice(0, 2).join(', ')}
                        {mentor.specialties.length > 2 && '...'}
                      </div>
                    )}
                  </div>
                  {mentor.rating && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs sm:text-sm font-medium text-yellow-600">
                        ★{mentor.rating.avgRating}
                      </div>
                      <div className="text-xs text-gray-400">
                        ({mentor.rating.totalReviews}件)
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="py-4">
          <CalendarNavigation
            currentDate={currentDate}
            onDateChange={handleDateNavigation}
            view={'month'}
            onViewChange={handleViewChange}
          />
        </div>
        
        {propsIsLoading ? (
          <div className="flex justify-center items-center h-64" aria-live="polite" aria-busy="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="sr-only">読み込み中...</span>
          </div>
        ) : (
          <>
            {currentView === 'month' ? (
                <div className="pb-4 sm:pb-6">
                  <h4 className="font-semibold mb-4 text-gray-900 text-center text-sm sm:text-base">予約可能日カレンダー</h4>
                <MonthView
                  currentDate={currentDate}
                  allTimeSlots={allTimeSlots}
                  myReservations={myReservations}
                  mentors={mentors}
                  onDateClick={handleDateClick}
                  onSlotClick={handleSlotClick}
                  selectedDates={selectedDates}
                />
                
                {/* 凡例 - モバイル最適化 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">予約状況の見方</h5>
                  
                  {/* 生徒の予約表示の凡例 */}
                  <div className="mb-4">
                    <h6 className="text-xs font-medium text-gray-600 mb-2">あなたの予約</h6>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 text-xs font-medium rounded border-2 bg-blue-100 border-blue-400 text-blue-800">
                          🎵 確定済み
                        </div>
                        <span>レッスン確定</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 text-xs font-medium rounded border-2 bg-teal-100 border-teal-400 text-teal-800">
                          ✅ 承認済み
                        </div>
                        <span>決済待ち</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 text-xs font-medium rounded border-2 bg-orange-100 border-orange-400 text-orange-800">
                          ⏳ 承認待ち
                        </div>
                        <span>メンター確認中</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 text-xs font-medium rounded border-2 bg-yellow-100 border-yellow-400 text-yellow-800">
                          🎵 保留中
                        </div>
                        <span>処理中</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* スロットタグの凡例 */}
                  <div className="mb-4">
                    <h6 className="text-xs font-medium text-gray-600 mb-2">予約可能スロット</h6>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="calendar-slot-tag-available">
                          9:00
                        </div>
                        <span>完全空き</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="calendar-slot-tag-partial">
                          14:00
                        </div>
                        <span>部分予約</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="calendar-slot-tag-full">
                          16:00
                        </div>
                        <span>満席</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="calendar-slot-tag-unavailable">
                          18:00
                        </div>
                        <span>利用不可</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-gray-600 border-t pt-2">
                    💡 <strong>操作方法:</strong> 
                    <br />• 🎵マークの日付 = あなたの予約済み日
                    <br />• スロットタグをクリック→新規予約
                    <br />• 日付をクリック→詳細表示
                  </div>
                </div>
              </div>
            ) : (
              <DayView
                selectedDate={selectedDateForDay || new Date()}
                allTimeSlots={allTimeSlots}
                myReservations={myReservations}
                otherReservations={otherReservations}
                mentors={mentors}
                onSlotClick={handleDaySlotClick}
                onBackToMonth={() => handleViewChange('month')}
                onDayNavigation={handleDayNavigation}
                isLoadingReservations={isLoadingReservations}
              />
            )}
          </>
        )}
      </div>
      
      {/* 予約モーダル */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedDate={modalSelectedDate}
        mentors={mentors}
        preSelectedSlot={modalSelectedSlot}
        preSelectedMentor={modalSelectedMentor}
        onBookingComplete={handleBookingComplete}
      />
    </div>
  );
};

export default MentorCalendar; 

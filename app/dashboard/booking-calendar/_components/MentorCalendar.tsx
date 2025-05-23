'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CalendarChangeHandler, CalendarSelected, CalendarReserved } from '@demark-pro/react-booking-calendar';
import '@demark-pro/react-booking-calendar/dist/react-booking-calendar.css';
import { Mentor } from './MentorList';
import { CalendarNavigation } from './CalendarNavigation';
import { TimeSlotDisplay, TimeSlot } from './TimeSlotDisplay';
import { BookingModal } from './BookingModal';
import { startOfMonth, endOfMonth, isSameDay, addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, isSameMonth, getDay, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { fetchMentorAvailability, convertToReservedDates, getDefaultDateRange, hasAvailableSlotsOnDate } from '../_lib/calendarUtils';
import { AlertCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

// デバッグモード
const DEBUG = true;

// 予約状況情報を含む拡張TimeSlot型
interface ExtendedTimeSlot extends TimeSlot {
  mentorId: string;
  mentorName: string | null;
  bookingStatus: 'available' | 'partial' | 'full' | 'unavailable';
  reservationCount: number;
  bookedTime: number;
  availableTime: number;
  bookingRate: number;
}

interface MentorCalendarProps {
  mentors: Mentor[];
  isLoading?: boolean;
  onDateSelect?: (selectedDates: Date[]) => void;
  onTimeSlotSelect?: (slot: TimeSlot) => void;
}

export const MentorCalendar: React.FC<MentorCalendarProps> = ({
  mentors,
  isLoading: propsIsLoading = false,
  onDateSelect,
  onTimeSlotSelect,
}) => {
  // 現在表示中の日付
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // ビュー管理
  const [currentView, setCurrentView] = useState<'month' | 'day' | 'week'>('month');
  const [selectedDateForDay, setSelectedDateForDay] = useState<Date | null>(null);
  
  // 統合された予約時間枠（全メンター）
  const [allTimeSlots, setAllTimeSlots] = useState<ExtendedTimeSlot[]>([]);
  
  // 選択された日付
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  
  // 選択された時間枠
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // モーダル関連のstate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSelectedDate, setModalSelectedDate] = useState<Date | null>(null);

  // コンポーネント初期化時のデバッグ
  console.log('🔵 MentorCalendar コンポーネント初期化（新設計）');
  console.log('mentors props:', mentors);
  console.log('mentors.length:', mentors?.length);
  
  if (mentors && mentors.length > 0) {
    console.log('最初のメンター:', mentors[0]);
    console.log('最初のメンターのavailableSlots:', mentors[0].availableSlots);
  }

  // 全メンターの時間枠を統合して取得
  useEffect(() => {
    console.log('🔴 useEffect実行開始（全メンター統合 + 予約状況分析）');
    console.log('mentors:', mentors);
    console.log('mentors.length:', mentors?.length);
    
    if (!mentors || mentors.length === 0) {
      console.log('🔴 mentorsが空のため終了');
      setAllTimeSlots([]);
      return;
    }
    
    try {
      // 全メンターの空き時間を統合
      const allSlots: ExtendedTimeSlot[] = [];
      
      mentors.forEach(mentor => {
        if (mentor.availableSlots && mentor.availableSlots.length > 0) {
          const mentorSlots = mentor.availableSlots
            .filter(slot => slot.id) // idが存在するもののみ
            .map(slot => {
              // 予約状況の分析
              const slotStart = new Date(slot.startTime).getTime();
              const slotEnd = new Date(slot.endTime).getTime();
              const slotDuration = slotEnd - slotStart;
              
              let bookedTime = 0;
              let reservationCount = 0;
              
              if (slot.reservations && slot.reservations.length > 0) {
                const activeReservations = slot.reservations.filter(
                  res => res.status === 'CONFIRMED' || res.status === 'PENDING'
                );
                
                reservationCount = activeReservations.length;
                
                // 予約済み時間を計算
                activeReservations.forEach(reservation => {
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
              
              return {
                id: slot.id!,
                startTime: slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime),
                endTime: slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime),
                isAvailable: slot.isAvailable !== false,
                hourlyRate: slot.hourlyRate || 5000,
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
      
      console.log('📊 統合後の全timeSlots（予約状況付き）:', allSlots);
      console.log('📊 統合後の全timeSlots数:', allSlots.length);
      
      // 予約状況の統計
      const statusCounts = allSlots.reduce((acc, slot) => {
        acc[slot.bookingStatus] = (acc[slot.bookingStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('📈 予約状況統計:', statusCounts);
      
      setAllTimeSlots(allSlots);
      
    } catch (err) {
      console.error('時間枠統合エラー:', err);
      setError('予約可能な時間枠の取得に失敗しました。');
    }
  }, [mentors]);

  // カレンダーコンポーネントに渡す予約済み日時
  const reserved = convertToReservedDates(allTimeSlots);
  
  // 予約可能な日付リスト（月表示で色付けするため）
  const availableDays = Array.from(new Set(
    allTimeSlots
      .filter(slot => slot.isAvailable)
      .map(slot => startOfDay(new Date(slot.startTime)).getTime())
  )).map(timestamp => new Date(timestamp));
  
  // デバッグ情報を出力
  if (DEBUG && availableDays.length > 0) {
    console.log('利用可能な日付:', availableDays.map(d => format(d, 'yyyy/MM/dd')));
  }

  // 日付選択時の処理（ビュー切り替え対応）
  const handleDateClick = (date: Date) => {
    // その日に利用可能な時間帯があるかチェック
    const hasSlots = allTimeSlots.some(slot => 
      isSameDay(new Date(slot.startTime), date) && slot.isAvailable
    );
    
    if (hasSlots) {
      // 日表示に切り替え
      setCurrentView('day');
      setSelectedDateForDay(date);
      setSelectedDates([date]);
      
      if (onDateSelect) {
        onDateSelect([date]);
      }
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
    }
  };

  // 日表示で日付を変更する処理
  const handleDayNavigation = (date: Date) => {
    setSelectedDateForDay(date);
    setCurrentDate(date);
  };

  // モーダルを閉じる処理
  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalSelectedDate(null);
  };

  // 予約完了時の処理
  const handleBookingComplete = () => {
    setIsModalOpen(false);
    setModalSelectedDate(null);
    setSelectedDates([]);
    
    // 必要に応じて時間枠データを再取得
    // fetchTimeSlots();
  };

  // 日付ナビゲーションの処理
  const handleDateNavigation = (date: Date) => {
    setCurrentDate(date);
  };

  // 時間枠選択の処理
  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    
    if (onTimeSlotSelect) {
      onTimeSlotSelect(slot);
    }
  };

  // 日付が今日かどうかをチェック
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // 価格フォーマット関数
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
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
            {availableDays.length > 0 && (
              <p>• 近日の予約可能日: <span className="font-medium">{availableDays.slice(0, 3).map(d => format(d, 'M/d')).join(', ')}</span></p>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-4">
        {/* メンター情報表示 */}
        {mentors.length > 0 && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {mentors[0].image ? (
              <img
                src={mentors[0].image || ''}
                alt={mentors[0].name || ''}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {mentors[0].name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <div className="font-medium">{mentors[0].name}</div>
              <div className="text-sm text-gray-500">
                レッスン数: {mentors[0].availableSlotsCount || 0}回
              </div>
            </div>
          </div>
        )}
        
        <CalendarNavigation
          currentDate={currentDate}
          onDateChange={handleDateNavigation}
          view={'month'}
          onViewChange={handleViewChange}
        />
        
        {propsIsLoading ? (
          <div className="flex justify-center items-center h-64" aria-live="polite" aria-busy="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="sr-only">読み込み中...</span>
          </div>
        ) : (
          <>
            {currentView === 'month' ? (
              // 月表示
              <>
                {/* メイン月表示カレンダー */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-4 text-gray-900 text-center">予約可能日カレンダー</h4>
                  {availableDays.length > 0 ? (
                    <div className="grid grid-cols-7 gap-2">
                      {/* 曜日ヘッダー */}
                      {['月', '火', '水', '木', '金', '土', '日'].map((day, index) => (
                        <div key={index} className="text-center text-xs font-medium text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                      
                      {/* 月の日付を表示 */}
                      {(() => {
                        const monthStart = startOfMonth(currentDate);
                        const monthEnd = endOfMonth(currentDate);
                        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
                        const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                        
                        return calendarDays.map((date, index) => {
                          const daySlots = allTimeSlots.filter(slot => 
                            isSameDay(new Date(slot.startTime), date) && slot.isAvailable
                          );
                          const isCurrentMonth = isSameMonth(date, currentDate);
                          const isAvailable = availableDays.some(d => isSameDay(d, date));
                          const todayMark = isToday(date);
                          const isSelected = selectedDates.some(d => isSameDay(d, date));
                          
                          // 予約状況の分析
                          const extSlots = daySlots as ExtendedTimeSlot[];
                          const statusCounts = {
                            available: extSlots.filter(s => s.bookingStatus === 'available').length,
                            partial: extSlots.filter(s => s.bookingStatus === 'partial').length,
                            full: extSlots.filter(s => s.bookingStatus === 'full').length,
                            unavailable: extSlots.filter(s => s.bookingStatus === 'unavailable').length,
                          };
                          
                          const totalReservations = extSlots.reduce((sum, s) => sum + (s.reservationCount || 0), 0);
                          const totalAvailableTime = extSlots.reduce((sum, s) => sum + (s.availableTime || 0), 0);
                          
                          // 日付全体の予約状況を判定
                          let dayStatus: 'available' | 'partial' | 'full' | 'unavailable' = 'available';
                          if (!isAvailable) {
                            dayStatus = 'unavailable';
                          } else if (statusCounts.full > 0 && statusCounts.available === 0) {
                            dayStatus = 'full';
                          } else if (statusCounts.partial > 0 || statusCounts.full > 0) {
                            dayStatus = 'partial';
                          }
                          
                          return (
                            <button
                              key={index}
                              onClick={() => isAvailable ? handleDateClick(date) : undefined}
                              disabled={!isAvailable}
                              className={`
                                aspect-square p-1 text-center rounded-lg transition-all duration-200 relative min-h-[70px] flex flex-col justify-between
                                ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
                                ${isCurrentMonth && !isAvailable ? 'text-gray-400 bg-gray-50' : ''}
                                ${isAvailable && !isSelected && dayStatus === 'available' ? 'bg-green-50 border-2 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-400' : ''}
                                ${isAvailable && !isSelected && dayStatus === 'partial' ? 'bg-yellow-50 border-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100 hover:border-yellow-400' : ''}
                                ${isAvailable && !isSelected && dayStatus === 'full' ? 'bg-orange-50 border-2 border-orange-300 text-orange-800 hover:bg-orange-100 hover:border-orange-400' : ''}
                                ${isSelected ? 'bg-primary text-primary-foreground border-2 border-primary' : ''}
                                ${todayMark && !isSelected ? 'ring-2 ring-blue-500 ring-offset-1 font-bold' : ''}
                                ${todayMark && isSelected ? 'bg-primary text-primary-foreground border-2 border-primary font-bold' : ''}
                              `}
                            >
                              <div className="text-sm font-medium">
                                {format(date, 'd')}
                              </div>
                              
                              {/* メンタースロット情報表示（シンプル版） */}
                              {isAvailable && daySlots.length > 0 && (
                                <div className="flex flex-col gap-0.5 w-full mt-1 px-1">
                                  {/* メンター名タグ（最大2つ） */}
                                  {Array.from(new Set(daySlots.slice(0, 2).map(slot => {
                                    const extSlot = slot as ExtendedTimeSlot;
                                    const slotMentor = mentors.find(m => 
                                      m.availableSlots?.some(s => s.id === slot.id)
                                    );
                                    return slotMentor?.name;
                                  }))).filter(Boolean).map((mentorName, nameIndex) => (
                                    <div key={nameIndex} className="text-[7px] leading-tight text-center">
                                      <div className="font-medium truncate bg-white/50 rounded px-1 py-0.5">
                                        {mentorName}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {/* スロット数表示 */}
                                  <div className="text-[7px] text-center font-medium opacity-80">
                                    {daySlots.length}スロット
                                  </div>
                                  
                                  {/* 簡潔な予約状況 */}
                                  {totalReservations > 0 && (
                                    <div className="text-[6px] text-center opacity-70 font-medium">
                                      {totalReservations}予約
                                    </div>
                                  )}
                                  
                                  {/* 状態インジケーター（小さなドット） */}
                                  <div className="flex gap-0.5 justify-center mt-1">
                                    {daySlots.slice(0, 3).map((_, dotIndex) => {
                                      const dotSlot = extSlots[dotIndex];
                                      let dotColor = 'bg-green-500'; // デフォルト: 利用可能
                                      
                                      if (dotSlot?.bookingStatus === 'partial') {
                                        dotColor = 'bg-yellow-500';
                                      } else if (dotSlot?.bookingStatus === 'full') {
                                        dotColor = 'bg-orange-500';
                                      } else if (dotSlot?.bookingStatus === 'unavailable') {
                                        dotColor = 'bg-gray-400';
                                      }
                                      
                                      return (
                                        <div 
                                          key={dotIndex} 
                                          className={`w-1 h-1 rounded-full ${
                                            isSelected ? 'bg-white' : dotColor
                                          }`}
                                        />
                                      );
                                    })}
                                    {daySlots.length > 3 && (
                                      <div className={`text-[6px] font-bold ${
                                        isSelected ? 'text-white' : 'text-gray-600'
                                      }`}>
                                        +
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* 今日のマーク */}
                              {todayMark && (
                                <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                                  isSelected ? 'bg-white' : 'bg-blue-500'
                                }`} />
                              )}
                              
                              {/* 選択中のマーク */}
                              {isSelected && (
                                <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-gray-400 mb-2">📅</div>
                      <p className="text-gray-500 font-medium">利用可能な日付がありません</p>
                      <p className="text-xs text-gray-400 mt-1">他のメンターを選択してください</p>
                    </div>
                  )}
                </div>
                
                {/* 凡例 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">予約状況の見方</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
                      <span>完全に空き</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-300 rounded"></div>
                      <span>部分的に予約済み</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-50 border-2 border-orange-300 rounded"></div>
                      <span>ほぼ満席</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded"></div>
                      <span>利用不可</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>今日</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary border-2 border-primary rounded"></div>
                      <span>選択中</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                        <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                        <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                      </div>
                      <span>スロット状況</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 日表示
              <div className="mt-4">
                {/* 日表示ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="outline"
                    onClick={() => handleViewChange('month')}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    月表示に戻る
                  </Button>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedDateForDay && format(selectedDateForDay, 'yyyy年M月d日 (EEEE)', { locale: ja })}
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prevDay = new Date(selectedDateForDay!);
                        prevDay.setDate(prevDay.getDate() - 1);
                        handleDayNavigation(prevDay);
                      }}
                      disabled={!selectedDateForDay}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const nextDay = new Date(selectedDateForDay!);
                        nextDay.setDate(nextDay.getDate() + 1);
                        handleDayNavigation(nextDay);
                      }}
                      disabled={!selectedDateForDay}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Google Calendar風タイムライン表示 */}
                {selectedDateForDay && (() => {
                  const daySlots = allTimeSlots.filter(slot => 
                    isSameDay(new Date(slot.startTime), selectedDateForDay) && slot.isAvailable
                  );
                  
                  // メンター別にスロットをグループ化
                  const slotsByMentor = daySlots.reduce((acc, slot) => {
                    const mentorId = (slot as ExtendedTimeSlot).mentorId;
                    if (!acc[mentorId]) {
                      acc[mentorId] = [];
                    }
                    acc[mentorId].push(slot as ExtendedTimeSlot);
                    return acc;
                  }, {} as Record<string, ExtendedTimeSlot[]>);

                  // この日にスロットがあるメンターのみを取得
                  const availableMentors = mentors.filter(mentor => 
                    slotsByMentor[mentor.id] && slotsByMentor[mentor.id].length > 0
                  );

                  // 時間軸の生成（8:00-22:00、1時間刻み）
                  const timeSlots = [];
                  for (let hour = 8; hour <= 22; hour++) {
                    timeSlots.push(hour);
                  }

                  // 指定した時間にメンターのスロットがあるかチェック
                  const getSlotForMentorAtTime = (mentorId: string, hour: number) => {
                    const mentorSlots = slotsByMentor[mentorId] || [];
                    return mentorSlots.find(slot => {
                      const slotStart = new Date(slot.startTime);
                      const slotEnd = new Date(slot.endTime);
                      const hourStart = new Date(selectedDateForDay);
                      hourStart.setHours(hour, 0, 0, 0);
                      const hourEnd = new Date(selectedDateForDay);
                      hourEnd.setHours(hour + 1, 0, 0, 0);
                      
                      // スロットがこの時間帯と重複しているかチェック
                      return (slotStart < hourEnd && slotEnd > hourStart);
                    });
                  };

                  return availableMentors.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* メンターヘッダー */}
                      <div className="bg-gray-50 border-b border-gray-200">
                        <div className="grid" style={{ gridTemplateColumns: '80px repeat(' + availableMentors.length + ', 1fr)' }}>
                          {/* 時間軸ヘッダー */}
                          <div className="p-3 border-r border-gray-200 text-center text-sm font-medium text-gray-600">
                            時間
                          </div>
                          
                          {/* メンターヘッダー */}
                          {availableMentors.map((mentor) => (
                            <div key={mentor.id} className="p-3 text-center border-r border-gray-200 last:border-r-0">
                              <div className="flex flex-col items-center gap-2">
                                {mentor.image ? (
                                  <img
                                    src={mentor.image}
                                    alt={mentor.name || ''}
                                    className="w-10 h-10 rounded-full"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                  </div>
                                )}
                                <div className="text-sm font-medium text-gray-900 truncate w-full">
                                  {mentor.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {(slotsByMentor[mentor.id] || []).length}スロット
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* タイムライングリッド */}
                      <div className="divide-y divide-gray-200">
                        {timeSlots.map((hour) => (
                          <div 
                            key={hour}
                            className="grid min-h-[60px]"
                            style={{ gridTemplateColumns: '80px repeat(' + availableMentors.length + ', 1fr)' }}
                          >
                            {/* 時間軸 */}
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center bg-gray-50">
                              <div className="text-sm font-medium text-gray-600">
                                {hour.toString().padStart(2, '0')}:00
                              </div>
                            </div>
                            
                            {/* 各メンターの時間帯セル */}
                            {availableMentors.map((mentor) => {
                              const slot = getSlotForMentorAtTime(mentor.id, hour);
                              
                              return (
                                <div 
                                  key={`${mentor.id}-${hour}`}
                                  className={`p-2 border-r border-gray-200 last:border-r-0 transition-all cursor-pointer hover:bg-gray-50 ${
                                    slot ? (
                                      slot.bookingStatus === 'available' 
                                        ? 'bg-green-50 hover:bg-green-100'
                                        : slot.bookingStatus === 'partial'
                                        ? 'bg-yellow-50 hover:bg-yellow-100'
                                        : slot.bookingStatus === 'full'
                                        ? 'bg-orange-50'
                                        : 'bg-gray-50'
                                    ) : ''
                                  }`}
                                  onClick={() => {
                                    if (slot && (slot.bookingStatus === 'available' || slot.bookingStatus === 'partial')) {
                                      setModalSelectedDate(selectedDateForDay);
                                      setIsModalOpen(true);
                                    }
                                  }}
                                >
                                  {slot && (
                                    <div className="space-y-1">
                                      {/* スロット時間範囲 */}
                                      <div className="text-xs font-medium text-gray-900">
                                        {format(new Date(slot.startTime), 'HH:mm')}-
                                        {format(new Date(slot.endTime), 'HH:mm')}
                                      </div>
                                      
                                      {/* 予約状況バッジ */}
                                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                        slot.bookingStatus === 'available' 
                                          ? 'bg-green-100 text-green-800'
                                          : slot.bookingStatus === 'partial'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : slot.bookingStatus === 'full'
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {slot.bookingStatus === 'available' && '空き'}
                                        {slot.bookingStatus === 'partial' && `${slot.availableTime}分空き`}
                                        {slot.bookingStatus === 'full' && '満席'}
                                        {slot.bookingStatus === 'unavailable' && '不可'}
                                      </div>
                                      
                                      {/* 料金表示 */}
                                      <div className="text-xs text-gray-600">
                                        {formatPrice(slot.hourlyRate || 5000)}
                                      </div>
                                      
                                      {/* 予約数表示 */}
                                      {slot.reservationCount > 0 && (
                                        <div className="text-xs text-gray-500">
                                          {slot.reservationCount}件予約
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-gray-400 mb-2">📅</div>
                      <p className="text-gray-500 font-medium">この日には利用可能なスロットがありません</p>
                      <p className="text-xs text-gray-400 mt-1">別の日を選択してください</p>
                    </div>
                  );
                })()}
              </div>
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
        onBookingComplete={handleBookingComplete}
      />
    </div>
  );
};

export default MentorCalendar; 

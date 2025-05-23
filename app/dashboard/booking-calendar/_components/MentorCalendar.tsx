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
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

// デバッグモード
const DEBUG = true;

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
  
  // 統合された予約時間枠（全メンター）
  const [allTimeSlots, setAllTimeSlots] = useState<TimeSlot[]>([]);
  
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
    console.log('🔴 useEffect実行開始（全メンター統合）');
    console.log('mentors:', mentors);
    console.log('mentors.length:', mentors?.length);
    
    if (!mentors || mentors.length === 0) {
      console.log('🔴 mentorsが空のため終了');
      setAllTimeSlots([]);
      return;
    }
    
    try {
      // 全メンターの空き時間を統合
      const allSlots: TimeSlot[] = [];
      
      mentors.forEach(mentor => {
        if (mentor.availableSlots && mentor.availableSlots.length > 0) {
          const mentorSlots = mentor.availableSlots
            .filter(slot => slot.id) // idが存在するもののみ
            .map(slot => ({
              id: slot.id!,
              startTime: slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime),
              endTime: slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime),
              isAvailable: slot.isAvailable !== false, // デフォルトはtrue
              hourlyRate: slot.hourlyRate || 5000,
              // メンター情報も保持（後でメンター名を表示するため）
              mentorId: mentor.id,
              mentorName: mentor.name
            } as TimeSlot & { mentorId: string; mentorName: string | null }));
          
          allSlots.push(...mentorSlots);
        }
      });
      
      console.log('統合後の全timeSlots:', allSlots);
      console.log('統合後の全timeSlots数:', allSlots.length);
      
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

  // 日付選択時の処理（モーダル版）
  const handleDateClick = (date: Date) => {
    // その日に利用可能な時間帯があるかチェック
    const hasSlots = allTimeSlots.some(slot => 
      isSameDay(new Date(slot.startTime), date) && slot.isAvailable
    );
    
    if (hasSlots) {
      setModalSelectedDate(date);
      setSelectedDates([date]);
      setIsModalOpen(true);
      
      if (onDateSelect) {
        onDateSelect([date]);
      }
    }
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
          onViewChange={() => {}}
        />
        
        {propsIsLoading ? (
          <div className="flex justify-center items-center h-64" aria-live="polite" aria-busy="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="sr-only">読み込み中...</span>
          </div>
        ) : (
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
                      
                      return (
                        <button
                          key={index}
                          onClick={() => isAvailable ? handleDateClick(date) : undefined}
                          disabled={!isAvailable}
                          className={`
                            aspect-square p-1 text-center rounded-lg transition-all duration-200 relative min-h-[70px] flex flex-col justify-between
                            ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
                            ${isCurrentMonth && !isAvailable ? 'text-gray-400 bg-gray-50' : ''}
                            ${isAvailable && !isSelected ? 'bg-green-50 border-2 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-400' : ''}
                            ${isSelected ? 'bg-primary text-primary-foreground border-2 border-primary' : ''}
                            ${todayMark && !isSelected ? 'bg-blue-50 border-2 border-blue-400 text-blue-900 font-bold' : ''}
                            ${todayMark && isSelected ? 'bg-primary text-primary-foreground border-2 border-primary font-bold' : ''}
                          `}
                        >
                          <div className="text-sm font-medium">
                            {format(date, 'd')}
                          </div>
                          
                          {/* メンタースロット情報表示 */}
                          {isAvailable && daySlots.length > 0 && (
                            <div className="flex flex-col gap-0.5 w-full mt-1 px-1">
                              {/* 最初の2つのスロットを表示 */}
                              {daySlots.slice(0, 2).map((slot, slotIndex) => {
                                // スロットに対応するメンターを見つける
                                const slotMentor = mentors.find(m => 
                                  m.availableSlots?.some(s => s.id === slot.id)
                                );
                                
                                return (
                                  <div key={slotIndex} className="text-[8px] leading-tight text-center">
                                    <div className="font-medium truncate">
                                      {slotMentor?.name || '講師'}
                                    </div>
                                    <div className="text-[7px] opacity-80">
                                      {format(new Date(slot.startTime), 'HH:mm')}-
                                      {format(new Date(slot.endTime), 'HH:mm')}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* 3つ以上ある場合の追加表示 */}
                              {daySlots.length > 2 && (
                                <div className="text-[7px] text-center opacity-70 font-medium">
                                  +{daySlots.length - 2}件
                                </div>
                              )}
                              
                              {/* 状態インジケーター（小さなドット） */}
                              <div className="flex gap-0.5 justify-center mt-0.5">
                                {daySlots.slice(0, 4).map((_, dotIndex) => (
                                  <div 
                                    key={dotIndex} 
                                    className={`w-0.5 h-0.5 rounded-full ${
                                      isSelected ? 'bg-white' : 'bg-green-500'
                                    }`}
                                  />
                                ))}
                                {daySlots.length > 4 && (
                                  <div className={`text-[6px] font-bold ${
                                    isSelected ? 'text-white' : 'text-green-600'
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
              <h5 className="text-sm font-medium text-gray-700 mb-2">凡例</h5>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
                  <span>予約可能</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 border-2 border-blue-400 rounded"></div>
                  <span>今日</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary border-2 border-primary rounded"></div>
                  <span>選択中</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  </div>
                  <span>時間帯数</span>
                </div>
              </div>
            </div>
            
            {/* React Booking Calendar（参考用・非表示） */}
            <div className="hidden">
              <Calendar
                selected={selectedDates}
                reserved={reserved}
                onChange={() => {}}
                classNames={{
                  CalendarContainer: 'bg-white',
                  DayContent: 'text-center w-full h-full min-h-[50px] sm:min-h-[60px] flex flex-col items-center justify-center relative',
                  DaySelection: 'bg-primary text-primary-foreground rounded-md',
                  DayReservation: 'bg-red-100 text-red-700 line-through',
                }}
              />
            </div>
            
            {/* 旧フォールバック表示（削除予定） */}
            <div className="hidden mt-4 p-4 bg-gray-50 rounded-lg"></div>
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
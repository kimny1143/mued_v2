'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CalendarChangeHandler, CalendarSelected, CalendarReserved } from '@demark-pro/react-booking-calendar';
import '@demark-pro/react-booking-calendar/dist/react-booking-calendar.css';
import { Mentor } from './MentorList';
import { CalendarNavigation } from './CalendarNavigation';
import { TimeSlotDisplay, TimeSlot } from './TimeSlotDisplay';
import { startOfMonth, endOfMonth, isSameDay, addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, isSameMonth, getDay, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { fetchMentorAvailability, convertToReservedDates, getDefaultDateRange, hasAvailableSlotsOnDate } from '../_lib/calendarUtils';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

// デバッグモード
const DEBUG = true;

interface MentorCalendarProps {
  mentors: Mentor[];
  selectedMentorId?: string;
  onMentorSelect?: (mentorId: string) => void;
  onDateSelect?: (selectedDates: Date[]) => void;
  onTimeSlotSelect?: (slot: TimeSlot) => void;
}

export const MentorCalendar: React.FC<MentorCalendarProps> = ({
  mentors,
  selectedMentorId,
  onMentorSelect,
  onDateSelect,
  onTimeSlotSelect,
}) => {
  // 現在表示中の日付
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // 表示モード (月/週/日)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  
  // 予約時間枠
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // 選択された日付
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  
  // 選択された時間枠
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  
  // データ取得中のローディング状態
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // 現在選択中のメンターID
  const [currentMentorId, setCurrentMentorId] = useState<string | undefined>(
    selectedMentorId || mentors[0]?.id
  );

  // コンポーネント初期化時のデバッグ
  console.log('🔵 MentorCalendar コンポーネント初期化');
  console.log('mentors props:', mentors);
  console.log('mentors.length:', mentors?.length);
  console.log('selectedMentorId props:', selectedMentorId);
  console.log('currentMentorId state:', currentMentorId);
  
  if (mentors && mentors.length > 0) {
    console.log('最初のメンター:', mentors[0]);
    console.log('最初のメンターのavailableSlots:', mentors[0].availableSlots);
  }

  // currentMentorIdが変更されたときのデバッグ
  useEffect(() => {
    console.log('🟡 currentMentorId変更:', currentMentorId);
    console.log('mentors配列:', mentors);
    console.log('mentors.length:', mentors?.length);
    
    if (selectedMentorId && selectedMentorId !== currentMentorId) {
      console.log('🟠 selectedMentorIdとcurrentMentorIdが不一致、更新:', selectedMentorId);
      setCurrentMentorId(selectedMentorId);
    }
  }, [selectedMentorId, mentors]);

  // カレンダー表示範囲が変更されたときに時間枠を再取得
  useEffect(() => {
    console.log('🔴 useEffect実行開始');
    console.log('currentMentorId:', currentMentorId);
    console.log('mentors:', mentors);
    console.log('mentors.length:', mentors?.length);
    
    if (!currentMentorId) {
      console.log('🔴 currentMentorIdがnull/undefinedのため終了');
      return;
    }
    
    const fetchTimeSlots = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 現在選択されているメンターを取得
        const selectedMentor = mentors.find(m => m.id === currentMentorId);
        
        if (!selectedMentor) {
          console.error('選択されたメンターが見つかりません:', currentMentorId);
          console.log('利用可能なメンターIDs:', mentors.map(m => m.id));
          setTimeSlots([]);
          return;
        }
        
        console.log('=== MentorCalendar デバッグ情報 ===');
        console.log('選択されたメンター:', selectedMentor.name);
        console.log('メンターのavailableSlots:', selectedMentor.availableSlots);
        console.log('availableSlotsの型:', typeof selectedMentor.availableSlots);
        console.log('availableSlotsの長さ:', selectedMentor.availableSlots?.length);
        
        if (selectedMentor.availableSlots && selectedMentor.availableSlots.length > 0) {
          console.log('最初のavailableSlot:', selectedMentor.availableSlots[0]);
        }
        
        // fetchMentorAvailabilityを呼ばずに、直接availableSlotsをTimeSlot形式に変換
        if (selectedMentor.availableSlots && selectedMentor.availableSlots.length > 0) {
          const timeSlots = selectedMentor.availableSlots.map(slot => ({
            id: slot.id || `slot-${currentMentorId}-${slot.startTime}`,
            startTime: slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime),
            endTime: slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime),
            isAvailable: slot.isAvailable !== false, // デフォルトはtrue
            hourlyRate: slot.hourlyRate || 5000 // hourlyRateを追加
          }));
          
          console.log('変換後のtimeSlots:', timeSlots);
          console.log('変換後のtimeSlots数:', timeSlots.length);
          
          setTimeSlots(timeSlots);
        } else {
          console.warn('availableSlotsが空またはundefinedです');
          setTimeSlots([]);
        }
        
      } catch (err) {
        console.error('時間枠取得エラー:', err);
        setError('予約可能な時間枠の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimeSlots();
  }, [currentMentorId, mentors]);

  // 月が変更されたときの処理は一旦コメントアウト
  /*
  useEffect(() => {
    if (!currentMentorId || !mentors.length) return;
    
    const updateTimeSlotsForCurrentMonth = async () => {
      const dateRange = getDefaultDateRange(currentDate);
      const selectedMentor = mentors.find(m => m.id === currentMentorId);
      
      if (!selectedMentor || !selectedMentor.availableSlots) return;
      
      const slots = await fetchMentorAvailability(
        currentMentorId,
        dateRange.from,
        dateRange.to,
        selectedMentor.availableSlots
      );
      
      setTimeSlots(slots);
    };
    
    updateTimeSlotsForCurrentMonth();
  }, [currentDate, currentMentorId, mentors]);
  */

  // カレンダーコンポーネントに渡す予約済み日時
  const reserved = convertToReservedDates(timeSlots);
  
  // 予約可能な日付リスト（月表示で色付けするため）
  const availableDays = Array.from(new Set(
    timeSlots
      .filter(slot => slot.isAvailable)
      .map(slot => startOfDay(new Date(slot.startTime)).getTime())
  )).map(timestamp => new Date(timestamp));
  
  // react-booking-calendar用の選択可能な日付を作成
  const selectableDates = availableDays;
  
  // デバッグ情報を出力
  if (DEBUG && availableDays.length > 0) {
    console.log('利用可能な日付:', availableDays.map(d => format(d, 'yyyy/MM/dd')));
  }
  
  // カスタムスタイルクラス
  const customDayClass = (date: Date) => {
    // 予約可能な日付かチェック
    if (availableDays.some(d => isSameDay(d, date))) {
      return 'bg-green-50 font-medium border border-green-200';
    }
    return '';
  };

  // 日付選択時の処理
  const handleDateChange: CalendarChangeHandler = (dates) => {
    // Calendarの選択値からDate型のみを抽出
    const validDates = dates
      .filter((d): d is Date => d instanceof Date);
    
    if (DEBUG) console.log('選択された日付:', validDates.map(d => d.toDateString()));
    
    setSelectedDates(validDates);
    setSelectedTimeSlot(null);
    
    if (onDateSelect) {
      onDateSelect(validDates);
    }
    
    // 日付が選択されたら自動的に日表示に切り替え
    if (validDates.length > 0) {
      setView('day');
      setCurrentDate(validDates[0]);
      
      // モバイルでは自動的に時間枠表示にスクロール
      if (window.innerWidth < 768) {
        setTimeout(() => {
          const timeSlotElement = document.getElementById('time-slot-section');
          if (timeSlotElement) {
            timeSlotElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  };

  // メンター選択時の処理
  const handleMentorChange = (mentorId: string) => {
    setCurrentMentorId(mentorId);
    setSelectedDates([]);
    setSelectedTimeSlot(null);
    
    if (onMentorSelect) {
      onMentorSelect(mentorId);
    }
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

  // 選択された日付のみを取得
  const selectedDate = selectedDates.length > 0 ? selectedDates[0] : null;

  // 週表示用の日付範囲を取得
  const getWeekDates = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // 月曜始まり
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  // 週表示の日付配列
  const weekDates = getWeekDates(currentDate);

  // 日付表示の前後移動
  const goToPreviousDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setCurrentDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
  };

  // 選択された日付の曜日名を取得
  const getWeekdayName = (date: Date) => {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getDay()];
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
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
          <h3 className="text-sm font-medium mb-1">デバッグ情報</h3>
          <div className="text-xs space-y-1">
            <p>総スロット数: {timeSlots.length}</p>
            <p>日付ごとの予約可能日: {availableDays.length}日</p>
            {availableDays.length > 0 && (
              <p>例: {availableDays.slice(0, 3).map(d => d.toDateString()).join(', ')}...</p>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-4">
        {/* メンター情報表示 */}
        {currentMentorId && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {mentors.find(m => m.id === currentMentorId)?.image ? (
              <img
                src={mentors.find(m => m.id === currentMentorId)?.image || ''}
                alt={mentors.find(m => m.id === currentMentorId)?.name || ''}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {mentors.find(m => m.id === currentMentorId)?.name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <div className="font-medium">{mentors.find(m => m.id === currentMentorId)?.name}</div>
              <div className="text-sm text-gray-500">
                レッスン数: {mentors.find(m => m.id === currentMentorId)?.availableSlotsCount || 0}回
              </div>
            </div>
          </div>
        )}
        
        <CalendarNavigation
          currentDate={currentDate}
          onDateChange={handleDateNavigation}
          view={view}
          onViewChange={setView}
        />
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64" aria-live="polite" aria-busy="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="sr-only">読み込み中...</span>
          </div>
        ) : (
          <>
            {/* 月表示モード */}
            {view === 'month' && (
              <div className="calendar-container touch-manipulation">
                {DEBUG && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
                    <h4 className="text-sm font-medium mb-1">カレンダー表示 デバッグ</h4>
                    <div className="text-xs space-y-1">
                      <p>全timeSlots数: {timeSlots.length}</p>
                      <p>利用可能日数: {availableDays.length}</p>
                      {availableDays.length > 0 && (
                        <p>利用可能日例: {availableDays.slice(0, 3).map(d => format(d, 'MM/dd')).join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}
                <Calendar
                  selected={selectedDates}
                  reserved={reserved}
                  onChange={handleDateChange}
                  classNames={{
                    CalendarContainer: 'bg-white',
                    DayContent: 'text-center w-full h-full min-h-[40px] sm:min-h-[inherit]',
                    DaySelection: 'bg-primary text-primary-foreground rounded-md',
                    DayReservation: 'bg-red-100 line-through text-gray-400',
                  }}
                />
                
                {/* 簡易的な日付グリッド表示（フォールバック） */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">予約可能日</h4>
                  {availableDays.length > 0 ? (
                    <div className="grid grid-cols-7 gap-2">
                      {availableDays.map((date, index) => (
                        <button
                          key={index}
                          onClick={() => handleDateChange([date])}
                          className="p-2 text-center bg-white border border-green-300 rounded hover:bg-green-50"
                        >
                          <div className="text-sm font-medium">{format(date, 'M/d')}</div>
                          <div className="text-xs text-gray-500">{getWeekdayName(date)}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">利用可能な日付がありません</p>
                  )}
                </div>
              </div>
            )}
            
            {/* 週表示モード */}
            {view === 'week' && (
              <div className="mt-4">
                <div className="grid grid-cols-7 gap-1 mt-2">
                  {weekDates.map((date, index) => {
                    const isSelected = selectedDates.some(d => isSameDay(d, date));
                    const hasAvailableSlots = hasAvailableSlotsOnDate(timeSlots, date);
                    
                    return (
                      <div 
                        key={index} 
                        className={`
                          flex flex-col items-center p-2 rounded-md cursor-pointer
                          ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                          ${!hasAvailableSlots ? 'opacity-50' : 'hover:bg-gray-100'}
                          ${isToday(date) ? 'border border-primary' : ''}
                          ${hasAvailableSlots && !isSelected ? 'border border-green-300 bg-green-50' : ''}
                        `}
                        onClick={() => {
                          if (hasAvailableSlots) {
                            handleDateChange([date]);
                          }
                        }}
                      >
                        <div className={`text-sm ${!isSameMonth(date, currentDate) ? 'text-gray-400' : ''}`}>
                          {format(date, 'M/d')}
                        </div>
                        <div className="text-xs mt-1">
                          {getWeekdayName(date)}
                        </div>
                        {hasAvailableSlots && (
                          <div className="mt-1 h-1 w-1 rounded-full bg-primary"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* 選択された日付の時間枠表示 */}
                {selectedDate && (
                  <div className="mt-4">
                    <TimeSlotDisplay
                      selectedDate={selectedDate}
                      timeSlots={timeSlots}
                      onTimeSlotSelect={handleTimeSlotSelect}
                      selectedSlot={selectedTimeSlot}
                      showDateHeading={true}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* 日表示モード */}
            {view === 'day' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={goToPreviousDay}
                    className="p-1 h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <h3 className="text-lg font-medium">
                    {format(currentDate, 'yyyy年MM月dd日')} ({getWeekdayName(currentDate)})
                    {isToday(currentDate) && <span className="ml-2 text-sm text-primary">今日</span>}
                    {DEBUG && hasAvailableSlotsOnDate(timeSlots, currentDate) && (
                      <span className="ml-2 text-xs text-green-600">(予約可)</span>
                    )}
                  </h3>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={goToNextDay}
                    className="p-1 h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {DEBUG && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
                    <h4 className="text-sm font-medium mb-1">TimeSlotDisplay デバッグ</h4>
                    <div className="text-xs space-y-1">
                      <p>選択日: {format(currentDate, 'yyyy/MM/dd')}</p>
                      <p>全timeSlots数: {timeSlots.length}</p>
                      <p>この日のスロット数: {timeSlots.filter(slot => isSameDay(new Date(slot.startTime), currentDate)).length}</p>
                      {timeSlots.length > 0 && (
                        <p>timeSlots例: {timeSlots.slice(0, 2).map(slot => 
                          `${format(new Date(slot.startTime), 'MM/dd HH:mm')}`
                        ).join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <TimeSlotDisplay
                  selectedDate={currentDate}
                  timeSlots={timeSlots}
                  onTimeSlotSelect={handleTimeSlotSelect}
                  selectedSlot={selectedTimeSlot}
                  showDateHeading={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MentorCalendar; 
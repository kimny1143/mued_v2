'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CalendarChangeHandler, CalendarSelected, CalendarReserved } from '@demark-pro/react-booking-calendar';
import '@demark-pro/react-booking-calendar/dist/react-booking-calendar.css';
import { Mentor } from './MentorList';
import { CalendarNavigation } from './CalendarNavigation';
import { TimeSlotDisplay, TimeSlot } from './TimeSlotDisplay';
import { startOfMonth, endOfMonth, isSameDay, addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, isSameMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { fetchMentorAvailability, convertToReservedDates, getDefaultDateRange } from '../_lib/calendarUtils';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

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
  
  // レッスン時間 (60分 or 90分)
  const [lessonDuration, setLessonDuration] = useState<60 | 90>(60);
  
  // データ取得中のローディング状態
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // 現在選択中のメンターID
  const [currentMentorId, setCurrentMentorId] = useState<string | undefined>(
    selectedMentorId || mentors[0]?.id
  );

  // カレンダー表示範囲が変更されたときに時間枠を再取得
  useEffect(() => {
    if (!currentMentorId) return;
    
    const fetchTimeSlots = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const dateRange = getDefaultDateRange(currentDate);
        const slots = await fetchMentorAvailability(
          currentMentorId,
          dateRange.from,
          dateRange.to
        );
        
        setTimeSlots(slots);
      } catch (err) {
        console.error('時間枠取得エラー:', err);
        setError('予約可能な時間枠の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimeSlots();
  }, [currentMentorId, currentDate]);

  // カレンダーコンポーネントに渡す予約済み日時
  const reserved = convertToReservedDates(timeSlots);

  // 日付選択時の処理
  const handleDateChange: CalendarChangeHandler = (dates) => {
    // Calendarの選択値からDate型のみを抽出
    const validDates = dates
      .filter((d): d is Date => d instanceof Date);
    
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

  // レッスン時間変更の処理
  const handleLessonDurationChange = (duration: 60 | 90) => {
    setLessonDuration(duration);
    setSelectedTimeSlot(null);
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
                <Calendar
                  selected={selectedDates}
                  reserved={reserved}
                  onChange={handleDateChange}
                  initialDate={currentDate}
                  classNames={{
                    CalendarContainer: 'bg-white',
                    MonthContent: 'text-lg font-medium mb-2',
                    WeekContent: 'text-sm',
                    DayContent: 'text-center w-full h-full min-h-[40px] sm:min-h-[inherit]',
                    DaySelection: 'bg-primary text-primary-foreground rounded-md',
                    DayReservation: 'bg-red-100 line-through text-gray-400',
                  }}
                />
              </div>
            )}
            
            {/* 週表示モード */}
            {view === 'week' && (
              <div className="mt-4">
                <div className="grid grid-cols-7 gap-1 mt-2">
                  {weekDates.map((date, index) => {
                    const isSelected = selectedDates.some(d => isSameDay(d, date));
                    const hasAvailableSlots = timeSlots.some(
                      slot => isSameDay(slot.startTime, date) && slot.isAvailable
                    );
                    
                    return (
                      <div 
                        key={index} 
                        className={`
                          flex flex-col items-center p-2 rounded-md cursor-pointer
                          ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                          ${!hasAvailableSlots ? 'opacity-50' : 'hover:bg-gray-100'}
                          ${isToday(date) ? 'border border-primary' : ''}
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
                      lessonDuration={lessonDuration}
                      onLessonDurationChange={handleLessonDurationChange}
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
                
                <TimeSlotDisplay
                  selectedDate={currentDate}
                  timeSlots={timeSlots}
                  onTimeSlotSelect={handleTimeSlotSelect}
                  selectedSlot={selectedTimeSlot}
                  lessonDuration={lessonDuration}
                  onLessonDurationChange={handleLessonDurationChange}
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
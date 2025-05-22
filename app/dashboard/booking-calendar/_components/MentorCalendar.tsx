'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CalendarChangeHandler, CalendarSelected } from '@demark-pro/react-booking-calendar';
import '@demark-pro/react-booking-calendar/dist/react-booking-calendar.css';
import { Mentor } from './MentorList';
import { CalendarNavigation } from './CalendarNavigation';
import { TimeSlotDisplay, TimeSlot } from './TimeSlotDisplay';
import { startOfMonth, endOfMonth, isSameDay, addDays } from 'date-fns';
import { fetchMentorAvailability, convertToReservedDates, getDefaultDateRange } from '../_lib/calendarUtils';
import { AlertCircle } from 'lucide-react';

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
  
  // 表示モード (月/週)
  const [view, setView] = useState<'month' | 'week'>('month');
  
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
    
    // モバイルでは自動的に時間枠表示にスクロール
    if (validDates.length > 0 && window.innerWidth < 768) {
      setTimeout(() => {
        const timeSlotElement = document.getElementById('time-slot-section');
        if (timeSlotElement) {
          timeSlotElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
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

  return (
    <div className="flex flex-col space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg flex items-center mb-4" role="alert">
          <AlertCircle className="h-4 w-4 mr-2" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-4">
        {/* モバイルでメンター選択の折りたたみセクション */}
        <div className="md:hidden w-full bg-white rounded-lg shadow">
          <details className="w-full">
            <summary className="p-4 cursor-pointer font-semibold flex items-center justify-between">
              メンターを選択
              <span className="text-sm text-gray-500">
                {mentors.find(m => m.id === currentMentorId)?.name || '選択してください'}
              </span>
            </summary>
            <div className="p-4 pt-0 border-t space-y-2">
              {mentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    currentMentorId === mentor.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => handleMentorChange(mentor.id)}
                >
                  <div className="flex items-center gap-2">
                    {mentor.image ? (
                      <img
                        src={mentor.image}
                        alt={mentor.name || '名前なし'}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        {mentor.name ? mentor.name.charAt(0) : '?'}
                      </div>
                    )}
                    <span>{mentor.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
        
        {/* デスクトップ表示のメンター選択サイドバー */}
        <div className="hidden md:block md:w-1/4 lg:w-1/5 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4" id="mentor-selector-heading">メンターを選択</h3>
          <div className="space-y-2" role="radiogroup" aria-labelledby="mentor-selector-heading">
            {mentors.map((mentor) => (
              <div
                key={mentor.id}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  currentMentorId === mentor.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                onClick={() => handleMentorChange(mentor.id)}
                role="radio"
                aria-checked={currentMentorId === mentor.id}
                tabIndex={currentMentorId === mentor.id ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleMentorChange(mentor.id);
                    e.preventDefault();
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {mentor.image ? (
                    <img
                      src={mentor.image}
                      alt={mentor.name || '名前なし'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      {mentor.name ? mentor.name.charAt(0) : '?'}
                    </div>
                  )}
                  <span>{mentor.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* カレンダーセクション */}
        <div className="w-full md:w-3/4 lg:w-4/5 bg-white rounded-lg shadow p-4">
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
        </div>
      </div>
      
      {/* 時間枠表示セクション */}
      {selectedDate && (
        <div className="mt-4" id="time-slot-section">
          <TimeSlotDisplay
            selectedDate={selectedDate}
            timeSlots={timeSlots}
            onTimeSlotSelect={handleTimeSlotSelect}
            selectedSlot={selectedTimeSlot}
            lessonDuration={lessonDuration}
            onLessonDurationChange={handleLessonDurationChange}
          />
        </div>
      )}
    </div>
  );
};

export default MentorCalendar; 
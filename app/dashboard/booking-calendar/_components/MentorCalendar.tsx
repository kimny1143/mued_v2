'use client';

import React, { useState } from 'react';
import { Calendar, CalendarChangeHandler, CalendarSelected, CalendarClassNames } from '@demark-pro/react-booking-calendar';
import '@demark-pro/react-booking-calendar/dist/react-booking-calendar.css';
import { Mentor } from './MentorList';

// 予約情報の型
interface ReservationInfo {
  startDate: Date;
  endDate: Date;
  mentorId: string;
}

interface MentorCalendarProps {
  mentors: Mentor[];
  selectedMentorId?: string;
  onMentorSelect?: (mentorId: string) => void;
  onDateSelect?: (selectedDates: Date[]) => void;
}

export const MentorCalendar: React.FC<MentorCalendarProps> = ({
  mentors,
  selectedMentorId,
  onMentorSelect,
  onDateSelect,
}) => {
  // 予約済み日時の例（実際にはAPIから取得します）
  const [reservations] = useState<ReservationInfo[]>([
    {
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2日後
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),   // 3日後
      mentorId: mentors[0]?.id || '',
    },
    {
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),   // 6日後
      mentorId: mentors[0]?.id || '',
    },
  ]);

  // 選択された日付
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // 現在選択中のメンターIDを管理
  const [currentMentorId, setCurrentMentorId] = useState<string | undefined>(
    selectedMentorId || mentors[0]?.id
  );

  // 選択されたメンターの予約情報をフィルタリング
  const filteredReservations = reservations.filter(
    (res) => res.mentorId === currentMentorId
  );

  // カレンダーコンポーネントに渡す予約済み日時
  const reserved = filteredReservations.map((res) => ({
    startDate: res.startDate,
    endDate: res.endDate,
  }));

  // 日付選択時の処理
  const handleDateChange: CalendarChangeHandler = (dates) => {
    // Calendarの選択値からDate型のみを抽出
    const validDates = dates
      .filter((d): d is Date => d instanceof Date);
    
    setSelectedDates(validDates);
    
    if (onDateSelect) {
      onDateSelect(validDates);
    }
  };

  // メンター選択時の処理
  const handleMentorChange = (mentorId: string) => {
    setCurrentMentorId(mentorId);
    setSelectedDates([]);
    
    if (onMentorSelect) {
      onMentorSelect(mentorId);
    }
  };

  // カレンダーのカスタムクラス名
  const calendarClassNames: CalendarClassNames = {
    CalendarContainer: 'bg-white',
    MonthContent: 'text-lg font-medium mb-2',
    WeekContent: 'text-sm',
    DayContent: 'text-center w-full h-full',
    DaySelection: 'bg-primary text-primary-foreground rounded-md',
    DayReservation: 'bg-red-100 line-through text-gray-400',
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row items-start gap-4">
        {/* メンター選択セクション */}
        <div className="w-full md:w-1/4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">メンターを選択</h3>
          <div className="space-y-2">
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
        </div>

        {/* カレンダーセクション */}
        <div className="w-full md:w-3/4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">空き時間を選択</h3>
          <Calendar
            selected={selectedDates}
            reserved={reserved}
            onChange={handleDateChange}
            classNames={calendarClassNames}
          />
        </div>
      </div>
      
      {/* 選択された日付の表示 */}
      {selectedDates.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow">
          <h4 className="font-medium mb-2">選択された日時:</h4>
          <ul className="list-disc list-inside">
            {selectedDates.map((date, index) => (
              <li key={index} className="text-sm">
                {date.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MentorCalendar; 
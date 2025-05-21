'use client';

import { MentorCalendar } from './_components/MentorCalendar';
import { useState } from 'react';

// テスト用のメンターデータ
const testMentors = [
  {
    id: 'mentor-1',
    name: '山田太郎',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    id: 'mentor-2',
    name: '佐藤花子',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    id: 'mentor-3',
    name: '鈴木一郎',
    image: 'https://randomuser.me/api/portraits/men/86.jpg',
  },
];

export default function BookingCalendarPage() {
  const [selectedMentorId, setSelectedMentorId] = useState<string | undefined>(testMentors[0].id);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const handleMentorSelect = (mentorId: string) => {
    setSelectedMentorId(mentorId);
    setSelectedDates([]);
  };

  const handleDateSelect = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">メンター予約カレンダー</h1>
      
      <MentorCalendar
        mentors={testMentors}
        selectedMentorId={selectedMentorId}
        onMentorSelect={handleMentorSelect}
        onDateSelect={handleDateSelect}
      />
      
      {selectedDates.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">予約を確定する</h2>
          <div className="mb-4">
            <p>
              <span className="font-medium">メンター:</span> {testMentors.find(m => m.id === selectedMentorId)?.name}
            </p>
            <p>
              <span className="font-medium">日時:</span> {selectedDates[0]?.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <h3 className="font-medium mb-2">レッスン時間</h3>
              <div className="flex gap-2">
                <button className="border border-primary bg-primary text-primary-foreground px-4 py-2 rounded-md">60分</button>
                <button className="border border-gray-300 hover:border-primary px-4 py-2 rounded-md">90分</button>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-2">料金</h3>
              <p className="text-xl">¥5,000</p>
              <p className="text-sm text-gray-500">（レッスン時間に関わらず固定）</p>
            </div>
          </div>
          <button className="mt-4 w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">
            予約・決済に進む
          </button>
        </div>
      )}
    </div>
  );
} 
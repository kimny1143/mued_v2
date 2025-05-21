'use client';

import { useState, useEffect } from 'react';
import { MentorCalendar } from './_components/MentorCalendar';
import { MentorList } from './_components/MentorList';
import type { Mentor } from './_components/MentorList';
import { Button } from '@/app/components/ui/button';
import { CalendarClock } from 'lucide-react';

export default function BookingCalendarPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMentorId, setSelectedMentorId] = useState<string | undefined>();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [error, setError] = useState<string | null>(null);

  // APIからメンターデータを取得
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setIsLoading(true);
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        
        // 日付範囲を指定してAPIを呼び出し
        const fromDate = now.toISOString().split('T')[0];
        const toDate = nextMonth.toISOString().split('T')[0];
        
        const response = await fetch(
          `/api/mentors?withAvailability=true&withDetails=true&from=${fromDate}&to=${toDate}`
        );
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setMentors(data);
          setSelectedMentorId(data[0].id);
        }
        
      } catch (err) {
        console.error('メンター情報取得エラー:', err);
        setError('メンター情報の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, []);

  const handleMentorSelect = (mentorId: string) => {
    setSelectedMentorId(mentorId);
    setSelectedDates([]);
  };

  const handleDateSelect = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  const selectedMentor = mentors.find(m => m.id === selectedMentorId);

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex items-center mb-6">
        <CalendarClock className="h-6 w-6 mr-2 text-primary" />
        <h1 className="text-2xl font-bold">メンターレッスン予約</h1>
      </div>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p>{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline" 
            className="mt-2"
          >
            再読み込み
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* メンター選択リスト */}
          <div className="md:col-span-1">
            <MentorList
              mentors={mentors}
              selectedMentorId={selectedMentorId}
              onMentorSelect={handleMentorSelect}
              isLoading={isLoading}
            />
          </div>
          
          {/* カレンダー表示 */}
          <div className="md:col-span-2">
            {selectedMentorId && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold">予約可能な日時を選択</h3>
                  {selectedMentor && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedMentor.name} のレッスン可能時間
                    </p>
                  )}
                </div>
                
                <div className="p-4">
                  <MentorCalendar
                    mentors={mentors}
                    selectedMentorId={selectedMentorId}
                    onMentorSelect={handleMentorSelect}
                    onDateSelect={handleDateSelect}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 予約確認セクション */}
      {selectedDates.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">予約を確定する</h2>
          <div className="mb-4">
            <p>
              <span className="font-medium">メンター:</span> {selectedMentor?.name}
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
          
          <Button className="mt-4 w-full" size="lg">
            予約・決済に進む
          </Button>
        </div>
      )}
    </div>
  );
} 
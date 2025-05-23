'use client';

import { useState, useEffect, useRef } from 'react';
import { MentorCalendar } from './_components/MentorCalendar';
import { MentorList } from './_components/MentorList';
import type { Mentor } from './_components/MentorList';
import { Button } from '@/app/components/ui/button';
import { CalendarClock, ArrowRight, ArrowLeft } from 'lucide-react';
import { TimeSlot } from './_components/TimeSlotDisplay';
import { supabaseBrowser } from '@/lib/supabase-browser';

// デバッグモード
const DEBUG = true;

// レッスンスロットの型定義
interface LessonSlot {
  id: string;
  teacherId: string;
  startTime: string | Date;
  endTime: string | Date;
  isAvailable: boolean;
  hourlyRate?: number;
  currency?: string;
  teacher: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
  };
  reservations: Array<{
    id: string;
    status: string;
    bookedStartTime?: string;
    bookedEndTime?: string;
  }>;
}

// レッスンスロットをメンター形式に変換する関数
function convertLessonSlotsToMentors(lessonSlots: LessonSlot[]): Mentor[] {
  try {
    // メンターIDでグループ化
    const mentorMap: Record<string, LessonSlot[]> = {};
    
    // 利用可能なスロットのみをフィルタリング
    const availableSlots = lessonSlots.filter(slot => {
      // isAvailableフラグがfalseなら確実に予約不可
      if (!slot.isAvailable) return false;
      
      // 予約がある場合は、状態によって判断
      if (slot.reservations && slot.reservations.length > 0) {
        // すでに確定済みの予約がある場合は予約不可
        if (slot.reservations.some(res => res.status === 'CONFIRMED')) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log('利用可能なスロット数:', availableSlots.length);
    if (availableSlots.length > 0) {
      console.log('サンプルスロット:', availableSlots[0]);
    }
    
    // メンターIDでグループ化
    availableSlots.forEach(slot => {
      const mentorId = slot.teacherId;
      if (!mentorMap[mentorId]) {
        mentorMap[mentorId] = [];
      }
      mentorMap[mentorId].push(slot);
    });
    
    // メンター情報を構築
    return Object.entries(mentorMap).map(([mentorId, slots]) => {
      // 最初のスロットからメンター情報を取得
      const firstSlot = slots[0];
      const teacher = firstSlot.teacher;
      
      return {
        id: mentorId,
        name: teacher.name || '名前なし',
        email: teacher.email || '',
        image: teacher.image,
        // 仮の追加情報
        bio: `${teacher.name || '講師'}は経験豊富なインストラクターです。`,
        specialties: ['ピアノ', 'ギター'].slice(0, Math.floor(Math.random() * 3) + 1),
        rating: {
          avgRating: 4.5,
          totalReviews: 10
        },
        availableSlots: slots.map(slot => ({
          ...slot,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime)
        })),
        availableSlotsCount: slots.length
      };
    });
  } catch (error) {
    console.error('データ変換エラー:', error);
    return [];
  }
}

export default function BookingCalendarPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMentorId, setSelectedMentorId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // APIからメンターデータを取得
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setIsLoading(true);
        
        // 認証トークンを取得
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        
        console.log('APIリクエスト開始: 全ての利用可能スロットを取得');
        
        // 全ての利用可能なスロットを取得（日付フィルタリングなし）
        const response = await fetch('/api/lesson-slots', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorResponse = await response.json();
          console.error('APIエラーレスポンス:', errorResponse);
          throw new Error(
            errorResponse.error || 
            `API通信エラー: ${response.status} ${response.statusText}`
          );
        }
        
        const data: LessonSlot[] = await response.json();
        console.log(`取得したレッスンスロット: ${data.length}件`);
        if (data.length > 0) {
          console.log('最初のスロット例:', {
            id: data[0].id,
            teacherId: data[0].teacherId,
            startTime: data[0].startTime,
            endTime: data[0].endTime,
            teacherName: data[0].teacher?.name
          });
        }
        
        // メンター形式に変換
        const convertedMentors = convertLessonSlotsToMentors(data);
        console.log('変換後のメンターデータ:', convertedMentors);
        
        if (convertedMentors.length > 0) {
          console.log('🟢 page.tsx: mentorsを設定');
          console.log('🟢 page.tsx: 最初のメンターID:', convertedMentors[0].id);
          console.log('🟢 page.tsx: 現在のselectedMentorId:', selectedMentorId);
          
          setMentors(convertedMentors);
          
          if (!selectedMentorId) {
            console.log('🟢 page.tsx: selectedMentorIdを設定:', convertedMentors[0].id);
            setSelectedMentorId(convertedMentors[0].id);
          }
        } else {
          console.log('利用可能なメンターがありません');
        }
        
      } catch (err) {
        console.error('メンター情報取得エラー:', err);
        setError('メンター情報の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, [selectedMentorId]);

  const handleMentorSelect = (mentorId: string) => {
    setSelectedMentorId(mentorId);
  };

  // MentorCalendarコンポーネントをレンダリング前のデバッグ
  if (DEBUG && mentors.length > 0) {
    console.log('🔴 page.tsx: MentorCalendarをレンダリング');
    console.log('🔴 page.tsx: mentors:', mentors);
    console.log('🔴 page.tsx: selectedMentorId:', selectedMentorId);
    console.log('🔴 page.tsx: mentors.length:', mentors?.length);
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-2">
        <div className="flex items-center">
          <CalendarClock className="h-6 w-6 mr-2 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold">メンターレッスン予約</h1>
        </div>
      </div>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg" role="alert">
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
        <>
          {/* メンター選択とカレンダー表示エリア */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* メンター選択リスト - 左側 */}
            <div className="md:col-span-1">
              <MentorList
                mentors={mentors}
                selectedMentorId={selectedMentorId}
                onMentorSelect={handleMentorSelect}
                isLoading={isLoading}
              />
            </div>
            
            {/* カレンダー表示 - 右側 */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">予約可能な日時を選択</h2>
                  {selectedMentorId && (
                    <p className="text-sm text-gray-600 mt-1">
                      {mentors.find(m => m.id === selectedMentorId)?.name} のレッスン可能時間
                    </p>
                  )}
                </div>
                
                <div className="p-4">
                  <MentorCalendar
                    mentors={mentors}
                    selectedMentorId={selectedMentorId}
                    onMentorSelect={handleMentorSelect}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 
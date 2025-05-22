'use client';

import { useState, useEffect, useRef } from 'react';
import { MentorCalendar } from './_components/MentorCalendar';
import { MentorList } from './_components/MentorList';
import type { Mentor } from './_components/MentorList';
import { Button } from '@/app/components/ui/button';
import { CalendarClock, ArrowRight, ArrowLeft } from 'lucide-react';
import { TimeSlot } from './_components/TimeSlotDisplay';
import { supabaseBrowser } from '@/lib/supabase-browser';

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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [lessonDuration, setLessonDuration] = useState<60 | 90>(60);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'calendar' | 'confirmation'>('calendar');
  const confirmationRef = useRef<HTMLDivElement>(null);

  // APIからメンターデータを取得
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setIsLoading(true);
        
        // 認証トークンを取得
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        
        // 日付範囲を指定
        const fromDate = new Date();
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 30); // 30日先まで取得
        
        // クエリパラメータの構築
        const queryString = new URLSearchParams({
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        }).toString();
        
        console.log('APIリクエスト開始:', queryString);
        
        // 既存のAPIを使用
        const response = await fetch(`/api/lesson-slots?${queryString}`, {
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
        
        // メンター形式に変換
        const convertedMentors = convertLessonSlotsToMentors(data);
        console.log('変換後のメンターデータ:', convertedMentors);
        
        if (convertedMentors.length > 0) {
          setMentors(convertedMentors);
          setSelectedMentorId(convertedMentors[0].id);
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
  }, []);

  const handleMentorSelect = (mentorId: string) => {
    setSelectedMentorId(mentorId);
    setSelectedDates([]);
    setSelectedTimeSlot(null);
  };

  const handleDateSelect = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    
    // モバイルでは時間枠選択後、自動的に確認画面にスクロール
    if (window.innerWidth < 768) {
      setTimeout(() => {
        if (confirmationRef.current) {
          confirmationRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };
  
  const handleLessonDurationChange = (duration: 60 | 90) => {
    setLessonDuration(duration);
  };

  const handleBackToCalendar = () => {
    setStep('calendar');
  };

  const handleProceedToPayment = () => {
    // TODO: 決済処理へ進む
    alert('決済処理へ進みます');
  };

  const selectedMentor = mentors.find(m => m.id === selectedMentorId);

  // 予約情報からレッスン料金を計算
  const calculatePrice = () => {
    // 60分: 5,000円、90分: 7,500円
    return lessonDuration === 60 ? 5000 : 7500;
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-2">
        <div className="flex items-center">
          <CalendarClock className="h-6 w-6 mr-2 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold">メンターレッスン予約</h1>
        </div>
        
        {/* ステップ表示 - モバイル用 */}
        <div className="flex items-center md:hidden">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToCalendar}
            disabled={step === 'calendar'}
            className="text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            カレンダーに戻る
          </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* メンター選択リスト */}
          <div className={`md:col-span-1 ${step === 'confirmation' ? 'hidden md:block' : ''}`}>
            <MentorList
              mentors={mentors}
              selectedMentorId={selectedMentorId}
              onMentorSelect={handleMentorSelect}
              isLoading={isLoading}
            />
          </div>
          
          {/* カレンダー表示 */}
          <div className={`md:col-span-2 ${step === 'confirmation' ? 'hidden md:block' : ''}`}>
            {selectedMentorId && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">予約可能な日時を選択</h2>
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
                    onTimeSlotSelect={handleTimeSlotSelect}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 予約確認セクション */}
      {selectedDates.length > 0 && selectedTimeSlot && (
        <div 
          className={`mt-8 bg-white rounded-lg shadow p-4 ${step === 'confirmation' ? 'block' : 'md:block'}`}
          ref={confirmationRef}
          id="confirmation-section"
          aria-live="polite"
        >
          <h2 className="text-xl font-semibold mb-4" id="confirmation-heading">予約を確定する</h2>
          <div className="mb-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-md">
              <div className="font-medium w-24">メンター:</div>
              <div className="flex-1">{selectedMentor?.name}</div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-md">
              <div className="font-medium w-24">レッスン日:</div>
              <div className="flex-1">
                {selectedDates[0]?.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-md">
              <div className="font-medium w-24">レッスン時間:</div>
              <div className="flex-1">
                {selectedTimeSlot.startTime.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} 〜 {
                  lessonDuration === 60 
                    ? selectedTimeSlot.endTime.toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : new Date(selectedTimeSlot.startTime.getTime() + 90 * 60000).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                }
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="flex-1">
              <h3 className="font-medium mb-2">レッスン時間</h3>
              <div className="flex gap-2">
                <button 
                  className={`border ${lessonDuration === 60 ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-300 hover:border-primary'} px-4 py-2 rounded-md`}
                  onClick={() => handleLessonDurationChange(60)}
                  aria-pressed={lessonDuration === 60}
                >
                  60分
                </button>
                <button 
                  className={`border ${lessonDuration === 90 ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-300 hover:border-primary'} px-4 py-2 rounded-md`}
                  onClick={() => handleLessonDurationChange(90)}
                  aria-pressed={lessonDuration === 90}
                >
                  90分
                </button>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium mb-2">料金</h3>
              <p className="text-xl">¥{calculatePrice().toLocaleString()}</p>
              <p className="text-sm text-gray-500">（税込）</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={handleBackToCalendar}
              className="order-2 sm:order-1"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              予約内容を変更
            </Button>
            
            <Button 
              className="w-full sm:flex-1 order-1 sm:order-2"
              size="lg"
              onClick={handleProceedToPayment}
            >
              予約・決済に進む
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
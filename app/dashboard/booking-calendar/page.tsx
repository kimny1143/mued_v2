'use client';

import { useState, useEffect, useRef } from 'react';
import { MentorCalendar } from './_components/MentorCalendar';
import { MentorList } from './_components/MentorList';
import type { Mentor } from './_components/MentorList';
import { Button } from '@/app/components/ui/button';
import { CalendarClock, ArrowRight, ArrowLeft, Check } from 'lucide-react';
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

// 予約ステップの定義
type BookingStep = 'selection' | 'confirmation';

export default function BookingCalendarPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMentorId, setSelectedMentorId] = useState<string | undefined>();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<BookingStep>('selection');
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
    setSelectedDates([]);
    setSelectedTimeSlot(null);
  };

  const handleDateSelect = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    
    // 時間枠選択後、自動的に確認ステップに進む
    setStep('confirmation');
    
    // モバイルでは時間枠選択後、自動的に確認画面にスクロール
    if (window.innerWidth < 768) {
      setTimeout(() => {
        if (confirmationRef.current) {
          confirmationRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };
  
  const handleBackToSelection = () => {
    setStep('selection');
  };

  const handleProceedToPayment = async () => {
    if (!selectedTimeSlot || !selectedMentor || selectedDates.length === 0) {
      alert('予約情報が不完全です。もう一度お試しください。');
      return;
    }

    try {
      // 予約データの準備
      const reservationData = {
        slotId: selectedTimeSlot.id,
        mentorId: selectedMentor.id,
        startTime: selectedTimeSlot.startTime.toISOString(),
        endTime: selectedTimeSlot.endTime.toISOString(),
        hourlyRate: selectedTimeSlot.hourlyRate || 5000,
        amount: calculatePrice()
      };

      console.log('決済データ:', reservationData);

      // Stripe決済セッション作成APIを呼び出し
      const response = await fetch('/api/create-payment-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        throw new Error('決済セッションの作成に失敗しました');
      }

      const { sessionId, checkoutUrl } = await response.json();
      
      if (checkoutUrl) {
        // Stripe決済ページにリダイレクト
        window.location.href = checkoutUrl;
      } else {
        throw new Error('決済URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('決済処理エラー:', error);
      alert('決済処理でエラーが発生しました。もう一度お試しください。');
    }
  };

  const selectedMentor = mentors.find(m => m.id === selectedMentorId);

  // 予約情報からレッスン料金を計算
  const calculatePrice = () => {
    // 60分: 5,000円、90分: 7,500円
    return selectedTimeSlot ? selectedTimeSlot.hourlyRate || 0 : 0;
  };

  // MentorCalendarコンポーネントをレンダリング前のデバッグ
  if (DEBUG && mentors.length > 0) {
    console.log('🔴 page.tsx: MentorCalendarをレンダリング');
    console.log('🔴 page.tsx: mentors:', mentors);
    console.log('🔴 page.tsx: selectedMentorId:', selectedMentorId);
    console.log('🔴 page.tsx: mentors.length:', mentors?.length);
  }

  // 現在のステップに基づいてステップインジケーターを表示
  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-between mb-6 bg-white rounded-lg shadow p-4">
        <div className="hidden md:flex w-full justify-between">
          <div className={`flex flex-col items-center ${step === 'selection' ? 'text-primary font-medium' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${step === 'selection' ? 'bg-primary text-white' : 'bg-green-100 text-green-600'}`}>
              {step === 'confirmation' ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <span className="text-sm">メンター・日時選択</span>
          </div>
          
          <div className="w-full mx-4 mt-4 border-t border-gray-200" />
          
          <div className={`flex flex-col items-center ${step === 'confirmation' ? 'text-primary font-medium' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${step === 'confirmation' ? 'bg-primary text-white' : 'bg-gray-100'}`}>
              2
            </div>
            <span className="text-sm">予約確認・決済</span>
          </div>
        </div>
        
        {/* モバイル用のシンプルなステップ表示 */}
        <div className="flex md:hidden w-full items-center justify-between">
          <div className={`text-sm ${step === 'selection' ? 'text-primary font-medium' : 'text-green-600'}`}>
            1. 選択
          </div>
          <div className={`text-sm ${step === 'confirmation' ? 'text-primary font-medium' : 'text-gray-500'}`}>
            2. 確認・決済
          </div>
        </div>
      </div>
    );
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
          {step === 'confirmation' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToSelection}
              className="text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              選択に戻る
            </Button>
          )}
        </div>
      </div>
      
      {/* ステップインジケーター */}
      {renderStepIndicator()}
      
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
          {step === 'selection' && (
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
              </div>
            </div>
          )}
          
          {/* 予約確認セクション */}
          {step === 'confirmation' && selectedDates.length > 0 && selectedTimeSlot && (
            <div 
              className="bg-white rounded-lg shadow p-6"
              ref={confirmationRef}
              id="confirmation-section"
              aria-live="polite"
            >
              <h2 className="text-xl font-semibold mb-6" id="confirmation-heading">予約内容の確認</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">レッスン詳細</h3>
                  <div className="mb-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 bg-gray-50 rounded-md">
                      <div className="font-medium w-32">メンター:</div>
                      <div className="flex-1 flex items-center gap-2">
                        {selectedMentor?.image ? (
                          <img src={selectedMentor.image} alt={selectedMentor.name || '名前なし'} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {selectedMentor?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        {selectedMentor?.name}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 bg-gray-50 rounded-md">
                      <div className="font-medium w-32">レッスン日:</div>
                      <div className="flex-1">
                        {selectedDates[0]?.toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 bg-gray-50 rounded-md">
                      <div className="font-medium w-32">開始時間:</div>
                      <div className="flex-1">
                        {selectedTimeSlot.startTime.toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">料金詳細</h3>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <span>レッスン時間:</span>
                      <span>¥{calculatePrice().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                      <span>消費税（10%）</span>
                      <span>¥{(calculatePrice() * 0.1).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-300 my-2"></div>
                    <div className="flex justify-between items-center font-bold mt-2">
                      <span>合計</span>
                      <span>¥{calculatePrice().toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">（税込）</p>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">お支払い方法</h3>
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="text-sm">クレジットカード（Visa、Mastercard、JCB、American Express）</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleBackToSelection}
                  className="order-2 sm:order-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  日時を変更
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
        </>
      )}
    </div>
  );
} 
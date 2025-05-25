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

// 予約情報の型定義
interface Reservation {
  id: string;
  slotId: string;
  studentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  bookedStartTime: string;
  bookedEndTime: string;
  createdAt: string;
  student: {
    id: string;
    name: string | null;
    email: string;
  };
  slot: {
    id: string;
    teacherId: string;
    teacher: {
      id: string;
      name: string | null;
    };
  };
}

// レッスンスロットをメンター形式に変換する関数
function convertLessonSlotsToMentors(lessonSlots: LessonSlot[]): Mentor[] {
  try {
    // メンターIDでグループ化
    const mentorMap: Record<string, LessonSlot[]> = {};
    
    // スロットの利用可能性を詳細チェック
    const availableSlots = lessonSlots.filter(slot => {
      // 基本的なisAvailableフラグをチェック
      if (!slot.isAvailable) return false;
      
      // 予約情報がある場合の詳細チェック
      if (slot.reservations && slot.reservations.length > 0) {
        const slotStart = new Date(slot.startTime).getTime();
        const slotEnd = new Date(slot.endTime).getTime();
        
        // 確定済みまたは保留中の予約を取得
        const activeReservations = slot.reservations.filter(
          res => res.status === 'CONFIRMED' || res.status === 'PENDING'
        );
        
        // スロット全体が予約で埋まっているかチェック
        let totalBookedTime = 0;
        const bookedIntervals: Array<{start: number, end: number}> = [];
        
        activeReservations.forEach(reservation => {
          if (reservation.bookedStartTime && reservation.bookedEndTime) {
            const bookStart = new Date(reservation.bookedStartTime).getTime();
            const bookEnd = new Date(reservation.bookedEndTime).getTime();
            
            // スロット範囲内の予約のみカウント
            const effectiveStart = Math.max(bookStart, slotStart);
            const effectiveEnd = Math.min(bookEnd, slotEnd);
            
            if (effectiveStart < effectiveEnd) {
              bookedIntervals.push({start: effectiveStart, end: effectiveEnd});
            }
          }
        });
        
        // 重複する時間帯をマージして実際の予約時間を計算
        if (bookedIntervals.length > 0) {
          bookedIntervals.sort((a, b) => a.start - b.start);
          const mergedIntervals: Array<{start: number, end: number}> = [bookedIntervals[0]];
          
          for (let i = 1; i < bookedIntervals.length; i++) {
            const current = bookedIntervals[i];
            const lastMerged = mergedIntervals[mergedIntervals.length - 1];
            
            if (current.start <= lastMerged.end) {
              // 重複している場合はマージ
              lastMerged.end = Math.max(lastMerged.end, current.end);
            } else {
              // 重複していない場合は新しい区間として追加
              mergedIntervals.push(current);
            }
          }
          
          // 実際の予約時間を計算
          totalBookedTime = mergedIntervals.reduce(
            (total, interval) => total + (interval.end - interval.start), 
            0
          );
        }
        
        const slotDuration = slotEnd - slotStart;
        const availableTime = slotDuration - totalBookedTime;
        
        // 最低60分の空きがない場合は利用不可とする
        const MIN_LESSON_TIME = 60 * 60 * 1000; // 60分をミリ秒に変換
        
        console.log(`📅 スロット空き状況分析:`, {
          slotId: slot.id,
          slotDuration: Math.round(slotDuration / (60 * 1000)) + '分',
          totalBookedTime: Math.round(totalBookedTime / (60 * 1000)) + '分',
          availableTime: Math.round(availableTime / (60 * 1000)) + '分',
          isAvailable: availableTime >= MIN_LESSON_TIME
        });
        
        return availableTime >= MIN_LESSON_TIME;
      }
      
      return true; // 予約がない場合は利用可能
    });
    
    console.log('📊 空き状況フィルタリング結果:', {
      totalSlots: lessonSlots.length,
      availableSlots: availableSlots.length,
      filteredOut: lessonSlots.length - availableSlots.length
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
          endTime: new Date(slot.endTime),
          // 予約情報の型を適切に変換
          reservations: slot.reservations?.map(res => ({
            id: res.id,
            status: res.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
            bookedStartTime: res.bookedStartTime,
            bookedEndTime: res.bookedEndTime
          })) || []
        })),
        availableSlotsCount: slots.length
      };
    });
  } catch (error) {
    console.error('❌ データ変換エラー:', error);
    return [];
  }
}

export default function BookingCalendarPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 予約情報とスロット情報を統合してスロットの実際の空き状況を計算
  const calculateSlotAvailability = (lessonSlots: LessonSlot[], reservations: Reservation[]) => {
    return lessonSlots.map(slot => {
      // このスロットに関連する予約を取得
      const slotReservations = reservations.filter(
        res => res.slotId === slot.id && (res.status === 'CONFIRMED' || res.status === 'PENDING')
      );
      
      // 予約情報をスロットのreservationsフィールドに統合
      const updatedSlot = {
        ...slot,
        reservations: slotReservations.map(res => ({
          id: res.id,
          status: res.status,
          bookedStartTime: res.bookedStartTime,
          bookedEndTime: res.bookedEndTime,
          student: res.student
        }))
      };
      
      return updatedSlot;
    });
  };

  // APIからメンターデータを取得
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setIsLoading(true);
        
        // 認証トークンを取得
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        
        console.log('🔥 APIリクエスト開始: スロットと予約情報を並行取得');
        
        // スロット情報、全予約情報、自分の予約情報を並行取得
        const [slotsResponse, reservationsResponse, myReservationsResponse] = await Promise.all([
          fetch('/api/lesson-slots?viewMode=all', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: 'include',
          }),
          fetch('/api/reservations', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: 'include',
          }),
          fetch('/api/my-reservations', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: 'include',
          })
        ]);
        
        // スロット情報の処理
        if (!slotsResponse.ok) {
          const errorResponse = await slotsResponse.json();
          throw new Error(errorResponse.error || `スロット取得エラー: ${slotsResponse.status}`);
        }
        
        // 予約情報の処理
        if (!reservationsResponse.ok) {
          const errorResponse = await reservationsResponse.json();
          console.warn('予約情報取得に失敗:', errorResponse);
          // 予約情報の取得に失敗しても、スロット情報は表示する
        }
        
        // 自分の予約情報の処理
        if (!myReservationsResponse.ok) {
          const errorResponse = await myReservationsResponse.json();
          console.warn('自分の予約情報取得に失敗:', errorResponse);
        }
        
        const slotsData: LessonSlot[] = await slotsResponse.json();
        const reservationsData: Reservation[] = reservationsResponse.ok 
          ? await reservationsResponse.json() 
          : [];
        const myReservationsData: Reservation[] = myReservationsResponse.ok 
          ? await myReservationsResponse.json() 
          : [];
        
        console.log(`📊 取得結果:`);
        console.log(`- レッスンスロット: ${slotsData.length}件`);
        console.log(`- 全予約情報: ${reservationsData.length}件`);
        console.log(`- 自分の予約情報: ${myReservationsData.length}件`);
        
        // 予約情報を保存
        setReservations(reservationsData);
        setMyReservations(myReservationsData);
        
        // スロット情報と予約情報を統合
        const updatedSlots = calculateSlotAvailability(slotsData, reservationsData);
        
        // メンター形式に変換
        const convertedMentors = convertLessonSlotsToMentors(updatedSlots);
        console.log('🎯 統合後のメンターデータ:', convertedMentors);
        
        if (convertedMentors.length > 0) {
          console.log('✅ mentorsを設定完了');
          setMentors(convertedMentors);
        } else {
          console.log('⚠️ 利用可能なメンターがありません');
        }
        
      } catch (err) {
        console.error('❌ データ取得エラー:', err);
        setError('メンター情報の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, []);

  // MentorCalendarコンポーネントをレンダリング前のデバッグ
  if (DEBUG && mentors.length > 0) {
    console.log('🔴 page.tsx: MentorCalendarをレンダリング');
    console.log('🔴 page.tsx: mentors:', mentors);
    console.log('🔴 page.tsx: mentors.length:', mentors?.length);
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-2">
        <div className="flex items-center">
          <CalendarClock className="h-6 w-6 mr-2 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold">メンターレッスン予約</h1>
        </div>
        <div className="text-sm text-gray-600">
          {mentors.length}人のメンターが利用可能
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
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">予約可能な日時を選択</h2>
            <p className="text-sm text-gray-600 mt-1">
              カレンダー上で気になる日付をクリックして、その日のレッスン一覧を確認できます
            </p>
          </div>
          
          <div className="p-6">
            <MentorCalendar
              mentors={mentors}
              isLoading={isLoading}
              myReservations={myReservations}
            />
          </div>
        </div>
      )}
    </div>
  );
} 
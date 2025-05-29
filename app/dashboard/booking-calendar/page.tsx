'use client';

import { useState, useEffect, useRef } from 'react';
import { MentorCalendar } from './_components/MentorCalendar';
import { MentorList } from './_components/MentorList';
import type { Mentor, LessonSlot, Reservation } from '@/lib/types';
import { Button } from '@/app/components/ui/button';
import { CalendarClock, ArrowRight, ArrowLeft } from 'lucide-react';
import { TimeSlot } from './_components/TimeSlotDisplay';
import { supabaseBrowser } from '@/lib/supabase-browser';
import DashboardLayout from '../layout';

// デバッグモード
const DEBUG = true;

// APIレスポンス用の型定義（lesson_slotsプロパティを含む）
interface ApiLessonSlot {
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

// APIレスポンス用の予約型定義（lesson_slotsプロパティを含む）
interface ApiReservation {
  id: string;
  slotId: string;
  studentId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  bookedStartTime: string;
  bookedEndTime: string;
  createdAt: string;
  lesson_slots?: {
    id: string;
    users?: {
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
          id: slot.id,
          teacherId: slot.teacherId,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
          isAvailable: slot.isAvailable,
          hourlyRate: slot.hourlyRate,
          currency: slot.currency,
          teacher: slot.teacher,
          reservations: slot.reservations?.map(res => ({
            id: res.id,
            slotId: slot.id,
            studentId: '', // APIから取得する必要がある
            status: res.status as Reservation['status'],
            bookedStartTime: res.bookedStartTime || '',
            bookedEndTime: res.bookedEndTime || '',
            createdAt: '', // APIから取得する必要がある
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
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now()); // データ再取得のトリガー
  const [realtimeStatus, setRealtimeStatus] = useState<{
    lessonSlots: 'connecting' | 'connected' | 'disconnected' | 'error';
    reservations: 'connecting' | 'connected' | 'disconnected' | 'error';
  }>({
    lessonSlots: 'disconnected',
    reservations: 'disconnected'
  });

  // 予約情報とスロット情報を統合してスロットの実際の空き状況を計算
  const calculateSlotAvailability = (lessonSlots: ApiLessonSlot[], reservations: Reservation[]) => {
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

  // データ取得関数を分離（再利用可能にする）
  const fetchMentorsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 認証トークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      
      console.log('🔥 APIリクエスト開始: スロットと予約情報を並行取得');
      
      // スロット情報、全予約情報、自分の予約情報を並行取得
      const [slotsResponse, reservationsResponse] = await Promise.all([
        fetch('/api/lesson-slots?viewMode=all', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          cache: 'no-store', // キャッシュを無効化
        }),
        fetch('/api/reservations', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          cache: 'no-store', // キャッシュを無効化
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
      
      const slotsData: ApiLessonSlot[] = await slotsResponse.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allReservationsData: any[] = reservationsResponse.ok 
        ? await reservationsResponse.json() 
        : [];
      
      console.log(`📊 取得結果:`);
      console.log(`- レッスンスロット: ${slotsData.length}件`);
      console.log(`- 全予約情報: ${allReservationsData.length}件`);
      
      // Supabaseから直接ユーザーIDを取得（session.tsは使用しない）
      const currentUserId = sessionData.session?.user?.id;
      
      console.log('🔍 Supabaseから取得したユーザーID:', currentUserId);
      
      if (!currentUserId) {
        console.warn('⚠️ ユーザーIDが取得できませんでした');
        setMyReservations([]);
      } else {
        console.log('🔍 全予約データの詳細:', allReservationsData.map(res => ({
          id: res.id,
          studentId: res.studentId,
          status: res.status,
          studentIdType: typeof res.studentId,
          currentUserIdType: typeof currentUserId,
          isMatch: res.studentId === currentUserId
        })));
        
        const myReservationsFormatted = allReservationsData
          .filter((res) => {
            const isMyReservation = res.studentId === currentUserId;
            console.log(`🔍 予約 ${res.id}: studentId=${res.studentId}, currentUserId=${currentUserId}, match=${isMyReservation}`);
            return isMyReservation;
          })
          .filter((res) => ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'PENDING'].includes(res.status)) // アクティブな予約のみ
          .map((res) => {
            console.log('🔍 自分の予約をフォーマット:', {
              id: res.id,
              status: res.status,
              bookedStartTime: res.bookedStartTime,
              bookedEndTime: res.bookedEndTime
            });
            return {
              id: res.id,
              slotId: res.slotId,
              studentId: res.studentId,
              status: res.status as Reservation['status'],
              bookedStartTime: res.bookedStartTime,
              bookedEndTime: res.bookedEndTime,
              createdAt: res.createdAt,
              student: {
                id: res.studentId,
                name: res.student?.name || null,
                email: res.student?.email || ''
              },
              slot: res.lessonSlots ? {
                id: res.lessonSlots.id || res.slotId,
                teacherId: res.lessonSlots.teacherId || res.lessonSlots.users?.id || '',
                teacher: {
                  id: res.lessonSlots.users?.id || '',
                  name: res.lessonSlots.users?.name || null,
                }
              } : undefined
            };
          });
        
        console.log(`- 自分の予約情報: ${myReservationsFormatted.length}件`);
        console.log('🔍 自分の予約詳細:', myReservationsFormatted);
        
        setMyReservations(myReservationsFormatted);
      }
      
      // 予約情報を保存
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setReservations(allReservationsData as any);
      
      // スロット情報と予約情報を統合（型変換を簡素化）
      const updatedSlots = slotsData.map(slot => ({
        ...slot,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime),
        reservations: allReservationsData
          .filter(res => res.slotId === slot.id)
          .map(res => ({
            id: res.id,
            slotId: res.slotId,
            studentId: res.studentId,
            status: res.status,
            bookedStartTime: res.bookedStartTime,
            bookedEndTime: res.bookedEndTime,
            createdAt: res.createdAt,
            student: res.student
          }))
      }));
      
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

  // 手動でデータを再取得する関数
  const refreshData = () => {
    console.log('🔄 手動データ再取得開始');
    setLastRefresh(Date.now());
  };

  // URLパラメータをチェックして予約完了を検知
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const setupSuccess = urlParams.get('setup_success');
    
    if (success === 'true' || setupSuccess === 'true') {
      console.log('🎉 予約完了を検知 - データを再取得します');
      // URLパラメータをクリア
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // データを再取得
      refreshData();
    }
  }, []);

  // APIからメンターデータを取得
  useEffect(() => {
    fetchMentorsData();
  }, [lastRefresh]); // lastRefreshが変更されたときに再実行

  // ページがフォーカスされたときにデータを更新
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 ページフォーカス時のデータ更新を実行');
      refreshData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Supabaseリアルタイム更新を設定
  useEffect(() => {
    let lessonSlotsSubscription: ReturnType<typeof supabaseBrowser.channel> | null = null;
    let reservationsSubscription: ReturnType<typeof supabaseBrowser.channel> | null = null;

    const setupRealtimeSubscriptions = async () => {
      try {
        // 認証されたユーザーの情報を取得
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        if (!sessionData.session?.user?.id) {
          console.log('認証されていないため、リアルタイム監視をスキップ');
          return;
        }

        const userId = sessionData.session.user.id;
        console.log('🔴 リアルタイム監視を開始:', userId);

        // 接続開始時のステータス更新
        setRealtimeStatus({
          lessonSlots: 'connecting',
          reservations: 'connecting'
        });

        // lesson_slotsテーブルの変更を監視
        lessonSlotsSubscription = supabaseBrowser
          .channel('lesson-slots-changes-booking')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'lesson_slots',
            },
            (payload) => {
              console.log('📅 lesson_slotsリアルタイム更新を受信:', payload);
              
              // データ変更があった場合に自動的にリフレッシュ
              setTimeout(() => {
                console.log('🔄 lesson_slots変更によるデータ再取得');
                refreshData();
              }, 500);
            }
          )
          .subscribe((status) => {
            console.log('lesson_slotsリアルタイム監視状態:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ lesson_slotsリアルタイム監視が開始されました');
              setRealtimeStatus(prev => ({ ...prev, lessonSlots: 'connected' }));
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ lesson_slotsリアルタイム監視でエラーが発生しました:', status);
              setRealtimeStatus(prev => ({ ...prev, lessonSlots: 'error' }));
            }
          });

        // reservationsテーブルの変更を監視
        reservationsSubscription = supabaseBrowser
          .channel('reservations-changes-booking')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'reservations',
            },
            (payload) => {
              console.log('📝 reservationsリアルタイム更新を受信:', payload);
              
              // データ変更があった場合に自動的にリフレッシュ
              setTimeout(() => {
                console.log('🔄 reservations変更によるデータ再取得');
                refreshData();
              }, 500);
            }
          )
          .subscribe((status) => {
            console.log('reservationsリアルタイム監視状態:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ reservationsリアルタイム監視が開始されました');
              setRealtimeStatus(prev => ({ ...prev, reservations: 'connected' }));
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ reservationsリアルタイム監視でエラーが発生しました:', status);
              setRealtimeStatus(prev => ({ ...prev, reservations: 'error' }));
            }
          });

      } catch (error) {
        console.error('リアルタイム監視の設定エラー:', error);
      }
    };

    setupRealtimeSubscriptions();

    // クリーンアップ
    return () => {
      if (lessonSlotsSubscription) {
        console.log('lesson_slotsリアルタイム監視を停止');
        supabaseBrowser.removeChannel(lessonSlotsSubscription);
      }
      if (reservationsSubscription) {
        console.log('reservationsリアルタイム監視を停止');
        supabaseBrowser.removeChannel(reservationsSubscription);
      }
    };
  }, []);

  // MentorCalendarコンポーネントをレンダリング前のデバッグ
  if (DEBUG && mentors.length > 0) {
    console.log('🔴 page.tsx: MentorCalendarをレンダリング');
    console.log('🔴 page.tsx: mentors:', mentors);
    console.log('🔴 page.tsx: mentors.length:', mentors?.length);
  }

  return (
    <DashboardLayout 
      title="メンターレッスン予約"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm text-gray-600 hidden sm:block">
            {mentors.length}人のメンターが利用可能
          </div>
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? '更新中...' : '🔄 更新'}
          </Button>
          
          {/* リアルタイム接続状態表示 */}
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus.lessonSlots === 'connected' ? 'bg-green-500' :
                realtimeStatus.lessonSlots === 'connecting' ? 'bg-yellow-500' :
                realtimeStatus.lessonSlots === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-gray-500 hidden sm:inline">スロット</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus.reservations === 'connected' ? 'bg-green-500' :
                realtimeStatus.reservations === 'connecting' ? 'bg-yellow-500' :
                realtimeStatus.reservations === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-gray-500 hidden sm:inline">予約</span>
            </div>
          </div>
        </div>
      }
    >
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg" role="alert">
          <p>{error}</p>
          <Button 
            onClick={refreshData}
            variant="outline" 
            className="mt-2"
          >
            再読み込み
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-none sm:rounded-lg shadow-none sm:shadow">
          <div className="p-0">
            <MentorCalendar
              mentors={mentors}
              isLoading={isLoading}
              myReservations={myReservations}
              onRefreshData={refreshData} // データ再取得関数を渡す
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 
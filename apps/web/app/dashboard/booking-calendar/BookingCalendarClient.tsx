'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Mentor, LessonSlot, Reservation } from '@/lib/types';

import { MentorCalendar } from './_components/MentorCalendar';


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
  console.log('🔄 convertLessonSlotsToMentors STARTED with', lessonSlots.length, 'slots');
  try {
    // 入力検証
    if (!Array.isArray(lessonSlots)) {
      console.warn('convertLessonSlotsToMentors: lessonSlots が配列ではありません:', typeof lessonSlots);
      return [];
    }
    
    if (lessonSlots.length === 0) {
      console.log('convertLessonSlotsToMentors: lessonSlots が空です');
      return [];
    }
    
    console.log('convertLessonSlotsToMentors: 変換開始、スロット数:', lessonSlots.length);
    
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
        
        // 重複する時間帯をマージして実際の予約時間を計算（簡略化版）
        if (bookedIntervals.length > 0) {
          try {
            bookedIntervals.sort((a, b) => a.start - b.start);
            const mergedIntervals: Array<{start: number, end: number}> = [bookedIntervals[0]];
            
            // 安全な上限を設定してループの暴走を防ぐ
            const maxIterations = Math.min(bookedIntervals.length, 100);
            
            for (let i = 1; i < maxIterations; i++) {
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
          } catch (mergeError) {
            console.error('間隔マージエラー:', mergeError);
            // フォールバック: 単純な合計
            totalBookedTime = bookedIntervals.reduce(
              (total, interval) => total + (interval.end - interval.start), 
              0
            );
          }
        }
        
        const slotDuration = slotEnd - slotStart;
        const availableTime = slotDuration - totalBookedTime;
        
        // 最低60分の空きがない場合は利用不可とする
        const MIN_LESSON_TIME = 60 * 60 * 1000; // 60分をミリ秒に変換
        
        
        return availableTime >= MIN_LESSON_TIME;
      }
      
      return true; // 予約がない場合は利用可能
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
    console.log('🔄 Building mentors from', Object.keys(mentorMap).length, 'mentor groups');
    const mentorEntries = Object.entries(mentorMap).map(([mentorId, slots]) => {
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
    
    const result = mentorEntries;
    console.log('🔄 convertLessonSlotsToMentors COMPLETED successfully with', result.length, 'mentors');
    return result;
  } catch (error) {
    console.error('❌ データ変換エラー:', error);
    return [];
  }
}

interface BookingCalendarClientProps {
  userRole: string;
}

export default function BookingCalendarClient({ userRole }: BookingCalendarClientProps) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now()); // データ再取得のトリガー
  const [debugInfo, setDebugInfo] = useState<any>(null); // デバッグ情報
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
    console.log('🔥 fetchMentorsData STARTED');
    const debugSteps: any[] = [];
    
    try {
      setIsLoading(true);
      setError(null);
      debugSteps.push({ step: 'start', timestamp: Date.now() });
      
      // 認証トークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      debugSteps.push({ 
        step: 'auth', 
        timestamp: Date.now(), 
        hasToken: !!token,
        userId: sessionData.session?.user?.id
      });
      
      // スロット情報、全予約情報、自分の予約情報を並行取得
      debugSteps.push({ step: 'fetching_apis', timestamp: Date.now() });
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
      
      debugSteps.push({ 
        step: 'api_responses', 
        timestamp: Date.now(),
        slotsStatus: slotsResponse.status,
        reservationsStatus: reservationsResponse.status
      });
      
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
      debugSteps.push({ 
        step: 'slots_parsed', 
        timestamp: Date.now(),
        slotsCount: slotsData.length
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allReservationsData: any[] = reservationsResponse.ok 
        ? await reservationsResponse.json() 
        : [];
        
      debugSteps.push({ 
        step: 'reservations_parsed', 
        timestamp: Date.now(),
        reservationsCount: allReservationsData.length
      });
      
      
      // Supabaseから直接ユーザーIDを取得（session.tsは使用しない）
      const currentUserId = sessionData.session?.user?.id;
      
      
      if (!currentUserId) {
        setMyReservations([]);
      } else {
        
        const myReservationsFormatted = allReservationsData
          .filter((res) => {
            const isMyReservation = res.studentId === currentUserId;
            return isMyReservation;
          })
          .filter((res) => ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'PENDING'].includes(res.status)) // アクティブな予約のみ
          .map((res) => {
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
      debugSteps.push({ step: 'conversion_start', timestamp: Date.now() });
      const convertedMentors = convertLessonSlotsToMentors(updatedSlots);
      debugSteps.push({ 
        step: 'conversion_end', 
        timestamp: Date.now(),
        mentorsResult: convertedMentors.length
      });
      
      debugSteps.push({ 
        step: 'conversion_complete', 
        timestamp: Date.now(),
        mentorsCount: convertedMentors.length
      });

      if (convertedMentors.length > 0) {
        setMentors(convertedMentors);
      } else {
        console.warn('変換後のメンター数が0です');
      }
      
      debugSteps.push({ step: 'success', timestamp: Date.now() });
      
    } catch (err) {
      console.error('データ取得エラー:', err);
      debugSteps.push({ 
        step: 'error', 
        timestamp: Date.now(), 
        error: String(err) 
      });
      setError('メンター情報の取得に失敗しました。');
    } finally {
      setDebugInfo({ steps: debugSteps, totalTime: Date.now() - debugSteps[0]?.timestamp });
      setIsLoading(false);
    }
  };

  // 手動でデータを再取得する関数
  const refreshData = () => {
    setLastRefresh(Date.now());
  };

  // URLパラメータをチェックして予約完了を検知
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const setupSuccess = urlParams.get('setup_success');
    
    if (success === 'true' || setupSuccess === 'true') {
      // URLパラメータをクリア
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // データを再取得
      refreshData();
    }
  }, []);

  // APIからメンターデータを取得
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.error('fetchMentorsData がタイムアウトしました。強制的に読み込み状態を解除します。');
      setIsLoading(false);
      setError('データの読み込みがタイムアウトしました。ページを再読み込みしてください。');
    }, 30000); // 30秒タイムアウト

    fetchMentorsData().finally(() => {
      clearTimeout(timeoutId);
    });
    
    return () => clearTimeout(timeoutId);
  }, [lastRefresh]); // lastRefreshが変更されたときに再実行

  // ページがフォーカスされたときにデータを更新
  useEffect(() => {
    const handleFocus = () => {
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
          return;
        }

        const userId = sessionData.session.user.id;

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
              
              // データ変更があった場合に自動的にリフレッシュ
              setTimeout(() => {
                refreshData();
              }, 500);
            }
          )
          .subscribe((status) => {
            
            if (status === 'SUBSCRIBED') {
              setRealtimeStatus(prev => ({ ...prev, lessonSlots: 'connected' }));
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
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
              
              // データ変更があった場合に自動的にリフレッシュ
              setTimeout(() => {
                refreshData();
              }, 500);
            }
          )
          .subscribe((status) => {
            
            if (status === 'SUBSCRIBED') {
              setRealtimeStatus(prev => ({ ...prev, reservations: 'connected' }));
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setRealtimeStatus(prev => ({ ...prev, reservations: 'error' }));
            }
          });

      } catch (error) {
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


  return (
    <>
      {/* ページヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">メンターレッスン予約</h1>
            <p className="text-sm text-gray-600 mt-1">
              {mentors.length}人のメンターが利用可能
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

      {/* デバッグ情報表示 */}
      {DEBUG && debugInfo && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-semibold mb-2 text-blue-900">🔍 デバッグ情報</h3>
          <div className="text-xs space-y-1 text-blue-800">
            <p>• 総処理時間: <span className="font-medium">{debugInfo.totalTime}ms</span></p>
            <div className="bg-white p-2 rounded text-xs overflow-auto max-h-32">
              <pre>{JSON.stringify(debugInfo.steps, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

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
          {/* デバッグ情報も表示 */}
          {debugInfo && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm">デバッグ情報を表示</summary>
              <div className="bg-white p-2 rounded text-xs overflow-auto max-h-32 mt-2">
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            </details>
          )}
        </div>
      ) : (
        <MentorCalendar
          mentors={mentors}
          isLoading={isLoading}
          myReservations={myReservations}
          onRefreshData={refreshData} // データ再取得関数を渡す
        />
      )}
    </>
  );
}
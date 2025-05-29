'use client';

import { useState, useEffect, useCallback } from 'react';
import { SlotsCalendar } from './_components/SlotsCalendar';
import { CalendarClock, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ReservationStatus } from '@prisma/client';
import { CancelReason } from '@/lib/types/reservation';
import { ReservationManagementModal, type ReservationManagementModalProps } from './_components/ReservationManagementModal';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api-client';

// デバッグモード
const DEBUG = true;

// レッスンスロットの型定義（メンター視点）
interface MentorLessonSlot {
  id: string;
  teacherId: string;
  startTime: string | Date;
  endTime: string | Date;
  isAvailable: boolean;
  hourlyRate?: number;
  currency?: string;
  minDuration?: number;
  maxDuration?: number;
  description?: string;
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
    totalAmount?: number;
    notes?: string;
    student?: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

type ModalMode = 'view' | 'cancel' | 'reschedule' | 'approve' | 'reject';

// 予約データの型定義
interface ReservationData {
  id: string;
  status: ReservationStatus;
  bookedStartTime: Date;
  bookedEndTime: Date;
  totalAmount: number;
  notes?: string;
  teacher: { name: string; };
  student?: { name: string; };
}

export default function SlotsCalendarPage() {
  const [slots, setSlots] = useState<MentorLessonSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'mentor' | 'admin'>('mentor');
  
  // 予約管理モーダル関連の状態
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null);
  const [reservationModalMode, setReservationModalMode] = useState<ModalMode>('view');
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isReservationProcessing, setIsReservationProcessing] = useState(false);

  // スロットデータを取得する関数（RLSポリシー対応版）
  const fetchMySlots = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 認証トークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      
      if (!token) {
        throw new Error('認証が必要です。ログインしてください。');
      }
      
      // ユーザーロールを取得
      const userMetadata = sessionData.session?.user?.user_metadata;
      const currentUserRole = userMetadata?.role || 'student';
      
      console.log(`APIリクエスト開始: レッスンスロットを取得 (ロール: ${currentUserRole})`);
      
      // ロールに応じてviewModeを設定
      let viewMode = 'own'; // デフォルト（メンターの場合）
      
      if (currentUserRole === 'student') {
        viewMode = 'available'; // 生徒の場合は利用可能なスロットを取得
      } else if (currentUserRole === 'admin') {
        viewMode = 'all'; // 管理者の場合はすべてのスロットを取得
      }
      
      const response = await fetch(`/api/lesson-slots?viewMode=${viewMode}`, {
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
      
      const data: MentorLessonSlot[] = await response.json();
      console.log(`取得したレッスンスロット: ${data.length}件 (${viewMode}モード)`);
      
      if (DEBUG && data.length > 0) {
        console.log('最初のスロット例:', {
          id: data[0].id,
          startTime: data[0].startTime,
          endTime: data[0].endTime,
          isAvailable: data[0].isAvailable,
          reservations: data[0].reservations?.length || 0,
          teacherName: data[0].teacher?.name
        });
      }
      
      setSlots(data);
      setError(null);
      
    } catch (err) {
      console.error('スロット情報取得エラー:', err);
      setError(err instanceof Error ? err.message : 'スロット情報の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ユーザーロールを取得
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        
        if (token) {
          const response = await fetch('/api/user', {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role || 'mentor');
          }
        }
      } catch (error) {
        console.error('ユーザーロール取得エラー:', error);
      }
    };

    getUserRole();
  }, []);

  // 初回スロットデータ取得
  useEffect(() => {
    fetchMySlots();
  }, [fetchMySlots]);

  // リアルタイム更新を設定（RLSポリシー対応版）
  useEffect(() => {
    let subscription: ReturnType<typeof supabaseBrowser.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      try {
        // 認証されたユーザーの情報を取得
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        if (!sessionData.session?.user?.id) {
          console.log('認証されていないため、リアルタイム監視をスキップ');
          return;
        }

        const userId = sessionData.session.user.id;
        const userMetadata = sessionData.session.user.user_metadata;
        const userRole = userMetadata?.role || 'student';
        
        // ロールに応じたリアルタイム監視の設定
        const channelName = `lesson-slots-changes-${userRole}`;
        
        subscription = supabaseBrowser
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'lesson_slots',
              // RLSポリシーによりアクセス可能なデータのみが配信される
              // フィルターは不要（RLSが自動的に適用される）
            },
            (payload) => {
              console.log(`リアルタイム更新を受信 (${userRole}):`, payload);
              
              // データ変更があった場合に自動的にリフレッシュ
              setTimeout(() => {
                fetchMySlots();
              }, 500);
            }
          )
          .subscribe((status) => {
            console.log(`リアルタイム監視状態 (${userRole}):`, status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ リアルタイム監視が開始されました');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ リアルタイム監視でエラーが発生しました:', status);
            }
          });
      } catch (error) {
        console.error('リアルタイム監視の設定エラー:', error);
      }
    };

    setupRealtimeSubscription();

    // クリーンアップ
    return () => {
      if (subscription) {
        console.log('リアルタイム監視を停止');
        supabaseBrowser.removeChannel(subscription);
      }
    };
  }, [fetchMySlots]);

  // 予約クリック処理
  const handleReservationClick = async (reservation: MentorLessonSlot['reservations'][0], mode: ModalMode = 'view') => {
    try {
      // スロット情報を取得（予約から逆引き）
      const parentSlot = slots.find(slot => 
        slot.reservations.some(res => res.id === reservation.id)
      );

      let totalAmount = 0;
      try {
        // 予約の詳細情報をAPIから取得
        const reservationDetail = await api.get(`/api/reservations/${reservation.id}`) as {
          totalAmount?: number;
          total_amount?: number;
          [key: string]: unknown;
        };
        
        // デバッグ用ログ
        console.log('=== handleReservationClick API Debug ===');
        console.log('API Response:', reservationDetail);
        console.log('totalAmount from API:', reservationDetail.totalAmount);
        console.log('total_amount from API:', reservationDetail.total_amount);
        console.log('============================================');
        
        totalAmount = reservationDetail.totalAmount || 0;
      } catch (error) {
        if (error instanceof ApiError) {
          console.warn(`API request failed (${error.status}), calculating from slot data`);
        } else {
          console.warn('API request failed, calculating from slot data');
        }
        // APIエラーの場合はスロットの時間単価から計算
        const duration = new Date(reservation.bookedEndTime || '').getTime() - new Date(reservation.bookedStartTime || '').getTime();
        const hours = duration / (1000 * 60 * 60);
        totalAmount = Math.round((parentSlot?.hourlyRate || 5000) * hours);
        console.log('Calculated totalAmount from slot:', totalAmount);
      }
      
      console.log('Final totalAmount value:', totalAmount);
      
      // 予約データを適切な形式に変換
      const reservationData: ReservationData = {
        id: reservation.id,
        status: reservation.status as ReservationStatus,
        bookedStartTime: new Date(reservation.bookedStartTime || ''),
        bookedEndTime: new Date(reservation.bookedEndTime || ''),
        totalAmount: totalAmount,
        notes: reservation.notes,
        teacher: { 
          name: parentSlot?.teacher?.name || 'Unknown Teacher' 
        },
        student: reservation.student ? { 
          name: reservation.student.name || 'Unknown Student' 
        } : undefined,
      };

      setSelectedReservation(reservationData);
      setReservationModalMode(mode);
      setIsReservationModalOpen(true);
    } catch (error) {
      console.error('予約詳細取得エラー:', error);
      toast.error('予約詳細の取得に失敗しました');
    }
  };

  // 予約キャンセル処理（リアルタイム更新版）
  const handleReservationCancel = async (reason: CancelReason, notes?: string) => {
    if (!selectedReservation) return;
    
    try {
      setIsReservationProcessing(true);
      
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/reservations/${selectedReservation.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, notes }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'キャンセル処理に失敗しました');
      }

      toast.success('予約をキャンセルしました');
      
      // モーダルを閉じる
      setIsReservationModalOpen(false);
      setSelectedReservation(null);
      
      // スロット一覧をリアルタイム更新
      await fetchMySlots();
      
    } catch (error) {
      console.error('キャンセル処理エラー:', error);
      toast.error(`キャンセルに失敗しました: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsReservationProcessing(false);
    }
  };

  // 予約承認処理（リアルタイム更新版）
  const handleReservationApprove = async () => {
    if (!selectedReservation) return;
    
    try {
      setIsReservationProcessing(true);
      
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/reservations/${selectedReservation.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '承認処理に失敗しました');
      }

      toast.success('予約を承認しました');
      
      // モーダルを閉じる
      setIsReservationModalOpen(false);
      setSelectedReservation(null);
      
      // スロット一覧をリアルタイム更新
      await fetchMySlots();
      
    } catch (error) {
      console.error('承認処理エラー:', error);
      toast.error(`承認に失敗しました: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsReservationProcessing(false);
    }
  };

  // 予約拒否処理（リアルタイム更新版）
  const handleReservationReject = async (reason: string) => {
    if (!selectedReservation) return;
    
    try {
      setIsReservationProcessing(true);
      
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/reservations/${selectedReservation.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '拒否処理に失敗しました');
      }

      toast.success('予約を拒否しました');
      
      // モーダルを閉じる
      setIsReservationModalOpen(false);
      setSelectedReservation(null);
      
      // スロット一覧をリアルタイム更新
      await fetchMySlots();
      
    } catch (error) {
      console.error('拒否処理エラー:', error);
      toast.error(`拒否に失敗しました: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsReservationProcessing(false);
    }
  };

  // リスケジュール処理（リアルタイム更新版）
  const handleReservationReschedule = async (newStartTime: Date, newEndTime: Date) => {
    if (!selectedReservation) return;
    
    try {
      setIsReservationProcessing(true);
      
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`/api/reservations/${selectedReservation.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          newStartTime: newStartTime.toISOString(),
          newEndTime: newEndTime.toISOString()
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'リスケジュール処理に失敗しました');
      }

      toast.success('予約をリスケジュールしました');
      
      // モーダルを閉じる
      setIsReservationModalOpen(false);
      setSelectedReservation(null);
      
      // スロット一覧をリアルタイム更新
      await fetchMySlots();
      
    } catch (error) {
      console.error('リスケジュール処理エラー:', error);
      toast.error(`リスケジュールに失敗しました: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsReservationProcessing(false);
    }
  };

  // スロット更新処理（最適化版）
  const handleSlotUpdate = useCallback((updatedSlot: MentorLessonSlot) => {
    setSlots(prev => {
      const existingSlotIndex = prev.findIndex(slot => slot.id === updatedSlot.id);
      
      if (existingSlotIndex >= 0) {
        // 既存スロットの更新
        const newSlots = [...prev];
        newSlots[existingSlotIndex] = updatedSlot;
        return newSlots;
      } else {
        // 新規スロットの追加
        return [...prev, updatedSlot];
      }
    });
    
    // 成功メッセージを表示
    toast.success('スロットが正常に保存されました');
    
    // 更新が反映されない場合のフォールバック（短縮）
    setTimeout(() => {
      fetchMySlots();
    }, 1000);
  }, [fetchMySlots]);

  // スロット削除処理（最適化版）
  const handleSlotDelete = useCallback((deletedSlotId: string) => {
    setSlots(prev => prev.filter(slot => slot.id !== deletedSlotId));
    
    // 成功メッセージを表示
    toast.success('スロットが正常に削除されました');
    
    // 削除が反映されない場合のフォールバック（短縮）
    setTimeout(() => {
      fetchMySlots();
    }, 1000);
  }, [fetchMySlots]);

  // エラー時の再読み込み処理
  const handleRetry = () => {
    setError(null);
    fetchMySlots();
  };

  return (
    <div className="w-full py-6 px-0 sm:px-4 lg:container lg:mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 px-2 sm:px-0">
        <div className="flex items-center">
          <CalendarClock className="h-6 w-6 mr-2 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">レッスンスロット管理</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              あなたのレッスン予定と予約状況を管理できます
            </p>
          </div>
        </div>
      </div>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg" role="alert">
          <p>{error}</p>
          <Button 
            onClick={handleRetry}
            variant="outline" 
            className="mt-2"
          >
            再読み込み
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-none sm:rounded-lg shadow-none sm:shadow -mx-4 sm:mx-0">
          <SlotsCalendar
            slots={slots}
            isLoading={isLoading}
            onSlotUpdate={handleSlotUpdate}
            onSlotDelete={handleSlotDelete}
            onReservationClick={handleReservationClick}
          />
        </div>
      )}
      
      {/* 予約管理モーダル */}
      {selectedReservation && (
        <ReservationManagementModal
          isOpen={isReservationModalOpen}
          onClose={() => {
            setIsReservationModalOpen(false);
            setSelectedReservation(null);
          }}
          mode={reservationModalMode}
          reservation={selectedReservation}
          userRole={userRole}
          onCancel={handleReservationCancel}
          onApprove={handleReservationApprove}
          onReject={handleReservationReject}
          onReschedule={handleReservationReschedule}
          onModeChange={(newMode) => setReservationModalMode(newMode)}
          isLoading={isReservationProcessing}
        />
      )}
      
      {DEBUG && slots.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold mb-2 text-blue-900">📊 スロット統計</h3>
          <div className="text-xs space-y-1 text-blue-800">
            <p>• 総スロット数: <span className="font-medium">{slots.length}</span></p>
            <p>• 予約済み: <span className="font-medium">{slots.filter(s => s.reservations?.some(r => r.status === 'CONFIRMED')).length}</span></p>
            <p>• 利用可能: <span className="font-medium">{slots.filter(s => s.isAvailable && !s.reservations?.some(r => r.status === 'CONFIRMED')).length}</span></p>
          </div>
        </div>
      )}
    </div>
  );
} 
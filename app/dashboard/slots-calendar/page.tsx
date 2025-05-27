'use client';

import { useState, useEffect } from 'react';
import { SlotsCalendar } from './_components/SlotsCalendar';
import { CalendarClock, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ReservationStatus } from '@prisma/client';
import { CancelReason } from '@/lib/types/reservation';
import { ReservationManagementModal, type ReservationManagementModalProps } from './_components/ReservationManagementModal';
import { toast } from 'sonner';

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

  // APIから自分のスロットデータを取得
  useEffect(() => {
    const fetchMySlots = async () => {
      try {
        setIsLoading(true);
        
        // 認証トークンを取得
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        
        if (!token) {
          throw new Error('認証が必要です。ログインしてください。');
        }
        
        console.log('APIリクエスト開始: 自分のレッスンスロットを取得');
        
        // 自分が作成したスロットのみを取得
        const response = await fetch('/api/lesson-slots?viewMode=own', {
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
        console.log(`取得した自分のレッスンスロット: ${data.length}件`);
        
        if (DEBUG && data.length > 0) {
          console.log('最初のスロット例:', {
            id: data[0].id,
            startTime: data[0].startTime,
            endTime: data[0].endTime,
            isAvailable: data[0].isAvailable,
            reservations: data[0].reservations?.length || 0
          });
        }
        
        setSlots(data);
        
      } catch (err) {
        console.error('スロット情報取得エラー:', err);
        setError(err instanceof Error ? err.message : 'スロット情報の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMySlots();
  }, []);

  // 予約クリック処理
  const handleReservationClick = async (reservation: MentorLessonSlot['reservations'][0], mode: ModalMode = 'view') => {
    try {
      // スロット情報を取得（予約から逆引き）
      const parentSlot = slots.find(slot => 
        slot.reservations.some(res => res.id === reservation.id)
      );

      // 予約の詳細情報をAPIから取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      const response = await fetch(`/api/reservations/${reservation.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      let totalAmount = 0;
      if (response.ok) {
        const reservationDetail = await response.json();
        totalAmount = reservationDetail.totalAmount || 0;
      } else {
        // APIエラーの場合はスロットの時間単価から計算
        const duration = new Date(reservation.bookedEndTime || '').getTime() - new Date(reservation.bookedStartTime || '').getTime();
        const hours = duration / (1000 * 60 * 60);
        totalAmount = Math.round((parentSlot?.hourlyRate || 5000) * hours);
      }
      
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

  // 予約キャンセル処理
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
      
      // スロット一覧を再取得
      window.location.reload();
      
    } catch (error) {
      console.error('キャンセル処理エラー:', error);
      toast.error(`キャンセルに失敗しました: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsReservationProcessing(false);
    }
  };

  // 予約承認処理
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
      
      // スロット一覧を再取得
      window.location.reload();
      
    } catch (error) {
      console.error('承認処理エラー:', error);
      toast.error(`承認に失敗しました: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsReservationProcessing(false);
    }
  };

  // 予約拒否処理
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
      
      // スロット一覧を再取得
      window.location.reload();
      
    } catch (error) {
      console.error('拒否処理エラー:', error);
      toast.error(`拒否に失敗しました: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsReservationProcessing(false);
    }
  };

  // リスケジュール処理
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
      
      // スロット一覧を再取得
      window.location.reload();
      
    } catch (error) {
      console.error('リスケジュール処理エラー:', error);
      toast.error(`リスケジュールに失敗しました: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsReservationProcessing(false);
    }
  };

  const handleSlotUpdate = (updatedSlot: MentorLessonSlot) => {
    setSlots(prev => prev.map(slot => 
      slot.id === updatedSlot.id ? updatedSlot : slot
    ));
  };

  const handleSlotDelete = (deletedSlotId: string) => {
    setSlots(prev => prev.filter(slot => slot.id !== deletedSlotId));
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
        
        <Button 
          onClick={() => {/* 新規スロット作成処理 */}}
          className="flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">新しいスロット作成</span>
          <span className="sm:hidden">作成</span>
        </Button>
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
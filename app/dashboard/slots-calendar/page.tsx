'use client';

import { useState, useEffect } from 'react';
import { SlotsCalendar } from './_components/SlotsCalendar';
import { CalendarClock, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase-browser';

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
    student?: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function SlotsCalendarPage() {
  const [slots, setSlots] = useState<MentorLessonSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  const handleSlotCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleSlotCreated = () => {
    setIsCreateModalOpen(false);
    // スロット一覧を再取得
    // fetchMySlots();
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
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <CalendarClock className="h-6 w-6 mr-2 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">レッスンスロット管理</h1>
            <p className="text-sm text-gray-600 mt-1">
              あなたのレッスン予定と予約状況を管理できます
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleSlotCreate}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新しいスロット作成
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
        <div className="bg-white rounded-lg shadow">
          <SlotsCalendar
            slots={slots}
            isLoading={isLoading}
            onSlotUpdate={handleSlotUpdate}
            onSlotDelete={handleSlotDelete}
          />
        </div>
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
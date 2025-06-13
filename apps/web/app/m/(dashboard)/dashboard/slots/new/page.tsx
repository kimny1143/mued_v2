'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { format, addHours, setMinutes, setHours } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function NewSlotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [hourlyRate, setHourlyRate] = useState(5000);
  const [capacity, setCapacity] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  // URLパラメータから日付を取得して設定
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setDate(dateParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !startTime || !endTime) {
      alert('すべての項目を入力してください');
      return;
    }

    // 開始時間と終了時間の検証
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(endHour, endMinute, 0, 0);

    if (endDate <= startDate) {
      alert('終了時間は開始時間より後に設定してください');
      return;
    }

    try {
      setLoading(true);
      
      // Supabaseセッションを取得
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      if (!session) {
        alert('ログインが必要です');
        return;
      }

      // スロット作成データを準備
      const slotData = {
        date: date,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        hourlyRate: hourlyRate,
        capacity: capacity,
        isRecurring: isRecurring,
        recurringWeeks: isRecurring ? recurringWeeks : undefined
      };

      // APIリクエスト
      const response = await fetch('/api/lesson-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify(slotData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '作成に失敗しました');
      }

      alert('スロットを作成しました');
      router.push('/m/dashboard/booking-calendar');
    } catch (error) {
      console.error('Slot creation error:', error);
      alert(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">新規スロット作成</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* フォーム */}
      <main className="p-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 日付 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日付
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始時間
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了時間
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* 時給 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              時給（円）
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              min="1000"
              step="500"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 定員 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              定員
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 定期作成 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="recurring" className="text-sm font-medium">
                定期的に作成する
              </label>
            </div>
            
            {isRecurring && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  繰り返し週数
                </label>
                <select
                  value={recurringWeeks}
                  onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2}>2週間</option>
                  <option value={4}>4週間</option>
                  <option value={8}>8週間</option>
                  <option value={12}>12週間</option>
                </select>
              </div>
            )}
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                作成中...
              </span>
            ) : (
              'スロットを作成'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
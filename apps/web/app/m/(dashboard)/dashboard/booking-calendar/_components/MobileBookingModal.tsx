'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { LessonSlot } from '../_types/calendar';

interface MobileBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: LessonSlot;
  onComplete: () => void;
}

export default function MobileBookingModal({
  isOpen,
  onClose,
  slot,
  onComplete
}: MobileBookingModalProps) {
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState(slot.startTime);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const mentorName = slot.teacher?.name || slot.teacher?.email?.split('@')[0] || '講師';
  const slotStart = new Date(slot.startTime);
  const slotEnd = new Date(slot.endTime);
  
  // 利用可能な開始時間の計算
  const availableStartTimes = [];
  let currentTime = new Date(slotStart);
  
  while (currentTime < slotEnd) {
    const endTime = new Date(currentTime.getTime() + duration * 60000);
    if (endTime <= slotEnd) {
      availableStartTimes.push(currentTime.toISOString());
    }
    currentTime = new Date(currentTime.getTime() + 30 * 60000); // 30分刻み
  }

  const calculateTotalAmount = () => {
    return Math.floor((duration / 60) * slot.hourlyRate);
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      
      // Supabaseセッションを取得
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      if (!session) {
        alert('ログインが必要です');
        setLoading(false);
        return;
      }
      
      const endTime = new Date(new Date(startTime).getTime() + duration * 60000);
      
      const response = await fetch('/api/reservations/setup-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          reservationData: {
            slotId: slot.id,  // APIがslotIdを期待している
            duration: duration,
            bookedStartTime: startTime,
            bookedEndTime: endTime.toISOString(),
            totalAmount: calculateTotalAmount(),
            notes: ''
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Checkout URL not received');
      }
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage = error instanceof Error ? error.message : '予約処理中にエラーが発生しました';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* モーダルコンテンツ - 画面下部に固定 */}
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-xl flex flex-col" style={{ maxHeight: '85%' }}>
        {/* ヘッダー */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">レッスン予約</h2>
          <button onClick={onClose} className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* スクロール可能なコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* メンター情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-2">{mentorName}先生</h3>
            <div className="text-sm text-gray-600">
              <p>{format(slotStart, 'yyyy年M月d日(E)', { locale: ja })}</p>
              <p>{format(slotStart, 'HH:mm')} - {format(slotEnd, 'HH:mm')}</p>
              <p className="mt-1">¥{slot.hourlyRate.toLocaleString()}/時間</p>
            </div>
          </div>

          {/* レッスン時間選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">レッスン時間</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDuration(60)}
                className={`p-3 rounded-md border ${
                  duration === 60 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300'
                }`}
              >
                60分
              </button>
              <button
                onClick={() => setDuration(90)}
                className={`p-3 rounded-md border ${
                  duration === 90 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300'
                }`}
              >
                90分
              </button>
            </div>
          </div>

          {/* 開始時間選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">開始時間</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-900"
            >
              {availableStartTimes.map((time) => (
                <option key={time} value={time}>
                  {format(new Date(time), 'HH:mm')}
                </option>
              ))}
            </select>
          </div>

          {/* 料金確認 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">合計金額</span>
              <span className="text-xl font-bold">
                ¥{calculateTotalAmount().toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              ※ メンター承認後に自動的に決済されます
            </p>
          </div>
        </div>

        {/* フッター - 固定位置 */}
        <div className="bg-white border-t px-4 pt-4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleBooking}
            disabled={loading || availableStartTimes.length === 0}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                処理中...
              </span>
            ) : (
              '決済情報入力へ進む'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
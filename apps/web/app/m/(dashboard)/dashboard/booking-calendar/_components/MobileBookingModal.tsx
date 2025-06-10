'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { isPastJst } from '@/lib/utils/timezone';
import type { LessonSlot } from '../_types/calendar';

interface MobileBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: LessonSlot;
  onComplete: () => void;
}

// 生徒の既存予約の型定義
interface StudentReservation {
  id: string;
  bookedStartTime: string;
  bookedEndTime: string;
  status: string;
  slotId: string;
}

export default function MobileBookingModal({
  isOpen,
  onClose,
  slot,
  onComplete
}: MobileBookingModalProps) {
  const [duration, setDuration] = useState(60);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentReservations, setStudentReservations] = useState<StudentReservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  // 生徒の既存予約を取得
  const fetchStudentReservations = async () => {
    setIsLoadingReservations(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) return;
      
      const response = await fetch('/api/reservations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        // アクティブな予約のみフィルタリング
        const activeReservations = data.filter((res: StudentReservation) => 
          res.status === 'PENDING_APPROVAL' || 
          res.status === 'APPROVED' || 
          res.status === 'CONFIRMED'
        );
        setStudentReservations(activeReservations);
      }
    } catch (error) {
      console.error('既存予約の取得エラー:', error);
    } finally {
      setIsLoadingReservations(false);
    }
  };

  // モーダルが開いたときの初期化
  useEffect(() => {
    if (isOpen) {
      setSelectedStartTime(null);
      setSelectedEndTime(null);
      setDuration(60);
      setError(null);
      fetchStudentReservations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const mentorName = slot.teacher?.name || slot.teacher?.email?.split('@')[0] || '講師';
  const slotStart = new Date(slot.startTime);
  const slotEnd = new Date(slot.endTime);

  // 時間選択肢を生成（15分刻み）
  const generateTimeOptions = () => {
    const options: Array<{ time: Date; label: string; isAvailable: boolean; reason?: string }> = [];
    const maxStartTime = new Date(slotEnd.getTime() - duration * 60 * 1000);
    
    // 予約済み時間帯を収集
    const bookedIntervals: Array<{start: number, end: number, type: string}> = [];
    
    // 現在のスロットの予約情報
    if (slot.reservations) {
      slot.reservations
        .filter(res => res.status === 'CONFIRMED' || res.status === 'PENDING' || res.status === 'PENDING_APPROVAL' || res.status === 'APPROVED')
        .forEach(res => {
          if (res.bookedStartTime && res.bookedEndTime) {
            bookedIntervals.push({
              start: new Date(res.bookedStartTime).getTime(),
              end: new Date(res.bookedEndTime).getTime(),
              type: 'mentor'
            });
          }
        });
    }
    
    // 生徒の他の予約（同じ日の他のメンターとの予約）
    const slotDate = slotStart.toDateString();
    studentReservations
      .filter(res => {
        const resDate = new Date(res.bookedStartTime);
        return resDate.toDateString() === slotDate && res.slotId !== slot.id;
      })
      .forEach(res => {
        bookedIntervals.push({
          start: new Date(res.bookedStartTime).getTime(),
          end: new Date(res.bookedEndTime).getTime(),
          type: 'student'
        });
      });
    
    let currentTime = new Date(slotStart);
    
    while (currentTime <= maxStartTime) {
      const proposedStartTime = currentTime.getTime();
      const proposedEndTime = proposedStartTime + duration * 60 * 1000;
      
      let isAvailable = true;
      let reason: string | undefined;
      
      // 過去の時間をチェック
      if (isPastJst(currentTime)) {
        isAvailable = false;
        reason = '過去の時間';
      } else {
        // 重複チェック
        for (const interval of bookedIntervals) {
          if (proposedStartTime < interval.end && proposedEndTime > interval.start) {
            isAvailable = false;
            reason = interval.type === 'mentor' ? '他の生徒が予約済み' : '他のメンターと予約済み';
            break;
          }
        }
      }
      
      options.push({
        time: new Date(currentTime),
        label: format(currentTime, 'HH:mm'),
        isAvailable,
        reason
      });
      
      // 15分追加
      currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
    }
    
    return options;
  };

  const calculateTotalAmount = () => {
    return Math.floor((duration / 60) * slot.hourlyRate);
  };

  // 開始時間選択時の処理
  const handleStartTimeSelect = (startTime: Date) => {
    setSelectedStartTime(startTime);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    setSelectedEndTime(endTime);
    setError(null);
  };

  // レッスン時間変更時の処理
  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    if (selectedStartTime) {
      const endTime = new Date(selectedStartTime.getTime() + newDuration * 60 * 1000);
      setSelectedEndTime(endTime);
    }
  };

  const handleBooking = async () => {
    if (!selectedStartTime || !selectedEndTime) {
      setError('開始時間を選択してください');
      return;
    }
    try {
      setLoading(true);
      
      // Supabaseセッションを取得
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      if (!session) {
        alert('ログインが必要です');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/reservations/setup-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          reservationData: {
            slotId: slot.id,
            duration: duration,
            bookedStartTime: selectedStartTime.toISOString(),
            bookedEndTime: selectedEndTime.toISOString(),
            totalAmount: calculateTotalAmount(),
            notes: `${mentorName}先生とのレッスン予約（${duration}分）`,
            currency: slot.currency || 'JPY',
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
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const timeOptions = generateTimeOptions();
  const availableOptions = timeOptions.filter(opt => opt.isAvailable);

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
          {/* エラー表示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* メンター情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-2">{mentorName}先生</h3>
            <div className="text-sm text-gray-600">
              <p>{format(slotStart, 'yyyy年M月d日(E)', { locale: ja })}</p>
              <p>{format(slotStart, 'HH:mm')} - {format(slotEnd, 'HH:mm')}</p>
              <p className="mt-1">¥{slot.hourlyRate.toLocaleString()}/時間</p>
            </div>
            {selectedStartTime && selectedEndTime && (
              <div className="text-sm font-medium text-blue-600 mt-2">
                予約時間: {format(selectedStartTime, 'HH:mm')} - {format(selectedEndTime, 'HH:mm')}
              </div>
            )}
          </div>

          {/* レッスン時間選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">レッスン時間</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDurationChange(60)}
                className={`p-3 rounded-md border transition-all ${
                  duration === 60 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300'
                }`}
              >
                <div className="font-medium">60分</div>
                <div className="text-xs mt-1">¥{Math.floor(slot.hourlyRate).toLocaleString()}</div>
              </button>
              <button
                onClick={() => handleDurationChange(90)}
                className={`p-3 rounded-md border transition-all ${
                  duration === 90 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300'
                }`}
              >
                <div className="font-medium">90分</div>
                <div className="text-xs mt-1">¥{Math.floor(slot.hourlyRate * 1.5).toLocaleString()}</div>
              </button>
            </div>
          </div>

          {/* 開始時間選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">開始時間（15分刻み）</label>
            {isLoadingReservations ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : availableOptions.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  この時間帯では{duration}分レッスンの空きがありません。
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  レッスン時間を短くするか、他の時間帯を選択してください。
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {timeOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => option.isAvailable && handleStartTimeSelect(option.time)}
                      disabled={!option.isAvailable}
                      className={`p-3 text-sm border rounded-lg transition-all relative ${
                        selectedStartTime && selectedStartTime.getTime() === option.time.getTime()
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : option.isAvailable
                          ? 'border-gray-300 hover:border-gray-400'
                          : 'border-gray-200 bg-gray-100 text-gray-400'
                      }`}
                    >
                      {option.label}
                      {!option.isAvailable && option.reason?.includes('他のメンター') && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
                
                {/* 凡例 */}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                    <span>予約済み</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    </div>
                    <span>他のメンターと予約済み</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 料金確認 */}
          {selectedStartTime && selectedEndTime && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">予約内容</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>日時</span>
                  <span>
                    {format(slotStart, 'M/d(E)', { locale: ja })}
                    {' '}{format(selectedStartTime, 'HH:mm')}-{format(selectedEndTime, 'HH:mm')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>時間</span>
                  <span>{duration}分</span>
                </div>
                <div className="flex justify-between font-medium text-base mt-2 pt-2 border-t border-blue-200">
                  <span>合計</span>
                  <span>¥{calculateTotalAmount().toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター - 固定位置 */}
        <div className="bg-white border-t px-4 pt-4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleBooking}
            disabled={!selectedStartTime || !selectedEndTime || loading}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              selectedStartTime && selectedEndTime && !loading
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
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
              '予約して決済へ進む'
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            予約後、Stripeの決済ページで支払いを完了してください
          </p>
        </div>
      </div>
    </div>
  );
}
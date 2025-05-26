'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Clock, User, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { TimeSlot } from './TimeSlotDisplay';
import { Mentor } from './MentorList';
import { supabaseBrowser } from '@/lib/supabase-browser';

// 拡張TimeSlot型を再定義（MentorCalendarから共通利用）
interface ExtendedTimeSlot extends TimeSlot {
  mentorId: string;
  mentorName: string | null;
  bookingStatus: 'available' | 'partial' | 'full' | 'unavailable';
  reservationCount: number;
  bookedTime: number;
  availableTime: number;
  bookingRate: number;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  mentors: Mentor[];
  preSelectedSlot?: ExtendedTimeSlot | null;
  preSelectedMentor?: Mentor | null;
  onBookingComplete: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  mentors,
  preSelectedSlot,
  preSelectedMentor,
  onBookingComplete,
}) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(preSelectedSlot || null);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(preSelectedMentor || null);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [lessonDuration, setLessonDuration] = useState<60 | 90>(60); // デフォルト60分
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // モーダルが閉じられるときにstateをリセット
  const resetModalState = () => {
    setSelectedTimeSlot(null);
    setSelectedMentor(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    setLessonDuration(60);
    setError(null);
    setIsSuccess(false);
  };

  // モーダルが開閉されるときにstateをリセット
  React.useEffect(() => {
    if (!isOpen) {
      resetModalState();
    } else {
      // モーダルが開かれた時に事前選択されたスロットとメンターをセット
      if (preSelectedSlot && preSelectedMentor) {
        setSelectedTimeSlot(preSelectedSlot);
        setSelectedMentor(preSelectedMentor);
      }
    }
  }, [isOpen, preSelectedSlot, preSelectedMentor]);





  // スロット範囲内で選択可能な開始時間を生成（15分刻み）- 予約済み時間帯を除外
  const generateStartTimeOptions = (slot: TimeSlot) => {
    const options: Array<{ time: Date; label: string; isAvailable: boolean }> = [];
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    
    // 選択されたレッスン時間分だけ余裕を持たせる
    const maxStartTime = new Date(slotEnd.getTime() - lessonDuration * 60 * 1000);
    
    // 現在のスロットの予約情報を取得
    let bookedIntervals: Array<{start: number, end: number}> = [];
    
    if (selectedMentor?.availableSlots) {
      const currentSlot = selectedMentor.availableSlots.find(s => s.id === slot.id);
      if (currentSlot?.reservations) {
        bookedIntervals = currentSlot.reservations
          .filter(res => res.status === 'CONFIRMED' || res.status === 'PENDING')
          .filter(res => res.bookedStartTime && res.bookedEndTime)
          .map(res => ({
            start: new Date(res.bookedStartTime!).getTime(),
            end: new Date(res.bookedEndTime!).getTime()
          }))
          .sort((a, b) => a.start - b.start);
        
        // 重複する予約時間帯をマージ
        const mergedIntervals: Array<{start: number, end: number}> = [];
        for (const interval of bookedIntervals) {
          if (mergedIntervals.length === 0 || mergedIntervals[mergedIntervals.length - 1].end < interval.start) {
            mergedIntervals.push(interval);
          } else {
            mergedIntervals[mergedIntervals.length - 1].end = Math.max(mergedIntervals[mergedIntervals.length - 1].end, interval.end);
          }
        }
        bookedIntervals = mergedIntervals;
      }
    }
    
    let currentTime = new Date(slotStart);
    
    while (currentTime <= maxStartTime) {
      const proposedStartTime = currentTime.getTime();
      const proposedEndTime = proposedStartTime + lessonDuration * 60 * 1000;
      
      // この開始時間から終了時間までの間に予約済み時間帯と重複があるかチェック
      let isAvailable = true;
      for (const bookedInterval of bookedIntervals) {
        // 提案されたレッスン時間と予約済み時間が重複するかチェック
        if (proposedStartTime < bookedInterval.end && proposedEndTime > bookedInterval.start) {
          isAvailable = false;
          break;
        }
      }
      
      options.push({
        time: new Date(currentTime),
        label: format(currentTime, 'HH:mm'),
        isAvailable
      });
      
      // 15分追加
      currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
    }
    
    return options;
  };

  // 開始時間とレッスン時間から終了時間を計算
  const calculateEndTime = (startTime: Date, duration: number) => {
    return new Date(startTime.getTime() + duration * 60 * 1000);
  };



  // 開始時間選択時の処理
  const handleStartTimeSelect = (startTime: Date) => {
    setSelectedStartTime(startTime);
    const endTime = calculateEndTime(startTime, lessonDuration);
    setSelectedEndTime(endTime);
    setError(null);
  };

  // レッスン時間変更時の処理
  const handleDurationChange = (duration: 60 | 90) => {
    setLessonDuration(duration);
    if (selectedStartTime) {
      const endTime = calculateEndTime(selectedStartTime, duration);
      setSelectedEndTime(endTime);
    }
  };

  const handleBooking = async () => {
    if (!selectedTimeSlot || !selectedMentor || !selectedDate || !selectedStartTime || !selectedEndTime) {
      setError('予約情報が不完全です。メンター、時間帯、開始時間をすべて選択してください。');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Supabaseセッションからアクセストークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('ログインが必要です。再度ログインしてください。');
      }

      // 予約作成とStripe決済セッション作成を一度に実行
      const reservationData = {
        slotId: selectedTimeSlot.id,
        bookedStartTime: selectedStartTime.toISOString(),
        bookedEndTime: selectedEndTime.toISOString(),
        notes: `メンター: ${selectedMentor.name}とのレッスン予約（${lessonDuration}分）`,
        // 決済情報も含める
        totalAmount: calculateTotalPrice(),
        createPaymentIntent: true // 決済準備フラグ
      };

      console.log('=== モーダル予約データ送信（決済準備付き） ===');
      console.log('予約データ:', reservationData);
      console.log('レッスン時間:', lessonDuration, '分');
      console.log('開始時間:', selectedStartTime);
      console.log('終了時間:', selectedEndTime);
      console.log('決済予定金額:', calculateTotalPrice());

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reservationData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || '予約の作成に失敗しました');
      }

      const result = await response.json();

      // 新しいフロー: 予約リクエスト + 決済準備完了
      if (result.success) {
        // 予約完了後の処理
        onBookingComplete();
        
        // 成功状態を表示
        setIsSuccess(true);
        
        // 3秒後にモーダルを閉じる
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        throw new Error(result.message || '予約リクエストの送信に失敗しました');
      }
    } catch (error) {
      console.error('予約処理エラー:', error);
      setError(error instanceof Error ? error.message : '予約処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  const calculateTotalPrice = () => {
    if (!selectedTimeSlot || !selectedStartTime || !selectedEndTime) return 0;
    
    // 時間ベースで料金計算（時間単価 × レッスン時間（分） / 60）
    const hourlyRate = selectedTimeSlot.hourlyRate || 5000;
    const actualMinutes = (selectedEndTime.getTime() - selectedStartTime.getTime()) / (1000 * 60);
    return Math.round(hourlyRate * actualMinutes / 60);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* モーダル */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">レッスン予約リクエスト</h2>
                  {selectedDate && (
                    <p className="text-sm text-gray-600">
                      {format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: ja })} - メンター承認後に決済
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-8 h-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* コンテンツ */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* 成功表示 */}
              {isSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-medium text-green-900 mb-1">予約リクエストを送信しました！</h3>
                  <p className="text-sm text-green-700">
                    決済情報も準備完了しました。<br />
                    メンターが承認すると自動で決済が実行されます。
                  </p>
                </div>
              )}
              
              {/* エラー表示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* 選択されたメンターと時間帯の確認表示 */}
              {selectedMentor && selectedTimeSlot && (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">選択中の予約</h4>
                  <div className="flex items-center gap-3">
                    {selectedMentor.image ? (
                      <img
                        src={selectedMentor.image}
                        alt={selectedMentor.name || ''}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{selectedMentor.name}</div>
                      <div className="text-sm text-gray-600">
                        スロット時間: {format(new Date(selectedTimeSlot.startTime), 'HH:mm')} - 
                        {format(new Date(selectedTimeSlot.endTime), 'HH:mm')}
                      </div>
                      {selectedStartTime && selectedEndTime && (
                        <div className="text-sm font-medium text-primary">
                          予約時間: {format(selectedStartTime, 'HH:mm')} - 
                          {format(selectedEndTime, 'HH:mm')} ({lessonDuration}分)
                        </div>
                      )}
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-medium text-primary">
                        {formatPrice(calculateTotalPrice())}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* レッスン時間選択 */}
              {selectedTimeSlot && selectedMentor && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">レッスン時間を選択</h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => handleDurationChange(60)}
                      className={`p-3 text-center border rounded-lg transition-all ${
                        lessonDuration === 60
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">60分レッスン</div>
                      <div className="text-sm text-gray-600">
                        {formatPrice(Math.round((selectedTimeSlot.hourlyRate || 5000) * 60 / 60))}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDurationChange(90)}
                      className={`p-3 text-center border rounded-lg transition-all ${
                        lessonDuration === 90
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">90分レッスン</div>
                      <div className="text-sm text-gray-600">
                        {formatPrice(Math.round((selectedTimeSlot.hourlyRate || 5000) * 90 / 60))}
                      </div>
                    </button>
                  </div>

                  {/* 開始時間選択 */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">開始時間を選択（15分刻み）</h5>
                    {(() => {
                      const timeOptions = generateStartTimeOptions(selectedTimeSlot);
                      const availableOptions = timeOptions.filter(opt => opt.isAvailable);
                      
                      if (availableOptions.length === 0) {
                        return (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>この時間帯では{lessonDuration}分レッスンの空きがありません。</strong>
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              他のレッスン時間（60分/90分）を試すか、別のスロットを選択してください。
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-32 overflow-y-auto">
                          {timeOptions.map((option, index) => (
                            <button
                              key={index}
                              onClick={() => option.isAvailable ? handleStartTimeSelect(option.time) : undefined}
                              disabled={!option.isAvailable}
                              className={`p-2 text-sm border rounded transition-all ${
                                selectedStartTime && selectedStartTime.getTime() === option.time.getTime()
                                  ? 'border-primary bg-primary text-white'
                                  : !option.isAvailable
                                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              title={!option.isAvailable ? '予約済みのため選択できません' : ''}
                            >
                              {option.label}
                              {!option.isAvailable && (
                                <span className="text-xs block leading-none opacity-75">予約済</span>
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    {selectedStartTime && selectedEndTime && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>選択された時間:</strong> {format(selectedStartTime, 'HH:mm')} - {format(selectedEndTime, 'HH:mm')} ({lessonDuration}分)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 事前選択されていない場合のメッセージ */}
              {!selectedTimeSlot && (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h5 className="font-medium text-gray-900 mb-2">スロットが選択されていません</h5>
                  <p className="text-sm">カレンダーからレッスンスロットを選択してください。</p>
                </div>
              )}

              {/* 料金詳細 */}
              {selectedTimeSlot && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">予約内容と料金</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>レッスン料金</span>
                      <span>{formatPrice(calculateTotalPrice())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>消費税（10%）</span>
                      <span>{formatPrice(calculateTotalPrice() * 0.1)}</span>
                    </div>
                    <div className="border-t border-blue-300 pt-2">
                      <div className="flex justify-between font-medium">
                        <span>合計金額</span>
                        <span className="text-blue-700">
                          {formatPrice(calculateTotalPrice())}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-blue-700">
                    ✨ メンター承認後に自動で決済が実行されます
                  </div>
                </div>
              )}
            </div>

            {/* フッター */}
            {!isSuccess && (
              <div className="p-6 border-t bg-gray-50">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleBooking}
                    disabled={!selectedTimeSlot || !selectedMentor || !selectedStartTime || !selectedEndTime || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        処理中...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        予約リクエストを送信
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}; 
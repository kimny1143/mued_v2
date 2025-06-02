'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Clock, User, CreditCard } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Mentor } from './MentorList';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { ExtendedTimeSlot, TimeSlot } from '../_types/calendar.js';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  mentors: Mentor[];
  preSelectedSlot?: ExtendedTimeSlot | null;
  preSelectedMentor?: Mentor | null;
  onBookingComplete: () => void;
}

// 生徒の既存予約の型定義
interface StudentReservation {
  id: string;
  bookedStartTime: string;
  bookedEndTime: string;
  status: string;
  slotId: string;
}

// メインのBookingModalコンポーネント
export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  mentors: _mentors,
  preSelectedSlot,
  preSelectedMentor,
  onBookingComplete: _onBookingComplete,
}) => {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ExtendedTimeSlot | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [_notes, _setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_step, setStep] = useState<'booking' | 'confirmation'>('booking');
  const [studentReservations, setStudentReservations] = useState<StudentReservation[]>([]);

  // 生徒の既存予約を取得する関数
  const fetchStudentReservations = async () => {
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      if (!sessionData.session) return;
      
      const token = sessionData.session.access_token;
      
      // 生徒の既存予約を取得（承認待ち・確定済みのみ）
      const response = await fetch('/api/reservations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // 承認待ち・確定済みの予約のみフィルタリング
        const activeReservations = data.filter((res: StudentReservation) => 
          res.status === 'PENDING_APPROVAL' || 
          res.status === 'APPROVED' || 
          res.status === 'CONFIRMED'
        );
        setStudentReservations(activeReservations);
        console.log('生徒の既存予約を取得:', activeReservations);
      }
    } catch (error) {
      console.error('既存予約の取得エラー:', error);
    }
  };

  // 初期化処理
  useEffect(() => {
    if (isOpen) {
      if (preSelectedMentor) {
        setSelectedMentor(preSelectedMentor);
      }
      if (preSelectedSlot) {
        setSelectedSlot(preSelectedSlot);
      }
      setStep('booking');
      setError(null);
      // 生徒の既存予約を取得
      fetchStudentReservations();
    }
  }, [isOpen, preSelectedSlot, preSelectedMentor]);

  // スロット範囲内で選択可能な開始時間を生成（15分刻み）- 予約済み時間帯を除外
  const generateStartTimeOptions = (slot: TimeSlot) => {
    const options: Array<{ time: Date; label: string; isAvailable: boolean; unavailableReason?: string }> = [];
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    
    // 選択されたレッスン時間分だけ余裕を持たせる
    const maxStartTime = new Date(slotEnd.getTime() - duration * 60 * 1000);
    
    // 現在のスロットの予約情報を取得
    const bookedIntervals: Array<{start: number, end: number, type: 'mentor' | 'student', detail?: string}> = [];
    
    // 現在のメンターの予約情報を追加
    if (selectedMentor?.availableSlots) {
      const currentSlot = selectedMentor.availableSlots.find(s => s.id === slot.id);
      if (currentSlot?.reservations) {
        const mentorBookedIntervals = currentSlot.reservations
          .filter(res => res.status === 'CONFIRMED' || res.status === 'PENDING')
          .filter(res => res.bookedStartTime && res.bookedEndTime)
          .map(res => ({
            start: new Date(res.bookedStartTime!).getTime(),
            end: new Date(res.bookedEndTime!).getTime(),
            type: 'mentor' as const,
            detail: '他の生徒が予約済み'
          }));
        bookedIntervals.push(...mentorBookedIntervals);
      }
    }
    
    // 生徒の既存予約（他のメンターとの予約）を追加
    if (studentReservations.length > 0 && selectedDate) {
      const selectedDateStr = selectedDate.toDateString();
      
      const studentBookedIntervals = studentReservations
        .filter(res => {
          const resDate = new Date(res.bookedStartTime);
          return resDate.toDateString() === selectedDateStr;
        })
        .map(res => ({
          start: new Date(res.bookedStartTime).getTime(),
          end: new Date(res.bookedEndTime).getTime(),
          type: 'student' as const,
          detail: '他のメンターと予約済み'
        }));
      bookedIntervals.push(...studentBookedIntervals);
    }
    
    // 予約時間帯をソートしてマージ
    bookedIntervals.sort((a, b) => a.start - b.start);
    
    let currentTime = new Date(slotStart);
    
    while (currentTime <= maxStartTime) {
      const proposedStartTime = currentTime.getTime();
      const proposedEndTime = proposedStartTime + duration * 60 * 1000;
      
      // この開始時間から終了時間までの間に予約済み時間帯と重複があるかチェック
      let isAvailable = true;
      let unavailableReason: string | undefined;
      
      for (const bookedInterval of bookedIntervals) {
        // 提案されたレッスン時間と予約済み時間が重複するかチェック
        if (proposedStartTime < bookedInterval.end && proposedEndTime > bookedInterval.start) {
          isAvailable = false;
          unavailableReason = bookedInterval.detail;
          break;
        }
      }
      
      options.push({
        time: new Date(currentTime),
        label: format(currentTime, 'HH:mm'),
        isAvailable,
        unavailableReason
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
    const endTime = calculateEndTime(startTime, duration);
    setSelectedEndTime(endTime);
    setError(null);
  };

  // レッスン時間変更時の処理
  const handleDurationChange = (duration: number) => {
    setDuration(duration);
    if (selectedStartTime) {
      const endTime = calculateEndTime(selectedStartTime, duration);
      setSelectedEndTime(endTime);
    }
  };

  // 予約処理（Setup Intent決済情報入力ページにリダイレクト）
  const handleBooking = async () => {
    if (!selectedSlot || !selectedMentor || !selectedDate || !selectedStartTime || !selectedEndTime) {
      setError('予約情報が不完全です。メンター、時間帯、開始時間をすべて選択してください。');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 予約データを準備（Setup Intentのメタデータに保存）
      const reservationData = {
        slotId: selectedSlot.id,
        bookedStartTime: selectedStartTime.toISOString(),
        bookedEndTime: selectedEndTime.toISOString(),
        duration: duration,
        notes: `メンター: ${selectedMentor.name}とのレッスン予約（${duration}分）`,
        totalAmount: calculateTotalPrice(),
        currency: 'JPY',
      };

      console.log('=== Setup Intent決済情報入力ページ作成 ===');
      console.log('予約データ:', reservationData);

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;

      // Setup Intent用のCheckout Sessionを作成
      const response = await fetch('/api/reservations/setup-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ reservationData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Setup Intent決済ページの作成に失敗しました');
      }

      console.log('=== Setup Intent決済ページ作成成功 ===');
      console.log('決済URL:', result.checkoutUrl);

      // Stripe決済情報入力ページにリダイレクト
      window.location.href = result.checkoutUrl;

    } catch (error) {
      console.error('Setup Intent決済ページ作成エラー:', error);
      setError(error instanceof Error ? error.message : '決済ページ作成中にエラーが発生しました');
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  const calculateTotalPrice = () => {
    if (!selectedSlot || !selectedStartTime || !selectedEndTime) return 0;
    
    // 時間ベースで料金計算（時間単価 × レッスン時間（分） / 60）
    const hourlyRate = selectedSlot.hourlyRate || 5000;
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
                  <h2 className="text-xl font-semibold text-gray-900">レッスン予約</h2>
                  {selectedDate && (
                    <p className="text-sm text-gray-600">
                      {format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: ja })} - Stripe決済ページで支払い
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
              {/* エラー表示 */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 選択されたメンターと時間帯の確認表示 */}
              {selectedMentor && selectedSlot && (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">選択中の予約</h4>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">{selectedMentor.name}</div>
                      <div className="text-sm text-gray-600">
                        スロット時間: {format(new Date(selectedSlot.startTime), 'HH:mm')} - 
                        {format(new Date(selectedSlot.endTime), 'HH:mm')}
                      </div>
                      {selectedStartTime && selectedEndTime && (
                        <div className="text-sm font-medium text-primary">
                          予約時間: {format(selectedStartTime, 'HH:mm')} - 
                          {format(selectedEndTime, 'HH:mm')} ({duration}分)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* レッスン時間選択 */}
              {selectedSlot && selectedMentor && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">レッスン時間を選択</h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => handleDurationChange(60)}
                      className={`p-3 text-center border rounded-lg transition-all ${
                        duration === 60
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">60分レッスン</div>
                      <div className="text-sm text-gray-600">
                        {formatPrice(Math.round((selectedSlot.hourlyRate || 5000) * 60 / 60))}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDurationChange(90)}
                      className={`p-3 text-center border rounded-lg transition-all ${
                        duration === 90
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">90分レッスン</div>
                      <div className="text-sm text-gray-600">
                        {formatPrice(Math.round((selectedSlot.hourlyRate || 5000) * 90 / 60))}
                      </div>
                    </button>
                  </div>

                  {/* 開始時間選択 */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">開始時間を選択（15分刻み）</h5>
                    {(() => {
                      const timeOptions = generateStartTimeOptions(selectedSlot);
                      const availableOptions = timeOptions.filter(opt => opt.isAvailable);
                      
                      if (availableOptions.length === 0) {
                        return (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>この時間帯では{duration}分レッスンの空きがありません。</strong>
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              レッスン時間を短くするか、他の時間帯を選択してください。
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                            {timeOptions.map((option, index) => (
                              <div key={index} className="relative">
                                <button
                                  onClick={() => option.isAvailable && handleStartTimeSelect(option.time)}
                                  disabled={!option.isAvailable}
                                  className={`w-full p-2 text-sm border rounded transition-all ${
                                    selectedStartTime && selectedStartTime.getTime() === option.time.getTime()
                                      ? 'border-primary bg-primary text-white'
                                      : option.isAvailable
                                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                      : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={!option.isAvailable ? option.unavailableReason : undefined}
                                >
                                  {format(option.time, 'HH:mm')}
                                </button>
                                {!option.isAvailable && option.unavailableReason?.includes('他のメンター') && (
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" 
                                       title={option.unavailableReason} />
                                )}
                              </div>
                            ))}
                          </div>
                          {/* 凡例 */}
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
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
                        </div>
                      );
                    })()}
                    
                    {selectedStartTime && selectedEndTime && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>選択された時間:</strong> {format(selectedStartTime, 'HH:mm')} - {format(selectedEndTime, 'HH:mm')} ({duration}分)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 事前選択されていない場合のメッセージ */}
              {!selectedSlot && (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">時間帯を選択してください</p>
                  <p className="text-sm">カレンダーから予約したい時間帯をクリックしてください</p>
                </div>
              )}

              {/* 料金詳細 */}
              {selectedSlot && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">予約内容と料金</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>メンター:</span>
                      <span className="font-medium">{selectedMentor?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>日時:</span>
                      <span className="font-medium">
                        {selectedDate && format(selectedDate, 'M月d日(E)', { locale: ja })}
                        {selectedStartTime && selectedEndTime && (
                          <> {format(selectedStartTime, 'HH:mm')}-{format(selectedEndTime, 'HH:mm')}</>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>レッスン時間:</span>
                      <span className="font-medium">{duration}分</span>
                    </div>
                    <div className="border-t border-blue-200 pt-2 flex justify-between font-medium text-base">
                      <span>合計金額:</span>
                      <span className="text-blue-900">{formatPrice(calculateTotalPrice())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                {/* キャンセルボタン */}
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                
                {/* 予約ボタン */}
                <Button
                  onClick={handleBooking}
                  disabled={
                    !selectedSlot || !selectedMentor || !selectedStartTime || !selectedEndTime || isSubmitting
                  }
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      予約して決済ページへ
                    </>
                  )}
                </Button>
              </div>
              
              {/* 注意事項 */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                💳 予約後、Stripeの安全な決済ページで支払いを完了してください
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 
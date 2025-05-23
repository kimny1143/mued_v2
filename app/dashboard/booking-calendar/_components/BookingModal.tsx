'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Clock, User, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { TimeSlot } from './TimeSlotDisplay';
import { Mentor } from './MentorList';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  mentors: Mentor[];
  onBookingComplete: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  mentors,
  onBookingComplete,
}) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [lessonDuration, setLessonDuration] = useState<60 | 90>(60); // デフォルト60分
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが閉じられるときにstateをリセット
  const resetModalState = () => {
    setSelectedTimeSlot(null);
    setSelectedMentor(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    setLessonDuration(60);
    setError(null);
  };

  // モーダルが開閉されるときにstateをリセット
  React.useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen]);

  // 選択された日付の全メンターの空き時間を取得
  const getMentorSlotsForDate = (mentor: Mentor, date: Date) => {
    if (!mentor.availableSlots) return [];
    
    return mentor.availableSlots
      .filter(slot => slot.id) // idが存在するもののみ
      .filter(slot => {
        const slotDate = new Date(slot.startTime);
        return slotDate.toDateString() === date.toDateString() && slot.isAvailable;
      })
      .map(slot => ({
        id: slot.id!,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime),
        isAvailable: slot.isAvailable ?? true,
        hourlyRate: slot.hourlyRate
      } as TimeSlot))
      .sort((a, b) => 
        a.startTime.getTime() - b.startTime.getTime()
      );
  };

  // 選択された日付に空きがあるメンターのみを取得
  const availableMentors = selectedDate ? mentors.filter(mentor => 
    getMentorSlotsForDate(mentor, selectedDate).length > 0
  ) : [];

  // スロット範囲内で選択可能な開始時間を生成（30分刻み）
  const generateStartTimeOptions = (slot: TimeSlot) => {
    const options: Array<{ time: Date; label: string }> = [];
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    
    // 選択されたレッスン時間分だけ余裕を持たせる
    const maxStartTime = new Date(slotEnd.getTime() - lessonDuration * 60 * 1000);
    
    let currentTime = new Date(slotStart);
    
    while (currentTime <= maxStartTime) {
      options.push({
        time: new Date(currentTime),
        label: format(currentTime, 'HH:mm')
      });
      
      // 30分追加
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }
    
    return options;
  };

  // 開始時間とレッスン時間から終了時間を計算
  const calculateEndTime = (startTime: Date, duration: number) => {
    return new Date(startTime.getTime() + duration * 60 * 1000);
  };

  const handleTimeSlotSelect = (slot: TimeSlot, mentor: Mentor) => {
    setSelectedTimeSlot(slot);
    setSelectedMentor(mentor);
    setSelectedStartTime(null); // 時間スロット変更時にリセット
    setSelectedEndTime(null);
    setError(null);
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
        notes: `メンター: ${selectedMentor.name}とのレッスン予約（${lessonDuration}分）`
      };

      console.log('=== モーダル予約データ送信（時間選択版） ===');
      console.log('予約データ:', reservationData);
      console.log('レッスン時間:', lessonDuration, '分');
      console.log('開始時間:', selectedStartTime);
      console.log('終了時間:', selectedEndTime);

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

      if (result.checkoutUrl) {
        // 予約完了後の処理
        onBookingComplete();
        
        // Stripe決済ページにリダイレクト
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('決済URLの取得に失敗しました');
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
                  <h2 className="text-xl font-semibold text-gray-900">レッスン予約</h2>
                  {selectedDate && (
                    <p className="text-sm text-gray-600">
                      {format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: ja })}
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
                    <h5 className="text-sm font-medium text-gray-700 mb-2">開始時間を選択</h5>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {generateStartTimeOptions(selectedTimeSlot).map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleStartTimeSelect(option.time)}
                          className={`p-2 text-sm border rounded transition-all ${
                            selectedStartTime && selectedStartTime.getTime() === option.time.getTime()
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
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

              {/* メンター別の空き時間一覧 */}
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">利用可能なレッスン</h4>
                {availableMentors.length > 0 ? (
                  availableMentors.map((mentor) => {
                    const mentorSlots = getMentorSlotsForDate(mentor, selectedDate!);
                    
                    return (
                      <div key={mentor.id} className="border border-gray-200 rounded-lg p-4">
                        {/* メンター情報ヘッダー */}
                        <div className="flex items-center gap-3 mb-4">
                          {mentor.image ? (
                            <img
                              src={mentor.image}
                              alt={mentor.name || ''}
                              className="w-12 h-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{mentor.name}</h5>
                            {mentor.specialties && mentor.specialties.length > 0 && (
                              <p className="text-sm text-gray-600">
                                {mentor.specialties.join('、')}
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {mentorSlots.length}件の空き
                          </div>
                        </div>
                        
                        {/* 時間帯選択 */}
                        <div className="grid gap-2 md:grid-cols-2">
                          {mentorSlots.map((slot) => (
                            <button
                              key={slot.id}
                              onClick={() => handleTimeSlotSelect(slot, mentor)}
                              className={`p-3 text-left border rounded-lg transition-all ${
                                selectedTimeSlot?.id === slot.id
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">
                                    {format(new Date(slot.startTime), 'HH:mm')} - 
                                    {format(new Date(slot.endTime), 'HH:mm')}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    空き時間: {Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / (1000 * 60))}分
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-primary">
                                    {selectedTimeSlot?.id === slot.id ? '選択中' : '選択'}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h5 className="font-medium text-gray-900 mb-2">利用可能なレッスンがありません</h5>
                    <p className="text-sm">この日程では、どのメンターも空きがありません。</p>
                    <p className="text-sm">別の日程をご検討ください。</p>
                  </div>
                )}
              </div>

              {/* 料金詳細 */}
              {selectedTimeSlot && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">料金詳細</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>レッスン料金</span>
                      <span>{formatPrice(calculateTotalPrice())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>消費税（10%）</span>
                      <span>{formatPrice(calculateTotalPrice() * 0.1)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2">
                      <div className="flex justify-between font-medium">
                        <span>合計</span>
                        <span className="text-primary">
                          {formatPrice(calculateTotalPrice())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* フッター */}
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
                      <CreditCard className="h-4 w-4 mr-2" />
                      決済に進む
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 
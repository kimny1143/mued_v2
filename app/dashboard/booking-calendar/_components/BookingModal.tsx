'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, Clock, User, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { TimeSlot } from './TimeSlotDisplay';
import { Mentor } from './MentorList';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  timeSlots: TimeSlot[];
  mentor: Mentor | null;
  onBookingComplete: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  timeSlots,
  mentor,
  onBookingComplete,
}) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // その日の利用可能な時間帯をフィルタリング
  const availableSlots = selectedDate ? timeSlots.filter(slot => {
    const slotDate = new Date(slot.startTime);
    return slotDate.toDateString() === selectedDate.toDateString() && slot.isAvailable;
  }) : [];

  // 時間帯を時刻順にソート
  const sortedSlots = availableSlots.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    setError(null);
  };

  const handleBooking = async () => {
    if (!selectedTimeSlot || !mentor || !selectedDate) {
      setError('予約情報が不完全です。');
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
        bookedStartTime: selectedTimeSlot.startTime.toISOString(),
        bookedEndTime: selectedTimeSlot.endTime.toISOString(),
        notes: `メンター: ${mentor.name}とのレッスン予約`
      };

      console.log('=== モーダル予約データ送信 ===');
      console.log('予約データ:', reservationData);

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
    return selectedTimeSlot ? selectedTimeSlot.hourlyRate || 0 : 0;
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
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
                      {format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: require('date-fns/locale/ja') })}
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
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* メンター情報 */}
              {mentor && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
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
                    <div>
                      <h3 className="font-medium text-gray-900">{mentor.name}</h3>
                      {mentor.specialties && mentor.specialties.length > 0 && (
                        <p className="text-sm text-gray-600">
                          {mentor.specialties.join('、')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* エラー表示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* 時間帯選択 */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">時間帯を選択</h4>
                {sortedSlots.length > 0 ? (
                  <div className="grid gap-2">
                    {sortedSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleTimeSlotSelect(slot)}
                        className={`p-4 text-left border rounded-lg transition-all ${
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
                              {Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / (1000 * 60))}分
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-primary">
                              {formatPrice(slot.hourlyRate || 0)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>この日に利用可能な時間帯がありません</p>
                  </div>
                )}
              </div>

              {/* 料金詳細 */}
              {selectedTimeSlot && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
                  disabled={!selectedTimeSlot || isProcessing}
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
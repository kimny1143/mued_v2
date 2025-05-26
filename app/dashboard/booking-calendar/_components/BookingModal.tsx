'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Clock, User, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { TimeSlot } from './TimeSlotDisplay';
import { Mentor } from './MentorList';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Stripe公開キーを取得
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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

// 実際のStripe Elements使用版のカード入力フォーム
const StripeCardInputForm: React.FC<{
  onPaymentMethodReady: (paymentMethodId: string) => void;
  isProcessing: boolean;
}> = ({ onPaymentMethodReady, isProcessing }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState<string | null>(null);

  const handleCardChange = (event: { error?: { message: string } }) => {
    setCardError(event.error ? event.error.message : null);
  };

  const createPaymentMethod = async () => {
    if (!stripe || !elements) {
      console.error('Stripe または Elements が初期化されていません');
      return null;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      console.error('CardElement が見つかりません');
      return null;
    }

    console.log('💳 PaymentMethod作成開始...');

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        // 必要に応じて請求先情報を追加
      },
    });

    if (error) {
      console.error('💳 PaymentMethod作成エラー:', error);
      setCardError(error.message || 'カード情報の処理中にエラーが発生しました');
      return null;
    }

    console.log('💳 PaymentMethod作成成功:', {
      id: paymentMethod.id,
      type: paymentMethod.type,
      card: paymentMethod.card
    });

    return paymentMethod;
  };

  useEffect(() => {
    if (isProcessing) {
      createPaymentMethod().then((paymentMethod) => {
        if (paymentMethod) {
          onPaymentMethodReady(paymentMethod.id);
        }
      });
    }
  }, [isProcessing]);

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          カード情報
        </label>
        <CardElement
          onChange={handleCardChange}
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
                iconColor: '#424770',
              },
              invalid: {
                color: '#e53e3e',
                iconColor: '#e53e3e',
              },
            },
            hidePostalCode: true, // 郵便番号フィールドを非表示（日本では不要）
          }}
        />
        {cardError && (
          <div className="mt-2 text-sm text-red-600">
            {cardError}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500">
        💳 カード情報は暗号化されて安全に処理されます
      </div>
    </div>
  );
};

// 簡易版のカード入力フォーム（フォールバック用）
const SimpleCardInputForm: React.FC<{
  onPaymentMethodReady: (paymentMethodId: string) => void;
  isProcessing: boolean;
}> = ({ onPaymentMethodReady, isProcessing }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);

  // 簡易的なカード番号バリデーション
  const validateCard = () => {
    if (cardNumber.length < 16) {
      setCardError('カード番号は16桁で入力してください');
      return false;
    }
    if (expiryDate.length < 5) {
      setCardError('有効期限を正しく入力してください（MM/YY）');
      return false;
    }
    if (cvc.length < 3) {
      setCardError('CVCを正しく入力してください');
      return false;
    }
    setCardError(null);
    return true;
  };

  useEffect(() => {
    if (isProcessing && validateCard()) {
      // 実際のStripe実装では、ここでPaymentMethodを作成
      // 今は仮のIDを返す
      onPaymentMethodReady('pm_test_' + Date.now());
    }
  }, [isProcessing]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            カード番号
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
            placeholder="1234 5678 9012 3456"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              有効期限
            </label>
            <input
              type="text"
              value={expiryDate}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                  value = value.slice(0, 2) + '/' + value.slice(2, 4);
                }
                setExpiryDate(value);
              }}
              placeholder="MM/YY"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVC
            </label>
            <input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>
      {cardError && (
        <div className="text-sm text-red-600">
          {cardError}
        </div>
      )}
      <div className="text-xs text-gray-500">
        💳 カード情報は暗号化されて安全に処理されます
      </div>
    </div>
  );
};

// カード入力フォームのラッパー（Stripe Elements使用可能かどうかで切り替え）
const CardInputForm: React.FC<{
  onPaymentMethodReady: (paymentMethodId: string) => void;
  isProcessing: boolean;
}> = (props) => {
  // 開発環境では簡易版を使用、本番環境ではStripe Elementsを使用
  const useStripeElements = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (useStripeElements) {
    return <StripeCardInputForm {...props} />;
  } else {
    return <SimpleCardInputForm {...props} />;
  }
};

// メインのBookingModalコンポーネント（Stripe Elementsでラップ）
const BookingModalContent: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  mentors,
  preSelectedSlot,
  preSelectedMentor,
  onBookingComplete,
}) => {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ExtendedTimeSlot | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'booking' | 'payment' | 'confirmation'>('booking');
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
      setPaymentMethodId(null);
      setError(null);
    }
  }, [isOpen, preSelectedSlot, preSelectedMentor]);

  // スロット範囲内で選択可能な開始時間を生成（15分刻み）- 予約済み時間帯を除外
  const generateStartTimeOptions = (slot: TimeSlot) => {
    const options: Array<{ time: Date; label: string; isAvailable: boolean }> = [];
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    
    // 選択されたレッスン時間分だけ余裕を持たせる
    const maxStartTime = new Date(slotEnd.getTime() - duration * 60 * 1000);
    
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
      const proposedEndTime = proposedStartTime + duration * 60 * 1000;
      
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

  // 予約処理（決済情報付き）
  const handleBooking = async () => {
    if (!selectedSlot || !selectedMentor || !selectedDate || !selectedStartTime || !selectedEndTime) {
      setError('予約情報が不完全です。メンター、時間帯、開始時間をすべて選択してください。');
      return;
    }

    // ステップ1: 予約情報確認 → 決済情報入力へ
    if (step === 'booking') {
      setStep('payment');
      return;
    }

    // ステップ2: 決済情報入力 → 予約確定処理
    if (step === 'payment') {
      setIsSubmitting(true);
      setError(null);

      try {
        // 決済情報の処理を開始
        setIsProcessingPayment(true);
        
        // CardInputFormからpaymentMethodIdが返されるまで待機
        // （useEffectで処理される）
        
      } catch (error) {
        console.error('決済情報処理エラー:', error);
        setError('決済情報の処理中にエラーが発生しました');
        setIsSubmitting(false);
      }
    }
  };

  // 決済情報が準備できた時の処理
  const handlePaymentMethodReady = async (paymentMethodId: string) => {
    try {
      setPaymentMethodId(paymentMethodId);
      
      // 予約作成とStripe決済セッション作成を一度に実行
      const reservationData = {
        slotId: selectedSlot!.id,
        bookedStartTime: selectedStartTime!.toISOString(),
        bookedEndTime: selectedEndTime!.toISOString(),
        notes: `メンター: ${selectedMentor!.name}とのレッスン予約（${duration}分）`,
        // 決済情報も含める
        totalAmount: calculateTotalPrice(),
        currency: 'JPY',
        createPaymentIntent: true,
        paymentMethodId: paymentMethodId, // 決済手段IDを含める
      };

      console.log('=== モーダル予約データ送信（決済情報付き） ===');
      console.log('予約データ:', reservationData);
      console.log('決済手段ID:', paymentMethodId);

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify(reservationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `予約作成エラー: ${response.status}`);
      }

      console.log('=== 予約作成成功（決済準備完了） ===');
      console.log('予約ID:', result.reservation?.id);
      console.log('決済Intent ID:', result.paymentIntentId);
      
      // 成功状態を表示
      setStep('confirmation');
      
      // 3秒後にモーダルを閉じる
      setTimeout(() => {
        onClose();
        onBookingComplete();
      }, 3000);

    } catch (error) {
      console.error('予約作成エラー:', error);
      setError(error instanceof Error ? error.message : '予約処理中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
      setIsProcessingPayment(false);
    }
  };

  // 前のステップに戻る
  const handleBackStep = () => {
    if (step === 'payment') {
      setStep('booking');
      setPaymentMethodId(null);
      setError(null);
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
              {step === 'confirmation' && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-green-900 mb-1">予約が完了しました！</h3>
                  <p className="text-sm text-green-700">
                    決済情報も準備完了しました。メンターの承認をお待ちください。<br/>
                    承認後に自動で決済が実行されます。
                  </p>
                </div>
              )}

              {/* ステップインジケーター */}
              {step !== 'confirmation' && (
                <div className="mb-6">
                  <div className="flex items-center justify-center space-x-4">
                    <div className={`flex items-center ${step === 'booking' ? 'text-primary' : step === 'payment' ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === 'booking' ? 'bg-primary text-white' : 
                        step === 'payment' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        1
                      </div>
                      <span className="ml-2 text-sm font-medium">予約内容</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div className={`flex items-center ${step === 'payment' ? 'text-primary' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === 'payment' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        2
                      </div>
                      <span className="ml-2 text-sm font-medium">決済情報</span>
                    </div>
                  </div>
                </div>
              )}

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

              {/* ステップ1: 予約内容確認 */}
              {step === 'booking' && (
                <>
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
                            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                              {availableOptions.map((option, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleStartTimeSelect(option.time)}
                                  className={`p-2 text-sm border rounded transition-all ${
                                    selectedStartTime && selectedStartTime.getTime() === option.time.getTime()
                                      ? 'border-primary bg-primary text-white'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {format(option.time, 'HH:mm')}
                                </button>
                              ))}
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
                </>
              )}

              {/* ステップ2: 決済情報入力 */}
              {step === 'payment' && (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">決済情報を入力</h3>
                    <p className="text-sm text-gray-600">
                      カード情報を入力してください。メンターが承認後に自動で決済されます。
                    </p>
                  </div>

                  {/* 予約内容サマリー */}
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">予約内容</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>メンター:</span>
                        <span>{selectedMentor?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>日時:</span>
                        <span>
                          {selectedDate && format(selectedDate, 'M月d日(E)', { locale: ja })}
                          {selectedStartTime && selectedEndTime && (
                            <> {format(selectedStartTime, 'HH:mm')}-{format(selectedEndTime, 'HH:mm')}</>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>合計金額:</span>
                        <span>{formatPrice(calculateTotalPrice())}</span>
                      </div>
                    </div>
                  </div>

                  {/* カード入力フォーム */}
                  <CardInputForm 
                    onPaymentMethodReady={handlePaymentMethodReady}
                    isProcessing={isProcessingPayment}
                  />
                </>
              )}
            </div>

            {/* フッター */}
            {step !== 'confirmation' && (
            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                {/* 戻るボタン（決済ステップでのみ表示） */}
                {step === 'payment' && (
                  <Button
                    variant="outline"
                    onClick={handleBackStep}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    戻る
                  </Button>
                )}
                
                {/* キャンセルボタン */}
                <Button
                  variant="outline"
                  onClick={onClose}
                  className={step === 'payment' ? 'flex-1' : 'flex-1'}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                
                {/* メインアクションボタン */}
                <Button
                  onClick={handleBooking}
                  disabled={
                    (step === 'booking' && (!selectedSlot || !selectedMentor || !selectedStartTime || !selectedEndTime)) ||
                    (step === 'payment' && isSubmitting)
                  }
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      {step === 'payment' ? '決済処理中...' : '処理中...'}
                    </>
                  ) : (
                    <>
                      {step === 'booking' && (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          決済情報入力へ
                        </>
                      )}
                      {step === 'payment' && (
                        <>
                          予約を確定する
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
              
              {/* 注意事項 */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                {step === 'booking' && (
                  <>
                    💡 次のステップで決済情報を入力します。メンター承認後に自動決済されます。
                  </>
                )}
                {step === 'payment' && (
                  <>
                    🔒 決済情報は暗号化されて安全に保存されます。承認前は課金されません。
                  </>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export const BookingModal: React.FC<BookingModalProps> = (props) => {
  // Stripe Elementsが利用可能な場合はプロバイダーでラップ
  const useStripeElements = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (useStripeElements) {
    return (
      <Elements stripe={stripePromise}>
        <BookingModalContent {...props} />
      </Elements>
    );
  } else {
    // Stripe Elementsが利用できない場合は直接レンダリング
    return <BookingModalContent {...props} />;
  }
}; 
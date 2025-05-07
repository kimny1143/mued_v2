'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ClockIcon, UserIcon, CreditCardIcon } from 'lucide-react';
import { useReservation } from '../../../reservations/_hooks/useReservation';

interface ReservationData {
  success: boolean;
  status: string;
  reservation: {
    id: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
    updatedAt: string;
    lessonSlot: {
      id: string;
      start_time: string;
      end_time: string;
      mentor_name?: string;
      price: number;
    };
  };
  payment: {
    payment_status: string;
  } | null;
  session: {
    id: string;
    paymentStatus: string;
    amountTotal: number;
    currency: string;
  };
}

interface ReservationSuccessContentProps {
  sessionId: string;
}

export const ReservationSuccessContent: React.FC<ReservationSuccessContentProps> = ({ sessionId }) => {
  const { checkReservationStatus, isLoading, error } = useReservation();
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);

  useEffect(() => {
    const fetchReservationStatus = async () => {
      const data = await checkReservationStatus(sessionId);
      if (data && data.success) {
        setReservationData(data);
      }
    };

    fetchReservationStatus();
  }, [sessionId, checkReservationStatus]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">予約情報を読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  if (!reservationData) {
    return <div className="text-gray-500 py-4">予約情報が見つかりませんでした。</div>;
  }

  const { reservation, payment, session } = reservationData;
  const lessonSlot = reservation.lessonSlot;

  // 日時のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy年M月d日(EEE)', { locale: ja });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm', { locale: ja });
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">予約詳細</h2>
        
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start">
            <CalendarIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">レッスン日</div>
              <div className="font-medium">
                {lessonSlot && formatDate(lessonSlot.start_time)}
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">レッスン時間</div>
              <div className="font-medium">
                {lessonSlot && `${formatTime(lessonSlot.start_time)} - ${formatTime(lessonSlot.end_time)}`}
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <UserIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">メンター</div>
              <div className="font-medium">
                {lessonSlot?.mentor_name || 'メンター名未設定'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">決済情報</h2>
        
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start">
            <CreditCardIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">決済金額</div>
              <div className="font-medium">
                ¥{session.amountTotal?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="h-5 w-5 mr-3" />
            <div>
              <div className="text-sm text-gray-500">決済ステータス</div>
              <div className="font-medium">
                {payment?.payment_status === 'succeeded' ? '決済完了' : '処理中'}
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="h-5 w-5 mr-3" />
            <div>
              <div className="text-sm text-gray-500">予約番号</div>
              <div className="font-medium text-sm">
                {reservation.id}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4 mt-6">
        <p className="text-sm text-gray-600">
          予約確認メールを送信しました。詳細はメールをご確認ください。
        </p>
      </div>
    </div>
  );
}; 
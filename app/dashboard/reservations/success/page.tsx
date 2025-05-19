export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircleIcon, CalendarIcon, ClockIcon, UserIcon, CreditCardIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SuccessPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const sessionId = searchParams.session_id as string;
  const reservationId = searchParams.reservation_id as string;

  if (!sessionId && !reservationId) {
    redirect('/dashboard/reservations');
  }

  let reservationData = null;
  let sessionData = null;
  
  try {
    // 予約情報の取得
    if (reservationId) {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          slot: {
            include: {
              teacher: true
            }
          },
          student: true
        }
      });
      
      if (reservation) {
        reservationData = {
          id: reservation.id,
          status: reservation.status,
          paymentId: reservation.paymentId,
          slot: {
            id: reservation.slot.id,
            startTime: reservation.slot.startTime.toISOString(),
            endTime: reservation.slot.endTime.toISOString(),
            teacherName: reservation.slot.teacher?.name || '不明な講師'
          }
        };
      }
    }

    // Stripe セッション情報の取得
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent']
      });
      
      if (session) {
        sessionData = {
          id: session.id,
          amountTotal: session.amount_total,
          currency: session.currency,
          paymentStatus: session.payment_status
        };
      }
    }
  } catch (error) {
    console.error('データ取得エラー:', error);
  }

  // 日時のフォーマット関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy年M月d日(EEE)', { locale: ja });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm', { locale: ja });
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-green-50 p-6 flex flex-col items-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-green-800">予約が完了しました</h1>
          <p className="text-green-600 text-center mt-2">
            決済が完了し、レッスンの予約が確定しました
          </p>
        </div>

        <div className="p-6">
          {reservationData && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">予約詳細</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">レッスン日</div>
                      <div className="font-medium">
                        {formatDate(reservationData.slot.startTime)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <ClockIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">レッスン時間</div>
                      <div className="font-medium">
                        {`${formatTime(reservationData.slot.startTime)} - ${formatTime(reservationData.slot.endTime)}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <UserIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">メンター</div>
                      <div className="font-medium">
                        {reservationData.slot.teacherName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">決済情報</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start">
                    <CreditCardIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">決済金額</div>
                      <div className="font-medium">
                        ¥{sessionData?.amountTotal?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="h-5 w-5 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500">決済ステータス</div>
                      <div className="font-medium">
                        {sessionData?.paymentStatus === 'paid' ? '決済完了' : '処理中'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="h-5 w-5 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500">予約番号</div>
                      <div className="font-medium text-sm">
                        {reservationData.id}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard/reservations" className="btn-secondary">
              予約一覧へ戻る
            </Link>
            <Link href="/dashboard" className="btn-primary">
              ダッシュボードへ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
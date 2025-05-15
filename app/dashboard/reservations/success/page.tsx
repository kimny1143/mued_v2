import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircleIcon } from 'lucide-react';
import { ReservationSuccessContent } from '../../../components/reservation/_components/ReservationSuccessContent';
//import { supabaseAdmin } from '@/lib/supabase-admin';
import { prisma } from '@/lib/prisma';

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
  
  // 予約IDがある場合はDBから予約情報を直接取得
  if (reservationId) {
    try {
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
          slot: {
            id: reservation.slot.id,
            startTime: reservation.slot.startTime.toISOString(),
            endTime: reservation.slot.endTime.toISOString(),
            teacherName: reservation.slot.teacher?.name || '不明な講師'
          }
        };
      }
    } catch (error) {
      console.error('予約データ取得エラー:', error);
    }
  }

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
          {reservationData ? (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">予約内容</h2>
              <div className="bg-gray-50 p-4 rounded-md space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-600 text-sm">予約ID:</span>
                  <span className="col-span-2 text-sm font-medium">{reservationData.id}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-600 text-sm">ステータス:</span>
                  <span className="col-span-2 text-sm font-medium">{reservationData.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-600 text-sm">開始時間:</span>
                  <span className="col-span-2 text-sm font-medium">
                    {new Date(reservationData.slot.startTime).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-600 text-sm">講師名:</span>
                  <span className="col-span-2 text-sm font-medium">{reservationData.slot.teacherName}</span>
                </div>
              </div>
            </div>
          ) : (
            <ReservationSuccessContent sessionId={sessionId} />
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
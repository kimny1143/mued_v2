import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircleIcon } from 'lucide-react';
import { ReservationSuccessContent } from '../../components/reservation/_components/ReservationSuccessContent';

interface SuccessPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const sessionId = searchParams.session_id as string;

  if (!sessionId) {
    redirect('/reservations');
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
          <ReservationSuccessContent sessionId={sessionId} />
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/reservations" className="btn-secondary">
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
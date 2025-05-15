import React, { useEffect } from 'react';
import Link from 'next/link';
import { redirect, useRouter } from 'next/navigation';
import { CheckCircleIcon } from 'lucide-react';
import { ReservationSuccessContent } from '@/app/components/reservation/_components/ReservationSuccessContent';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';

// セッションIDとリザベーションIDのパラメータを受け取る
interface SuccessPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function SuccessPage({ searchParams }: SuccessPageProps) {
  const router = useRouter();
  const sessionId = searchParams.session_id as string;
  
  // セッションIDがない場合は予約一覧にリダイレクト
  useEffect(() => {
    if (!sessionId) {
      router.push('/dashboard/reservations');
    }
    
    // 予約データが最新であることを確認するため、予約APIを再読み込みする効果
    const refreshReservationData = async () => {
      try {
        // キャッシュを回避して最新の予約データを取得するためのフラグ
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/checkout/status?session_id=${sessionId}&_=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });
        
        if (response.ok) {
          console.log('予約データを最新化しました');
        }
      } catch (error) {
        console.error('予約データの更新中にエラーが発生しました:', error);
      }
    };
    
    if (sessionId) {
      refreshReservationData();
    }
  }, [sessionId, router]);
  
  if (!sessionId) {
    return null; // リダイレクト中
  }

  return (
    <Card className="p-6 max-w-3xl mx-auto mt-8">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">予約が確定しました</h1>
        <p className="text-gray-600 mb-4">
          レッスンのお支払いを受け付けました。
        </p>
      </div>

      <ReservationSuccessContent sessionId={sessionId} />

      <div className="mt-6 flex justify-center">
        <Button>
          <Link href="/dashboard/reservations">予約一覧に戻る</Link>
        </Button>
      </div>
    </Card>
  );
} 
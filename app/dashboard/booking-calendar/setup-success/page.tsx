'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { CheckCircle, Clock, CreditCard } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export default function SetupSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [reservation, setReservation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processSetupSuccess = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setError('セッションIDが見つかりません');
        setIsProcessing(false);
        return;
      }

      try {
        console.log('=== Setup成功後の処理開始 ===');
        console.log('セッションID:', sessionId);

        // Setup Intent完了後の処理APIを呼び出し
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch('/api/reservations/complete-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: 'include',
          body: JSON.stringify({ sessionId }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Setup完了処理に失敗しました');
        }

        console.log('=== Setup完了処理成功 ===');
        console.log('予約:', result.reservation);
        
        setReservation(result.reservation);
        setIsProcessing(false);

      } catch (error) {
        console.error('Setup完了処理エラー:', error);
        setError(error instanceof Error ? error.message : 'Setup完了処理中にエラーが発生しました');
        setIsProcessing(false);
      }
    };

    processSetupSuccess();
  }, [searchParams]);

  const handleGoToCalendar = () => {
    router.push('/dashboard/booking-calendar');
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">処理中...</h2>
          <p className="text-gray-600">決済情報を保存し、予約を作成しています</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={handleGoToCalendar} className="w-full">
            カレンダーに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">予約が完了しました！</h2>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <Clock className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">メンター承認待ち</span>
          </div>
          <p className="text-sm text-blue-700">
            決済情報は安全に保存されました。<br/>
            メンターが承認すると自動で決済が実行されます。
          </p>
        </div>

        {reservation && (
          <div className="mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">予約詳細</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div>予約ID: {reservation.id}</div>
              <div>ステータス: {reservation.status}</div>
              <div>金額: ¥{reservation.totalAmount}</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={handleGoToCalendar} className="w-full">
            <CreditCard className="h-4 w-4 mr-2" />
            カレンダーに戻る
          </Button>
          
          <p className="text-xs text-gray-500">
            💳 決済は承認後に自動実行されます
          </p>
        </div>
      </div>
    </div>
  );
} 
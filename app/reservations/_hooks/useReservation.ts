import { useState } from 'react';

export const useReservation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReservation = async (lessonSlotId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // チェックアウトセッションを作成
      const response = await fetch('/api/checkout/lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonSlotId,
          successUrl: `${window.location.origin}/reservations/success`,
          cancelUrl: `${window.location.origin}/reservations`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予約処理中にエラーが発生しました');
      }

      const { url } = await response.json();
      
      // Stripeチェックアウトページにリダイレクト
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('チェックアウトURLが取得できませんでした');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予約処理中に未知のエラーが発生しました';
      setError(errorMessage);
      console.error('Reservation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkReservationStatus = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // セッションIDを使用して予約状態を確認
      const response = await fetch(`/api/checkout/status?session_id=${sessionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予約状態の確認中にエラーが発生しました');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予約状態の確認中に未知のエラーが発生しました';
      setError(errorMessage);
      console.error('Reservation status check error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createReservation,
    checkReservationStatus,
    isLoading,
    error,
  };
}; 
import { useCallback, useState } from 'react';

interface PaymentResult {
  success: boolean;
  error?: string;
}

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = useCallback(async (reservationId: string): Promise<PaymentResult> => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });

      if (!response.ok) {
        throw new Error(`Payment failed: ${response.statusText}`);
      }

      const data = await response.json();
      window.location.href = data.url;
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '支払い処理に失敗しました';
      setError(errorMessage);
      console.error("Checkout error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processPayment, isProcessing, error };
}

import { useApiPost } from './use-api-fetch';

interface PaymentResult {
  success: boolean;
  error?: string;
}

interface CheckoutPayload {
  reservationId: string;
}

interface CheckoutResponse {
  url: string;
}

export function usePayment() {
  const { mutate: checkout, isLoading: isProcessing, error } = useApiPost<CheckoutResponse, CheckoutPayload>('/api/checkout');

  const processPayment = async (reservationId: string): Promise<PaymentResult> => {
    try {
      const data = await checkout({ reservationId });

      if (!data) {
        return {
          success: false,
          error: error?.message || '支払い処理に失敗しました'
        };
      }

      window.location.href = data.url;
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '支払い処理に失敗しました';
      console.error("Checkout error:", err);
      return { success: false, error: errorMessage };
    }
  };

  return { processPayment, isProcessing, error };
}

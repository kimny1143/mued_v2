import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateReservationInput {
  lessonSlotId: string;
  successUrl: string;
  cancelUrl: string;
}

interface CreateReservationResponse {
  url: string;
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation<CreateReservationResponse, Error, CreateReservationInput>({
    mutationFn: async (input) => {
      const response = await fetch('/api/checkout/lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予約処理中にエラーが発生しました');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // チェックアウトURLが存在する場合、リダイレクト
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('チェックアウトURLが取得できませんでした');
      }
    },
  });
} 
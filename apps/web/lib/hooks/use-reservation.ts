import { useCreateReservation } from './mutations/useCreateReservation';
import { useReservationStatus } from './queries/useReservationStatus';

export const useReservation = () => {
  // チェックアウトセッション作成のミューテーション
  const createReservationMutation = useCreateReservation();

  // 予約状態確認のクエリ
  const checkReservationStatusQuery = useReservationStatus(null);

  const createReservation = async (lessonSlotId: string) => {
    try {
      await createReservationMutation.mutateAsync({
        lessonSlotId,
        successUrl: `${window.location.origin}/reservations/success`,
        cancelUrl: `${window.location.origin}/reservations`,
      });
    } catch (err) {
      console.error('Reservation error:', err);
      throw err;
    }
  };

  const checkReservationStatus = async (sessionId: string) => {
    try {
      const result = await checkReservationStatusQuery.refetch();
      return result.data;
    } catch (err) {
      console.error('Reservation status check error:', err);
      return null;
    }
  };

  return {
    createReservation,
    checkReservationStatus,
    isLoading: createReservationMutation.isPending || checkReservationStatusQuery.isLoading,
    error: createReservationMutation.error?.message || checkReservationStatusQuery.error?.message,
  };
}; 
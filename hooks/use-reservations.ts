import { useApiFetch, useApiPost } from './use-api-fetch';

export interface Reservation {
  id: string;
  slotId: string;
  studentId: string;
  mentorId: string;
  status: string;
  paymentStatus: string;
  amount: string;
  notes: string | null;
  createdAt: string;
  slot: {
    id: string;
    startTime: string;
    endTime: string;
    price: string;
  };
  mentor: {
    id: string;
    name: string;
    email: string;
    profileImageUrl: string | null;
  };
}

interface ReservationsResponse {
  reservations: Reservation[];
  error?: string;
}

interface CreateReservationPayload {
  slotId: string;
  notes?: string;
}

interface CreateReservationResponse {
  reservation: Reservation;
  error?: string;
}

export function useReservations() {
  const { data, error, isLoading, refetch } = useApiFetch<ReservationsResponse>('/api/reservations');
  const { mutate: postReservation } = useApiPost<CreateReservationResponse, CreateReservationPayload>('/api/reservations');

  const reservations = data?.reservations || [];
  const displayError = error || (data?.error ? new Error(data.error) : null);

  const createReservation = async (slotId: string, notes?: string) => {
    try {
      const result = await postReservation({
        slotId,
        notes: notes || '',
      });

      if (!result) {
        return {
          success: false,
          error: 'Failed to create reservation',
        };
      }

      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Refetch to update the list
      refetch();

      return { success: true, reservation: result.reservation };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create reservation',
      };
    }
  };

  return { reservations, loading: isLoading, error: displayError, refetch, createReservation };
}

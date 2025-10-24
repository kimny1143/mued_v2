import { useState, useEffect } from 'react';

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

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reservations');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setReservations([]);
      } else {
        setReservations(data.reservations || []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (slotId: string, notes?: string) => {
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slotId,
          notes: notes || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return { success: true, reservation: data.reservation };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create reservation',
      };
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  return { reservations, loading, error, refetch: fetchReservations, createReservation };
}

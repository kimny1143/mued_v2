import { useState, useEffect } from 'react';

export interface Mentor {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  bio: string | null;
  skills: string[] | null;
}

export interface Reservation {
  id: string;
  slotId: string;
  status: string;
  paymentStatus: string;
}

export interface LessonSlot {
  id: string;
  mentorId: string;
  startTime: string;
  endTime: string;
  price: string;
  maxCapacity: number;
  currentCapacity: number;
  status: string;
  tags?: string[] | null;
  mentor: Mentor;
  reservation?: Reservation | null;
}

export interface LessonFilters {
  available?: boolean;
  mentorId?: string;
}

export function useLessons(filters?: LessonFilters) {
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.available) params.append('available', 'true');
      if (filters?.mentorId) params.append('mentorId', filters.mentorId);

      const response = await fetch(`/api/lessons?${params.toString()}`);
      const data = await response.json();
      setSlots(data.slots || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lessons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.available, filters?.mentorId]);

  return { slots, loading, error, refetch: fetchSlots };
}

export function useLessonSlot(slotId: string) {
  const [slot, setSlot] = useState<LessonSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlot = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/lessons/${slotId}`);
        const data = await response.json();
        setSlot(data.slot || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch lesson slot');
      } finally {
        setLoading(false);
      }
    };

    if (slotId) {
      fetchSlot();
    }
  }, [slotId]);

  return { slot, loading, error };
}

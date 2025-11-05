import { useMemo } from 'react';
import { useApiFetch } from './use-api-fetch';

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

interface LessonSlotsResponse {
  slots: LessonSlot[];
}

interface LessonSlotResponse {
  slot: LessonSlot | null;
}

export function useLessons(filters?: LessonFilters) {
  // Build URL with query parameters
  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (filters?.available) params.append('available', 'true');
    if (filters?.mentorId) params.append('mentorId', filters.mentorId);
    return `/api/lessons?${params.toString()}`;
  }, [filters?.available, filters?.mentorId]);

  const { data, error, isLoading, refetch } = useApiFetch<LessonSlotsResponse>(url, {
    dependencies: [url],
  });

  const slots = data?.slots || [];

  return { slots, loading: isLoading, error, refetch };
}

export function useLessonSlot(slotId: string) {
  const { data, error, isLoading } = useApiFetch<LessonSlotResponse>(
    `/api/lessons/${slotId}`,
    {
      manual: !slotId, // Don't fetch if no slotId provided
      dependencies: [slotId],
    }
  );

  const slot = data?.slot || null;

  return { slot, loading: isLoading, error };
}

/**
 * Hook for managing mentor lesson slots
 *
 * Provides CRUD operations for mentor's own slots including:
 * - Fetching slots with filtering
 * - Creating single/recurring slots
 * - Updating and deleting slots
 * - Managing recurring series
 */

'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';

// ========================================
// Type Definitions
// ========================================

export interface MentorSlot {
  id: string;
  mentorId: string;
  startTime: string;
  endTime: string;
  price: string;
  maxCapacity: number;
  currentCapacity: number;
  status: 'available' | 'booked' | 'cancelled';
  tags: string[] | null;
  recurringId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  mentor: {
    id: string;
    name: string | null;
    email: string;
    profileImageUrl: string | null;
  } | null;
}

export interface MentorSlotStats {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  cancelledSlots: number;
  totalCapacity: number;
  usedCapacity: number;
}

export interface CreateSlotInput {
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  price: string;
  maxCapacity?: number;
  tags?: string[];
}

export interface CreateRecurringInput {
  recurring: true;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  price: string;
  maxCapacity?: number;
  tags?: string[];
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  startDate: string; // ISO datetime
  endDate: string;   // ISO datetime
}

export interface UpdateSlotInput {
  startTime?: string;
  endTime?: string;
  price?: string;
  maxCapacity?: number;
  status?: 'available' | 'cancelled';
  tags?: string[];
}

export interface SlotFilters {
  status?: 'available' | 'booked' | 'cancelled';
  startDate?: string;
  endDate?: string;
}

// ========================================
// Fetcher
// ========================================

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Failed to fetch');
  }
  const data = await res.json();
  return data.data;
}

// ========================================
// Hook
// ========================================

export function useMentorSlots(filters?: SlotFilters) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build query string
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);

  const queryString = params.toString();
  const url = `/api/mentor-slots${queryString ? `?${queryString}` : ''}`;

  // Fetch slots
  const { data, error: fetchError, isLoading } = useSWR<{
    slots: MentorSlot[];
    stats: MentorSlotStats;
  }>(url, fetcher);

  // Create single slot
  const createSlot = useCallback(async (input: CreateSlotInput): Promise<MentorSlot | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/mentor-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create slot');
      }

      // Revalidate
      mutate(url);

      return result.data.slot;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create slot';
      setError(message);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [url]);

  // Create recurring slots
  const createRecurring = useCallback(async (input: CreateRecurringInput): Promise<{
    slots: MentorSlot[];
    recurringId: string;
  } | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/mentor-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create recurring slots');
      }

      // Revalidate
      mutate(url);

      return {
        slots: result.data.slots,
        recurringId: result.data.recurringId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create recurring slots';
      setError(message);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [url]);

  // Update slot
  const updateSlot = useCallback(async (slotId: string, input: UpdateSlotInput): Promise<MentorSlot | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/mentor-slots/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to update slot');
      }

      // Revalidate
      mutate(url);

      return result.data.slot;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update slot';
      setError(message);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [url]);

  // Delete slot
  const deleteSlot = useCallback(async (slotId: string, action: 'delete' | 'cancel' = 'cancel'): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/mentor-slots/${slotId}?action=${action}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to delete slot');
      }

      // Revalidate
      mutate(url);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete slot';
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [url]);

  // Cancel recurring series
  const cancelRecurringSeries = useCallback(async (recurringId: string, fromDate?: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const params = new URLSearchParams({ action: 'cancel' });
      if (fromDate) params.set('fromDate', fromDate);

      const res = await fetch(`/api/mentor-slots/recurring/${recurringId}?${params}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to cancel recurring series');
      }

      // Revalidate
      mutate(url);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel recurring series';
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [url]);

  return {
    slots: data?.slots || [],
    stats: data?.stats || null,
    isLoading,
    error: error || (fetchError?.message ?? null),
    isCreating,
    isUpdating,
    isDeleting,
    createSlot,
    createRecurring,
    updateSlot,
    deleteSlot,
    cancelRecurringSeries,
    refresh: () => mutate(url),
  };
}

// ========================================
// Day of Week Helpers
// ========================================

export const DAYS_OF_WEEK = [
  { value: 0, label: '日', labelFull: '日曜日' },
  { value: 1, label: '月', labelFull: '月曜日' },
  { value: 2, label: '火', labelFull: '火曜日' },
  { value: 3, label: '水', labelFull: '水曜日' },
  { value: 4, label: '木', labelFull: '木曜日' },
  { value: 5, label: '金', labelFull: '金曜日' },
  { value: 6, label: '土', labelFull: '土曜日' },
] as const;

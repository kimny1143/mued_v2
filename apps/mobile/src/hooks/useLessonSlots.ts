import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface LessonSlot {
  id: string;
  teacherId: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  hourlyRate: number;
  currency: string;
  teacher?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  hourlySlots?: Array<{
    startTime: string;
    endTime: string;
    isReserved: boolean;
    reservationId?: string;
  }>;
}

// 生徒用: 全メンターのスロットを取得
export const useAllLessonSlots = () => {
  return useQuery<LessonSlot[]>({
    queryKey: ['lessonSlots', 'all'],
    queryFn: () => apiClient.getLessonSlots(),
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分
  });
};

// メンター用: 自分のスロットを取得
export const useMyLessonSlots = () => {
  const { user } = useAuth();
  
  return useQuery<LessonSlot[]>({
    queryKey: ['lessonSlots', 'my', user?.id],
    queryFn: () => apiClient.getMyLessonSlots(),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分
  });
};

// 特定メンターのスロットを取得
export const useMentorLessonSlots = (mentorId: string, dateRange?: { from: string; to: string }) => {
  return useQuery<LessonSlot[]>({
    queryKey: ['lessonSlots', 'mentor', mentorId, dateRange],
    queryFn: () => apiClient.getLessonSlots(mentorId, dateRange),
    enabled: !!mentorId,
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分
  });
};
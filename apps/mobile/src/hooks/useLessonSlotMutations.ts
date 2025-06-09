import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

// スロット作成
export const useCreateLessonSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      startTime: string;
      endTime: string;
      hourlyRate: number;
      minHours?: number;
      maxHours?: number;
    }) => apiClient.createLessonSlot(data),
    onSuccess: () => {
      // キャッシュを無効化して再フェッチ
      queryClient.invalidateQueries({ queryKey: ['lessonSlots'] });
    },
    // 楽観的アップデート
    onMutate: async (newSlot) => {
      // 現在のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['lessonSlots', 'my'] });

      // 現在のデータをスナップショット
      const previousSlots = queryClient.getQueryData(['lessonSlots', 'my']);

      // 楽観的にデータを更新
      queryClient.setQueryData(['lessonSlots', 'my'], (old: any) => {
        if (!old) return [newSlot];
        return [...old, { ...newSlot, id: 'temp-' + Date.now() }];
      });

      return { previousSlots };
    },
    onError: (err, newSlot, context) => {
      // エラー時は元のデータに戻す
      if (context?.previousSlots) {
        queryClient.setQueryData(['lessonSlots', 'my'], context.previousSlots);
      }
    },
  });
};

// スロット削除
export const useDeleteLessonSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => apiClient.deleteLessonSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonSlots'] });
    },
    // 楽観的アップデート
    onMutate: async (slotId) => {
      await queryClient.cancelQueries({ queryKey: ['lessonSlots', 'my'] });

      const previousSlots = queryClient.getQueryData(['lessonSlots', 'my']);

      queryClient.setQueryData(['lessonSlots', 'my'], (old: any) => {
        if (!old) return [];
        return old.filter((slot: any) => slot.id !== slotId);
      });

      return { previousSlots };
    },
    onError: (err, slotId, context) => {
      if (context?.previousSlots) {
        queryClient.setQueryData(['lessonSlots', 'my'], context.previousSlots);
      }
    },
  });
};
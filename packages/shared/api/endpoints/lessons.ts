// @mued/shared/api/endpoints/lessons - Lesson slot endpoints

import type { ApiClient } from '../client';
import type { 
  LessonSlot, 
  CreateLessonSlotRequest, 
  UpdateLessonSlotRequest,
  PaginatedResponse,
  PaginationParams
} from '../../types';

export class LessonEndpoints {
  constructor(private client: ApiClient) {}

  async list(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<LessonSlot>>('/api/lesson-slots', { params });
  }

  async getById(id: string) {
    return this.client.get<LessonSlot>(`/api/lesson-slots/${id}`);
  }

  async create(data: CreateLessonSlotRequest) {
    return this.client.post<LessonSlot>('/api/lesson-slots', data);
  }

  async update(id: string, data: UpdateLessonSlotRequest) {
    return this.client.patch<LessonSlot>(`/api/lesson-slots/${id}`, data);
  }

  async delete(id: string) {
    return this.client.delete<void>(`/api/lesson-slots/${id}`);
  }

  async getByMentor(mentorId: string, params?: PaginationParams) {
    return this.client.get<PaginatedResponse<LessonSlot>>(`/api/lesson-slots/by-mentor/${mentorId}`, { params });
  }

  async getAvailable(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<LessonSlot>>('/api/lesson-slots/by-mentor', { 
      params: { ...params, status: 'available' } 
    });
  }

  async bulkCreate(data: CreateLessonSlotRequest[]) {
    return this.client.post<LessonSlot[]>('/api/lesson-slots/bulk', { slots: data });
  }

  async bulkUpdate(updates: Array<{ id: string; data: UpdateLessonSlotRequest }>) {
    return this.client.patch<LessonSlot[]>('/api/lesson-slots/bulk', { updates });
  }

  async bulkDelete(ids: string[]) {
    return this.client.post<void>('/api/lesson-slots/bulk-delete', { ids });
  }

  async checkAvailability(id: string) {
    return this.client.get<{ available: boolean }>(`/api/lesson-slots/${id}/availability`);
  }
}
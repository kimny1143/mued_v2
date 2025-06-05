// @mued/shared/api/endpoints/sessions - Session endpoints

import type { ApiClient } from '../client';
import type { 
  Session,
  StartSessionRequest,
  EndSessionRequest,
  SessionFeedbackRequest,
  PaginatedResponse,
  PaginationParams
} from '../../types';

export class SessionEndpoints {
  constructor(private client: ApiClient) {}

  async list(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<Session>>('/api/sessions', { params });
  }

  async getById(id: string) {
    return this.client.get<Session>(`/api/sessions/${id}`);
  }

  async getByReservation(reservationId: string) {
    return this.client.get<Session>(`/api/sessions/reservation/${reservationId}`);
  }

  async start(id: string, data?: StartSessionRequest) {
    return this.client.post<Session>(`/api/sessions/${id}/start`, data);
  }

  async end(id: string, data?: EndSessionRequest) {
    return this.client.post<Session>(`/api/sessions/${id}/end`, data);
  }

  async submitFeedback(id: string, data: SessionFeedbackRequest) {
    return this.client.post<Session>(`/api/sessions/${id}/feedback`, data);
  }

  async updateNotes(id: string, notes: string) {
    return this.client.patch<Session>(`/api/sessions/${id}`, { notes });
  }

  async addAttachment(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.client.post<{ url: string }>(`/api/sessions/${id}/attachments`, formData);
  }

  async removeAttachment(id: string, attachmentId: string) {
    return this.client.delete<void>(`/api/sessions/${id}/attachments/${attachmentId}`);
  }

  async getUpcoming(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<Session>>('/api/sessions/upcoming', { params });
  }

  async getPast(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<Session>>('/api/sessions/past', { params });
  }

  async getStats(userId?: string) {
    const url = userId ? `/api/sessions/stats/${userId}` : '/api/sessions/stats';
    return this.client.get<{
      totalSessions: number;
      completedSessions: number;
      totalHours: number;
      averageRating: number;
      upcomingSessions: number;
    }>(url);
  }

  async joinSession(id: string) {
    return this.client.get<{ 
      roomUrl: string; 
      token?: string;
      expiresAt?: Date;
    }>(`/api/sessions/${id}/join`);
  }

  async recordSession(id: string, enabled: boolean) {
    return this.client.post<{ recording: boolean }>(`/api/sessions/${id}/record`, { enabled });
  }

  async getRecording(id: string) {
    return this.client.get<{ 
      url: string;
      duration: number;
      size: number;
    }>(`/api/sessions/${id}/recording`);
  }
}
// @mued/shared/api/endpoints/reservations - Reservation endpoints

import type { ApiClient } from '../client';
import type { 
  Reservation, 
  CreateReservationRequest, 
  UpdateReservationRequest,
  CancelReservationRequest,
  RescheduleReservationRequest,
  PaginatedResponse,
  PaginationParams
} from '../../types';

export class ReservationEndpoints {
  constructor(private client: ApiClient) {}

  async list(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<Reservation>>('/api/reservations', { params });
  }

  async getById(id: string) {
    return this.client.get<Reservation>(`/api/reservations/${id}`);
  }

  async create(data: CreateReservationRequest) {
    return this.client.post<Reservation>('/api/reservations', data);
  }

  async update(id: string, data: UpdateReservationRequest) {
    return this.client.patch<Reservation>(`/api/reservations/${id}`, data);
  }

  async approve(id: string) {
    return this.client.post<Reservation>(`/api/reservations/${id}/approve`);
  }

  async reject(id: string, reason?: string) {
    return this.client.post<Reservation>(`/api/reservations/${id}/reject`, { reason });
  }

  async cancel(id: string, data: CancelReservationRequest) {
    return this.client.post<Reservation>(`/api/reservations/${id}/cancel`, data);
  }

  async reschedule(id: string, data: RescheduleReservationRequest) {
    return this.client.post<Reservation>(`/api/reservations/${id}/reschedule`, data);
  }

  async setupPayment(id: string) {
    return this.client.post<{ url: string }>(`/api/reservations/${id}/setup-payment`);
  }

  async checkout(id: string) {
    return this.client.post<{ url: string }>(`/api/reservations/${id}/checkout`);
  }

  async getMyReservations(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<Reservation>>('/api/my-reservations', { params });
  }
}
// @mued/shared/api/endpoints/payments - Payment endpoints

import type { ApiClient } from '../client';
import type { 
  Payment,
  RefundRequest,
  CheckoutSessionResponse,
  PaginatedResponse,
  PaginationParams
} from '../../types';

export class PaymentEndpoints {
  constructor(private client: ApiClient) {}

  async list(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<Payment>>('/api/payments', { params });
  }

  async getById(id: string) {
    return this.client.get<Payment>(`/api/payments/${id}`);
  }

  async getByReservation(reservationId: string) {
    return this.client.get<Payment>(`/api/payments/reservation/${reservationId}`);
  }

  async createCheckoutSession(reservationId: string) {
    return this.client.post<CheckoutSessionResponse>('/api/checkout/lesson', { reservationId });
  }

  async getCheckoutSession(sessionId: string) {
    return this.client.get<{ session: any }>(`/api/checkout-session/${sessionId}`);
  }

  async checkCheckoutStatus(sessionId: string) {
    return this.client.get<{ status: string; paymentIntent?: any }>('/api/checkout/status', { 
      params: { session_id: sessionId } 
    });
  }

  async executePayment(paymentId: string) {
    return this.client.post<Payment>(`/api/payments/${paymentId}/execute`);
  }

  async refund(data: RefundRequest) {
    return this.client.post<Payment>('/api/payments/refund', data);
  }

  async retryPayment(paymentId: string) {
    return this.client.post<Payment>(`/api/payments/${paymentId}/retry`);
  }

  async cancelPayment(paymentId: string, reason?: string) {
    return this.client.post<Payment>(`/api/payments/${paymentId}/cancel`, { reason });
  }

  async getPaymentMethods() {
    return this.client.get<Array<{ id: string; type: string; last4?: string }>>('/api/payments/methods');
  }

  async testCheckout() {
    return this.client.get<{ url: string }>('/api/checkout-session/test');
  }

  async executePendingPayments() {
    return this.client.post<{ executed: number; errors: number }>('/api/cron/execute-payments');
  }

  async debugExecutePayments() {
    return this.client.get<any>('/api/cron/execute-payments/debug');
  }

  async testExecutePayments() {
    return this.client.get<any>('/api/cron/execute-payments/test');
  }
}
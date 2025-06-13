// @mued/shared/api/endpoints/subscriptions - Subscription endpoints

import type { ApiClient } from '../client';
import type { 
  Subscription,
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  PaginatedResponse,
  PaginationParams
} from '../../types';

export class SubscriptionEndpoints {
  constructor(private client: ApiClient) {}

  async getCurrent() {
    return this.client.get<Subscription>('/api/subscription');
  }

  async getUserSubscription(userId?: string) {
    const url = userId ? `/api/user/${userId}/subscription` : '/api/user/subscription';
    return this.client.get<Subscription>(url);
  }

  async list(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<Subscription>>('/api/subscriptions', { params });
  }

  async createCheckoutSession(data: CreateCheckoutSessionRequest) {
    return this.client.post<CheckoutSessionResponse>('/api/subscription-checkout', data);
  }

  async cancel(subscriptionId?: string) {
    const url = subscriptionId ? `/api/subscription/${subscriptionId}/cancel` : '/api/subscription/cancel';
    return this.client.post<Subscription>(url);
  }

  async resume(subscriptionId?: string) {
    const url = subscriptionId ? `/api/subscription/${subscriptionId}/resume` : '/api/subscription/resume';
    return this.client.post<Subscription>(url);
  }

  async updatePlan(priceId: string, subscriptionId?: string) {
    const url = subscriptionId ? `/api/subscription/${subscriptionId}` : '/api/subscription';
    return this.client.patch<Subscription>(url, { priceId });
  }

  async getPlans() {
    return this.client.get<Array<{
      id: string;
      name: string;
      priceId: string;
      price: number;
      currency: string;
      interval: 'month' | 'year';
      features: string[];
    }>>('/api/subscription/plans');
  }

  async getBillingPortalUrl() {
    return this.client.get<{ url: string }>('/api/billing-portal');
  }

  async getUsageStats(subscriptionId?: string) {
    const url = subscriptionId 
      ? `/api/subscription/${subscriptionId}/usage` 
      : '/api/subscription/usage';
    return this.client.get<{
      lessonsBooked: number;
      lessonsRemaining: number;
      nextResetDate: Date;
    }>(url);
  }

  async getInvoices(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created: Date;
      pdfUrl?: string;
    }>>('/api/subscription/invoices', { params });
  }

  async syncWithStripe() {
    return this.client.post<{ synced: number; errors: number }>('/api/subscription/sync');
  }
}
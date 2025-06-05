// @mued/shared/api/endpoints/auth - Authentication endpoints

import type { ApiClient } from '../client';
import type { AuthResponse, LoginRequest, SignupRequest } from '../../types';

export class AuthEndpoints {
  constructor(private client: ApiClient) {}

  async login(data: LoginRequest) {
    return this.client.post<AuthResponse>('/api/auth/login', data);
  }

  async signup(data: SignupRequest) {
    return this.client.post<AuthResponse>('/api/auth/signup', data);
  }

  async logout() {
    return this.client.post<void>('/api/auth/logout');
  }

  async getSession() {
    return this.client.get<AuthResponse>('/api/auth/session');
  }

  async refreshToken() {
    return this.client.post<AuthResponse>('/api/auth/refresh');
  }

  async resetPassword(email: string) {
    return this.client.post<void>('/api/auth/reset-password', { email });
  }

  async updatePassword(oldPassword: string, newPassword: string) {
    return this.client.post<void>('/api/auth/update-password', {
      oldPassword,
      newPassword,
    });
  }
}
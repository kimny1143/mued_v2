// @mued/shared/api/endpoints/users - User endpoints

import type { ApiClient } from '../client';
import type { User, Role, PaginatedResponse, PaginationParams } from '../../types';

export class UserEndpoints {
  constructor(private client: ApiClient) {}

  async getProfile() {
    return this.client.get<User>('/api/user');
  }

  async updateProfile(data: Partial<User>) {
    return this.client.patch<User>('/api/user', data);
  }

  async getRole() {
    return this.client.get<Role>('/api/roles');
  }

  async updateRole(data: Partial<Role>) {
    return this.client.patch<Role>('/api/roles', data);
  }

  async listUsers(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<User>>('/api/users', { params });
  }

  async getUserById(id: string) {
    return this.client.get<User>(`/api/users/${id}`);
  }

  async deleteAccount() {
    return this.client.delete<void>('/api/user');
  }
}
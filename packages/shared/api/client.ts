// @mued/shared/api/client - Platform-agnostic API client

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import type { ApiResponse } from '../types';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  getAuthToken?: () => Promise<string | null>;
}

export class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      async (config) => {
        if (this.config.getAuthToken) {
          const token = await this.config.getAuthToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError = this.handleError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private handleError(error: AxiosError): ApiResponse {
    if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as any;
      return {
        error: responseData?.error || error.message,
        message: responseData?.message || 'An error occurred',
        status: error.response.status,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        error: 'Network error',
        message: 'Unable to connect to the server',
        status: 0,
      };
    } else {
      // Something else happened
      return {
        error: 'Request error',
        message: error.message,
        status: 0,
      };
    }
  }

  // HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<T>(url, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<T>(url, config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }
}

// Factory function for creating API client
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
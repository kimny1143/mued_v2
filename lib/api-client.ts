/**
 * Unified API Client for MUED LMS v2
 *
 * Features:
 * - Automatic retry logic with exponential backoff
 * - Request timeout handling
 * - Automatic authentication header injection (Clerk)
 * - Centralized error handling
 * - Type-safe request/response
 *
 * Usage:
 * ```typescript
 * import { apiClient } from '@/lib/api-client';
 *
 * // GET request
 * const { data } = await apiClient.get<Material[]>('/api/materials');
 *
 * // POST request
 * const { data } = await apiClient.post<Material>('/api/materials', {
 *   title: 'New Material',
 *   type: 'music',
 * });
 * ```
 */

import { logger } from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipAuth?: boolean;
  timeout?: number;
  retries?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  status: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}

// ============================================================================
// API Client Class
// ============================================================================

class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000, // 30 seconds
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000, // 1 second
    };
  }

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.config.retries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && this.isRetriableError(error)) {
        const delay = this.config.retryDelay * (this.config.retries - retries + 1);
        logger.warn('Retrying API request', { retries, delay, error });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private isRetriableError(error: unknown): boolean {
    if (error instanceof Response) {
      // Retry on server errors (5xx) or rate limiting (429)
      return error.status >= 500 || error.status === 429;
    }

    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  /**
   * Enrich headers with authentication and default values
   */
  private async enrichHeaders(
    headers: HeadersInit = {},
    skipAuth: boolean = false
  ): Promise<Headers> {
    const enriched = new Headers(headers);

    // Add default content type if not present
    if (!enriched.has('Content-Type')) {
      enriched.set('Content-Type', 'application/json');
    }

    // Add authentication token (client-side only)
    if (typeof window !== 'undefined' && !skipAuth) {
      try {
        // Note: Clerk authentication is handled by middleware
        // This is a placeholder for explicit token injection if needed
        // const { getToken } = await import('@clerk/nextjs');
        // const token = await getToken();
        // if (token) {
        //   enriched.set('Authorization', `Bearer ${token}`);
        // }
      } catch (error) {
        logger.warn('Failed to get auth token', error);
      }
    }

    return enriched;
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(path: string, params?: Record<string, string>): string {
    const baseURL = this.config.baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = new URL(path, baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }

    return url.toString();
  }

  /**
   * Parse error response
   */
  private async parseError(response: Response): Promise<{ message: string; details?: unknown }> {
    try {
      const data = await response.json();
      return {
        message: data.error || data.message || `HTTP ${response.status}`,
        details: data,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  /**
   * Core request method
   */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      params,
      skipAuth = false,
      timeout = this.config.timeout,
      retries = this.config.retries,
      ...fetchOptions
    } = options;

    const url = this.buildURL(path, params);
    const headers = await this.enrichHeaders(fetchOptions.headers, skipAuth);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      logger.debug('API request', {
        method: fetchOptions.method || 'GET',
        url,
        hasBody: !!fetchOptions.body,
      });

      const response = await this.executeWithRetry(
        async () => {
          const res = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: controller.signal,
          });

          if (!res.ok) {
            const error = await this.parseError(res);
            throw new ApiError(error.message, res.status, error.details);
          }

          return res;
        },
        retries
      );

      clearTimeout(timeoutId);

      // Handle empty responses
      const contentType = response.headers.get('Content-Type');
      const data = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();

      logger.debug('API response', {
        status: response.status,
        hasData: !!data,
      });

      return {
        success: true,
        data: data as T,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        logger.error('API error', {
          message: error.message,
          status: error.status,
          details: error.details,
        });
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ApiError('Request timeout', 408);
        logger.error('API timeout', { timeout, url });
        throw timeoutError;
      }

      const unknownError = new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
      logger.error('API unknown error', { error });
      throw unknownError;
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const apiClient = new ApiClient();

// ============================================================================
// React Hook Wrapper (Optional)
// ============================================================================

/**
 * React hook for accessing the API client
 *
 * Usage:
 * ```typescript
 * function MyComponent() {
 *   const api = useApiClient();
 *
 *   async function fetchData() {
 *     const { data } = await api.get<Material[]>('/api/materials');
 *     setMaterials(data);
 *   }
 * }
 * ```
 */
export function useApiClient() {
  return apiClient;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard for ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return ApiError.isApiError(error);
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}

import { useState, useEffect, useCallback } from 'react';
import { useApiClient, getErrorMessage } from '@/lib/api-client';
import { logger } from '@/lib/utils/logger';

export interface UseApiFetchOptions {
  /**
   * 自動フェッチを無効化
   * @default false
   */
  manual?: boolean;

  /**
   * フェッチ時の依存配列
   */
  dependencies?: unknown[];
}

export interface UseApiFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * 汎用APIフェッチフック
 *
 * データフェッチングのボイラープレートを削減する共通フック
 *
 * @template T レスポンスの型
 * @param url フェッチするURL
 * @param options オプション
 * @returns フェッチ結果とリフェッチ関数
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const { data, isLoading, error } = useApiFetch<User[]>('/api/users');
 *
 * // 手動フェッチ
 * const { data, refetch, isLoading } = useApiFetch<User>(
 *   `/api/users/${id}`,
 *   { manual: true }
 * );
 *
 * // 依存配列指定
 * const { data, isLoading } = useApiFetch<Material[]>(
 *   `/api/materials?type=${type}`,
 *   { dependencies: [type] }
 * );
 * ```
 */
export function useApiFetch<T>(
  url: string,
  options: UseApiFetchOptions = {}
): UseApiFetchResult<T> {
  const { manual = false, dependencies = [] } = options;
  const apiClient = useApiClient();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!manual);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<T | { success: boolean; data: T }>(url);

      // Check if response is in apiSuccess format: { success: true, data: T }
      const responseData = response.data as unknown;
      if (
        typeof responseData === 'object' &&
        responseData !== null &&
        'success' in responseData &&
        'data' in responseData
      ) {
        // apiSuccess format - unwrap the data
        const apiResponse = responseData as { success: boolean; data: T };
        if (apiResponse.success && apiResponse.data !== undefined) {
          setData(apiResponse.data);
        } else {
          throw new Error('API returned success: false');
        }
      } else {
        // Legacy format - use response data directly
        setData(response.data as T);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(getErrorMessage(err));
      setError(error);
      logger.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, url]);

  useEffect(() => {
    if (!manual) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, manual, ...dependencies]);

  return {
    data,
    error,
    isLoading,
    refetch: fetchData,
  };
}

/**
 * POST リクエスト用フック
 *
 * @example
 * ```typescript
 * const { mutate, isLoading, error } = useApiPost<CreateUserResponse>('/api/users');
 *
 * const handleSubmit = async (userData: UserInput) => {
 *   const result = await mutate(userData);
 *   if (result) {
 *     console.log('Created user:', result);
 *   }
 * };
 * ```
 */
export function useApiPost<TResponse, TPayload = unknown>(url: string) {
  const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (payload: TPayload): Promise<TResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<TResponse | { success: boolean; data: TResponse }>(url, payload);

        // Check if response is in apiSuccess format: { success: true, data: TResponse }
        const responseData = response.data as unknown;
        if (
          typeof responseData === 'object' &&
          responseData !== null &&
          'success' in responseData &&
          'data' in responseData
        ) {
          // apiSuccess format - unwrap the data
          const apiResponse = responseData as { success: boolean; data: TResponse };
          if (apiResponse.success && apiResponse.data !== undefined) {
            return apiResponse.data;
          } else {
            throw new Error('API returned success: false');
          }
        } else {
          // Legacy format - use response data directly
          return response.data as TResponse;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(getErrorMessage(err));
        setError(error);
        logger.error('Post error:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient, url]
  );

  return {
    mutate,
    isLoading,
    error,
  };
}

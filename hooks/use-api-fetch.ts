import { useState, useEffect, useCallback } from 'react';

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

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!manual);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [url]);

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (payload: TPayload): Promise<TResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const json = await response.json();
        return json;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        console.error('Post error:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [url]
  );

  return {
    mutate,
    isLoading,
    error,
  };
}

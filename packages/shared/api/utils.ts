// @mued/shared/api/utils - API utility functions

/**
 * URLにクエリパラメータを追加
 */
export function appendQueryParams(url: string, params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * APIエラーレスポンスからエラーメッセージを抽出
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * HTTPステータスコードがエラーかどうかを判定
 */
export function isErrorStatus(status: number): boolean {
  return status >= 400;
}

/**
 * HTTPステータスコードが成功かどうかを判定
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}
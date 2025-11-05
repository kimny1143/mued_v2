/**
 * API Response Utilities
 * 標準化されたAPIレスポンス形式
 */

import { NextResponse } from 'next/server';

/**
 * 成功レスポンスの型定義
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}

/**
 * エラーレスポンスの型定義
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp?: string;
}

/**
 * 統一されたAPIレスポンス型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 成功レスポンスを生成
 */
export function apiSuccess<T>(
  data: T,
  options?: {
    message?: string;
    status?: number;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  if (options?.message) {
    response.message = options.message;
  }

  return NextResponse.json(response, { status: options?.status ?? 200 });
}

/**
 * エラーレスポンスを生成
 */
export function apiError(
  error: string | Error,
  options?: {
    code?: string;
    details?: unknown;
    status?: number;
  }
): NextResponse<ApiErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : error;

  const response: ApiErrorResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString(),
  };

  if (options?.code) {
    response.code = options.code;
  }

  if (options?.details) {
    response.details = options.details;
  }

  return NextResponse.json(response, { status: options?.status ?? 500 });
}

/**
 * バリデーションエラーレスポンス
 */
export function apiValidationError(
  message: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return apiError(message, {
    code: 'VALIDATION_ERROR',
    details,
    status: 400,
  });
}

/**
 * 認証エラーレスポンス
 */
export function apiUnauthorized(
  message: string = 'Unauthorized'
): NextResponse<ApiErrorResponse> {
  return apiError(message, {
    code: 'UNAUTHORIZED',
    status: 401,
  });
}

/**
 * 権限エラーレスポンス
 */
export function apiForbidden(
  message: string = 'Forbidden'
): NextResponse<ApiErrorResponse> {
  return apiError(message, {
    code: 'FORBIDDEN',
    status: 403,
  });
}

/**
 * リソースが見つからないエラー
 */
export function apiNotFound(
  message: string = 'Resource not found'
): NextResponse<ApiErrorResponse> {
  return apiError(message, {
    code: 'NOT_FOUND',
    status: 404,
  });
}

/**
 * レート制限エラー
 */
export function apiRateLimitExceeded(
  message: string = 'Rate limit exceeded'
): NextResponse<ApiErrorResponse> {
  return apiError(message, {
    code: 'RATE_LIMIT_EXCEEDED',
    status: 429,
  });
}

/**
 * サーバーエラーレスポンス
 */
export function apiServerError(
  error: string | Error,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return apiError(error, {
    code: 'INTERNAL_SERVER_ERROR',
    details,
    status: 500,
  });
}

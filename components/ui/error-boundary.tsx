'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface ErrorBoundaryProps {
  /**
   * エラーオブジェクトまたはメッセージ
   */
  error: Error | string;

  /**
   * リトライボタンを表示するか
   * @default false
   */
  showRetry?: boolean;

  /**
   * リトライ時のコールバック
   */
  onRetry?: () => void;

  /**
   * タイトルのカスタマイズ
   */
  title?: string;
}

/**
 * 共通エラー表示コンポーネント
 *
 * @example
 * ```tsx
 * // 基本的な使用
 * {error && <ErrorBoundary error={error} />}
 *
 * // リトライボタン付き
 * <ErrorBoundary
 *   error={error}
 *   showRetry
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function ErrorBoundary({
  error,
  showRetry = false,
  onRetry,
  title = 'エラーが発生しました',
}: ErrorBoundaryProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{errorMessage}</p>
        {showRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onRetry}
          >
            再試行
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * ページ全体のエラー表示（画面中央配置）
 */
export function PageError({ error, onRetry }: ErrorBoundaryProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ErrorBoundary error={error} showRetry onRetry={onRetry} />
      </div>
    </div>
  );
}

/**
 * インラインエラー表示
 */
export function InlineError({ error }: { error: Error | string }) {
  return <ErrorBoundary error={error} />;
}

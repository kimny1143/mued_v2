import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  /**
   * スピナーのサイズ
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * 画面中央に配置するか
   * @default false
   */
  centered?: boolean;

  /**
   * ラベルテキスト
   */
  label?: string;

  /**
   * カスタムクラス名
   */
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
};

/**
 * 共通ローディングスピナーコンポーネント
 *
 * @example
 * ```tsx
 * // 基本的な使用
 * <LoadingSpinner />
 *
 * // 画面中央に配置
 * <LoadingSpinner centered />
 *
 * // サイズとラベル指定
 * <LoadingSpinner size="lg" label="読み込み中..." />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  centered = false,
  label,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary',
          sizeClasses[size]
        )}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );

  if (centered) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * ページ全体のローディング（画面中央配置）
 */
export function PageLoading({ label }: { label?: string }) {
  return <LoadingSpinner centered size="lg" label={label} />;
}

/**
 * インラインローディング（テキスト横など）
 */
export function InlineLoading({ label }: { label?: string }) {
  return <LoadingSpinner size="sm" label={label} />;
}

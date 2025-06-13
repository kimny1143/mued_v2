// @mued/shared/utils/format - Formatting utility functions

/**
 * 価格を通貨形式でフォーマット
 */
export function formatCurrency(
  amount: number,
  currency: string = 'JPY',
  locale: string = 'ja-JP'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 数値をカンマ区切りでフォーマット
 */
export function formatNumber(num: number, locale: string = 'ja-JP'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * 時間（分）を「○時間○分」形式に変換
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}分`;
  } else if (mins === 0) {
    return `${hours}時間`;
  } else {
    return `${hours}時間${mins}分`;
  }
}

/**
 * パーセンテージをフォーマット
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 名前のイニシャルを取得
 */
export function getInitials(name: string): string {
  const names = name.trim().split(' ');
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return names
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}
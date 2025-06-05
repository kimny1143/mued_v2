// @mued/shared/utils/validation - Validation utility functions

import * as z from 'zod';

/**
 * メールアドレスのバリデーションスキーマ
 */
export const emailSchema = z.string().email('有効なメールアドレスを入力してください');

/**
 * パスワードのバリデーションスキーマ
 */
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上である必要があります')
  .regex(/[A-Z]/, '大文字を1つ以上含む必要があります')
  .regex(/[a-z]/, '小文字を1つ以上含む必要があります')
  .regex(/[0-9]/, '数字を1つ以上含む必要があります');

/**
 * 電話番号のバリデーションスキーマ（日本）
 */
export const phoneNumberSchema = z
  .string()
  .regex(/^0\d{9,10}$/, '有効な電話番号を入力してください');

/**
 * URLのバリデーションスキーマ
 */
export const urlSchema = z.string().url('有効なURLを入力してください');

/**
 * 日付文字列のバリデーション
 */
export function isValidDateString(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 数値の範囲チェック
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 配列が空でないことを確認
 */
export function isNonEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}

/**
 * オブジェクトが空でないことを確認
 */
export function isNonEmptyObject(obj: Record<string, any>): boolean {
  return Object.keys(obj).length > 0;
}
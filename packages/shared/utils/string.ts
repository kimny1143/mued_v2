// @mued/shared/utils/string - String utility functions

/**
 * snake_caseをcamelCaseに変換
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * camelCaseをsnake_caseに変換
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * オブジェクトのキーをcamelCaseに変換（ネストされたオブジェクトにも対応）
 */
export function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key);
      result[camelKey] = convertKeysToCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

/**
 * オブジェクトのキーをsnake_caseに変換（ネストされたオブジェクトにも対応）
 */
export function convertKeysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnakeCase(item));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = convertKeysToSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

/**
 * 文字列を指定された長さで切り詰める
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * 文字列の最初の文字を大文字にする
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * メールアドレスのバリデーション
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 電話番号のフォーマット（日本の形式）
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.substr(0, 3)}-${cleaned.substr(3, 4)}-${cleaned.substr(7)}`;
  } else if (cleaned.length === 10) {
    return `${cleaned.substr(0, 3)}-${cleaned.substr(3, 3)}-${cleaned.substr(6)}`;
  }
  return phoneNumber;
}
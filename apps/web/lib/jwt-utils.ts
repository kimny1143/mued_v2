/**
 * JWT関連のユーティリティ関数
 * トークン抽出とデコードの最適化版
 */

// 正規表現を事前コンパイル（パフォーマンス向上）
const TOKEN_COOKIE_PATTERN = /sb-[^-]+-auth-token\.0=([^;]+)/;
const BEARER_PATTERN = /^Bearer\s+(.+)$/i;

/**
 * リクエストからJWTトークンを高速抽出
 * @param request HTTP Request オブジェクト
 * @returns JWTトークン文字列またはnull
 */
export function extractTokenFast(request: Request): string | null {
  // 1. Authorizationヘッダーを優先的にチェック（最も高速）
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(BEARER_PATTERN);
    if (match) {
      return match[1];
    }
  }

  // 2. Cookieからの抽出
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;

  const match = cookie.match(TOKEN_COOKIE_PATTERN);
  if (!match) return null;

  try {
    const encodedValue = match[1];
    const decoded = decodeURIComponent(encodedValue);
    
    // base64エンコードされている場合
    if (decoded.startsWith('base64-')) {
      const base64Content = decoded.substring(7);
      const jsonString = Buffer.from(base64Content, 'base64').toString('utf-8');
      const parsed = JSON.parse(jsonString);
      return parsed.access_token || null;
    }
    
    // 通常のJSON形式
    const parsed = JSON.parse(decoded);
    return parsed.access_token || null;
  } catch (error) {
    console.error('[JWT] Token extraction error:', error);
    return null;
  }
}

/**
 * JWTペイロードを高速デコード（検証なし）
 * キャッシュ用途などで使用
 * @param token JWTトークン
 * @returns デコードされたペイロード
 */
export function decodeJWTPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[JWT] Payload decode error:', error);
    return null;
  }
}

/**
 * JWTの有効期限をチェック
 * @param token JWTトークン
 * @returns 有効期限内ならtrue
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || !payload.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * キャッシュキーを生成（トークンの一部を使用）
 * @param token JWTトークン
 * @returns キャッシュキー
 */
export function generateCacheKey(token: string): string {
  // トークンの最初の32文字をキーとして使用（衝突の可能性は極めて低い）
  return `session:${token.substring(0, 32)}`;
}
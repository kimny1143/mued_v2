/**
 * 動的URL生成ユーティリティ
 * ローカル開発、Vercelプレビュー、本番環境に対応
 */

/**
 * ベースURLを動的に取得
 * @param request - Next.js Request オブジェクト（オプション）
 * @returns ベースURL（プロトコル含む）
 */
export function getBaseUrl(request?: Request): string {
  // 1. 明示的に設定された環境変数を最優先（ローカル開発・テスト用）
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // 2. 明示的なデプロイURL設定（Vercel環境でのオーバーライド用）
  if (process.env.NEXT_PUBLIC_DEPLOY_URL) {
    return process.env.NEXT_PUBLIC_DEPLOY_URL;
  }
  
  // 3. Vercel環境変数をチェック（自動設定）
  if (process.env.VERCEL_URL) {
    // Vercelプレビューデプロイメント
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 4. 本番環境のドメイン
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    return 'https://www.mued.jp';
  }
  
  // 5. リクエストヘッダーから動的に生成
  if (request) {
    const host = request.headers.get('host');
    if (host) {
      // localhost判定
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      const protocol = isLocalhost ? 'http' : 'https';
      return `${protocol}://${host}`;
    }
  }
  
  // 6. クライアントサイドの場合は現在のオリジンを使用
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // 7. サーバーサイドのデフォルト
  return 'http://localhost:3000';
}

/**
 * 認証用のサイトURLを取得（Supabase Auth用）
 * 環境変数の優先順位を考慮した専用関数
 * @returns 認証用のベースURL
 */
export function getSiteUrl(): string {
  // 1. 環境変数から明示的に設定された値を最優先
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // 2. Vercelデプロイ環境用の設定
  if (process.env.NEXT_PUBLIC_DEPLOY_URL) {
    return process.env.NEXT_PUBLIC_DEPLOY_URL;
  }
  
  // 3. Vercel自動環境変数（プレビュー環境）
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 4. 本番環境
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.mued.jp';
  }
  
  // 5. ローカル開発環境のデフォルト
  return 'http://localhost:3000';
}

/**
 * 完全なURLを生成
 * @param path - パス（/で始まる）
 * @param request - Next.js Request オブジェクト（オプション）
 * @returns 完全なURL
 */
export function getFullUrl(path: string, request?: Request): string {
  const baseUrl = getBaseUrl(request);
  // パスが既に/で始まっている場合は、そのまま結合
  // そうでない場合は/を追加
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * 認証コールバックURLを生成
 * @param provider - 認証プロバイダー（google, githubなど）
 * @param isMobile - モバイル版かどうか
 * @param request - Next.js Request オブジェクト（オプション）
 * @returns 認証コールバックURL
 */
export function getAuthCallbackUrl(
  _provider: string = 'google',
  isMobile: boolean = false,
  request?: Request
): string {
  const path = isMobile ? '/m/callback' : '/auth/callback';
  return getFullUrl(path, request);
}

/**
 * Stripe成功/キャンセルURLを生成
 * @param type - 'success' | 'cancel'
 * @param returnPath - リダイレクト先のパス
 * @param request - Next.js Request オブジェクト（オプション）
 * @returns StripeリダイレクトURL
 */
export function getStripeReturnUrl(
  type: 'success' | 'cancel',
  returnPath: string,
  request?: Request
): string {
  const params = type === 'success' ? '?success=true' : '?canceled=true';
  return getFullUrl(`${returnPath}${params}`, request);
}

/**
 * 環境判定ヘルパー
 */
export const isLocalDevelopment = () => {
  return process.env.NODE_ENV === 'development' && 
         !process.env.VERCEL_ENV;
};

export const isVercelPreview = () => {
  return process.env.VERCEL_ENV === 'preview';
};

export const isProduction = () => {
  return process.env.VERCEL_ENV === 'production' || 
         (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV);
};
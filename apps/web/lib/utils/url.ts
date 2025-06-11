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
  // 1. NEXT_PUBLIC_URL を最優先（Vercel環境設定で使用）
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }
  
  // 2. 明示的に設定された環境変数（ローカル開発・テスト用）
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // 3. 明示的なデプロイURL設定（Vercel環境でのオーバーライド用）
  if (process.env.NEXT_PUBLIC_DEPLOY_URL) {
    return process.env.NEXT_PUBLIC_DEPLOY_URL;
  }
  
  // 4. Vercel環境変数をチェック（自動設定）
  if (process.env.VERCEL_URL) {
    // Vercelプレビューデプロイメント
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 5. 本番環境のドメイン
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    return 'https://www.mued.jp';
  }
  
  // 6. リクエストヘッダーから動的に生成
  if (request) {
    const host = request.headers.get('host');
    if (host) {
      // localhost判定
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      const protocol = isLocalhost ? 'http' : 'https';
      return `${protocol}://${host}`;
    }
  }
  
  // 7. クライアントサイドの場合は現在のオリジンを使用
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // 8. サーバーサイドのデフォルト
  return 'http://localhost:3000';
}

/**
 * 認証用のサイトURLを取得（Supabase Auth用）
 * 環境変数の優先順位を考慮した専用関数
 * @returns 認証用のベースURL
 */
export function getSiteUrl(): string {
  // デバッグログ出力
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
    console.log('[getSiteUrl] 環境変数の確認:', {
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_DEPLOY_URL: process.env.NEXT_PUBLIC_DEPLOY_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV
    });
  }
  
  // ローカル開発環境を最優先
  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL_ENV) {
    console.log('[getSiteUrl] ローカル開発環境を検出 - http://localhost:3000 を使用');
    return 'http://localhost:3000';
  }
  
  // 1. NEXT_PUBLIC_URL を優先（Vercel環境設定で使用）
  if (process.env.NEXT_PUBLIC_URL) {
    console.log('[getSiteUrl] NEXT_PUBLIC_URL を使用:', process.env.NEXT_PUBLIC_URL);
    return process.env.NEXT_PUBLIC_URL;
  }
  
  // 2. 環境変数から明示的に設定された値
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    console.log('[getSiteUrl] NEXT_PUBLIC_SITE_URL を使用:', process.env.NEXT_PUBLIC_SITE_URL);
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // 3. Vercelデプロイ環境用の設定
  if (process.env.NEXT_PUBLIC_DEPLOY_URL) {
    console.log('[getSiteUrl] NEXT_PUBLIC_DEPLOY_URL を使用:', process.env.NEXT_PUBLIC_DEPLOY_URL);
    return process.env.NEXT_PUBLIC_DEPLOY_URL;
  }
  
  // 4. Vercel自動環境変数（プレビュー環境）
  if (process.env.VERCEL_URL) {
    const url = `https://${process.env.VERCEL_URL}`;
    console.log('[getSiteUrl] VERCEL_URL を使用:', url);
    return url;
  }
  
  // 5. 本番環境
  if (process.env.NODE_ENV === 'production') {
    console.log('[getSiteUrl] 本番環境のデフォルトを使用');
    return 'https://www.mued.jp';
  }
  
  // 6. ローカル開発環境のデフォルト
  console.log('[getSiteUrl] ローカル開発環境のデフォルトを使用');
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
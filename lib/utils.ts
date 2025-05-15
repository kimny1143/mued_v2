import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 環境に応じて正しいベースURLを取得する統一関数
 * クライアント・サーバー両方で動作する
 */
export function getBaseUrl(): string {
  // クライアントサイドの場合、現在のURLを優先
  if (typeof window !== 'undefined') {
    // Vercelドメインやカスタムドメインの場合は現在のオリジンを使用
    if (window.location.host.includes('vercel.app') || 
        window.location.host.includes('mued.jp')) {
      return window.location.origin;
    }
  }
  
  // 明示的に設定されたデプロイURLを最優先
  const deployUrl = process.env.NEXT_PUBLIC_DEPLOY_URL;
  if (deployUrl) {
    return deployUrl.startsWith('http') ? deployUrl : `https://${deployUrl}`;
  }
  
  // Vercel環境変数をチェック
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // バックアップとしてのVercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 本番環境向け固定URL
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://mued-lms-fgm.vercel.app';
  }
  
  // サイトURL設定
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // ローカル開発環境のデフォルト
  return 'http://localhost:3000';
} 
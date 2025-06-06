import { NextResponse } from 'next/server';

// CORS設定
const ALLOWED_ORIGINS = [
  // 開発環境
  'http://localhost:3000', // PC版開発環境
  'http://localhost:3001', // モバイル版開発環境
  
  // PC版（親プロジェクト）
  'https://www.mued.jp', // PC版本番環境
  'https://dev.mued.jp', // PC版プレビュー環境
  'https://mued-lms-fgm.vercel.app', // PC版Vercelドメイン（本番）
  'https://mued-lms-fgm-git-develop-glasswerks.vercel.app', // PC版Vercelドメイン（開発）
  
  // モバイル版（PWA）
  'https://pwa.mued.jp', // モバイル版本番環境（将来）
  'https://devpwa.mued.jp', // モバイル版プレビュー環境（将来）
  'https://mued-pwa.vercel.app', // モバイル版Vercelドメイン（本番）
  'https://mued-pwa-git-develop-glasswerks.vercel.app', // モバイル版Vercelドメイン（開発）
  'https://mued-pwa-git-main-glasswerks.vercel.app', // モバイル版Vercelドメイン（メイン）
];

export function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  // originが許可リストに含まれているか、開発環境の場合はCORSを許可
  if (origin && (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === 'development')) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

// CORSヘッダーを含むレスポンスを作成
export function createCorsResponse(data: any, origin: string | null, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(origin),
  });
}

// OPTIONSリクエスト（プリフライト）への応答
export function handleOptions(origin: string | null) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(origin),
  });
}
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { userAgent } from 'next/server'

// CORS許可するオリジン
const allowedOrigins = [
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

export function middleware(request: NextRequest) {
  const { device } = userAgent(request);
  const isMobile = device.type === 'mobile' || device.type === 'tablet';
  const pathname = request.nextUrl.pathname;

  // デバッグログ
  console.log('[Middleware] Request:', {
    pathname: request.nextUrl.pathname,
    method: request.method,
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    isMobile,
    deviceType: device.type,
  });

  // モバイルデバイスの判定とルーティング
  // APIルート、静的ファイル、/m/パスは除外
  if (!pathname.startsWith('/api/') && 
      !pathname.startsWith('/_next/') && 
      !pathname.startsWith('/favicon.ico') &&
      !pathname.startsWith('/m/') &&
      !pathname.includes('/(shared)/')) {
    
    // モバイルデバイスからのアクセスで、かつ(mobile)パスでない場合
    if (isMobile && pathname.startsWith('/dashboard')) {
      const mobileUrl = new URL(request.url);
      // /dashboard を /m/dashboard にリダイレクト
      mobileUrl.pathname = pathname.replace('/dashboard', '/m/dashboard');
      return NextResponse.redirect(mobileUrl);
    }
    
    // デスクトップからのアクセスで、/m/パスにアクセスしようとした場合
    if (!isMobile && pathname.startsWith('/m/')) {
      const desktopUrl = new URL(request.url);
      desktopUrl.pathname = pathname.replace('/m/', '/');
      return NextResponse.redirect(desktopUrl);
    }
  }

  // APIルートへのリクエストのみ処理
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    
    // プリフライトリクエスト（OPTIONS）の処理
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Max-Age', '86400');
      }
      
      return response;
    }
    
    // 通常のリクエストの処理
    const response = NextResponse.next();
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return response;
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 
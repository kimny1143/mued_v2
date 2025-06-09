import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { userAgent } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// CORS許可するオリジン
const allowedOrigins = [
  // 開発環境
  'http://localhost:3000',
  
  // 本番環境
  'https://www.mued.jp',
  'https://dev.mued.jp',
  'https://mued-lms-fgm.vercel.app',
  'https://mued-lms-fgm-git-develop-glasswerks.vercel.app',
];

// スキップすべきパス（パフォーマンス最適化）
const skipPaths = [
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/logo.png',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/sw.js.map',
  '/workbox-',
  '/_next/',
  '/api/',
  '/.well-known/',
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // パフォーマンス最適化: 静的ファイルやAPIは早期リターン
  if (skipPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const { device } = userAgent(request);
  const isMobile = device.type === 'mobile' || device.type === 'tablet';

  // 開発環境での重要なルートのみログ出力
  if (process.env.NODE_ENV === 'development' && 
      (pathname.startsWith('/m/') || pathname.startsWith('/dashboard') || pathname === '/')) {
    console.log('[Middleware] Request:', {
      pathname,
      method: request.method,
      isMobile,
    });
  }

  // レスポンスを作成
  let response = NextResponse.next();

  // Supabase セッションの更新（/m/パスでのみ実行、静的ファイル除外）
  if (pathname.startsWith('/m/') && !pathname.startsWith('/m/login') && !pathname.startsWith('/m/(auth)')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // セッションの更新
    const { data: { user } } = await supabase.auth.getUser()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Auth check for:', pathname, 'User:', user?.email || 'None');
    }
  }

  // モバイルデバイスの判定とルーティング
  if (!pathname.startsWith('/api/') && 
      !pathname.startsWith('/_next/') && 
      !pathname.startsWith('/m/') &&
      !pathname.includes('/(shared)/')) {
    
    // モバイルデバイスからのアクセスで、かつ(mobile)パスでない場合
    if (isMobile && pathname.startsWith('/dashboard')) {
      const mobileUrl = new URL(request.url);
      // /dashboard を /m/dashboard にリダイレクト
      mobileUrl.pathname = pathname.replace('/dashboard', '/m/dashboard');
      return NextResponse.redirect(mobileUrl);
    }
  }

  // APIルートへのリクエストのみCORS処理
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    
    // プリフライトリクエスト（OPTIONS）の処理
    if (request.method === 'OPTIONS') {
      response = new NextResponse(null, { status: 200 });
      
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
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  return response;
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
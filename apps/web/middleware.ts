import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CORS許可するオリジン
const allowedOrigins = [
  'http://localhost:3001',
  'https://mued-pwa.vercel.app',
  'https://mued-pwa-git-develop-glasswerks.vercel.app',
  'https://mued-pwa-git-main-glasswerks.vercel.app',
];

export function middleware(request: NextRequest) {
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
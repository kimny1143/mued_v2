import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 動的レンダリングを強制（cookiesを使用するため）
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.error('Failed to set cookies', error);
          }
        },
      },
    }
  );

  // Supabaseセッションをクリア
  await supabase.auth.signOut();

  // 明示的にSupabase関連のクッキーをクリア（PWA対応）
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    // Supabase関連のクッキーを削除
    if (cookie.name.includes('supabase') || 
        cookie.name.includes('sb-') || 
        cookie.name.includes('auth')) {
      cookieStore.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }
  }

  // ログインページへリダイレクト
  const referer = request.headers.get('referer') || '';
  const isMobilePath = referer.includes('/m/');
  
  // リダイレクトURL構築（モバイルパスからは常に?logout=trueを追加）
  const redirectUrl = isMobilePath ? '/m/login?logout=true' : '/login';
  
  // Cache-Controlヘッダーを追加してキャッシュを防ぐ
  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}
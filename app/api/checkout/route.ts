import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // リクエスト情報をログに記録
    console.log('チェックアウトAPIがリクエストを受信:', {
      headers: Object.fromEntries(request.headers),
      url: request.url,
      method: request.method,
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      node_env: process.env.NODE_ENV,
    });

    // サーバーサイドのSupabaseクライアントを初期化
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'X-Client-Info': `checkout-api/${process.env.NODE_ENV || 'development'}`,
          },
        },
      }
    );

    // クッキーからセッションを取得する試み
    const supabaseCookie = cookieStore.get('sb-access-token')?.value || 
                          cookieStore.get('sb-refresh-token')?.value ||
                          cookieStore.get('supabase-auth-token')?.value;

    console.log('Supabase認証クッキー:', supabaseCookie ? '見つかりました' : '見つかりません');

    // セッションの取得と認証チェック
    const { data: { session } } = await supabase.auth.getSession();
    
    // リクエストボディを解析
    const body = await request.json();
    const { priceId, successUrl, cancelUrl, mode, userId } = body;

    console.log('リクエストボディ:', { priceId, successUrl, cancelUrl, mode, userId });

    // ユーザーIDのチェック（オプショナル）
    let authenticatedUserId = null;
    if (session && session.user) {
      authenticatedUserId = session.user.id;
      console.log('認証済みユーザー:', session.user.email);
    } else {
      console.warn('未認証アクセス - 続行します');
    }

    // 必須パラメータを確認
    if (!priceId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています', missing: { priceId: !priceId, successUrl: !successUrl, cancelUrl: !cancelUrl } }, 
        { status: 400 }
      );
    }

    // Stripe APIキーがない場合
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEYが環境変数に設定されていません');
      return NextResponse.json(
        { error: 'Stripe APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // テスト用のログ
    console.log('Stripe checkout session creating with:', { priceId, mode, userId });

    try {
      // Stripeセッションを作成
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: mode || 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId || authenticatedUserId || 'anonymous'
        },
        // サーバーサイドおよびクライアントサイドの両方からセッションが取得できるよう設定
        expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // 30分後に有効期限切れ
      });

      // セッションURLのログ（テスト環境のみ）
      console.log('Stripe session created:', { sessionId: session.id, url: session.url });

      return NextResponse.json({ url: session.url });
    } catch (stripeError) {
      console.error('Stripeセッション作成エラー:', stripeError);
      
      // Stripeエラーの詳細情報を抽出
      const errorDetails = stripeError instanceof Error 
        ? {
            message: stripeError.message,
            name: stripeError.name,
            stack: process.env.NODE_ENV === 'development' ? stripeError.stack : undefined,
            // @ts-expect-error: Stripeエラーの追加プロパティにアクセス
            type: stripeError.type,
            // @ts-expect-error: Stripeエラーの追加プロパティにアクセス
            code: stripeError.code,
            // @ts-expect-error: Stripeエラーの追加プロパティにアクセス
            param: stripeError.param,
          }
        : stripeError;
      
      return NextResponse.json(
        { error: 'Stripeセッションの作成に失敗しました', details: errorDetails }, 
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('チェックアウトセッション作成エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '決済処理中にエラーが発生しました';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
} 
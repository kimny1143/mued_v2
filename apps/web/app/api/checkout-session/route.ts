import { NextRequest, NextResponse } from 'next/server';

import { stripe } from '@/lib/stripe';

// ルート関数の実行を強制的に動的にする
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('🚀 ===== checkout-session API開始 (クエリパラメータ版) =====');
  console.log('🔵 URL:', request.url);
  console.log('🔵 Method:', request.method);
  
  try {
    // URLからセッションIDを取得
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    console.log('🔵 クエリパラメータ:', Object.fromEntries(searchParams.entries()));
    console.log('🔵 SessionId:', sessionId);

    if (!sessionId) {
      console.log('❌ セッションIDが未提供');
      return NextResponse.json(
        { error: 'セッションIDが必要です。?sessionId=xxx の形式で指定してください' },
        { status: 400 }
      );
    }

    console.log('🔍 Stripeセッション取得開始:', sessionId);
    console.log('🔑 Stripe設定確認:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'なし',
      stripeMockMode: process.env.STRIPE_MOCK
    });

    // Stripe決済セッションの詳細を取得
    console.log('📡 stripe.checkout.sessions.retrieve 呼び出し中...');
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
    console.log('✅ Stripe API呼び出し成功');

    console.log('📊 Stripeセッション取得成功:', {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata
    });

    if (!session) {
      console.log('❌ セッションが見つかりません');
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // レスポンス用のデータを構築（通貨に応じた金額変換）
    const currencyLower = (session.currency || 'jpy').toLowerCase();
    
    // JPYは最小単位が円（1円）なので変換不要、USD/EURなどは最小単位がセント（1/100）
    const formatAmount = (amount: number | null, currency: string): number => {
      if (!amount) return 0;
      
      // 0桁通貨（最小単位が基本単位と同じ）
      const zeroDecimalCurrencies = ['jpy', 'krw', 'clp', 'pyg', 'rwf', 'vnd', 'xaf', 'xof', 'xpf'];
      
      if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
        return Math.round(amount); // JPYなど: そのまま
      } else {
        return Math.round(amount / 100); // USD/EURなど: セントから基本単位に変換
      }
    };
    
    const responseData = {
      sessionId: session.id,
      status: session.payment_status,
      amount: formatAmount(session.amount_total, currencyLower),
      currency: currencyLower,
      customerEmail: session.customer_details?.email,
      metadata: session.metadata || {},
    };

    console.log('📤 APIレスポンス:', responseData);
    
    const response = NextResponse.json(responseData);
    console.log('✅ NextResponse.json作成完了');
    console.log('🚀 ===== checkout-session API終了（成功） =====');
    
    return response;
  } catch (error) {
    console.error('🚨 ===== checkout-session API エラー =====');
    console.error('❌ Stripe セッション取得エラー:', error);
    
    // Stripeエラーの詳細情報をログ出力
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    const errorResponse = NextResponse.json(
      { 
        error: 'セッション詳細の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
    
    console.log('🚀 ===== checkout-session API終了（エラー） =====');
    return errorResponse;
  }
} 
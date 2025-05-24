import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.log('🔵 checkout-session API呼び出し:', { sessionId: params.sessionId });
  
  try {
    const { sessionId } = params;

    if (!sessionId) {
      console.log('❌ セッションIDが未提供');
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    console.log('🔍 Stripeセッション取得開始:', sessionId);

    // Stripe決済セッションの詳細を取得
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

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

    // レスポンス用のデータを構築（金額をセントから円に変換）
    const responseData = {
      sessionId: session.id,
      status: session.payment_status,
      amount: session.amount_total ? Math.round(session.amount_total / 100) : 0, // セントから円に変換
      currency: session.currency || 'jpy',
      customerEmail: session.customer_details?.email,
      metadata: session.metadata || {},
    };

    console.log('📤 APIレスポンス:', responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ Stripe セッション取得エラー:', error);
    
    // Stripeエラーの詳細情報をログ出力
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: 'セッション詳細の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
} 
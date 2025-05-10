import { stripe } from '../../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// このAPIルートは常に動的に生成されるべき
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    // Stripeからセッション情報を取得
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // メタデータから予約IDを取得
    const reservationId = session.metadata?.reservationId;

    if (!reservationId) {
      return NextResponse.json(
        { error: '予約情報が見つかりません' },
        { status: 404 }
      );
    }

    // 予約情報を取得
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*, lesson_slots(*)')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      console.error('予約データ取得エラー:', reservationError);
      return NextResponse.json(
        { error: '予約データの取得に失敗しました' },
        { status: 500 }
      );
    }

    // 支払い情報を取得
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId)
      .maybeSingle();

    // レスポンスの作成
    return NextResponse.json({
      success: true,
      status: session.payment_status,
      reservation: {
        id: reservation.id,
        status: reservation.status,
        paymentStatus: reservation.payment_status,
        createdAt: reservation.created_at,
        updatedAt: reservation.updated_at,
        lessonSlot: reservation.lesson_slots,
      },
      payment: payment || null,
      session: {
        id: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '予約状態の確認中に未知のエラーが発生しました';
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
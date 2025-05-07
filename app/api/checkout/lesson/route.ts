import { stripe } from '../../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 認証処理（実際の実装ではNextAuthなどを使用）
    // このMVP段階では簡略化のためにユーザーIDを固定
    const userId = 'user-demo-123';
    
    const { lessonSlotId, successUrl, cancelUrl } = await req.json();
    
    if (!lessonSlotId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }
    
    // レッスン枠の情報を取得
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: lessonSlot, error } = await supabase
      .from('lesson_slots')
      .select('*, mentors(name)')
      .eq('id', lessonSlotId)
      .single();
    
    if (error || !lessonSlot) {
      console.error('レッスン枠取得エラー:', error);
      return NextResponse.json(
        { error: 'レッスン枠が見つかりません' },
        { status: 404 }
      );
    }
    
    // レッスン枠が既に予約済みでないか確認
    if (!lessonSlot.available) {
      return NextResponse.json(
        { error: 'このレッスン枠は既に予約されています' },
        { status: 400 }
      );
    }
    
    // 予約情報を仮登録（ステータスはpending）
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: userId,
        lesson_slot_id: lessonSlotId,
        status: 'pending',
      })
      .select()
      .single();
    
    if (reservationError) {
      console.error('予約仮登録エラー:', reservationError);
      return NextResponse.json(
        { error: '予約の仮登録に失敗しました' },
        { status: 500 }
      );
    }
    
    // Stripeチェックアウトセッションの作成
    const startTime = new Date(lessonSlot.start_time);
    const endTime = new Date(lessonSlot.end_time);
    
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `レッスン: ${lessonSlot.mentors?.name || 'メンター'}`,
              description: `${startTime.toLocaleString('ja-JP')} 〜 ${endTime.toLocaleString('ja-JP')}`,
            },
            unit_amount: lessonSlot.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      client_reference_id: reservation.id, // 予約IDを参照IDとして設定
      metadata: {
        reservationId: reservation.id,
        lessonSlotId: lessonSlotId,
        userId: userId,
      },
    });
    
    // セッションIDを返す
    return NextResponse.json({ 
      sessionId: stripeSession.id,
      url: stripeSession.url
    });
  } catch (error: unknown) {
    console.error('Checkout session creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'チェックアウトセッションの作成に失敗しました';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import Stripe from 'https://esm.sh/stripe@12.10.0?dts';

// Stripeの初期化
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
});

// Webhookエンドポイントシークレット
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  // リクエストボディとSignatureヘッダーを取得
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('Webhook error: 署名が見つかりません');
    return new Response('Signature missing', { status: 400 });
  }

  let event;
  try {
    // イベント検証
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Supabaseクライアントの初期化
  const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`Received Stripe event: ${event.type}`);

  // イベントタイプに基づいて処理
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // メタデータから予約情報を取得
        const reservationId = session.metadata.reservationId;
        const lessonSlotId = session.metadata.lessonSlotId;
        const userId = session.metadata.userId;
        
        if (!reservationId || !lessonSlotId || !userId) {
          console.error('メタデータ不足:', session.metadata);
          return new Response('Missing metadata', { status: 400 });
        }
        
        console.log(`Processing completed checkout for reservation ${reservationId}`);
        
        // 予約ステータスを確定に更新
        const { error: reservationError } = await supabase
          .from('reservations')
          .update({ 
            status: 'confirmed',
            payment_status: 'paid',
            payment_intent_id: session.payment_intent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reservationId);
        
        if (reservationError) {
          console.error('予約更新エラー:', reservationError);
          return new Response('Reservation update failed', { status: 500 });
        }
        
        // レッスン枠の利用状況更新
        const { error: lessonSlotError } = await supabase
          .from('lesson_slots')
          .update({ available: false })
          .eq('id', lessonSlotId);
        
        if (lessonSlotError) {
          console.error('レッスン枠更新エラー:', lessonSlotError);
          return new Response('Lesson slot update failed', { status: 500 });
        }
        
        // 支払い記録の作成
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            reservation_id: reservationId,
            amount: session.amount_total,
            currency: session.currency,
            payment_intent_id: session.payment_intent,
            payment_status: 'succeeded',
            payment_method: session.payment_method_types[0],
          });
        
        if (paymentError) {
          console.error('支払い記録作成エラー:', paymentError);
          return new Response('Payment record creation failed', { status: 500 });
        }
        
        console.log(`Successfully processed payment for reservation ${reservationId}`);
        break;
      }
        
      case 'checkout.session.expired': {
        // 期限切れの場合、予約を取り消す
        const expiredSession = event.data.object;
        const expiredReservationId = expiredSession.metadata.reservationId;
        
        if (expiredReservationId) {
          console.log(`Processing expired checkout for reservation ${expiredReservationId}`);
          
          const { error } = await supabase
            .from('reservations')
            .update({ 
              status: 'cancelled',
              payment_status: 'expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', expiredReservationId);
          
          if (error) {
            console.error('期限切れ予約キャンセルエラー:', error);
            return new Response('Reservation cancellation failed', { status: 500 });
          }
          
          console.log(`Successfully cancelled expired reservation ${expiredReservationId}`);
        }
        break;
      }
        
      // その他のイベントタイプについても必要に応じて処理を追加
    }
    
    // 成功レスポンス
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(`Webhook processing error: ${err.message}`);
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
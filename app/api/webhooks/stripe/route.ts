import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Stripeクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any // 型エラー回避
});

// 予約ステータス列挙型
enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// 支払いステータス列挙型
enum PaymentStatus {
  UNPAID = 'UNPAID',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature');

  if (!signature) {
    console.error('署名がありません');
    return new NextResponse('署名が必要です', { status: 400 });
  }

  // Webhookシークレット
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Webhook秘密鍵が設定されていません');
    return new NextResponse('設定エラー', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // イベントを検証
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    console.log(`Webhookイベント受信: ${event.id}, タイプ: ${event.type}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
    console.error(`Webhook検証エラー: ${errorMessage}`);
    return new NextResponse(`Webhook検証エラー: ${errorMessage}`, { status: 400 });
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`チェックアウト完了イベント: ${session.id}, モード: ${session.mode}`);
        console.log('セッションメタデータ:', session.metadata);
        
        // セッションモードがサブスクリプションの場合
        if (session.mode === 'subscription' && session.subscription) {
          console.log(`サブスクリプションID: ${session.subscription}, ユーザーメタデータ:`, session.metadata);
          await handleCompletedSubscriptionCheckout(session);
        }
        
        // 単発決済（レッスン予約）の場合
        else if (session.mode === 'payment') {
          console.log('単発レッスン決済を検出:', session.id);
          
          // メタデータから予約IDを取得（直接指定されたもの）
          let reservationId = session.metadata?.reservationId;
          let slotId = session.metadata?.slotId;
          
          // メタデータに両方の情報があれば処理を進める
          if (reservationId && slotId) {
            console.log(`メタデータから取得: 予約ID=${reservationId}, スロットID=${slotId}`);
            await handleCompletedLessonPayment(session);
          } 
          // metadata に reservationId がない場合は、client_reference_id から探す
          else if (session.client_reference_id) {
            console.log(`client_reference_id から予約を探索: ${session.client_reference_id}`);
            try {
              // クライアントリファレンスIDから予約を検索
              const reservation = await prisma.reservation.findFirst({
                where: { 
                  OR: [
                    { id: session.client_reference_id },
                    { paymentId: session.id }
                  ]
                },
                include: { slot: true }
              });
              
              if (reservation) {
                console.log(`予約情報を発見: ID=${reservation.id}, スロットID=${reservation.slotId}`);
                
                // メタデータを補完して処理
                const enrichedSession = {
                  ...session,
                  metadata: {
                    ...session.metadata,
                    reservationId: reservation.id,
                    slotId: reservation.slotId
                  }
                } as Stripe.Checkout.Session;
                
                await handleCompletedLessonPayment(enrichedSession);
              } else {
                console.error('関連する予約が見つかりません:', session.id);
                throw new Error('関連する予約が見つかりません');
              }
            } catch (error) {
              console.error('予約検索エラー:', error);
              throw error;
            }
          } else {
            console.error('予約IDとスロットIDの両方が見つかりません:', session);
            throw new Error('決済セッションに必要なメタデータがありません');
          }
        } else {
          console.log(`未対応のセッションモード: ${session.mode}, セッションID: ${session.id}`);
        }
        break;
      }
      
      case 'customer.subscription.created': 
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`サブスクリプション更新イベント: ${subscription.id}, ステータス: ${subscription.status}`);
        await handleSubscriptionChange(subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`サブスクリプション削除イベント: ${subscription.id}`);
        await handleSubscriptionCancellation(subscription);
        break;
      }
    }
    
    console.log(`イベント処理完了: ${event.type}`);
    return NextResponse.json({ received: true, success: true, event: event.type });
  } catch (error) {
    console.error('Webhook処理エラー詳細:', error);
    return new NextResponse('Webhook処理エラー', { status: 500 });
  }
}

// ユーザーIDを取得する関数
async function findUserByCustomerId(customerId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error || !data) {
      console.error('ユーザー検索エラー:', error || 'ユーザーが見つかりません');
      return null;
    }

    return data.user_id;
  } catch (error) {
    console.error('顧客ID検索エラー:', error);
    return null;
  }
}

// チェックアウト完了時の処理
async function handleCompletedSubscriptionCheckout(session: Stripe.Checkout.Session) {
  if (!session.customer || !session.subscription) {
    console.error('必須データがありません', { customer: session.customer, subscription: session.subscription });
    return;
  }

  console.log('チェックアウト完了処理開始:', {
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: session.subscription
  });

  // メタデータからユーザーIDを取得
  let userId = session.metadata?.userId;

  // メタデータにない場合は顧客IDから検索
  if (!userId) {
    const foundUserId = await findUserByCustomerId(session.customer as string);
    if (foundUserId) {
      userId = foundUserId;
    }
  }

  if (!userId) {
    console.error('ユーザーIDが見つかりません', { sessionId: session.id, customerId: session.customer });
    
    // ユーザーが見つからない場合は顧客レコードを作成
    if (typeof session.customer === 'string') {
      const customer = await stripe.customers.retrieve(session.customer);
      
      if (customer && !customer.deleted) {
        // 顧客のメールアドレスからユーザーを検索
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', customer.email)
          .maybeSingle();
          
        if (userData) {
          userId = userData.id;
          
          // 顧客マッピングを作成
          const { error: mappingError } = await supabaseAdmin
            .from('stripe_customers')
            .insert({
              user_id: userId,
              customer_id: session.customer
            });
            
          if (mappingError) {
            console.error('顧客マッピング作成エラー:', mappingError);
          } else {
            console.log('顧客マッピングを作成しました', { userId, customerId: session.customer });
          }
        }
      }
    }
    
    if (!userId) {
      throw new Error('サブスクリプションに関連付けるユーザーが見つかりません');
    }
  }

  console.log(`サブスクリプション処理: ユーザーID=${userId}`);

  // サブスクリプションデータを取得
  const subscriptionData = await stripe.subscriptions.retrieve(session.subscription as string, {
    expand: ['items.data.price']
  });

  console.log('サブスクリプションデータ:', {
    id: subscriptionData.id,
    status: subscriptionData.status,
    items: subscriptionData.items.data.map(item => ({
      priceId: item.price.id,
      productId: item.price.product,
      amount: item.price.unit_amount,
      interval: item.price.recurring?.interval
    }))
  });

  // データベース挿入処理の詳細デバッグ
  try {
    // 現在のサブスクリプション情報をデータベースに保存/更新
    const subscriptionRecord = {
      userId: userId,
      customerId: session.customer as string,
      subscriptionId: subscriptionData.id,
      priceId: subscriptionData.items.data[0]?.price.id,
      status: subscriptionData.status,
      currentPeriodStart: subscriptionData.current_period_start || Math.floor(Date.now() / 1000),
      currentPeriodEnd: subscriptionData.current_period_end || (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('保存するサブスクリプションデータ:', subscriptionRecord);

    // supabaseAdminを使用して権限問題を解決
    const { data, error } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .upsert(subscriptionRecord, {
        onConflict: 'userId',
        ignoreDuplicates: false
      })
      .select('*')
      .single();

    if (error) {
      console.error('サブスクリプションデータ保存エラー:', error);
      throw error;
    }

    console.log('サブスクリプションデータを保存しました:', data);
    
    return data;
  } catch (error) {
    console.error('サブスクリプションデータ更新中のエラー:', error);
    throw error;
  }
}

// サブスクリプション変更時の処理
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log(`サブスクリプション変更処理: ${subscription.id}`);
  
  const userId = await findUserByCustomerId(subscription.customer as string);
  
  if (!userId) {
    console.error('サブスクリプションに関連するユーザーが見つかりませんでした', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer
    });
    return;
  }

  console.log(`サブスクリプション変更: ユーザーID=${userId}, ステータス=${subscription.status}`);

  // サブスクリプション情報を更新
  const subscriptionRecord = {
    userId: userId,
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    priceId: subscription.items.data[0]?.price.id,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start || Math.floor(Date.now() / 1000),
    currentPeriodEnd: subscription.current_period_end || (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date().toISOString(),
  };
  
  console.log('更新するサブスクリプションデータ:', subscriptionRecord);

  // supabaseAdminを使用して権限問題を解決
  const { data, error } = await supabaseAdmin
    .from('stripe_user_subscriptions')
    .upsert(subscriptionRecord, {
      onConflict: 'userId',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error('サブスクリプションデータ更新エラー:', error);
    throw error;
  }

  console.log('サブスクリプションデータを更新しました:', data);
}

// サブスクリプションキャンセル時の処理
async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  console.log(`サブスクリプションキャンセル処理: ${subscription.id}`);

  // ユーザーIDを取得
  const userId = await findUserByCustomerId(subscription.customer as string);
  
  if (!userId) {
    console.error('サブスクリプションに関連するユーザーが見つかりませんでした', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer
    });
    return;
  }

  // サブスクリプションステータスを更新
  // supabaseAdminを使用して権限問題を解決
  const { data, error } = await supabaseAdmin
    .from('stripe_user_subscriptions')
    .update({
      status: 'canceled',
      updatedAt: new Date().toISOString(),
    })
    .eq('userId', userId)
    .select();

  if (error) {
    console.error('サブスクリプションキャンセルデータ更新エラー:', error);
    throw error;
  }

  console.log('サブスクリプションキャンセル完了:', data);
}

// レッスン決済完了時の処理
async function handleCompletedLessonPayment(session: Stripe.Checkout.Session) {
  try {
    // メタデータから必要な情報を取得
    const reservationId = session.metadata?.reservationId;
    const slotId = session.metadata?.slotId;
    
    if (!reservationId) {
      throw new Error('予約IDがメタデータにありません');
    }
    
    if (!slotId) {
      // スロットIDがない場合は予約から取得を試みる
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        select: { slotId: true }
      });
      
      if (reservation) {
        console.log(`予約から取得したスロットID: ${reservation.slotId}`);
      } else {
        throw new Error(`予約ID ${reservationId} に関連する情報が見つかりません`);
      }
    }
    
    console.log(`レッスン支払い処理: 予約ID=${reservationId}, スロットID=${slotId}`);
    
    // Stripeセッション情報を確認
    console.log("Stripeセッション詳細:", {
      id: session.id,
      paymentStatus: session.payment_status,
      amount: session.amount_total,
      currency: session.currency
    });
    
    // 予約情報を確認
    const existingReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { slot: true }
    });
    
    if (!existingReservation) {
      console.error(`予約ID ${reservationId} が見つかりません`);
      throw new Error('予約が見つかりません');
    }
    
    console.log("現在の予約状態:", {
      id: existingReservation.id,
      status: existingReservation.status,
      paymentStatus: existingReservation.paymentStatus,
      slotId: existingReservation.slotId,
      isSlotAvailable: existingReservation.slot.isAvailable
    });
    
    // 現在のスロット状態を確認
    const currentSlot = await prisma.lessonSlot.findUnique({
      where: { id: slotId || existingReservation.slotId }
    });
    
    console.log("現在のスロット状態:", {
      id: currentSlot?.id,
      isAvailable: currentSlot?.isAvailable,
      teacherId: currentSlot?.teacherId
    });
    
    // すでに確定済みならスキップ
    if (existingReservation.status === ReservationStatus.CONFIRMED && 
        existingReservation.paymentStatus === PaymentStatus.PAID) {
      console.log("すでに処理済みの予約です。スキップします。");
      return { success: true, status: 'already_processed' };
    }
    
    // 予約を更新: 状態を確定済み(CONFIRMED)に、支払い状態を支払い済み(PAID)に
    try {
      const updatedReservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          paymentId: session.id, // 支払いIDを更新
        },
      });
      
      console.log('予約ステータス更新完了:', {
        id: updatedReservation.id,
        status: updatedReservation.status,
        paymentStatus: updatedReservation.paymentStatus
      });
    } catch (updateError) {
      console.error("予約更新エラー:", updateError);
      throw updateError;
    }
    
    // レッスンスロットを更新: 利用不可に設定
    try {
      const updatedSlot = await prisma.lessonSlot.update({
        where: { id: slotId || existingReservation.slotId },
        data: {
          isAvailable: false, // スロットを予約済み状態に
        },
      });
      
      console.log('レッスンスロット更新完了:', {
        id: updatedSlot.id,
        isAvailable: updatedSlot.isAvailable,
        teacherId: updatedSlot.teacherId
      });
    } catch (slotError) {
      console.error("レッスンスロット更新エラー:", slotError);
      
      // リトライ: トランザクション分離レベルを変更して再試行
      try {
        const targetSlotId = slotId || existingReservation.slotId;
        console.log(`スロット更新リトライ: ID=${targetSlotId}`);
        
        // トランザクションでリトライ
        await prisma.$transaction(async (tx) => {
          // ロック取得のためのダミークエリ
          await tx.$executeRawUnsafe(`SELECT id FROM "lesson_slots" WHERE id = '${targetSlotId}' FOR UPDATE`);
          
          // 更新処理
          await tx.lessonSlot.update({
            where: { id: targetSlotId },
            data: { isAvailable: false },
          });
        });
        
        console.log("トランザクションによるスロット更新成功");
      } catch (txError) {
        console.error("トランザクションによる更新も失敗:", txError);
        
        // 最終手段: SQLで直接更新
        try {
          const targetSlotId = slotId || existingReservation.slotId;
          await prisma.$executeRaw`
            UPDATE "lesson_slots" 
            SET "isAvailable" = false
            WHERE id = ${targetSlotId}
          `;
          console.log("SQLで直接スロット状態を更新しました");
        } catch (rawError) {
          console.error("SQL直接更新エラー:", rawError);
          // このエラーはスローしない - 予約自体は確定できているため
          console.warn("スロット更新に失敗しましたが、予約自体は確定しています");
        }
      }
    }
    
    // TODO: 予約確定メールの送信など追加処理
    
    return { success: true };
  } catch (error) {
    console.error('レッスン支払い処理エラー:', error);
    throw error;
  }
} 
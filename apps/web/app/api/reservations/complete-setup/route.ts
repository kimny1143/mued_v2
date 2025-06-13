import { randomUUID } from 'crypto';

import { PaymentStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';


import { convertReservationToResponse, camelToSnakeKeys } from '@/lib/caseConverter';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

// フロントエンドから送信される形式（キャメルケース）
interface ReservationMetadata {
  slotId: string;
  bookedStartTime: string;
  bookedEndTime: string;
  totalAmount: number;
  duration?: number;
  notes?: string;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(request: NextRequest) {
  try {
    // セッション情報を取得
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    
    console.log('=== Setup完了処理開始 ===');
    console.log('セッションID:', sessionId);

    // Stripe Checkout Sessionを取得してメタデータから予約IDを取得
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent', 'setup_intent.payment_method']
    });

    console.log('=== Stripe セッション情報 ===');
    console.log('チェックアウトセッション:', {
      id: checkoutSession.id,
      status: checkoutSession.status,
      payment_status: checkoutSession.payment_status,
      mode: checkoutSession.mode,
      metadata: checkoutSession.metadata
    });

    if (!checkoutSession.setup_intent) {
      throw new Error('Setup Intentが見つかりません');
    }

    const setupIntent = checkoutSession.setup_intent as Stripe.SetupIntent;
    const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

    // メタデータから予約データを取得
    let reservationId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reservation: any | null;
    
    if (checkoutSession.metadata?.reservationId) {
      // 既存の予約の場合（setup-payment経由）
      reservationId = checkoutSession.metadata.reservationId;
      console.log('予約ID（既存）:', reservationId);
      
      // 予約の存在確認
      reservation = await prisma.reservations.findUnique({
        where: { id: reservationId },
        include: {
          payments: true,
          users: true,
          lesson_slots: {
            include: {
              users: true
            }
          }
        }
      });
      
    } else if (checkoutSession.metadata?.reservationData) {
      // 新規予約の場合（setup-payment経由）
      console.log('=== 新規予約処理開始 ===');
      console.log('予約データJSON文字列:', checkoutSession.metadata.reservationData);
      
      let reservationData: ReservationMetadata;
      try {
        reservationData = JSON.parse(checkoutSession.metadata.reservationData);
        console.log('パース後の予約データ:', reservationData);
      } catch (parseError) {
        console.error('予約データのJSONパースエラー:', parseError);
        throw new Error('予約データの形式が不正です');
      }
      
      // フロントエンドのキャメルケースをスネークケースに変換
      const convertedData = camelToSnakeKeys(reservationData as unknown as Record<string, unknown>);
      console.log('変換後のデータ:', convertedData);

      // 新規予約データの検証
      console.log('予約データ検証:', {
        slotId: reservationData.slotId,
        totalAmount: reservationData.totalAmount,
        hasSlotId: !!reservationData.slotId,
        hasTotalAmount: !!reservationData.totalAmount
      });
      
      if (!reservationData.slotId || !reservationData.totalAmount) {
        console.error('予約データ検証失敗:', {
          slotId: reservationData.slotId,
          totalAmount: reservationData.totalAmount,
          keys: Object.keys(reservationData)
        });
        throw new Error('予約データが不完全です');
      }

      console.log('新規予約作成データ:', {
        slotId: reservationData.slotId,
        studentId: session.user.id,
        totalAmount: reservationData.totalAmount,
        bookedStartTime: reservationData.bookedStartTime,
        bookedEndTime: reservationData.bookedEndTime
      });

      // durationから時間数と分数を計算
      const durationMinutes = reservationData.duration || 60;
      const hoursBooked = Math.ceil(durationMinutes / 60);

      // 新規予約を作成
      reservation = await prisma.reservations.create({
        data: {
          id: randomUUID(),
          slot_id: reservationData.slotId,
          student_id: session.user.id,
          status: 'PENDING_APPROVAL',
          booked_start_time: new Date(reservationData.bookedStartTime),
          booked_end_time: new Date(reservationData.bookedEndTime),
          hours_booked: hoursBooked,
          total_amount: reservationData.totalAmount,
          notes: reservationData.notes,
          duration_minutes: durationMinutes,
          updated_at: new Date()
        },
        include: {
          payments: true,
          users: true,
          lesson_slots: {
            include: {
              users: true
            }
          }
        }
      });
      
      reservationId = reservation.id;
      console.log('新規予約作成完了:', reservationId);
    } else {
      throw new Error('セッションメタデータに予約情報が見つかりません');
    }

    console.log('予約ID:', reservationId);

    if (!reservation) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック（予約者本人のみ）
    if (reservation.student_id !== session.user.id) {
      return NextResponse.json(
        { error: 'この予約にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    // 既に決済情報が存在する場合はエラー
    if (reservation.payments) {
      return NextResponse.json(
        { error: '既に決済情報が設定されています' },
        { status: 400 }
      );
    }

    console.log('=== Setup Intent情報確認 ===');
    console.log('Setup Intent ID:', setupIntent.id);
    console.log('Payment Method ID:', paymentMethod.id);
    console.log('Customer ID:', checkoutSession.customer);

    // トランザクションで決済情報を保存
    const result = await prisma.$transaction(async (tx) => {
      // 決済情報を作成
      const payment = await tx.payments.create({
        data: {
          id: randomUUID(),
          stripe_payment_id: null, // Payment Intent作成時に更新
          stripe_session_id: sessionId,
          amount: reservation.total_amount,
          currency: 'jpy',
          status: PaymentStatus.SETUP_COMPLETED,
          user_id: session.user.id,
          updated_at: new Date()
        }
      });

      // Setup Intentと決済手段の情報をmetadataとして保存
      await tx.$executeRaw`
        UPDATE payments 
        SET metadata = ${JSON.stringify({
          setupIntentId: setupIntent.id,
          paymentMethodId: paymentMethod.id,
          customerId: checkoutSession.customer,
          paymentMethodType: paymentMethod.type,
          cardBrand: paymentMethod.card?.brand,
          cardLast4: paymentMethod.card?.last4,
          setupCompletedAt: new Date().toISOString()
        })}
        WHERE id = ${payment.id}
      `;

      // 予約にpaymentIdを関連付け
      const updatedReservation = await tx.reservations.update({
        where: { id: reservationId },
        data: { 
          payment_id: payment.id,
          updated_at: new Date()
        }
      });

      return { payment, reservation: updatedReservation };
    });

    // メール通知送信
    try {
      const { sendEmail } = await import('@/lib/resend');
      
      await sendEmail({
        to: session.user.email || '',
        subject: 'カード情報登録完了 - MUED LMS',
        html: `
          <h2>カード情報登録完了のお知らせ</h2>
          <p>${session.user?.email || 'ユーザー'}様、</p>
          <p>レッスン予約のカード情報登録が完了しました。</p>
          <ul>
            <li>予約ID: ${reservationId}</li>
            <li>講師: ${reservation.lesson_slots?.users?.name || '講師名未設定'}</li>
            <li>日時: ${reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</li>
            <li>料金: ¥${reservation.total_amount.toLocaleString()}</li>
          </ul>
          <p>メンターの承認後、レッスン開始2時間前に自動決済が実行されます。</p>
          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        `
      });
      
      console.log('✅ カード登録完了メール送信成功');
    } catch (emailError) {
      console.error('❌ メール送信エラー:', emailError);
      // メール送信エラーでも処理は継続
    }

    // メール通知送信
    try {
      const { sendEmail } = await import('@/lib/resend');
      
      await sendEmail({
        to: session.user.email || '',
        subject: 'カード情報登録完了 - MUED LMS',
        html: `
          <h2>カード情報登録完了のお知らせ</h2>
          <p>${session.user?.email || 'ユーザー'}様、</p>
          <p>レッスン予約のカード情報登録が完了しました。</p>
          <ul>
            <li>予約ID: ${reservationId}</li>
            <li>講師: ${reservation.lesson_slots?.users?.name || '講師名未設定'}</li>
            <li>日時: ${reservation.booked_start_time ? new Date(reservation.booked_start_time).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '日時未設定'}</li>
            <li>料金: ¥${reservation.total_amount.toLocaleString()}</li>
          </ul>
          <p>メンターの承認後、レッスン開始2時間前に自動決済が実行されます。</p>
          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        `
      });
      
      console.log('✅ カード登録完了メール送信成功');
    } catch (emailError) {
      console.error('❌ メール送信エラー:', emailError);
      // メール送信エラーでも処理は継続
    }

    // 予約データをフロントエンド形式に変換
    const convertedReservation = convertReservationToResponse(result.reservation);

    console.log('=== Setup完了処理成功 ===');
    console.log('決済ID:', result.payment.id);
    console.log('決済ステータス:', result.payment.status);
    console.log('予約情報（DB形式）:', {
      id: result.reservation.id,
      status: result.reservation.status,
      total_amount: result.reservation.total_amount
    });
    console.log('予約情報（フロントエンド形式）:', convertedReservation);

    return NextResponse.json({
      success: true,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amount
      },
      reservation: convertedReservation,
      message: '決済情報が正常に保存されました。メンター承認後、レッスン開始2時間前に自動で決済が実行されます。'
    });

  } catch (error) {
    console.error('Setup完了処理エラー:', error);
    console.error('エラースタック:', error instanceof Error ? error.stack : 'スタック情報なし');
    return NextResponse.json(
      { 
        error: 'Setup完了処理に失敗しました', 
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
} 

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { getOrCreateStripeCustomer } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/utils/url';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;
    
    // セッション情報を取得
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    console.log('=== Setup Intent処理開始 ===');
    console.log('予約ID:', reservationId);
    console.log('ユーザーID:', session.user.id);

    // 予約の存在確認と権限チェック
    const reservation = await prisma.reservations.findUnique({
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

    // 予約ステータスチェック
    if (reservation.status !== 'PENDING_APPROVAL' && reservation.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'この予約は決済設定できません' },
        { status: 400 }
      );
    }

    // 既に決済情報が存在する場合はエラー
    if (reservation.payments) {
      return NextResponse.json(
        { error: '既に決済情報が設定されています' },
        { status: 400 }
      );
    }

    // Stripe顧客を取得または作成
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email || ''
    );

    // ベースURLの動的取得
    const baseUrl = getBaseUrl(request);

    // Setup Intent用のCheckout Sessionを作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup', // Setup Intentモード（決済情報保存のみ）
      payment_method_types: ['card'],
      success_url: `${baseUrl}/dashboard/reservations/${reservationId}/setup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/reservations/${reservationId}?setup_canceled=true`,
      metadata: {
        reservationId: reservationId,
        userId: session.user.id,
        userEmail: session.user.email || '',
        setupType: 'reservation_payment'
      },
    });

    console.log('=== Setup Intent Checkout Session作成完了 ===');
    console.log('セッションID:', checkoutSession.id);
    console.log('URL:', checkoutSession.url);

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
      message: 'Setup Intent用のCheckout Sessionが作成されました'
    });

  } catch (error) {
    console.error('Setup Intent処理エラー:', error);
    return NextResponse.json(
      { error: 'Setup Intent処理に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
} 
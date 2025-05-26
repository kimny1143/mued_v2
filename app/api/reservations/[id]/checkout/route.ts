import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { createCheckoutSessionForReservation } from '@/lib/stripe';
import { randomUUID } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    const reservationId = params.id;
    
    // 予約の存在確認と権限チェック
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        lesson_slots: {
          include: {
            users: {
              select: { name: true }
            }
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
    
    // 生徒が自分の予約のみ決済できることを確認
    if (reservation.studentId !== session.user.id) {
      return NextResponse.json(
        { error: 'この予約の決済権限がありません' },
        { status: 403 }
      );
    }
    
    // 決済可能な状態かチェック（承認済み状態のみ）
    if (reservation.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `この予約は決済できません。現在の状態: ${reservation.status}` },
        { status: 400 }
      );
    }
    
    // 既に決済が開始されているかチェック
    if (reservation.paymentId) {
      return NextResponse.json(
        { error: 'この予約は既に決済処理が開始されています' },
        { status: 400 }
      );
    }
    
    // 日付と時間をフォーマット（JST時間で表示）
    const formattedDate = reservation.bookedStartTime.toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const startTimeJST = reservation.bookedStartTime.toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const endTimeJST = reservation.bookedEndTime.toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const formattedTimeRange = `${startTimeJST} - ${endTimeJST}`;
    const formattedDuration = `${reservation.durationMinutes || 60}分`;
    
    try {
      // ベースURLの取得
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
        'https://dev.mued.jp' || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

      // 決済セッション作成
      const checkoutSession = await createCheckoutSessionForReservation(
        session.user.id,
        session.user.email,
        reservation.id,
        reservation.totalAmount,
        'jpy', // 固定でJPYを使用
        {
          teacher: reservation.lesson_slots.users.name || '名前未設定',
          date: formattedDate,
          time: formattedTimeRange,
          duration: formattedDuration
        },
        {
          successUrl: `${baseUrl}/dashboard/booking-calendar/success?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservation.id}`,
          cancelUrl: `${baseUrl}/dashboard/booking-calendar?canceled=true`
        }
      );
      
      // payment レコード作成とreservationの更新をトランザクションで実行
      const result = await prisma.$transaction(async (tx) => {
        // payment レコード作成
        const payment = await tx.payments.create({
          data: {
            id: randomUUID(),
            stripeSessionId: checkoutSession.id,
            amount: reservation.totalAmount,
            currency: 'jpy',
            status: 'PENDING',
            userId: session.user.id,
            updatedAt: new Date()
          }
        });
        
        // reservationにpaymentIdを関連付け
        const updatedReservation = await tx.reservations.update({
          where: { id: reservation.id },
          data: {
            paymentId: payment.id
          }
        });
        
        return { payment, reservation: updatedReservation, checkoutSession };
      });
      
      console.log('💳 決済セッション作成完了:', {
        reservationId: reservation.id,
        paymentId: result.payment.id,
        stripeSessionId: checkoutSession.id,
        amount: reservation.totalAmount,
        studentId: session.user.id
      });
      
      return NextResponse.json({
        success: true,
        checkoutUrl: checkoutSession.url,
        message: '決済ページにリダイレクトします',
        payment: result.payment
      });
      
    } catch (stripeError) {
      console.error('Stripe決済セッション作成エラー:', stripeError);
      return NextResponse.json(
        { error: 'Stripe決済セッションの作成に失敗しました', details: String(stripeError) },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('決済開始エラー:', error);
    return NextResponse.json(
      { error: '決済の開始中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 
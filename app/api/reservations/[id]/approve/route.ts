import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    // メンターロールのチェック
    if (session.role !== 'mentor') {
      return NextResponse.json(
        { error: 'メンターのみが予約を承認できます' },
        { status: 403 }
      );
    }
    
    const reservationId = params.id;
    
    // 予約の存在確認と権限チェック
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        lesson_slots: {
          select: {
            teacherId: true,
            users: {
              select: { name: true, email: true }
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
    
    // メンターが自分のレッスン枠の予約のみ承認できることを確認
    if (reservation.lesson_slots.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: 'この予約を承認する権限がありません' },
        { status: 403 }
      );
    }
    
    // 承認可能な状態かチェック
    if (reservation.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `この予約は承認できません。現在の状態: ${reservation.status}` },
        { status: 400 }
      );
    }
    
    // トランザクションで承認と決済処理を実行
    const result = await prisma.$transaction(async (tx) => {
      // 予約を承認状態に更新
      const updatedReservation = await tx.reservations.update({
        where: { id: reservationId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: session.user.id
        },
        include: {
          payments: true
        }
      });
      
      // 決済準備済みの場合は自動実行
      let paymentResult = null;
      if (updatedReservation.payments && updatedReservation.payments.stripePaymentId) {
        try {
          // Stripe Payment Intentをキャプチャ（実際の決済実行）
          const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2025-03-31.basil',
          });
          
          const paymentIntent = await stripe.paymentIntents.capture(
            updatedReservation.payments.stripePaymentId
          );
          
          // Payment ステータスを更新
          await tx.payments.update({
            where: { id: updatedReservation.payments.id },
            data: {
              status: 'SUCCEEDED',
              updatedAt: new Date()
            }
          });
          
          // 予約ステータスを確定済みに更新
          await tx.reservations.update({
            where: { id: reservationId },
            data: { status: 'CONFIRMED' }
          });
          
          paymentResult = {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            status: paymentIntent.status
          };
          
          console.log('💳 自動決済実行完了:', paymentResult);
        } catch (paymentError) {
          console.error('自動決済エラー:', paymentError);
          // 決済エラーでも承認は完了させる（手動決済可能）
        }
      }
      
      return { updatedReservation, paymentResult };
    });
    
    // 型アサーションで一時的に回避（Prismaクライアントの型が更新されるまで）
    const reservationWithApprovedAt = result.updatedReservation as typeof result.updatedReservation & { approvedAt: Date };
    
    console.log('✅ 予約承認完了:', {
      reservationId: result.updatedReservation.id,
      mentorId: session.user.id,
      mentorName: (session.user as { name?: string }).name || 'Unknown',
      approvedAt: reservationWithApprovedAt.approvedAt,
      autoPayment: !!result.paymentResult
    });
    
    const message = result.paymentResult 
      ? '予約を承認し、決済も自動で完了しました！'
      : '予約を承認しました。生徒に決済手続きの案内が送信されます。';
    
    return NextResponse.json({
      success: true,
      message,
      reservation: result.updatedReservation,
      payment: result.paymentResult
    });
    
  } catch (error) {
    console.error('予約承認エラー:', error);
    return NextResponse.json(
      { error: '予約の承認中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 
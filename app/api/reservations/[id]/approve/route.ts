import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { hasPermission, normalizeRoleName } from '@/lib/role-utils';

// 決済関連の型定義
interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  metadata?: string;
}

interface PaymentMetadata {
  setupIntentId?: string;
  paymentMethodId?: string;
  customerId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    // メンターロールのチェック（role-utilsを使用した統一的な判定）
    console.log('🔍 ロール判定詳細:', {
      sessionRole: session.role,
      roleType: typeof session.role,
      userId: session.user.id,
      userEmail: session.user.email
    });
    
    const normalizedRole = normalizeRoleName(session.role);
    const canApproveMentor = hasPermission(session.role || '', 'mentor');
    const canApproveAdmin = hasPermission(session.role || '', 'admin');
    
    console.log('🔍 権限チェック結果 (role-utils):', {
      originalRole: session.role,
      normalizedRole,
      canApproveMentor,
      canApproveAdmin,
      canApprove: canApproveMentor || canApproveAdmin
    });
    
    if (!canApproveMentor && !canApproveAdmin) {
      return NextResponse.json(
        { 
          error: 'メンターのみが予約を承認できます',
          debug: {
            providedRole: session.role,
            normalizedRole,
            canApproveMentor,
            canApproveAdmin
          }
        },
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
            teacher_id: true,
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
    if (reservation.lesson_slots.teacher_id !== session.user.id) {
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
          approved_at: new Date(),
          approved_by: session.user.id
        },
        include: {
          payments: true
        }
      });
      
      // Setup完了済みの場合は自動決済実行
      let paymentResult = null;
      
      console.log('🔍 決済情報確認:', {
        hasPayments: !!updatedReservation.payments,
        paymentStatus: updatedReservation.payments ? (updatedReservation.payments as PaymentRecord).status : 'なし',
        paymentId: updatedReservation.payments?.id
      });
      
      if (updatedReservation.payments && (updatedReservation.payments as PaymentRecord).status === 'SETUP_COMPLETED') {
        try {
          console.log('💳 決済タイミング判定開始');
          
          // 🔧 修正：2時間前判定を追加
          const { getPaymentExecutionTiming } = await import('@/lib/payment-flow');
          const timing = getPaymentExecutionTiming(updatedReservation.booked_start_time);
          
          console.log('⏰ 決済実行タイミング:', {
            lessonStartTime: updatedReservation.booked_start_time,
            executionTime: timing.executionTime,
            shouldExecuteImmediately: timing.shouldExecuteImmediately,
            hoursUntilExecution: timing.hoursUntilExecution,
            isAutoExecution: timing.isAutoExecution
          });
          
          if (timing.shouldExecuteImmediately) {
            console.log('🚀 2時間以内のため即座決済を実行');
            
            const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
              apiVersion: '2025-03-31.basil',
            });
            
            // Setup Intentから決済手段情報を取得
            const paymentMetadata: PaymentMetadata = JSON.parse((updatedReservation.payments as PaymentRecord).metadata || '{}');
            
            console.log('📋 決済メタデータ:', {
              setupIntentId: paymentMetadata.setupIntentId,
              paymentMethodId: paymentMetadata.paymentMethodId,
              customerId: paymentMetadata.customerId
            });
            const paymentMethodId = paymentMetadata.paymentMethodId;
            const customerId = paymentMetadata.customerId;
            
            if (!paymentMethodId) {
              throw new Error('決済手段が見つかりません');
            }
            
            console.log('🔄 Payment Intent作成開始');
            
            // Payment Intentを作成して即座に実行
            const paymentIntent = await stripe.paymentIntents.create({
              amount: updatedReservation.payments.amount,
              currency: 'jpy',
              customer: customerId,
              payment_method: paymentMethodId,
              confirm: true, // 即座に決済実行
              automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never' // リダイレクト系決済を無効化
              },
              metadata: {
                reservationId: reservationId,
                studentId: updatedReservation.student_id,
                teacherId: reservation.lesson_slots.teacher_id,
                slotId: updatedReservation.slot_id,
                executionTrigger: 'mentor_approval_immediate'
              },
              description: `レッスン予約の即座決済 - 予約ID: ${reservationId}`,
            });
            
            // Payment レコードを更新
            await tx.payments.update({
              where: { id: updatedReservation.payments.id },
              data: {
                stripe_payment_id: paymentIntent.id,
                status: 'SUCCEEDED',
                updated_at: new Date()
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
              status: paymentIntent.status,
              executionType: 'immediate'
            };
            
            console.log('💳 即座決済実行完了:', paymentResult);
          } else {
            // 🔧 新機能：2時間以上前の場合はCronジョブに委ねる
            console.log(`⏰ レッスン開始まで${timing.hoursUntilExecution}時間以上あるため、Cronジョブによる自動決済を待機`);
            console.log(`📅 自動決済予定時刻: ${timing.executionTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
            
            paymentResult = {
              executionType: 'scheduled',
              scheduledExecutionTime: timing.executionTime,
              hoursUntilExecution: timing.hoursUntilExecution,
              message: `レッスン開始2時間前（${timing.executionTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}）に自動決済されます`
            };
          }
          
        } catch (paymentError) {
          console.error('決済処理エラー:', paymentError);
          // 決済エラーでも承認は完了させる（手動決済可能）
          paymentResult = {
            executionType: 'error',
            error: String(paymentError)
          };
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
    
    // 🔧 修正：決済実行タイプに応じたメッセージ生成
    let message: string;
    if (result.paymentResult) {
      switch (result.paymentResult.executionType) {
        case 'immediate':
          message = '予約を承認し、決済も自動で完了しました！';
          break;
        case 'scheduled':
          message = `予約を承認しました。${result.paymentResult.message}`;
          break;
        case 'error':
          message = '予約を承認しましたが、決済処理でエラーが発生しました。手動で決済を確認してください。';
          break;
        default:
          message = '予約を承認しました。決済処理を確認中です。';
      }
    } else {
      message = '予約を承認しました。生徒に決済手続きの案内が送信されます。';
    }
    
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
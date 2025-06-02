import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { shouldUseNewPaymentFlowByLessonTime, getPaymentExecutionTiming } from '@/lib/payment-flow';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

// 動的ルートとして設定
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== 決済実行Cronジョブ開始 ===');
    console.log('実行時刻:', new Date().toISOString());
    console.log('実行時刻(JST):', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

    // Vercel Cronジョブの認証チェック
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent');
    
    console.log('🔐 認証情報:', {
      hasAuthHeader: !!authHeader,
      userAgent: userAgent || 'なし',
      environment: process.env.NODE_ENV,
      hasCronSecret: !!process.env.CRON_SECRET
    });
    
    // GitHub ActionsまたはVercelからのアクセスでない場合は認証チェック
    const isGitHubActions = userAgent?.includes('GitHub-Actions');
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment && !isGitHubActions) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error('❌ 認証エラー:', {
          expected: `Bearer ${process.env.CRON_SECRET ? '[HIDDEN]' : 'NOT_SET'}`,
          received: authHeader ? authHeader.replace(/Bearer .+/, 'Bearer [HIDDEN]') : 'なし'
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2時間以内に開始されるレッスンを検索
    const now = new Date();
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    // 5分のバッファを考慮（Cronジョブの実行間隔）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    console.log('検索条件:', {
      currentTime: now.toISOString(),
      currentTimeJST: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      searchRangeStart: fiveMinutesAgo.toISOString(),
      searchRangeEnd: twoHoursFromNow.toISOString(),
      description: '5分前から2時間後までの予約を検索'
    });

    // 新フロー対象の予約のみを検索（旧フローは即座決済のため対象外）
    const reservations = await prisma.reservations.findMany({
      where: {
        status: 'APPROVED', // メンター承認済み
        booked_start_time: {
          gte: fiveMinutesAgo,  // 5分前以降（過去の見逃し分も含む）
          lte: twoHoursFromNow, // 2時間後まで
        },
        payment_id: {
          not: null // 決済情報が存在する
        }
      },
      include: {
        payments: {
          where: {
            status: 'SETUP_COMPLETED' // Setup完了済み
          }
        },
        users: {
          select: { id: true, name: true, email: true }
        },
        lesson_slots: {
          include: {
            users: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    // Setup完了済みで未実行の決済のみをフィルタリング
    // 新フロー対象かつ実行タイミングに達した予約のみを処理
    const filteredReservations = [];
    for (const reservation of reservations) {
      // 新フロー対象かチェック
      const useNewFlow = shouldUseNewPaymentFlowByLessonTime(reservation.booked_start_time);
      if (!useNewFlow) {
        console.log(`予約 ${reservation.id} は旧フロー対象のためスキップ`);
        continue;
      }

      // 実行タイミングに達しているかチェック
      const timing = getPaymentExecutionTiming(reservation.booked_start_time, true);
      if (!timing.shouldExecuteImmediately) {
        console.log(`予約 ${reservation.id} はまだ実行タイミングではありません`);
        console.log(`  レッスン開始時刻: ${reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`  実行予定時刻: ${timing.executionTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`  実行まで: ${timing.hoursUntilExecution}時間`);
        continue;
      }

      if (reservation.payments && reservation.payments.status === 'SETUP_COMPLETED') {
        // 生のSQLで chargeexecutedat をチェック
        const paymentWithExecutionTime = await prisma.$queryRaw<Array<{chargeexecutedat: Date | null}>>`
          SELECT chargeexecutedat FROM payments WHERE id = ${reservation.payments.id}
        `;
        
        if (paymentWithExecutionTime.length > 0 && !paymentWithExecutionTime[0].chargeexecutedat) {
          filteredReservations.push(reservation);
        }
      }
    }

    console.log(`全予約数: ${reservations.length}件`);
    console.log(`対象予約数: ${filteredReservations.length}件`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const reservation of filteredReservations) {
      try {
        console.log(`\n--- 予約 ${reservation.id} の決済処理開始 ---`);
        
        if (!reservation.payments || !reservation.payments.metadata) {
          throw new Error('決済情報またはメタデータが見つかりません');
        }

        const metadata = JSON.parse(reservation.payments.metadata);
        const { paymentMethodId, customerId } = metadata;

        if (!paymentMethodId) {
          throw new Error('決済手段IDが見つかりません');
        }

        console.log('決済情報:', {
          paymentId: reservation.payments.id,
          amount: reservation.payments.amount,
          paymentMethodId,
          customerId
        });

        console.log(`⏰ 決済実行対象: 予約ID ${reservation.id}, 開始時刻: ${reservation.booked_start_time}`);

        // Payment Intentを作成して即座に実行
        const paymentIntent = await stripe.paymentIntents.create({
          amount: reservation.payments.amount,
          currency: 'jpy',
          customer: customerId,
          payment_method: paymentMethodId,
          confirm: true, // 即座に決済実行
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never' // リダイレクト系決済を無効化
          },
          metadata: {
            reservationId: reservation.id,
            studentId: reservation.student_id,
            teacherId: reservation.lesson_slots.teacher_id,
            slotId: reservation.slot_id,
            cronExecution: 'true',
            executedAt: new Date().toISOString()
          },
          description: `レッスン予約の自動決済 - 予約ID: ${reservation.id}`,
        });

        console.log('Payment Intent作成成功:', {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount
        });

        console.log(`💳 決済実行完了: 予約ID ${reservation.id}, 開始時刻: ${reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);

        // データベースを更新
        await prisma.$transaction(async (tx) => {
          // 決済情報を更新（生のSQLを使用）
          await tx.$executeRaw`
            UPDATE payments 
            SET 
              stripe_payment_id = ${paymentIntent.id},
              status = ${paymentIntent.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING'}::"PaymentStatus",
              charge_executed_at = ${new Date()},
              updated_at = ${new Date()}
            WHERE id = ${reservation.payments!.id}
          `;

          // 予約ステータスを確定済みに更新（決済成功時のみ）
          if (paymentIntent.status === 'succeeded') {
            await tx.reservations.update({
              where: { id: reservation.id },
              data: { 
                status: 'CONFIRMED',
                updated_at: new Date()
              }
            });
          }
        });

        results.push({
          reservationId: reservation.id,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          success: true
        });

        successCount++;
        console.log(`✅ 予約 ${reservation.id} の決済処理完了`);

      } catch (error) {
        console.error(`❌ 予約 ${reservation.id} の決済処理エラー:`, error);
        
        results.push({
          reservationId: reservation.id,
          error: String(error),
          success: false
        });

        errorCount++;

        // エラーログをデータベースに記録（オプション）
        try {
          await prisma.payments.update({
            where: { id: reservation.payments!.id },
            data: {
              updated_at: new Date(),
              // エラー情報をメタデータに追加
              metadata: JSON.stringify({
                ...JSON.parse(reservation.payments!.metadata || '{}'),
                lastExecutionError: {
                  message: String(error),
                  timestamp: new Date().toISOString()
                }
              })
            }
          });
        } catch (metadataError) {
          console.error('エラーメタデータ保存失敗:', metadataError);
        }
      }
    }

    console.log('\n=== 決済実行Cronジョブ完了 ===');
    console.log(`成功: ${successCount}件, エラー: ${errorCount}件`);

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: reservations.length,
        successCount,
        errorCount,
        executedAt: new Date().toISOString()
      },
      results
    });

  } catch (error) {
    console.error('Cronジョブエラー:', error);
    return NextResponse.json(
      { 
        error: 'Cronジョブの実行に失敗しました', 
        details: String(error),
        executedAt: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 
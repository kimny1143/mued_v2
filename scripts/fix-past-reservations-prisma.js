const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPastReservations() {
  try {
    console.log('🔧 過去の予約の処理を開始します...\n');
    
    // 既に処理済みのものを確認
    const alreadyFixed = await prisma.payments.count({
      where: {
        status: 'SUCCEEDED',
        charge_executed_at: { not: null }
      }
    });
    
    console.log(`ℹ️  既に修正済みのSUCCEEDED決済: ${alreadyFixed}件`);
    
    // 2. 過去のレッスン（24時間以上前）でSETUP_COMPLETEDのものを取得
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);
    
    const pastUnpaidReservations = await prisma.reservations.findMany({
      where: {
        status: 'APPROVED',
        booked_start_time: { lt: cutoffTime },
        payments: {
          status: 'SETUP_COMPLETED'
        }
      },
      include: {
        payments: true
      }
    });
    
    console.log(`\n📋 処理対象の過去の未決済予約: ${pastUnpaidReservations.length}件`);
    
    // 3. バッチで予約をキャンセル
    const canceledReservations = [];
    for (const reservation of pastUnpaidReservations) {
      try {
        const updated = await prisma.reservations.update({
          where: { id: reservation.id },
          data: {
            status: 'CANCELED',
            cancel_reason: 'PAYMENT_NOT_EXECUTED',
            canceled_at: new Date(),
            updated_at: new Date()
          }
        });
        canceledReservations.push(updated);
        console.log(`  - ${updated.id}: ${updated.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      } catch (err) {
        console.error(`  ❌ 予約 ${reservation.id} の更新に失敗:`, err.message);
      }
    }
    
    console.log(`\n❌ ${canceledReservations.length}件の過去の未決済予約をキャンセルしました`);
    
    // 4. 関連する決済情報もCANCELEDに
    const canceledPayments = [];
    for (const reservation of canceledReservations) {
      if (reservation.payment_id) {
        try {
          const payment = await prisma.payments.update({
            where: { id: reservation.payment_id },
            data: {
              status: 'CANCELED',
              updated_at: new Date()
            }
          });
          canceledPayments.push(payment);
        } catch (err) {
          console.error(`  ❌ 決済 ${reservation.payment_id} の更新に失敗:`, err.message);
        }
      }
    }
    
    console.log(`\n💳 ${canceledPayments.length}件の決済情報をキャンセルしました`);
    
    // 5. 現在から未来の予約を確認
    const futureReservations = await prisma.reservations.findMany({
      where: {
        status: 'APPROVED',
        booked_start_time: { gt: new Date() },
        payments: {
          status: 'SETUP_COMPLETED'
        }
      },
      include: {
        payments: true
      },
      orderBy: {
        booked_start_time: 'asc'
      }
    });
    
    console.log(`\n📅 未来の予約（Cron対象）: ${futureReservations.length}件`);
    if (futureReservations.length > 0) {
      futureReservations.forEach(r => {
        const hoursUntilStart = Math.round((r.booked_start_time.getTime() - new Date().getTime()) / (1000 * 60 * 60));
        console.log(`  - ${r.id.substring(0, 8)}: ${r.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (${hoursUntilStart}時間後)`);
      });
    }
    
    // 6. 統計情報
    const statusCounts = await prisma.reservations.groupBy({
      by: ['status'],
      _count: true
    });
    
    const paymentStatusCounts = await prisma.payments.groupBy({
      by: ['status'],
      _count: true
    });
    
    console.log('\n📊 更新後の統計:');
    console.log('予約ステータス:');
    statusCounts.forEach(s => {
      console.log(`  ${s.status}: ${s._count}件`);
    });
    
    console.log('\n決済ステータス:');
    paymentStatusCounts.forEach(s => {
      console.log(`  ${s.status}: ${s._count}件`);
    });
    
    console.log('\n✅ 処理完了！');
    console.log('💡 今後の予約は正常にCronジョブで処理されます');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 確認プロンプト
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  警告: このスクリプトは以下を実行します:');
console.log('1. 24時間以上前の未決済予約をキャンセル');
console.log('2. 関連する決済情報もキャンセル');
console.log('');
console.log('注: SUCCEEDEDの修正は既に完了しているためスキップします');
console.log('');

rl.question('実行しますか？ (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    fixPastReservations();
  } else {
    console.log('キャンセルしました');
    process.exit(0);
  }
  rl.close();
});
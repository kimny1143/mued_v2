const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPastReservations() {
  try {
    console.log('🔧 過去の予約の処理を開始します...\n');
    
    // 既に処理済みのものを確認（$queryRawUnsafeを使用）
    const alreadyFixed = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM payments
      WHERE status = 'SUCCEEDED'
        AND charge_executed_at IS NOT NULL
    `);
    
    console.log(`ℹ️  既に修正済みのSUCCEEDED決済: ${alreadyFixed[0].count}件`);
    
    // 2. 過去のレッスン（24時間以上前）でSETUP_COMPLETEDのものをCANCELEDに
    const pastLessons = await prisma.$queryRawUnsafe(`
      UPDATE reservations r
      SET status = 'CANCELED',
          cancel_reason = 'PAYMENT_NOT_EXECUTED',
          cancelled_at = NOW(),
          updated_at = NOW()
      FROM payments p
      WHERE r.payment_id = p.id
        AND r.status = 'APPROVED'
        AND p.status = 'SETUP_COMPLETED'
        AND r.booked_start_time < NOW() - INTERVAL '24 hours'
      RETURNING r.id, r.booked_start_time
    `);
    
    console.log(`\n❌ ${pastLessons.length}件の過去の未決済予約をキャンセルしました`);
    if (pastLessons.length > 0) {
      pastLessons.forEach(r => {
        console.log(`  - ${r.id}: ${r.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      });
    }
    
    // 3. 関連する決済情報もCANCELEDに
    if (pastLessons.length > 0) {
      const paymentIds = pastLessons.map(r => r.id);
      // パラメータをSQL内で直接構築
      const canceledPayments = await prisma.$queryRawUnsafe(`
        UPDATE payments p
        SET status = 'CANCELED',
            updated_at = NOW()
        FROM reservations r
        WHERE r.payment_id = p.id
          AND r.id IN (${paymentIds.map(id => `'${id}'`).join(',')})
          AND p.status = 'SETUP_COMPLETED'
        RETURNING p.id
      `);
      
      console.log(`\n💳 ${canceledPayments.length}件の決済情報をキャンセルしました`);
    }
    
    // 4. 現在から未来の予約を確認
    const futureReservations = await prisma.$queryRawUnsafe(`
      SELECT 
        r.id,
        r.booked_start_time,
        p.status as payment_status,
        EXTRACT(EPOCH FROM (r.booked_start_time - NOW())) / 3600 as hours_until_start
      FROM reservations r
      INNER JOIN payments p ON r.payment_id = p.id
      WHERE r.status = 'APPROVED'
        AND p.status = 'SETUP_COMPLETED'
        AND r.booked_start_time > NOW()
      ORDER BY r.booked_start_time
    `);
    
    console.log(`\n📅 未来の予約（Cron対象）: ${futureReservations.length}件`);
    if (futureReservations.length > 0) {
      futureReservations.forEach(r => {
        console.log(`  - ${r.id.substring(0, 8)}: ${r.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (${Math.round(r.hours_until_start)}時間後)`);
      });
    }
    
    // 5. 統計情報
    const stats = await prisma.$queryRawUnsafe(`
      SELECT 
        r.status,
        p.status as payment_status,
        COUNT(*) as count
      FROM reservations r
      LEFT JOIN payments p ON r.payment_id = p.id
      GROUP BY r.status, p.status
      ORDER BY r.status, p.status
    `);
    
    console.log('\n📊 更新後の統計:');
    console.table(stats);
    
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
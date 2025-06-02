const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPastReservations() {
  try {
    console.log('🔧 過去の予約の処理を開始します...\n');
    
    // 1. 既にSUCCEEDEDでcharge_executed_atがNULLのものを修正
    const succeededWithoutExecutedAt = await prisma.$queryRaw`
      UPDATE payments
      SET charge_executed_at = updated_at
      WHERE status = 'SUCCEEDED'
        AND charge_executed_at IS NULL
        AND stripe_payment_id IS NOT NULL
      RETURNING id, charge_executed_at
    `;
    
    console.log(`✅ ${succeededWithoutExecutedAt.length}件のSUCCEEDED決済のcharge_executed_atを修正しました`);
    
    // 2. 過去のレッスン（24時間以上前）でSETUP_COMPLETEDのものをCANCELEDに
    const pastLessons = await prisma.$queryRaw`
      UPDATE reservations r
      SET status = 'CANCELED'::"ReservationStatus",
          cancel_reason = 'PAYMENT_NOT_EXECUTED',
          cancelled_at = NOW(),
          updated_at = NOW()
      FROM payments p
      WHERE r.payment_id = p.id
        AND r.status = 'APPROVED'
        AND p.status = 'SETUP_COMPLETED'
        AND r.booked_start_time < NOW() - INTERVAL '24 hours'
      RETURNING r.id, r.booked_start_time
    `;
    
    console.log(`\n❌ ${pastLessons.length}件の過去の未決済予約をキャンセルしました`);
    pastLessons.forEach(r => {
      console.log(`  - ${r.id}: ${r.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    });
    
    // 3. 現在から未来の予約を確認
    const futureReservations = await prisma.$queryRaw`
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
    `;
    
    console.log(`\n📅 未来の予約（Cron対象）: ${futureReservations.length}件`);
    futureReservations.forEach(r => {
      console.log(`  - ${r.id.substring(0, 8)}: ${r.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (${Math.round(r.hours_until_start)}時間後)`);
    });
    
    // 4. 統計情報
    const stats = await prisma.$queryRaw`
      SELECT 
        r.status,
        p.status as payment_status,
        COUNT(*) as count
      FROM reservations r
      LEFT JOIN payments p ON r.payment_id = p.id
      GROUP BY r.status, p.status
      ORDER BY r.status, p.status
    `;
    
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
console.log('1. SUCCEEDEDステータスのcharge_executed_atを修正');
console.log('2. 24時間以上前の未決済予約をキャンセル');
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
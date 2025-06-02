// 生のSQLで決済実行対象を確認
const { PrismaClient } = require('@prisma/client');

async function checkCronTargets() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Cron決済実行対象の確認');
    console.log('現在時刻:', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    
    // 生のSQLで承認済み予約を取得
    const approvedReservations = await prisma.$queryRaw`
      SELECT 
        r.id,
        r.student_id,
        r.slot_id,
        r.status,
        r.booked_start_time,
        r.payment_id,
        p.id as payment_id_check,
        p.status as payment_status,
        p.stripe_session_id,
        p.stripe_payment_id,
        p.charge_executed_at,
        p.amount,
        p.metadata,
        u.name as student_name,
        u.email as student_email
      FROM reservations r
      LEFT JOIN payments p ON r.payment_id = p.id
      LEFT JOIN users u ON r.student_id = u.id
      WHERE r.status = 'APPROVED'
      AND r.booked_start_time >= NOW() - INTERVAL '5 minutes'
      AND r.booked_start_time <= NOW() + INTERVAL '2 hours'
      ORDER BY r.booked_start_time ASC
    `;
    
    console.log(`\n📋 2時間以内の承認済み予約: ${approvedReservations.length}件`);
    
    for (const res of approvedReservations) {
      console.log('\n----------------------------');
      console.log(`予約ID: ${res.id}`);
      console.log(`学生: ${res.student_name} (${res.student_email})`);
      console.log(`開始時刻: ${res.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`決済ステータス: ${res.payment_status || 'なし'}`);
      console.log(`決済実行日時: ${res.charge_executed_at ? res.charge_executed_at.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : 'なし'}`);
      
      // 新フロー対象かチェック（修正後の値）
      const NEW_POLICY_START_DATE = new Date('2025-06-02T15:00:00Z'); // JST 2025/6/3 0:00
      const isNewFlow = res.booked_start_time > NEW_POLICY_START_DATE;
      console.log(`新フロー対象: ${isNewFlow ? 'はい' : 'いいえ'}`);
      
      // 実行タイミングの計算
      const now = new Date();
      const minutesUntilLesson = (res.booked_start_time.getTime() - now.getTime()) / (1000 * 60);
      const shouldExecute = minutesUntilLesson <= 120;
      
      console.log(`レッスンまで: ${minutesUntilLesson.toFixed(0)}分`);
      console.log(`実行タイミング: ${shouldExecute ? 'はい' : 'いいえ'}`);
      
      // Cron実行可否
      const canExecute = 
        res.payment_status === 'SETUP_COMPLETED' &&
        !res.charge_executed_at &&
        isNewFlow &&
        shouldExecute;
      
      console.log(`\n🚦 Cron実行可否: ${canExecute ? '✅ 実行可能' : '❌ 実行不可'}`);
      
      if (!canExecute) {
        if (res.payment_status !== 'SETUP_COMPLETED') {
          console.log(`  理由: 決済ステータスが SETUP_COMPLETED ではない (${res.payment_status})`);
        }
        if (res.charge_executed_at) {
          console.log(`  理由: すでに決済実行済み`);
        }
        if (!isNewFlow) {
          console.log(`  理由: 旧フロー対象`);
        }
        if (!shouldExecute) {
          console.log(`  理由: まだ実行タイミングではない`);
        }
      }
      
      if (res.metadata) {
        try {
          const metadata = JSON.parse(res.metadata);
          console.log('\n📝 メタデータ:');
          console.log(`  Setup Intent: ${metadata.setupIntentId || 'なし'}`);
          console.log(`  Payment Method: ${metadata.paymentMethodId || 'なし'}`);
          console.log(`  Customer ID: ${metadata.customerId || 'なし'}`);
        } catch (e) {
          // メタデータ解析エラーは無視
        }
      }
    }
    
    // SETUP_COMPLETED の決済を確認
    console.log('\n\n📊 SETUP_COMPLETED ステータスの決済:');
    const setupCompletedPayments = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.status,
        p.charge_executed_at,
        r.id as reservation_id,
        r.booked_start_time,
        r.status as reservation_status
      FROM payments p
      JOIN reservations r ON r.payment_id = p.id
      WHERE p.status = 'SETUP_COMPLETED'
      AND p.charge_executed_at IS NULL
      ORDER BY r.booked_start_time ASC
    `;
    
    console.log(`合計: ${setupCompletedPayments.length}件`);
    for (const payment of setupCompletedPayments) {
      const startTime = payment.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      console.log(`- 決済ID: ${payment.id}, 予約ID: ${payment.reservation_id}, 開始: ${startTime}, 予約ステータス: ${payment.reservation_status}`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCronTargets();
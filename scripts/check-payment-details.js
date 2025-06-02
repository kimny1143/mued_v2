const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPaymentDetails() {
  try {
    console.log('🔍 決済情報の詳細を確認します...\n');
    
    // paymentsテーブルの生のカラム名を確認
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name LIKE '%charge%' OR column_name LIKE '%executed%'
      ORDER BY ordinal_position
    `;
    
    console.log('📊 Paymentsテーブルのカラム情報:');
    console.table(columnCheck);
    
    // 過去の予約で決済未実行のものを詳細確認
    const pastUnpaidReservations = await prisma.$queryRaw`
      SELECT 
        r.id as reservation_id,
        r.status as reservation_status,
        r.booked_start_time,
        p.id as payment_id,
        p.status as payment_status,
        p.stripe_payment_id,
        p.created_at as payment_created,
        p.updated_at as payment_updated,
        p.charge_executed_at,
        CASE 
          WHEN p.charge_executed_at IS NULL THEN 'NOT_EXECUTED'
          ELSE 'EXECUTED'
        END as execution_status,
        EXTRACT(EPOCH FROM (NOW() - r.booked_start_time)) / 3600 as hours_since_start
      FROM reservations r
      INNER JOIN payments p ON r.payment_id = p.id
      WHERE r.status = 'APPROVED'
        AND p.status = 'SETUP_COMPLETED'
        AND r.booked_start_time < NOW()
      ORDER BY r.booked_start_time DESC
      LIMIT 10
    `;
    
    console.log('\n📋 過去の未決済予約:');
    pastUnpaidReservations.forEach((res, idx) => {
      console.log(`\n【${idx + 1}. 予約ID: ${res.reservation_id}】`);
      console.log(`  レッスン開始: ${res.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`  経過時間: ${Math.abs(Math.round(res.hours_since_start))}時間前`);
      console.log(`  決済状態: ${res.payment_status}`);
      console.log(`  Stripe決済ID: ${res.stripe_payment_id || 'なし'}`);
      console.log(`  実行状態: ${res.execution_status}`);
      console.log(`  charge_executed_at: ${res.charge_executed_at || 'NULL'}`);
    });
    
    // Stripeの決済IDがあるものを確認
    const withStripePaymentId = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as count,
        p.status,
        CASE 
          WHEN p.stripe_payment_id IS NOT NULL THEN 'HAS_PAYMENT_ID'
          ELSE 'NO_PAYMENT_ID'
        END as stripe_status,
        CASE 
          WHEN p.charge_executed_at IS NOT NULL THEN 'EXECUTED'
          ELSE 'NOT_EXECUTED'
        END as execution_status
      FROM payments p
      GROUP BY p.status, stripe_status, execution_status
      ORDER BY p.status
    `;
    
    console.log('\n📊 決済状態の統計:');
    console.table(withStripePaymentId);
    
    // 最新の決済実行を確認
    const latestExecuted = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.status,
        p.charge_executed_at,
        p.stripe_payment_id,
        r.booked_start_time
      FROM payments p
      LEFT JOIN reservations r ON r.payment_id = p.id
      WHERE p.charge_executed_at IS NOT NULL
      ORDER BY p.charge_executed_at DESC
      LIMIT 5
    `;
    
    if (latestExecuted.length > 0) {
      console.log('\n✅ 最近実行された決済:');
      console.table(latestExecuted.map(p => ({
        決済ID: p.id.substring(0, 8),
        実行日時: p.charge_executed_at?.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        StripeID: p.stripe_payment_id?.substring(0, 15) || 'なし'
      })));
    } else {
      console.log('\n❌ charge_executed_atが記録されている決済はありません');
    }
    
    // NEW_POLICY_START_DATE以降の予約を確認
    const afterPolicyDate = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as count,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM reservations
      WHERE created_at >= '2024-07-01'::date
    `;
    
    console.log('\n📅 新ポリシー（2024-07-01以降）の予約:');
    console.log(`  件数: ${afterPolicyDate[0].count}`);
    console.log(`  最初: ${afterPolicyDate[0].earliest?.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) || 'なし'}`);
    console.log(`  最新: ${afterPolicyDate[0].latest?.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) || 'なし'}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
checkPaymentDetails();
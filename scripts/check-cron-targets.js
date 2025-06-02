const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCronTargets() {
  try {
    console.log('🔍 Cron決済対象の予約を確認します...\n');
    
    const now = new Date();
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    console.log('📅 時間情報:');
    console.log('  現在時刻(UTC):', now.toISOString());
    console.log('  現在時刻(JST):', now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    console.log('  検索範囲開始:', fiveMinutesAgo.toISOString());
    console.log('  検索範囲終了:', twoHoursFromNow.toISOString());
    console.log('');
    
    // SQLで直接確認
    const targets = await prisma.$queryRaw`
      SELECT 
        r.id as reservation_id,
        r.status as reservation_status,
        r.booked_start_time,
        r.student_id,
        p.id as payment_id,
        p.status as payment_status,
        p.amount,
        p.charge_executed_at,
        p.metadata,
        EXTRACT(EPOCH FROM (r.booked_start_time - NOW())) / 3600 as hours_until_start
      FROM reservations r
      INNER JOIN payments p ON r.payment_id = p.id
      WHERE r.status = 'APPROVED'
        AND p.status = 'SETUP_COMPLETED'
        AND p.charge_executed_at IS NULL
        AND r.booked_start_time >= ${fiveMinutesAgo}
        AND r.booked_start_time <= ${twoHoursFromNow}
      ORDER BY r.booked_start_time
    `;
    
    if (targets.length === 0) {
      console.log('❌ Cron実行対象の予約が見つかりません\n');
      
      // より広い範囲で確認
      console.log('📊 承認済み予約の全体像:');
      const allApproved = await prisma.$queryRaw`
        SELECT 
          r.id,
          r.status,
          r.booked_start_time,
          p.status as payment_status,
          p.charge_executed_at,
          EXTRACT(EPOCH FROM (r.booked_start_time - NOW())) / 3600 as hours_until_start
        FROM reservations r
        LEFT JOIN payments p ON r.payment_id = p.id
        WHERE r.status = 'APPROVED'
        ORDER BY r.booked_start_time
        LIMIT 10
      `;
      
      console.table(allApproved.map(r => ({
        ID: r.id.substring(0, 8),
        開始時刻: r.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        開始まで: `${Math.round(r.hours_until_start * 10) / 10}時間`,
        決済状態: r.payment_status || 'なし',
        実行済み: r.charge_executed_at ? '✓' : '✗'
      })));
      
    } else {
      console.log(`✅ ${targets.length}件のCron実行対象が見つかりました:\n`);
      
      targets.forEach((target, index) => {
        console.log(`\n【予約 ${index + 1}】`);
        console.log('  予約ID:', target.reservation_id);
        console.log('  レッスン開始:', target.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
        console.log('  開始まで:', Math.round(target.hours_until_start * 10) / 10, '時間');
        console.log('  決済金額:', target.amount, '円');
        console.log('  決済状態:', target.payment_status);
        
        if (target.metadata) {
          const metadata = JSON.parse(target.metadata);
          console.log('  決済手段ID:', metadata.paymentMethodId || '不明');
          console.log('  顧客ID:', metadata.customerId || '不明');
        }
      });
    }
    
    // 環境変数の確認
    console.log('\n🔧 環境変数の状態:');
    console.log('  NODE_ENV:', process.env.NODE_ENV || '未設定');
    console.log('  CRON_SECRET:', process.env.CRON_SECRET ? '設定済み' : '❌ 未設定');
    console.log('  STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '設定済み' : '❌ 未設定');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
checkCronTargets();
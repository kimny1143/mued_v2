const { PrismaClient } = require('@prisma/client');

async function checkPaymentExecutionDetails() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 決済実行条件の詳細確認');
    console.log('現在時刻:', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    console.log('NEW_POLICY_START_DATE: 2025-06-03T00:00:00Z');
    
    // 今日のレッスンを確認
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysReservations = await prisma.reservations.findMany({
      where: {
        booked_start_time: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        payments: true,
        lesson_slots: {
          include: {
            users: true
          }
        },
        users: true
      },
      orderBy: {
        booked_start_time: 'asc'
      }
    });
    
    console.log(`\n📅 本日のレッスン: ${todaysReservations.length}件`);
    
    for (const reservation of todaysReservations) {
      console.log('\n----------------------------');
      console.log(`予約ID: ${reservation.id}`);
      console.log(`学生: ${reservation.users.name}`);
      console.log(`メンター: ${reservation.lesson_slots.users.name}`);
      console.log(`開始時刻: ${reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`ステータス: ${reservation.status}`);
      
      // 新フロー対象かチェック
      const lessonStartTime = new Date(reservation.booked_start_time);
      const NEW_POLICY_START_DATE = new Date('2025-06-03T00:00:00Z');
      const isNewFlow = lessonStartTime > NEW_POLICY_START_DATE;
      
      console.log(`\n🔄 フロー判定:`);
      console.log(`  レッスン開始時刻: ${lessonStartTime.toISOString()}`);
      console.log(`  ポリシー開始日: ${NEW_POLICY_START_DATE.toISOString()}`);
      console.log(`  新フロー対象: ${isNewFlow ? 'はい' : 'いいえ'}`);
      
      if (!isNewFlow) {
        console.log(`  → 旧フロー対象のためCron対象外`);
        continue;
      }
      
      // 実行タイミングの計算
      const now = new Date();
      const twoHoursBeforeLesson = new Date(lessonStartTime.getTime() - 2 * 60 * 60 * 1000);
      const minutesUntilLesson = (lessonStartTime.getTime() - now.getTime()) / (1000 * 60);
      const shouldExecute = minutesUntilLesson <= 120;
      
      console.log(`\n⏰ 実行タイミング:`);
      console.log(`  現在時刻: ${now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`  2時間前: ${twoHoursBeforeLesson.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`  レッスンまで: ${minutesUntilLesson.toFixed(0)}分`);
      console.log(`  実行対象: ${shouldExecute ? 'はい' : 'いいえ'}`);
      
      if (reservation.payments) {
        console.log(`\n💳 決済情報:`);
        console.log(`  決済ID: ${reservation.payments.id}`);
        console.log(`  ステータス: ${reservation.payments.status}`);
        console.log(`  金額: ¥${reservation.payments.amount}`);
        
        // 生のSQLで chargeexecutedat を確認
        const paymentDetails = await prisma.$queryRaw`
          SELECT id, status, charge_executed_at as chargeexecutedat, created_at, updated_at
          FROM payments 
          WHERE id = ${reservation.payments.id}
        `;
        
        if (paymentDetails.length > 0) {
          const payment = paymentDetails[0];
          console.log(`  決済実行日時: ${payment.chargeexecutedat || 'なし'}`);
          console.log(`  作成日時: ${payment.created_at}`);
          console.log(`  更新日時: ${payment.updated_at}`);
        }
        
        if (reservation.payments.metadata) {
          try {
            const metadata = JSON.parse(reservation.payments.metadata);
            console.log(`  Setup Intent: ${metadata.setupIntentId || 'なし'}`);
            console.log(`  Payment Method: ${metadata.paymentMethodId || 'なし'}`);
            console.log(`  Customer ID: ${metadata.customerId || 'なし'}`);
          } catch (e) {
            console.log(`  メタデータ解析エラー`);
          }
        }
      } else {
        console.log(`\n💳 決済情報: なし`);
      }
      
      // Cron実行可否の判定
      console.log(`\n🚦 Cron実行判定:`);
      if (reservation.status !== 'APPROVED') {
        console.log(`  ❌ ステータスがAPPROVEDではない (${reservation.status})`);
      } else if (!reservation.payments) {
        console.log(`  ❌ 決済情報が存在しない`);
      } else if (reservation.payments.status !== 'SETUP_COMPLETED') {
        console.log(`  ❌ 決済ステータスがSETUP_COMPLETEDではない (${reservation.payments.status})`);
      } else if (!isNewFlow) {
        console.log(`  ❌ 旧フロー対象`);
      } else if (!shouldExecute) {
        console.log(`  ❌ まだ実行タイミングではない`);
      } else {
        console.log(`  ✅ Cron実行対象`);
      }
    }
    
    // APPROVEDステータスの予約を確認
    console.log('\n\n📊 APPROVEDステータスの予約:');
    const approvedReservations = await prisma.reservations.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        payments: true
      },
      orderBy: {
        booked_start_time: 'asc'
      }
    });
    
    console.log(`合計: ${approvedReservations.length}件`);
    for (const res of approvedReservations) {
      const startTime = res.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const paymentStatus = res.payments?.status || 'なし';
      console.log(`- ID: ${res.id}, 開始: ${startTime}, 決済: ${paymentStatus}`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentExecutionDetails();
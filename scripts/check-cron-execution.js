// Cronジョブの実行状況を詳細にチェック
const { PrismaClient } = require('@prisma/client');
const { differenceInMinutes, isAfter } = require('date-fns');

const prisma = new PrismaClient();

// 新ポリシー適用開始日（payment-flow.tsと同じ値を使用）
const NEW_POLICY_START_DATE = new Date('2025-06-02T15:00:00Z');

async function checkCronExecution() {
  try {
    console.log('🔍 Cron決済実行チェック');
    console.log('='.repeat(50));
    
    const now = new Date();
    console.log('現在時刻:', now.toISOString());
    console.log('現在時刻 (JST):', now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    
    // 2時間以内に開始されるレッスンを検索
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    console.log('\n📋 検索条件:');
    console.log('開始:', fiveMinutesAgo.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    console.log('終了:', twoHoursFromNow.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    
    // APPROVEDステータスの予約を検索
    const approvedReservations = await prisma.reservations.findMany({
      where: {
        status: 'APPROVED',
        booked_start_time: {
          gte: fiveMinutesAgo,
          lte: twoHoursFromNow,
        },
        payment_id: {
          not: null
        }
      },
      include: {
        payments: true,
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
    
    console.log(`\n📊 APPROVEDステータスの予約: ${approvedReservations.length}件`);
    
    for (const reservation of approvedReservations) {
      console.log('\n' + '─'.repeat(50));
      console.log(`予約ID: ${reservation.id}`);
      console.log(`学生: ${reservation.users.name} (${reservation.users.email})`);
      console.log(`メンター: ${reservation.lesson_slots.users.name}`);
      console.log(`開始時刻: ${reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      
      // 新フロー対象かチェック
      const isNewFlow = isAfter(reservation.booked_start_time, NEW_POLICY_START_DATE);
      console.log(`\n🔄 フロー判定:`);
      console.log(`  新フロー対象: ${isNewFlow ? '✅ はい' : '❌ いいえ'}`);
      
      if (!isNewFlow) {
        console.log(`  ⚠️ 旧フロー対象のためCron実行対象外`);
        continue;
      }
      
      // 時間計算
      const minutesUntilLesson = differenceInMinutes(reservation.booked_start_time, now);
      const shouldExecuteImmediately = minutesUntilLesson <= 120;
      
      console.log(`\n⏰ タイミング計算:`);
      console.log(`  レッスンまで: ${minutesUntilLesson}分 (${(minutesUntilLesson / 60).toFixed(2)}時間)`);
      console.log(`  2時間以内: ${shouldExecuteImmediately ? '✅ はい' : '❌ いいえ'}`);
      
      // 決済情報確認
      if (reservation.payments) {
        console.log(`\n💳 決済情報:`);
        console.log(`  決済ID: ${reservation.payments.id}`);
        console.log(`  ステータス: ${reservation.payments.status}`);
        console.log(`  金額: ¥${reservation.payments.amount.toLocaleString()}`);
        
        // charge_executed_atの確認（生SQL）
        const paymentExecution = await prisma.$queryRaw`
          SELECT charge_executed_at, stripe_payment_id 
          FROM payments 
          WHERE id = ${reservation.payments.id}
        `;
        
        if (paymentExecution.length > 0) {
          const execData = paymentExecution[0];
          console.log(`  実行日時: ${execData.charge_executed_at ? new Date(execData.charge_executed_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '未実行'}`);
          console.log(`  Stripe Payment ID: ${execData.stripe_payment_id || 'なし'}`);
        }
        
        // 実行可否判定
        console.log(`\n🎯 Cron実行判定:`);
        if (reservation.payments.status !== 'SETUP_COMPLETED') {
          console.log(`  ❌ Setup未完了のため実行不可`);
        } else if (paymentExecution[0]?.charge_executed_at) {
          console.log(`  ❌ 既に実行済み`);
        } else if (!shouldExecuteImmediately) {
          console.log(`  ❌ まだ2時間前になっていない`);
        } else {
          console.log(`  ✅ Cron実行対象！`);
          console.log(`  ⚠️ この予約は次回のCron実行で決済されるはずです`);
        }
      } else {
        console.log(`\n⚠️ 決済情報なし`);
      }
    }
    
    // まとめ
    console.log('\n' + '='.repeat(50));
    console.log('📊 サマリー:');
    
    const eligibleCount = approvedReservations.filter(r => {
      if (!r.payments || r.payments.status !== 'SETUP_COMPLETED') return false;
      const isNewFlow = isAfter(r.booked_start_time, NEW_POLICY_START_DATE);
      if (!isNewFlow) return false;
      const minutesUntilLesson = differenceInMinutes(r.booked_start_time, now);
      return minutesUntilLesson <= 120;
    }).length;
    
    console.log(`  APPROVED予約総数: ${approvedReservations.length}件`);
    console.log(`  新フロー対象: ${approvedReservations.filter(r => isAfter(r.booked_start_time, NEW_POLICY_START_DATE)).length}件`);
    console.log(`  Cron実行対象: ${eligibleCount}件`);
    
    if (eligibleCount > 0) {
      console.log(`\n⚠️ ${eligibleCount}件の予約が決済待ちです！`);
      console.log('GitHub ActionsのCronジョブが正しく動作しているか確認してください。');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCronExecution();
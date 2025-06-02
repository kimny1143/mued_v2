const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestReservation() {
  try {
    console.log('🔧 Cronテスト用の予約データを作成します...');
    
    // 1時間30分後のレッスンを設定（2時間以内なので即座決済対象）
    const lessonStartTime = new Date(Date.now() + 90 * 60 * 1000);
    const lessonEndTime = new Date(lessonStartTime.getTime() + 60 * 60 * 1000);
    
    console.log('📅 テストデータ:');
    console.log('  現在時刻:', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    console.log('  レッスン開始:', lessonStartTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    console.log('  レッスン終了:', lessonEndTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    console.log('  開始まで:', Math.round((lessonStartTime - new Date()) / 60000), '分');
    
    // 最初の生徒とメンターを取得
    const student = await prisma.users.findFirst({
      where: {
        roles: {
          some: { role_name: 'student' }
        }
      }
    });
    
    const mentor = await prisma.users.findFirst({
      where: {
        roles: {
          some: { role_name: 'mentor' }
        }
      }
    });
    
    if (!student || !mentor) {
      throw new Error('生徒またはメンターが見つかりません');
    }
    
    console.log('👤 使用するユーザー:');
    console.log('  生徒:', student.email);
    console.log('  メンター:', mentor.email);
    
    // レッスンスロットを作成
    const slot = await prisma.lesson_slots.create({
      data: {
        teacher_id: mentor.id,
        start_time: lessonStartTime,
        end_time: lessonEndTime,
        is_available: true,
        hourly_rate: 5000,
        currency: 'jpy',
        minDuration: 60,
        maxDuration: 60,
      }
    });
    
    console.log('✅ レッスンスロット作成:', slot.id);
    
    // 予約を作成（承認済み状態）
    const reservation = await prisma.reservations.create({
      data: {
        slot_id: slot.id,
        student_id: student.id,
        status: 'APPROVED',
        booked_start_time: lessonStartTime,
        booked_end_time: lessonEndTime,
        hours_booked: 1,
        duration_minutes: 60,
        total_amount: 5000,
        notes: 'Cronテスト用予約',
        approved_at: new Date(),
        approved_by: mentor.id,
      }
    });
    
    console.log('✅ 予約作成（承認済み）:', reservation.id);
    
    // 決済情報を作成（Setup完了状態）
    const payment = await prisma.payments.create({
      data: {
        stripe_payment_id: null,
        stripe_session_id: 'test_session_' + Date.now(),
        amount: 5000,
        currency: 'jpy',
        status: 'SETUP_COMPLETED',
        user_id: student.id,
        metadata: JSON.stringify({
          setupIntentId: 'test_setup_' + Date.now(),
          paymentMethodId: 'pm_test_' + Date.now(),
          customerId: 'cus_test_' + Date.now(),
          setupCompletedAt: new Date().toISOString()
        })
      }
    });
    
    // 予約に決済情報を関連付け
    await prisma.reservations.update({
      where: { id: reservation.id },
      data: { payment_id: payment.id }
    });
    
    console.log('✅ 決済情報作成（Setup完了）:', payment.id);
    
    console.log('\n🎯 Cronテスト準備完了！');
    console.log('  予約ID:', reservation.id);
    console.log('  決済ID:', payment.id);
    console.log('  レッスン開始まで:', Math.round((lessonStartTime - new Date()) / 60000), '分');
    console.log('\n💡 以下のコマンドでCronジョブをテスト実行してください:');
    console.log('  curl -X GET "YOUR_APP_URL/api/cron/execute-payments" -H "Authorization: Bearer YOUR_CRON_SECRET"');
    console.log('\n  または管理者アカウントでログイン後:');
    console.log('  GET /api/cron/execute-payments/test');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
createTestReservation();
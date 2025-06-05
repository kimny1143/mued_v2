const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkReservationStatus() {
  console.log('🔍 予約と決済の状況確認');
  
  try {
    // 最近の予約を取得
    const reservations = await prisma.reservations.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        payments: true,
        lesson_slots: {
          include: {
            users: {
              select: { name: true, email: true }
            }
          }
        },
        users: {
          select: { name: true, email: true }
        }
      }
    });

    console.log(`\n📋 最新の予約 ${reservations.length} 件:`);
    
    for (const reservation of reservations) {
      console.log('\n---');
      console.log(`予約ID: ${reservation.id}`);
      console.log(`学生: ${reservation.users.name} (${reservation.users.email})`);
      console.log(`メンター: ${reservation.lesson_slots.users.name}`);
      console.log(`ステータス: ${reservation.status}`);
      console.log(`予約時間: ${reservation.booked_start_time} - ${reservation.booked_end_time}`);
      console.log(`金額: ¥${reservation.total_amount}`);
      console.log(`承認日時: ${reservation.approved_at || 'なし'}`);
      console.log(`承認者: ${reservation.approved_by || 'なし'}`);
      
      if (reservation.payments) {
        console.log(`\n💳 決済情報:`);
        console.log(`  決済ID: ${reservation.payments.id}`);
        console.log(`  Stripeセッション: ${reservation.payments.stripe_session_id}`);
        console.log(`  StripeペイメントID: ${reservation.payments.stripe_payment_id || 'なし'}`);
        console.log(`  決済ステータス: ${reservation.payments.status}`);
        console.log(`  金額: ¥${reservation.payments.amount}`);
        
        if (reservation.payments.metadata) {
          const metadata = JSON.parse(reservation.payments.metadata);
          console.log(`  Setup Intent ID: ${metadata.setupIntentId || 'なし'}`);
          console.log(`  Payment Method ID: ${metadata.paymentMethodId || 'なし'}`);
          console.log(`  Customer ID: ${metadata.customerId || 'なし'}`);
        }
      } else {
        console.log(`💳 決済情報: なし`);
      }
    }

    // ステータス別の統計
    const statusCounts = await prisma.reservations.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    console.log(`\n📊 予約ステータス別統計:`);
    for (const stat of statusCounts) {
      console.log(`  ${stat.status}: ${stat._count.status} 件`);
    }

    // 決済ステータス別の統計
    const paymentStatusCounts = await prisma.payments.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    console.log(`\n💰 決済ステータス別統計:`);
    for (const stat of paymentStatusCounts) {
      console.log(`  ${stat.status}: ${stat._count.status} 件`);
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservationStatus(); 
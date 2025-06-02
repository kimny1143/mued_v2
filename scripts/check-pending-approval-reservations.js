const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingApprovalReservations() {
  try {
    console.log('🔍 PENDING_APPROVAL予約の確認を開始します...\n');
    
    // 1. 全予約のステータス統計
    const statusStats = await prisma.reservations.groupBy({
      by: ['status'],
      _count: true,
      orderBy: {
        _count: {
          status: 'desc'
        }
      }
    });
    
    console.log('📊 予約ステータスの統計:');
    console.table(statusStats.map(s => ({
      ステータス: s.status,
      件数: s._count
    })));
    
    // 2. PENDING_APPROVALの予約を詳細確認
    const pendingApprovalReservations = await prisma.reservations.findMany({
      where: {
        status: 'PENDING_APPROVAL'
      },
      include: {
        lesson_slots: {
          include: {
            users: true // teacher情報
          }
        },
        users: true, // student情報
        payments: true
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 10 // 最新10件
    });
    
    console.log(`\n🔍 PENDING_APPROVAL予約の詳細 (最新${pendingApprovalReservations.length}件):`);
    
    if (pendingApprovalReservations.length === 0) {
      console.log('⚠️ PENDING_APPROVALの予約が見つかりません');
    } else {
      pendingApprovalReservations.forEach((res, idx) => {
        console.log(`\n【${idx + 1}. 予約ID: ${res.id}】`);
        console.log(`  作成日時: ${res.created_at.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`  レッスン日時: ${res.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`  生徒: ${res.users?.name || 'なし'} (${res.users?.email})`);
        console.log(`  メンター: ${res.lesson_slots?.users?.name || 'なし'}`);
        console.log(`  スロットID: ${res.slot_id}`);
        console.log(`  金額: ¥${res.total_amount.toLocaleString()}`);
        console.log(`  決済状態: ${res.payments?.status || 'なし'}`);
      });
    }
    
    // 3. 未来のレッスンでPENDING_APPROVALのものを確認
    const futurePendingApprovals = await prisma.reservations.count({
      where: {
        status: 'PENDING_APPROVAL',
        booked_start_time: {
          gt: new Date()
        }
      }
    });
    
    console.log(`\n📅 未来のPENDING_APPROVAL予約: ${futurePendingApprovals}件`);
    
    // 4. 最新の予約を確認（ステータス関係なく）
    const latestReservations = await prisma.reservations.findMany({
      orderBy: {
        created_at: 'desc'
      },
      include: {
        lesson_slots: {
          include: {
            users: true
          }
        },
        users: true
      },
      take: 5
    });
    
    console.log('\n📋 最新の予約5件（全ステータス）:');
    latestReservations.forEach((res, idx) => {
      console.log(`${idx + 1}. ${res.status} - ${res.created_at.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} - ${res.users?.name} → ${res.lesson_slots?.users?.name}`);
    });
    
    // 5. 特定の日付範囲の予約を確認
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 7); // 今後7日間
    
    const upcomingReservations = await prisma.reservations.findMany({
      where: {
        booked_start_time: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
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
    
    console.log(`\n📅 今後7日間の予約 (${upcomingReservations.length}件):`);
    const statusCount = upcomingReservations.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {});
    console.table(statusCount);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
checkPendingApprovalReservations();
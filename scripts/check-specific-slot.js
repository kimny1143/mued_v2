const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificSlot() {
  try {
    const slotId = '4e5910f0-1120-472e-a676-cb6ada1cde57';
    console.log(`🔍 スロット ${slotId} の詳細確認...\n`);
    
    // スロット情報を取得
    const slot = await prisma.lesson_slots.findUnique({
      where: { id: slotId },
      include: {
        users: true,
        reservations: {
          include: {
            users: true,
            payments: true
          }
        }
      }
    });
    
    if (!slot) {
      console.log('❌ スロットが見つかりません');
      return;
    }
    
    console.log('📊 スロット情報:');
    console.log(`  ID: ${slot.id}`);
    console.log(`  開始時間: ${slot.start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`  終了時間: ${slot.end_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`  メンター: ${slot.users.name} (${slot.users.email})`);
    console.log(`  時給: ¥${slot.hourly_rate}`);
    console.log(`  利用可能: ${slot.is_available}`);
    
    console.log(`\n📋 予約情報 (${slot.reservations.length}件):`);
    slot.reservations.forEach((res, idx) => {
      console.log(`\n  [${idx + 1}] 予約ID: ${res.id}`);
      console.log(`      ステータス: ${res.status}`);
      console.log(`      生徒: ${res.users?.name} (${res.users?.email})`);
      console.log(`      予約開始: ${res.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`      予約終了: ${res.booked_end_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`      金額: ¥${res.total_amount}`);
      console.log(`      決済状態: ${res.payments?.status || 'なし'}`);
      console.log(`      作成日時: ${res.created_at.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    });
    
    // APIと同じクエリで確認
    console.log('\n🔍 APIと同じ条件でクエリ実行:');
    const apiStyleQuery = await prisma.lesson_slots.findMany({
      where: {
        id: slotId
      },
      include: {
        users: {
          select: { id: true, name: true, image: true }
        },
        reservations: {
          where: { 
            status: { in: ['PENDING', 'CONFIRMED', 'APPROVED', 'PENDING_APPROVAL'] } 
          },
          select: {
            id: true,
            booked_start_time: true,
            booked_end_time: true,
            status: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    console.log('APIスタイルのクエリ結果:');
    console.log(JSON.stringify(apiStyleQuery, null, 2));
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
checkSpecificSlot();
const { PrismaClient } = require('@prisma/client');

async function checkSpecificSlot() {
  const prisma = new PrismaClient();
  
  try {
    const slotId = '4e5910f0-1120-472e-a676-cb6ada1cde57';
    console.log(`🔍 スロット ${slotId} の詳細確認...\n`);
    
    // スロット情報を取得（$queryRawを使用）
    const slots = await prisma.$queryRawUnsafe(`
      SELECT 
        ls.*,
        u.name as teacher_name,
        u.email as teacher_email
      FROM lesson_slots ls
      JOIN users u ON ls.teacher_id = u.id
      WHERE ls.id = $1
    `, slotId);
    
    if (slots.length === 0) {
      console.log('❌ スロットが見つかりません');
      return;
    }
    
    const slot = slots[0];
    console.log('📊 スロット情報:');
    console.log(`  ID: ${slot.id}`);
    console.log(`  開始時間: ${slot.start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`  終了時間: ${slot.end_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`  メンター: ${slot.teacher_name} (${slot.teacher_email})`);
    console.log(`  時給: ¥${slot.hourly_rate}`);
    console.log(`  利用可能: ${slot.is_available}`);
    
    // 予約情報を取得
    const reservations = await prisma.$queryRawUnsafe(`
      SELECT 
        r.*,
        u.name as student_name,
        u.email as student_email,
        p.status as payment_status
      FROM reservations r
      LEFT JOIN users u ON r.student_id = u.id
      LEFT JOIN payments p ON r.payment_id = p.id
      WHERE r.slot_id = $1
      ORDER BY r.created_at DESC
    `, slotId);
    
    console.log(`\n📋 予約情報 (${reservations.length}件):`);
    reservations.forEach((res, idx) => {
      console.log(`\n  [${idx + 1}] 予約ID: ${res.id}`);
      console.log(`      ステータス: ${res.status}`);
      console.log(`      生徒: ${res.student_name} (${res.student_email})`);
      console.log(`      予約開始: ${res.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`      予約終了: ${res.booked_end_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`      金額: ¥${res.total_amount}`);
      console.log(`      決済状態: ${res.payment_status || 'なし'}`);
      console.log(`      作成日時: ${res.created_at.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    });
    
    // ステータス別の予約数を確認
    const statusCounts = await prisma.$queryRawUnsafe(`
      SELECT 
        status,
        COUNT(*) as count
      FROM reservations
      WHERE slot_id = $1
      GROUP BY status
    `, slotId);
    
    console.log('\n📊 ステータス別予約数:');
    console.table(statusCounts);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
checkSpecificSlot();
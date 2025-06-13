/**
 * 重複している承認待ち予約をクリーンアップするスクリプト
 * 同一生徒・同一時間帯の複数の承認待ち予約から1つだけを残す
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicateReservations() {
  console.log('🧹 重複予約のクリーンアップを開始します...');
  
  try {
    // 承認待ちの予約を全て取得
    const pendingReservations = await prisma.reservations.findMany({
      where: {
        status: 'PENDING_APPROVAL'
      },
      include: {
        users: true,
        lesson_slots: {
          include: {
            users: true
          }
        }
      },
      orderBy: {
        created_at: 'asc' // 古い順に並べる
      }
    });
    
    console.log(`📊 承認待ち予約数: ${pendingReservations.length}件`);
    
    // 生徒IDと時間でグループ化
    const groupedReservations = {};
    
    pendingReservations.forEach(reservation => {
      const key = `${reservation.student_id}_${reservation.booked_start_time}_${reservation.booked_end_time}`;
      
      if (!groupedReservations[key]) {
        groupedReservations[key] = [];
      }
      
      groupedReservations[key].push(reservation);
    });
    
    // 重複があるグループを見つける
    const duplicateGroups = Object.entries(groupedReservations)
      .filter(([key, reservations]) => reservations.length > 1);
    
    console.log(`🔍 重複グループ数: ${duplicateGroups.length}`);
    
    let totalDeleted = 0;
    
    // 各グループで最初の1つを残して他を削除
    for (const [key, reservations] of duplicateGroups) {
      const [keep, ...toDelete] = reservations;
      
      console.log(`\n📍 重複グループ: ${key}`);
      console.log(`  生徒: ${keep.users.name || keep.users.email}`);
      console.log(`  メンター: ${keep.lesson_slots.users.name || keep.lesson_slots.users.email}`);
      console.log(`  時間: ${new Date(keep.booked_start_time).toLocaleString('ja-JP')} - ${new Date(keep.booked_end_time).toLocaleString('ja-JP')}`);
      console.log(`  保持: ${keep.id} (作成: ${new Date(keep.created_at).toLocaleString('ja-JP')})`);
      
      for (const reservation of toDelete) {
        console.log(`  削除: ${reservation.id} (作成: ${new Date(reservation.created_at).toLocaleString('ja-JP')})`);
        
        // 実際に削除（本番実行時はコメントアウトを外す）
        // await prisma.reservations.delete({
        //   where: { id: reservation.id }
        // });
        
        totalDeleted++;
      }
    }
    
    console.log(`\n✅ クリーンアップ完了`);
    console.log(`   削除予定数: ${totalDeleted}件`);
    console.log(`\n⚠️  注意: 実際の削除を実行するにはスクリプト内のコメントアウトを外してください`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
cleanupDuplicateReservations();
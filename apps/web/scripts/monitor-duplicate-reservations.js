/**
 * 重複予約の状況をモニタリングするスクリプト
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function monitorDuplicateReservations() {
  console.log('📊 予約状況のモニタリング開始...\n');
  
  try {
    // 全ての予約を取得（過去1週間）
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const reservations = await prisma.reservations.findMany({
      where: {
        created_at: {
          gte: oneWeekAgo
        }
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
        created_at: 'desc'
      }
    });
    
    console.log(`📅 過去1週間の予約総数: ${reservations.length}件\n`);
    
    // ステータス別集計
    const statusCount = {};
    reservations.forEach(r => {
      statusCount[r.status] = (statusCount[r.status] || 0) + 1;
    });
    
    console.log('📈 ステータス別集計:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}件`);
    });
    
    // 重複チェック
    console.log('\n🔍 重複予約チェック:');
    
    const duplicateMap = {};
    reservations.forEach(reservation => {
      const key = `${reservation.student_id}_${reservation.booked_start_time}_${reservation.booked_end_time}`;
      
      if (!duplicateMap[key]) {
        duplicateMap[key] = [];
      }
      
      duplicateMap[key].push(reservation);
    });
    
    const duplicates = Object.entries(duplicateMap)
      .filter(([key, list]) => list.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
    
    if (duplicates.length === 0) {
      console.log('  ✅ 重複予約は見つかりませんでした');
    } else {
      console.log(`  ⚠️  重複予約が ${duplicates.length} グループ見つかりました:\n`);
      
      duplicates.forEach(([key, dups], index) => {
        const sample = dups[0];
        console.log(`  ${index + 1}. 生徒: ${sample.users.name || sample.users.email}`);
        console.log(`     メンター: ${sample.lesson_slots.users.name || sample.lesson_slots.users.email}`);
        console.log(`     時間: ${new Date(sample.booked_start_time).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`     重複数: ${dups.length}件`);
        console.log(`     ステータス: ${dups.map(d => d.status).join(', ')}`);
        console.log(`     作成時刻差: ${Math.max(...dups.map(d => new Date(d.created_at).getTime())) - Math.min(...dups.map(d => new Date(d.created_at).getTime()))}ms`);
        console.log('');
      });
    }
    
    // 短時間での連続作成チェック
    console.log('\n⏱️  短時間での連続予約作成チェック:');
    
    const studentCreations = {};
    reservations.forEach(r => {
      if (!studentCreations[r.student_id]) {
        studentCreations[r.student_id] = [];
      }
      studentCreations[r.student_id].push(r);
    });
    
    let rapidCreations = 0;
    Object.entries(studentCreations).forEach(([studentId, resList]) => {
      if (resList.length < 2) return;
      
      // 作成時刻順にソート
      resList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      for (let i = 1; i < resList.length; i++) {
        const timeDiff = new Date(resList[i].created_at) - new Date(resList[i-1].created_at);
        
        // 5秒以内に作成された予約をチェック
        if (timeDiff < 5000) {
          rapidCreations++;
          console.log(`  ⚡ 生徒 ${resList[i].users.name || resList[i].users.email} が ${timeDiff}ms 間隔で予約を作成`);
          console.log(`     1つ目: ${new Date(resList[i-1].created_at).toLocaleString('ja-JP')}`);
          console.log(`     2つ目: ${new Date(resList[i].created_at).toLocaleString('ja-JP')}`);
        }
      }
    });
    
    if (rapidCreations === 0) {
      console.log('  ✅ 短時間での連続作成は見つかりませんでした');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
monitorDuplicateReservations();
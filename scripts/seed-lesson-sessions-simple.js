const { PrismaClient } = require('@prisma/client');

// コマンドライン引数を解析
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const forceAll = args.includes('--force-all');

async function seedLessonSessions() {
  console.log('🌱 レッスンセッションシードスクリプト開始');
  console.log(`モード: ${isDryRun ? 'ドライラン' : '本実行'}`);
  console.log('');

  // 新しいPrismaClientインスタンスを作成
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  
  try {
    // 対象となる予約を取得（Prismaの標準クエリビルダーを使用）
    const targetStatuses = ['APPROVED', 'CONFIRMED'];
    if (forceAll) {
      targetStatuses.push('COMPLETED');
    }

    console.log('📋 対象予約を検索中...');
    
    const reservations = await prisma.reservations.findMany({
      where: {
        status: { in: targetStatuses },
        lesson_session: null // lesson_sessionが存在しない予約のみ
      },
      include: {
        users: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          } 
        },
        lesson_slots: {
          include: {
            users: { 
              select: { 
                id: true, 
                name: true, 
                email: true 
              } 
            }
          }
        }
      },
      orderBy: { 
        booked_start_time: 'asc' 
      }
    });

    if (reservations.length === 0) {
      console.log('✅ 対象となる予約がありません。すべての予約にセッションが作成済みです。');
      return;
    }

    console.log(`📋 対象予約数: ${reservations.length} 件\n`);

    // 現在時刻
    const now = new Date();
    
    // 統計情報
    const stats = {
      past: 0,
      future: 0,
      created: 0,
      errors: 0
    };

    console.log('予約詳細:');
    console.log('='.repeat(80));

    // 作成するセッションのリスト
    const sessionsToCreate = [];

    for (const reservation of reservations) {
      const isPast = reservation.booked_end_time < now;
      const sessionStatus = isPast ? 'COMPLETED' : 'SCHEDULED';
      
      console.log(`予約ID: ${reservation.id}`);
      console.log(`  生徒: ${reservation.users.name} (${reservation.users.email})`);
      console.log(`  メンター: ${reservation.lesson_slots.users.name} (${reservation.lesson_slots.users.email})`);
      console.log(`  予約日時: ${reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`  現在の状態: ${reservation.status}`);
      console.log(`  セッション状態: ${sessionStatus} (${isPast ? '過去' : '将来'})`);
      
      const sessionData = {
        reservation_id: reservation.id,
        scheduled_start: reservation.booked_start_time,
        scheduled_end: reservation.booked_end_time,
        status: sessionStatus,
        // 過去の予約は実際の開始・終了時刻を予定時刻と同じにする
        actual_start: isPast ? reservation.booked_start_time : null,
        actual_end: isPast ? reservation.booked_end_time : null,
        // 過去の完了済みセッションには自動メモを追加
        lesson_notes: isPast ? '（既存予約から自動作成されたセッション）' : null
      };

      sessionsToCreate.push({
        data: sessionData,
        reservation: reservation
      });
      
      // 統計情報の更新
      if (isPast) {
        stats.past++;
      } else {
        stats.future++;
      }
      
      console.log('---');
    }

    console.log('='.repeat(80));
    console.log('\n📊 作成予定の統計:');
    console.log(`  過去の予約: ${stats.past} 件 → COMPLETED`);
    console.log(`  将来の予約: ${stats.future} 件 → SCHEDULED`);
    console.log(`  合計: ${sessionsToCreate.length} 件\n`);

    if (isDryRun) {
      console.log('⚠️  ドライランモードのため、実際の作成は行われませんでした。');
      console.log('本実行するには、--dry-run オプションを外して再実行してください。');
      return;
    }

    // セッションを作成（個別に作成してエラーハンドリング）
    console.log('🔄 セッション作成を開始します...');
    
    for (const { data, reservation } of sessionsToCreate) {
      try {
        const session = await prisma.lesson_sessions.create({
          data: data
        });
        
        stats.created++;
        console.log(`✅ セッション作成成功: 予約ID ${reservation.id}`);
        
      } catch (error) {
        stats.errors++;
        console.error(`❌ セッション作成失敗: 予約ID ${reservation.id}`);
        console.error(`   エラー: ${error.message}`);
      }
    }

    console.log(`\n📊 作成結果:`);
    console.log(`  成功: ${stats.created} 件`);
    console.log(`  失敗: ${stats.errors} 件`);

    // 作成後の統計を取得
    const finalStats = await prisma.lesson_sessions.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    console.log('\n📊 最終的なセッションステータス統計:');
    for (const stat of finalStats) {
      console.log(`  ${stat.status}: ${stat._count.status} 件`);
    }

    // 過去の確定済み予約のヒント
    const pastConfirmedCount = reservations.filter(r => 
      r.booked_end_time < now && r.status === 'CONFIRMED'
    ).length;

    if (pastConfirmedCount > 0) {
      console.log(`\n💡 ヒント: ${pastConfirmedCount} 件の過去の確定済み予約があります。`);
      console.log('これらの予約ステータスをCOMPLETEDに更新することを検討してください。');
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    console.error('エラーの詳細:', error.message);
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    throw error;
  } finally {
    // 必ず接続を切断
    await prisma.$disconnect();
    console.log('\n🔌 データベース接続を切断しました');
  }
}

// ヘルプメッセージ
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
使い方: node seed-lesson-sessions-simple.js [オプション]

オプション:
  --dry-run    ドライランモード（実際の作成は行わない）
  --force-all  すべての予約を対象にする（テスト用）
  --help, -h   このヘルプを表示

例:
  node seed-lesson-sessions-simple.js --dry-run  # ドライラン実行
  node seed-lesson-sessions-simple.js            # 本実行

注意事項:
  - このスクリプトは既存の承認済み・確定済み予約に対してlesson_sessionsレコードを作成します
  - 本来は予約承認時に自動作成されるものですが、システム導入前の予約に対する移行措置です
  - 実行前に必ずドライランで確認してください
`);
  process.exit(0);
}

// スクリプト実行
console.log('🚀 スクリプトを開始します...\n');

seedLessonSessions()
  .then(() => {
    console.log('\n✨ スクリプトが正常に完了しました');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 スクリプト実行エラー:', error.message);
    process.exit(1);
  });
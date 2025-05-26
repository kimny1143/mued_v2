// テスト用のシードデータ生成スクリプト
// 注意: このスクリプトは post-reset-init.sql 実行後に使用してください
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🌱 テスト用データベースにシードデータを投入しています...');

  try {
    // 1. SQLファイルを使用してサンプルデータを投入
    await executeSqlFile();
    
    // 2. 追加のテスト用データ（必要に応じて）
    await createAdditionalTestData();
    
    console.log('✅ シードデータの投入が完了しました');
  } catch (error) {
    console.error('❌ シードデータの投入中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// SQLファイルを実行してサンプルデータを投入
async function executeSqlFile() {
  console.log('📄 SQLファイルからサンプルデータを投入中...');
  
  const sqlFilePath = path.join(process.cwd(), 'prisma', 'seed', 'sample-data.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.log('⚠️ sample-data.sql が見つかりません。手動でSupabase SQL Editorで実行してください。');
    return;
  }
  
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  
  try {
    // Supabaseで直接SQL実行
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.log('⚠️ SQL実行エラー（手動実行を推奨）:', error.message);
      console.log('📝 以下のSQLをSupabase SQL Editorで手動実行してください:');
      console.log(sqlFilePath);
    } else {
      console.log('✅ SQLファイルからのデータ投入完了');
    }
  } catch (error) {
    console.log('⚠️ SQL実行に失敗しました。手動でSupabase SQL Editorで実行してください:');
    console.log(sqlFilePath);
  }
}

// 追加のテスト用データ作成
async function createAdditionalTestData() {
  console.log('🔧 追加のテスト用データを作成中...');
  
  try {
    // E2Eテスト用の特別なユーザーを作成（必要に応じて）
    const testUsers = await prisma.users.findMany({
    where: {
        email: {
          in: ['test-student@example.com', 'test-mentor@example.com']
        }
    }
  });
  
    if (testUsers.length === 0) {
      // E2Eテスト専用ユーザーを作成
      await prisma.users.createMany({
        data: [
          {
            id: 'test-student-e2e',
            email: 'test-student@example.com',
            name: 'E2E Test Student',
            roleId: 'student',
            emailVerified: new Date()
          },
          {
            id: 'test-mentor-e2e', 
            email: 'test-mentor@example.com',
            name: 'E2E Test Mentor',
            roleId: 'mentor',
            emailVerified: new Date()
          }
        ],
        skipDuplicates: true
      });
      
      console.log('✅ E2Eテスト用ユーザーを作成しました');
    }
    
    // 追加のレッスンスロット（E2Eテスト用）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setHours(17, 0, 0, 0);
    
         await prisma.lesson_slots.createMany({
       data: [
         {
           id: 'e2e-slot-001',
           teacherId: 'test-mentor-e2e',
           startTime: tomorrow,
           endTime: dayAfterTomorrow,
           hourlyRate: 5000,
           currency: 'JPY',
           isAvailable: true,
           minDuration: 60,
           maxDuration: 120,
           createdAt: new Date(),
           updatedAt: new Date()
         }
       ],
       skipDuplicates: true
  });
  
     console.log('✅ E2Eテスト用レッスンスロットを作成しました');
     
   } catch (error) {
     console.log('⚠️ 追加データ作成でエラーが発生しましたが、継続します:', error);
   }
}

// スクリプト実行
main()
  .catch(e => {
    console.error('エラーが発生しました:', e);
    process.exit(1);
  }); 
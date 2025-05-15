// E2Eテスト用のシードデータ生成スクリプト
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('テスト用データベースにシードデータを投入しています...');

  try {
    // 既存のテストユーザーを削除
    await cleanTestData();
    
    // テスト用ユーザーの作成
    const adminUser = await createTestUser('admin@example.com', 'ADMIN');
    const mentorUser = await createTestUser('mentor@example.com', 'MENTOR');
    const studentUser = await createTestUser('student@example.com', 'STUDENT');
    
    console.log(`テストユーザーを作成しました: 
      Admin: ${adminUser.id} (${adminUser.email})
      Mentor: ${mentorUser.id} (${mentorUser.email})
      Student: ${studentUser.id} (${studentUser.email})
    `);
    
    // メンタープロフィールの作成
    const mentorProfile = await prisma.mentorProfile.create({
      data: {
        userId: mentorUser.id,
        bio: 'テスト用メンタープロフィール',
        specialties: ['ピアノ', 'ギター'],
        hourlyRate: 5000,
        isActive: true
      }
    });
    console.log(`メンタープロフィールを作成しました: ${mentorProfile.id}`);
    
    // テスト用レッスンスロットの作成（現在日時から1週間分）
    const now = new Date();
    const slots = [];
    
    for (let i = 1; i <= 7; i++) {
      const startDate = new Date(now);
      startDate.setDate(now.getDate() + i);
      startDate.setHours(10 + (i % 8), 0, 0, 0); // 10時〜18時
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1); // 1時間レッスン
      
      const slot = await prisma.lessonSlot.create({
        data: {
          mentorId: mentorProfile.id,
          start: startDate,
          end: endDate,
          isAvailable: true,
          title: `テストレッスン ${i}`,
          description: `テスト用レッスンスロット ${i}日目`
        }
      });
      slots.push(slot);
    }
    console.log(`${slots.length}件のレッスンスロットを作成しました`);
    
    // テスト用サブスクリプション（Student用）
    const subscription = await prisma.subscription.create({
      data: {
        userId: studentUser.id,
        planType: 'PREMIUM',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(now.setMonth(now.getMonth() + 1)),
        stripeSubscriptionId: 'test_sub_' + Date.now(),
        stripeCustomerId: 'test_cus_' + Date.now()
      }
    });
    console.log(`サブスクリプションを作成しました: ${subscription.id}`);
    
    // テスト用予約（1つ目のスロットを予約済みに）
    if (slots.length > 0) {
      const reservation = await prisma.reservation.create({
        data: {
          slotId: slots[0].id,
          userId: studentUser.id,
          status: 'CONFIRMED',
          notes: 'テスト用予約データ'
        }
      });
      console.log(`予約を作成しました: ${reservation.id} (スロット: ${slots[0].id})`);
      
      // 予約されたスロットを利用不可に更新
      await prisma.lessonSlot.update({
        where: { id: slots[0].id },
        data: { isAvailable: false }
      });
    }
    
    console.log('シードデータの投入が完了しました');
  } catch (error) {
    console.error('シードデータの投入中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// テスト用のユーザーを作成する関数
async function createTestUser(email: string, role: 'ADMIN' | 'MENTOR' | 'STUDENT') {
  return await prisma.user.create({
    data: {
      email,
      name: `Test ${role}`,
      role,
      emailVerified: new Date(),
      image: `https://ui-avatars.com/api/?name=Test+${role}`,
    }
  });
}

// テストデータのクリーンアップ
async function cleanTestData() {
  const testEmails = [
    'admin@example.com',
    'mentor@example.com', 
    'student@example.com'
  ];
  
  // テスト用メールアドレスのユーザーを検索
  const users = await prisma.user.findMany({
    where: {
      email: { in: testEmails }
    }
  });
  
  // 関連データの削除
  for (const user of users) {
    // ユーザーの予約を削除
    await prisma.reservation.deleteMany({
      where: { userId: user.id }
    });
    
    // ユーザーのサブスクリプションを削除
    await prisma.subscription.deleteMany({
      where: { userId: user.id }
    });
    
    // メンタープロフィールを検索
    const mentorProfile = await prisma.mentorProfile.findFirst({
      where: { userId: user.id }
    });
    
    if (mentorProfile) {
      // メンターのレッスンスロットを削除
      await prisma.lessonSlot.deleteMany({
        where: { mentorId: mentorProfile.id }
      });
      
      // メンタープロフィールを削除
      await prisma.mentorProfile.delete({
        where: { id: mentorProfile.id }
      });
    }
  }
  
  // テストユーザーを削除
  await prisma.user.deleteMany({
    where: {
      email: { in: testEmails }
    }
  });
  
  console.log('既存のテストデータをクリーンアップしました');
}

// スクリプト実行
main()
  .catch(e => {
    console.error('エラーが発生しました:', e);
    process.exit(1);
  }); 
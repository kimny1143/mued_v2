#!/usr/bin/env node

/**
 * データベースの決済ステータスを更新するスクリプト
 */

const { PrismaClient } = require('@prisma/client');

// 失敗した決済IDのリスト
const failedPaymentIds = [
  'eeabda7b-67ab-497f-9cb5-f86043d73460',
  'a41291b4-1b38-4b88-afa2-3f08302fadba',
  '1c6b396d-e522-49a6-a6ce-49521264a859'
];

async function updatePaymentStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 データベースの決済ステータスを更新中...\n');

    for (const paymentId of failedPaymentIds) {
      try {
        // 決済ステータスをCANCELEDに更新
        const updatedPayment = await prisma.payments.update({
          where: { id: paymentId },
          data: { 
            status: 'CANCELED',
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ 決済 ${paymentId}: CANCELED に更新`);
      } catch (error) {
        console.log(`❌ 決済 ${paymentId}: 更新エラー - ${error.message}`);
      }
    }

    console.log('\n🎉 データベースの決済ステータス更新完了');
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
updatePaymentStatus().catch(console.error); 
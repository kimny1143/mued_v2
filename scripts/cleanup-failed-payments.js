#!/usr/bin/env node

/**
 * 失敗した決済データの確認と整理スクリプト
 * 
 * このスクリプトは以下を実行します：
 * 1. 失敗したPayment Intentの確認
 * 2. 不整合な予約データの確認
 * 3. 必要に応じてクリーンアップ
 */

const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

async function main() {
  console.log('🔍 失敗した決済データの確認を開始...\n');

  try {
    // 1. データベースから失敗した決済を確認
    console.log('📊 データベースの決済状況確認...');
    
    const failedPayments = await prisma.payments.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'CANCELED' },
        ]
      },
      include: {
        reservations: {
          include: {
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
        }
      }
    });

    console.log(`  見つかった問題のある決済: ${failedPayments.length}件\n`);

    // 2. Stripeから失敗したPayment Intentを確認
    console.log('💳 Stripeの失敗したPayment Intent確認...');
    
    const failedPaymentIntents = [];
    
    for (const payment of failedPayments) {
      if (payment.stripePaymentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
          
          if (paymentIntent.status === 'requires_payment_method' || 
              paymentIntent.status === 'canceled' ||
              paymentIntent.status === 'payment_failed') {
            failedPaymentIntents.push({
              dbPayment: payment,
              stripePaymentIntent: paymentIntent
            });
          }
        } catch (error) {
          console.log(`  ⚠️  Payment Intent ${payment.stripePaymentId} が見つかりません`);
          failedPaymentIntents.push({
            dbPayment: payment,
            stripePaymentIntent: null,
            error: error.message
          });
        }
      }
    }

    console.log(`  失敗したPayment Intent: ${failedPaymentIntents.length}件\n`);

    // 3. 詳細レポート
    console.log('📋 詳細レポート:');
    console.log('================\n');

    for (const item of failedPaymentIntents) {
      const { dbPayment, stripePaymentIntent, error } = item;
      const reservation = dbPayment.reservations;
      
      console.log(`🔸 決済ID: ${dbPayment.id}`);
      console.log(`   予約ID: ${reservation?.id || 'なし'}`);
      console.log(`   生徒: ${reservation?.users?.name || '不明'} (${reservation?.users?.email || '不明'})`);
      console.log(`   メンター: ${reservation?.lesson_slots?.users?.name || '不明'}`);
      console.log(`   金額: ¥${dbPayment.amount}`);
      console.log(`   DB状態: ${dbPayment.status}`);
      console.log(`   予約状態: ${reservation?.status || '不明'}`);
      
      if (stripePaymentIntent) {
        console.log(`   Stripe状態: ${stripePaymentIntent.status}`);
        console.log(`   Stripe ID: ${stripePaymentIntent.id}`);
      } else if (error) {
        console.log(`   Stripeエラー: ${error}`);
      } else {
        console.log(`   Stripe ID: なし`);
      }
      
      console.log('');
    }

    // 4. 対処方法の提案
    console.log('💡 推奨対処方法:');
    console.log('================\n');

    const requiresPaymentMethodCount = failedPaymentIntents.filter(
      item => item.stripePaymentIntent?.status === 'requires_payment_method'
    ).length;

    const canceledCount = failedPaymentIntents.filter(
      item => item.stripePaymentIntent?.status === 'canceled'
    ).length;

    const notFoundCount = failedPaymentIntents.filter(
      item => !item.stripePaymentIntent && item.error
    ).length;

    if (requiresPaymentMethodCount > 0) {
      console.log(`🔧 ${requiresPaymentMethodCount}件の「requires_payment_method」状態の決済:`);
      console.log('   → これらは新しい決済フローで解決されます');
      console.log('   → 生徒に再予約を依頼するか、手動で決済リンクを送信');
      console.log('');
    }

    if (canceledCount > 0) {
      console.log(`❌ ${canceledCount}件のキャンセル済み決済:`);
      console.log('   → 予約もキャンセルするか、新しい決済を作成');
      console.log('');
    }

    if (notFoundCount > 0) {
      console.log(`🚫 ${notFoundCount}件のStripeで見つからない決済:`);
      console.log('   → データベースから削除するか、新しい決済を作成');
      console.log('');
    }

    // 5. 自動クリーンアップの提案
    console.log('🧹 自動クリーンアップオプション:');
    console.log('================================\n');
    
    console.log('以下のコマンドで自動クリーンアップを実行できます:');
    console.log('');
    console.log('1. 失敗した決済をキャンセル:');
    console.log('   node scripts/cleanup-failed-payments.js --cancel-failed');
    console.log('');
    console.log('2. 孤立した予約をクリーンアップ:');
    console.log('   node scripts/cleanup-failed-payments.js --cleanup-orphaned');
    console.log('');
    console.log('3. 全体的なクリーンアップ:');
    console.log('   node scripts/cleanup-failed-payments.js --full-cleanup');
    console.log('');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// コマンドライン引数の処理
async function handleCleanupCommands() {
  const args = process.argv.slice(2);
  
  if (args.includes('--cancel-failed')) {
    await cancelFailedPayments();
  } else if (args.includes('--cleanup-orphaned')) {
    await cleanupOrphanedReservations();
  } else if (args.includes('--full-cleanup')) {
    await fullCleanup();
  } else {
    await main();
  }
}

// 失敗した決済をキャンセル
async function cancelFailedPayments() {
  console.log('🧹 失敗した決済のキャンセルを開始...\n');
  
  // 新しいPrismaクライアントインスタンスを作成
  const localPrisma = new PrismaClient();
  
  try {
    const failedPayments = await localPrisma.payments.findMany({
      where: {
        status: 'PENDING',
        stripePaymentId: { not: null }
      }
    });

    for (const payment of failedPayments) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
        
        if (paymentIntent.status === 'requires_payment_method') {
          // Payment Intentをキャンセル
          await stripe.paymentIntents.cancel(payment.stripePaymentId);
          
          // データベースの状態を更新
          await localPrisma.payments.update({
            where: { id: payment.id },
            data: { status: 'CANCELED' }
          });
          
          console.log(`✅ 決済 ${payment.id} をキャンセルしました`);
        }
      } catch (error) {
        console.log(`⚠️  決済 ${payment.id} のキャンセルに失敗: ${error.message}`);
      }
    }
    
    console.log('\n🎉 失敗した決済のキャンセル完了');
  } finally {
    await localPrisma.$disconnect();
  }
}

// 孤立した予約をクリーンアップ
async function cleanupOrphanedReservations() {
  console.log('🧹 孤立した予約のクリーンアップを開始...\n');
  
  // 新しいPrismaクライアントインスタンスを作成
  const localPrisma = new PrismaClient();
  
  try {
    // 決済が失敗している予約を確認
    const orphanedReservations = await localPrisma.reservations.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        payments: {
          status: 'CANCELED'
        }
      },
      include: {
        payments: true
      }
    });

    for (const reservation of orphanedReservations) {
      // 予約をキャンセル状態に更新
      await localPrisma.reservations.update({
        where: { id: reservation.id },
        data: { 
          status: 'CANCELED',
          rejectedAt: new Date(),
          rejectionReason: '決済失敗のため自動キャンセル'
        }
      });
      
      console.log(`✅ 予約 ${reservation.id} をキャンセルしました`);
    }
    
    console.log('\n🎉 孤立した予約のクリーンアップ完了');
  } finally {
    await localPrisma.$disconnect();
  }
}

// 全体的なクリーンアップ
async function fullCleanup() {
  console.log('🧹 全体的なクリーンアップを開始...\n');
  
  await cancelFailedPayments();
  console.log('');
  await cleanupOrphanedReservations();
  
  console.log('\n🎉 全体的なクリーンアップ完了');
}

// スクリプト実行
handleCleanupCommands().catch(console.error); 
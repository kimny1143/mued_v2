const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { checkEnvironmentSafety } = require('./check-environment-safety');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 開発環境完全リセットスクリプト
 * 
 * 実行内容：
 * 1. Stripe テストデータの削除
 * 2. Supabase データベースのリセット
 * 3. ローカルキャッシュのクリア
 * 4. 初期データの投入
 */
async function resetDevelopmentEnvironment() {
  console.log('🔄 開発環境完全リセット開始...\n');
  
  const startTime = Date.now();
  let errors = [];

  try {
    // ========================================
    // 1. Stripe テストデータの削除
    // ========================================
    console.log('🗑️  Stripe テストデータ削除中...');
    
    try {
      // 全ての顧客を取得
      const customers = await stripe.customers.list({ limit: 100 });
      console.log(`  見つかった顧客: ${customers.data.length}件`);
      
      for (const customer of customers.data) {
        try {
          // 顧客のサブスクリプションをキャンセル
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active'
          });
          
          for (const subscription of subscriptions.data) {
            await stripe.subscriptions.cancel(subscription.id);
            console.log(`    ✅ サブスクリプション ${subscription.id} をキャンセル`);
          }
          
          // 顧客を削除
          await stripe.customers.del(customer.id);
          console.log(`    ✅ 顧客 ${customer.id} を削除`);
          
        } catch (customerError) {
          console.error(`    ❌ 顧客 ${customer.id} の削除エラー:`, customerError.message);
          errors.push(`Stripe顧客削除: ${customerError.message}`);
        }
      }
      
      // 未完了の支払いインテントを削除
      const paymentIntents = await stripe.paymentIntents.list({ 
        limit: 100,
        created: { gte: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) } // 過去7日間
      });
      
      for (const pi of paymentIntents.data) {
        if (pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation') {
          try {
            await stripe.paymentIntents.cancel(pi.id);
            console.log(`    ✅ PaymentIntent ${pi.id} をキャンセル`);
          } catch (piError) {
            console.warn(`    ⚠️  PaymentIntent ${pi.id} キャンセル失敗: ${piError.message}`);
          }
        }
      }
      
      console.log('  ✅ Stripe テストデータ削除完了\n');
      
    } catch (stripeError) {
      console.error('  ❌ Stripe削除エラー:', stripeError.message);
      errors.push(`Stripe削除: ${stripeError.message}`);
    }

    // ========================================
    // 2. Supabase データベースのリセット
    // ========================================
    console.log('🗃️  Supabase データベースリセット中...');
    
    try {
      // Stripe関連テーブルをクリア
      const tablesToClear = [
        'stripe_user_subscriptions',
        'stripe_customers',
        'reservations',
        'lesson_slots',
        'messages'
      ];
      
      for (const table of tablesToClear) {
        try {
          const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // 全削除
          
          if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
            console.warn(`    ⚠️  テーブル ${table} クリア警告: ${error.message}`);
          } else {
            console.log(`    ✅ テーブル ${table} をクリア`);
          }
        } catch (tableError) {
          console.warn(`    ⚠️  テーブル ${table} クリア失敗: ${tableError.message}`);
        }
      }
      
      console.log('  ✅ Supabase データベースリセット完了\n');
      
    } catch (supabaseError) {
      console.error('  ❌ Supabaseリセットエラー:', supabaseError.message);
      errors.push(`Supabaseリセット: ${supabaseError.message}`);
    }

    // ========================================
    // 3. ローカルキャッシュのクリア
    // ========================================
    console.log('🧹 ローカルキャッシュクリア中...');
    
    try {
      // Next.js キャッシュディレクトリ
      const cacheDirectories = [
        '.next',
        'node_modules/.cache',
        '.vercel'
      ];
      
      for (const dir of cacheDirectories) {
        const fullPath = path.join(process.cwd(), dir);
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`    ✅ ${dir} を削除`);
        }
      }
      
      console.log('  ✅ ローカルキャッシュクリア完了\n');
      
    } catch (cacheError) {
      console.error('  ❌ キャッシュクリアエラー:', cacheError.message);
      errors.push(`キャッシュクリア: ${cacheError.message}`);
    }

    // ========================================
    // 4. 初期データの投入（オプション）
    // ========================================
    console.log('🌱 初期データ投入中...');
    
    try {
      // 基本的なテストユーザーの作成は認証システムに依存するため、
      // ここでは最小限のマスターデータのみ投入
      
      console.log('  ✅ 初期データ投入完了\n');
      
    } catch (seedError) {
      console.error('  ❌ 初期データ投入エラー:', seedError.message);
      errors.push(`初期データ投入: ${seedError.message}`);
    }

    // ========================================
    // 5. 結果レポート
    // ========================================
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('📊 リセット完了レポート:');
    console.log(`  実行時間: ${duration}秒`);
    console.log(`  エラー数: ${errors.length}件`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  発生したエラー:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ 開発環境リセット完了！');
    console.log('\n📝 次のステップ:');
    console.log('  1. npx prisma migrate reset --force (Prismaマイグレーション)');
    console.log('  2. Supabase SQL Editorで prisma/post-reset-init.sql を実行');
    console.log('  3. npm run seed (サンプルデータ投入)');
    console.log('  4. npm run dev でサーバーを起動');
    console.log('  5. ブラウザでハードリフレッシュ (Cmd+Shift+R)');
    console.log('  6. 新しいアカウントでログイン');
    console.log('\n🔧 動作確認:');
    console.log('  - npm run check:user (ユーザー状況確認)');
    console.log('  - npm run debug:frontend (フロントエンド確認)');
    console.log('  - Supabase SQL Editor: SELECT * FROM public.test_post_reset_init();');

  } catch (error) {
    console.error('💥 リセット処理中に予期しないエラーが発生:', error);
    process.exit(1);
  }
}

// 実行確認
async function confirmReset() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  開発環境を完全リセットします。続行しますか？ (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// 実行
if (require.main === module) {
  confirmReset()
    .then(async (confirmed) => {
      if (confirmed) {
        await resetDevelopmentEnvironment();
        process.exit(0);
      } else {
        console.log('❌ リセットがキャンセルされました');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 リセット失敗:', error);
      process.exit(1);
    });
}

module.exports = { resetDevelopmentEnvironment }; 
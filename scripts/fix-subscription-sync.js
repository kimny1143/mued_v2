const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSubscriptionSync() {
  console.log('🔧 サブスクリプション同期修正開始...\n');

  try {
    const userId = 'a2c17a51-5e70-40e6-b830-5d5d8d3a204b';
    const customerId = 'cus_SNLNVDPpHb4lSu';

    // 1. Stripeから全てのサブスクリプションを取得（アクティブ・非アクティブ含む）
    console.log('📊 Stripeサブスクリプション確認...');
    const allSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100
    });

    console.log(`見つかったサブスクリプション: ${allSubscriptions.data.length}件`);
    allSubscriptions.data.forEach(sub => {
      console.log(`  - ${sub.id}: ${sub.status} (${sub.items.data[0]?.price.id})`);
      console.log(`    作成: ${new Date(sub.created * 1000).toISOString()}`);
      if (sub.canceled_at) {
        console.log(`    キャンセル: ${new Date(sub.canceled_at * 1000).toISOString()}`);
      }
    });

    // 2. Supabaseの現在のレコードを確認
    console.log('\n💾 Supabaseレコード確認...');
    const { data: currentRecords } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId);

    console.log(`現在のレコード: ${currentRecords?.length || 0}件`);
    currentRecords?.forEach(record => {
      console.log(`  - ${record.subscriptionId}: ${record.status} (${record.priceId})`);
    });

    // 3. 不整合を修正
    console.log('\n🔄 データ同期中...');
    
    for (const stripeSub of allSubscriptions.data) {
      const existingRecord = currentRecords?.find(r => r.subscriptionId === stripeSub.id);
      
      if (existingRecord) {
        // 既存レコードのステータス更新
        if (existingRecord.status !== stripeSub.status) {
          console.log(`  📝 ${stripeSub.id} のステータスを ${existingRecord.status} → ${stripeSub.status} に更新`);
          
          const { error } = await supabase
            .from('stripe_user_subscriptions')
            .update({
              status: stripeSub.status,
              updatedAt: new Date().toISOString()
            })
            .eq('subscriptionId', stripeSub.id);

          if (error) {
            console.error(`    ❌ 更新エラー: ${error.message}`);
          } else {
            console.log(`    ✅ 更新完了`);
          }
        }
      } else {
        // 新しいレコードを作成
        console.log(`  ➕ ${stripeSub.id} の新規レコード作成`);
        
        const { error } = await supabase
          .from('stripe_user_subscriptions')
          .insert({
            userId: userId,
            subscriptionId: stripeSub.id,
            customerId: customerId,
            priceId: stripeSub.items.data[0]?.price.id,
            status: stripeSub.status,
            createdAt: new Date(stripeSub.created * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          });

        if (error) {
          console.error(`    ❌ 作成エラー: ${error.message}`);
        } else {
          console.log(`    ✅ 作成完了`);
        }
      }
    }

    // 4. 最終確認
    console.log('\n✅ 修正後の状況確認...');
    const { data: finalRecords } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId);

    console.log(`最終レコード数: ${finalRecords?.length || 0}件`);
    finalRecords?.forEach(record => {
      console.log(`  - ${record.subscriptionId}: ${record.status} (${record.priceId})`);
    });

    // 5. アクティブサブスクリプションの確認
    const activeSubscriptions = finalRecords?.filter(r => r.status === 'active') || [];
    console.log(`\n🎯 アクティブサブスクリプション: ${activeSubscriptions.length}件`);
    
    if (activeSubscriptions.length === 0) {
      console.log('⚠️  アクティブなサブスクリプションがありません');
      console.log('   Billing Portalでプラン変更オプションが表示されない原因です');
    } else {
      console.log('✅ アクティブサブスクリプションが見つかりました');
      activeSubscriptions.forEach(sub => {
        console.log(`   - ${sub.subscriptionId} (${sub.priceId})`);
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  fixSubscriptionSync()
    .then(() => {
      console.log('\n🎉 同期修正完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 同期修正失敗:', error);
      process.exit(1);
    });
}

module.exports = { fixSubscriptionSync }; 
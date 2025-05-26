const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCustomerMismatch() {
  console.log('🔧 顧客ID不整合修正開始...\n');

  try {
    const currentUserId = 'a2c17a51-5e70-40e6-b830-5d5d8d3a204b';
    const currentCustomerId = 'cus_SNLNVDPpHb4lSu';
    const wrongSubId = 'sub_1RScLNRYtspYtD2zTK1IspKp';
    const correctCustomerId = 'cus_SNN5LTyKKSr7za';

    // 1. 現在の状況を確認
    console.log('📊 現在の状況:');
    console.log(`  現在のユーザーID: ${currentUserId}`);
    console.log(`  現在の顧客ID: ${currentCustomerId}`);
    console.log(`  問題のサブスクリプション: ${wrongSubId}`);
    console.log(`  実際の顧客ID: ${correctCustomerId}`);

    // 2. 間違ったレコードを削除
    console.log('\n🗑️  間違ったサブスクリプションレコードを削除...');
    const { error: deleteError } = await supabase
      .from('stripe_user_subscriptions')
      .delete()
      .eq('subscriptionId', wrongSubId)
      .eq('userId', currentUserId);

    if (deleteError) {
      console.error(`❌ 削除エラー: ${deleteError.message}`);
    } else {
      console.log(`✅ ${wrongSubId} を削除しました`);
    }

    // 3. 正しい顧客IDを持つユーザーを確認
    console.log('\n🔍 正しい顧客IDを持つユーザーを確認...');
    const { data: correctCustomerRecord } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('customerId', correctCustomerId);

    if (correctCustomerRecord && correctCustomerRecord.length > 0) {
      console.log(`✅ 正しい顧客レコードが見つかりました:`);
      correctCustomerRecord.forEach(record => {
        console.log(`  ユーザーID: ${record.userId}`);
        console.log(`  顧客ID: ${record.customerId}`);
      });

      // 4. 正しいユーザーにサブスクリプションレコードを作成
      const correctUserId = correctCustomerRecord[0].userId;
      console.log(`\n➕ 正しいユーザー (${correctUserId}) にサブスクリプションレコードを作成...`);
      
      // Stripeからサブスクリプション情報を取得
      const subscription = await stripe.subscriptions.retrieve(wrongSubId);
      
      const { error: insertError } = await supabase
        .from('stripe_user_subscriptions')
        .insert({
          userId: correctUserId,
          subscriptionId: wrongSubId,
          customerId: correctCustomerId,
          priceId: subscription.items.data[0]?.price.id,
          status: subscription.status,
          createdAt: new Date(subscription.created * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        });

      if (insertError) {
        console.error(`❌ 作成エラー: ${insertError.message}`);
      } else {
        console.log(`✅ 正しいユーザーにサブスクリプションレコードを作成しました`);
      }
    } else {
      console.log(`⚠️  正しい顧客ID (${correctCustomerId}) のレコードが見つかりません`);
    }

    // 5. 現在のユーザーの最終状況を確認
    console.log('\n📋 現在のユーザーの最終状況:');
    const { data: finalRecords } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', currentUserId);

    console.log(`サブスクリプションレコード: ${finalRecords?.length || 0}件`);
    finalRecords?.forEach(record => {
      console.log(`  - ${record.subscriptionId}: ${record.status} (${record.priceId})`);
    });

    const activeSubscriptions = finalRecords?.filter(r => r.status === 'active') || [];
    console.log(`\n🎯 アクティブサブスクリプション: ${activeSubscriptions.length}件`);
    
    if (activeSubscriptions.length === 0) {
      console.log('✅ 現在のユーザーにはアクティブなサブスクリプションがありません（正しい状態）');
      console.log('   Billing Portalでプラン変更オプションが表示されないのは正常です');
      console.log('   新しいサブスクリプションを作成する必要があります');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  fixCustomerMismatch()
    .then(() => {
      console.log('\n🎉 修正完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 修正失敗:', error);
      process.exit(1);
    });
}

module.exports = { fixCustomerMismatch }; 
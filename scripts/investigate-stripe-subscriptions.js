const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function investigateStripeSubscriptions() {
  console.log('🔍 Stripe詳細調査開始...\n');

  try {
    const customerId = 'cus_SNLNVDPpHb4lSu';
    const suspiciousSubIds = [
      'sub_1RScLNRYtspYtD2zTK1IspKp',
      'sub_1RSahORYtspYtD2z5C05KOGg'
    ];

    // 1. 顧客情報の詳細確認
    console.log('👤 顧客情報詳細:');
    const customer = await stripe.customers.retrieve(customerId);
    console.log(`  ID: ${customer.id}`);
    console.log(`  Email: ${customer.email}`);
    console.log(`  作成日: ${new Date(customer.created * 1000).toISOString()}`);
    console.log(`  削除済み: ${customer.deleted || false}`);

    // 2. 全てのサブスクリプション（削除済み含む）を確認
    console.log('\n📊 全サブスクリプション（削除済み含む）:');
    const allSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100
    });
    
    console.log(`見つかったサブスクリプション: ${allSubs.data.length}件`);
    allSubs.data.forEach(sub => {
      console.log(`  - ${sub.id}: ${sub.status}`);
      console.log(`    作成: ${new Date(sub.created * 1000).toISOString()}`);
      if (sub.canceled_at) {
        console.log(`    キャンセル: ${new Date(sub.canceled_at * 1000).toISOString()}`);
      }
      if (sub.ended_at) {
        console.log(`    終了: ${new Date(sub.ended_at * 1000).toISOString()}`);
      }
    });

    // 3. 疑わしいサブスクリプションIDを直接確認
    console.log('\n🔍 疑わしいサブスクリプションID直接確認:');
    for (const subId of suspiciousSubIds) {
      try {
        console.log(`\n  ${subId}:`);
        const sub = await stripe.subscriptions.retrieve(subId);
        console.log(`    ステータス: ${sub.status}`);
        console.log(`    顧客ID: ${sub.customer}`);
        console.log(`    作成: ${new Date(sub.created * 1000).toISOString()}`);
        console.log(`    プラン: ${sub.items.data[0]?.price.id}`);
        
        if (sub.canceled_at) {
          console.log(`    キャンセル: ${new Date(sub.canceled_at * 1000).toISOString()}`);
        }
        if (sub.ended_at) {
          console.log(`    終了: ${new Date(sub.ended_at * 1000).toISOString()}`);
        }
        
        // 顧客IDが一致するかチェック
        if (sub.customer !== customerId) {
          console.log(`    ⚠️  顧客IDが不一致! 期待: ${customerId}, 実際: ${sub.customer}`);
        }
        
      } catch (error) {
        console.log(`    ❌ 取得エラー: ${error.message}`);
        if (error.code === 'resource_missing') {
          console.log(`    💀 このサブスクリプションは削除されています`);
        }
      }
    }

    // 4. 顧客の支払い履歴を確認
    console.log('\n💳 支払い履歴:');
    const payments = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 10
    });
    
    console.log(`支払い履歴: ${payments.data.length}件`);
    payments.data.forEach(payment => {
      console.log(`  - ${payment.id}: ${payment.status} (${payment.amount / 100}円)`);
      console.log(`    作成: ${new Date(payment.created * 1000).toISOString()}`);
    });

    // 5. インボイス履歴を確認
    console.log('\n📄 インボイス履歴:');
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10
    });
    
    console.log(`インボイス履歴: ${invoices.data.length}件`);
    invoices.data.forEach(invoice => {
      console.log(`  - ${invoice.id}: ${invoice.status} (${invoice.amount_paid / 100}円)`);
      console.log(`    作成: ${new Date(invoice.created * 1000).toISOString()}`);
      if (invoice.subscription) {
        console.log(`    サブスクリプション: ${invoice.subscription}`);
      }
    });

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  investigateStripeSubscriptions()
    .then(() => {
      console.log('\n🎉 調査完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 調査失敗:', error);
      process.exit(1);
    });
}

module.exports = { investigateStripeSubscriptions }; 
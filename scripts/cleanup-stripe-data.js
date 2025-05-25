const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function cleanupStripeData() {
  console.log('🧹 Stripeテストデータクリーンアップ開始...\n');

  try {
    // 1. 既存のサブスクリプションを確認・キャンセル
    console.log('📋 既存のサブスクリプション確認中...');
    const subscriptions = await stripe.subscriptions.list({
      status: 'all',
      limit: 100
    });

    console.log(`見つかったサブスクリプション: ${subscriptions.data.length}件`);

    for (const subscription of subscriptions.data) {
      console.log(`- ${subscription.id} (${subscription.status}) - Customer: ${subscription.customer}`);
      
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        console.log(`  → キャンセル中...`);
        await stripe.subscriptions.cancel(subscription.id);
        console.log(`  ✅ キャンセル完了`);
      }
    }

    // 2. 既存の顧客を確認・削除
    console.log('\n👥 既存の顧客確認中...');
    const customers = await stripe.customers.list({
      limit: 100
    });

    console.log(`見つかった顧客: ${customers.data.length}件`);

    for (const customer of customers.data) {
      console.log(`- ${customer.id} (${customer.email}) - ${customer.name || 'No name'}`);
      
      // テストデータまたは特定の条件で削除
      if (customer.email && (
        customer.email.includes('test') || 
        customer.email.includes('webhook') ||
        customer.metadata?.test === 'true'
      )) {
        console.log(`  → 削除中...`);
        await stripe.customers.del(customer.id);
        console.log(`  ✅ 削除完了`);
      }
    }

    // 3. 未完了のCheckout Sessionを確認
    console.log('\n💳 未完了のCheckout Session確認中...');
    const sessions = await stripe.checkout.sessions.list({
      limit: 20
    });

    console.log(`見つかったセッション: ${sessions.data.length}件`);
    sessions.data.forEach(session => {
      console.log(`- ${session.id} (${session.status}) - ${session.customer_email || 'No email'}`);
    });

    console.log('\n✅ クリーンアップ完了！');
    console.log('🔄 新しいテストを実行できます');

  } catch (error) {
    console.error('❌ クリーンアップエラー:', error.message);
  }
}

cleanupStripeData().catch(console.error); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhook() {
  console.log('🧪 Webhook テスト開始...\n');

  try {
    // 1. テスト用の顧客を作成
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test User',
      metadata: {
        userId: 'test-user-id-123'
      }
    });

    console.log('👤 テスト顧客作成:', {
      customerId: customer.id,
      email: customer.email
    });

    // 2. テスト用のサブスクリプションを作成
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID || 'price_1RSY1mRYtspYtD2zKG7WnUsa'
      }],
      metadata: {
        userId: 'test-user-id-123'
      }
    });

    console.log('📋 テストサブスクリプション作成:', {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.items.data[0].price.id
    });

    // 3. Webhookイベントを確認
    const events = await stripe.events.list({
      type: 'customer.subscription.created',
      limit: 5
    });

    console.log('\n🔔 最近のサブスクリプション作成イベント:');
    events.data.forEach(event => {
      console.log(`- ${event.id}: ${event.created} (${new Date(event.created * 1000).toISOString()})`);
    });

    // 4. クリーンアップ
    await stripe.subscriptions.cancel(subscription.id);
    await stripe.customers.del(customer.id);

    console.log('\n✅ テスト完了 - リソースをクリーンアップしました');

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
  }
}

testWebhook().catch(console.error); 
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFrontendSubscription() {
  console.log('🔍 フロントエンド用サブスクリプションデバッグ開始...\n');

  try {
    const userId = 'a2c17a51-5e70-40e6-b830-5d5d8d3a204b';

    // 1. フロントエンドと同じクエリを実行
    console.log('📊 フロントエンドと同じクエリを実行...');
    
    // 最初のクエリ（修正後：アクティブのみ）
    console.log('\n1️⃣ 修正後クエリ（アクティブのみ）:');
    const { data: activeFirst, error: activeError } = await supabase
      .from('stripe_user_subscriptions')
      .select('priceId, status, currentPeriodEnd')
      .eq('userId', userId)
      .eq('status', 'active') // アクティブなもののみ
      .order('currentPeriodEnd', { ascending: false }) // 期限が長いものを優先
      .limit(1)
      .maybeSingle();

    if (activeError) {
      console.error(`❌ エラー: ${activeError.message}`);
    } else {
      console.log(`✅ 結果:`, activeFirst);
    }

    // 2番目のクエリ（アクティブのみ）
    console.log('\n2️⃣ アクティブのみクエリ:');
    const { data: activeOnly, error: activeOnlyError } = await supabase
      .from('stripe_user_subscriptions')
      .select('priceId, status, currentPeriodEnd')
      .eq('userId', userId)
      .eq('status', 'active') // アクティブなもののみ
      .order('currentPeriodEnd', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeOnlyError) {
      console.error(`❌ エラー: ${activeOnlyError.message}`);
    } else {
      console.log(`✅ 結果:`, activeOnly);
    }

    // 3. 全レコードを確認
    console.log('\n3️⃣ 全レコード確認:');
    const { data: allRecords, error: allError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId);

    if (allError) {
      console.error(`❌ エラー: ${allError.message}`);
    } else {
      console.log(`✅ 全レコード (${allRecords?.length || 0}件):`);
      allRecords?.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.subscriptionId}: ${record.status} (${record.priceId})`);
        console.log(`     作成: ${record.createdAt}`);
        console.log(`     更新: ${record.updatedAt}`);
      });
    }

    // 4. プライスIDからプラン名を判定
    console.log('\n4️⃣ プライスIDからプラン判定:');
    const priceToName = {
      'price_1RSY1mRYtspYtD2zKG7WnUsa': 'Starter (¥500)',
      'price_1RSY2ORYtspYtD2zMsvNdlBQ': 'Basic (¥2,480)', 
      'price_1RSY5xRYtspYtD2zC3YM2Ny9': 'Premium (¥2,480)',
      null: 'Free'
    };

    if (activeFirst) {
      const planName = priceToName[activeFirst.priceId] || `不明 (${activeFirst.priceId})`;
      console.log(`現在のプラン: ${planName} (${activeFirst.status})`);
    } else if (activeOnly) {
      const planName = priceToName[activeOnly.priceId] || `不明 (${activeOnly.priceId})`;
      console.log(`現在のプラン: ${planName} (${activeOnly.status})`);
    } else {
      console.log(`現在のプラン: Free (サブスクリプションなし)`);
    }

    // 5. RLSポリシーの確認
    console.log('\n5️⃣ RLSポリシー確認（認証ユーザーとして）:');
    
    // 実際のユーザーセッションをシミュレート
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('⚠️  認証ユーザー情報取得失敗 - サービスロールキーを使用中');
    } else {
      console.log(`認証ユーザー: ${user?.email || 'なし'}`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
if (require.main === module) {
  debugFrontendSubscription()
    .then(() => {
      console.log('\n🎉 デバッグ完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 デバッグ失敗:', error);
      process.exit(1);
    });
}

module.exports = { debugFrontendSubscription }; 
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 サブスクリプションAPIテスト開始...\\n');

// 環境変数の確認
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSubscriptionApi() {
  try {
    console.log('1️⃣ まず直接DBから確認...');
    
    // ユーザー一覧取得
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(5);
    
    if (usersError) {
      console.error('❌ ユーザー取得エラー:', usersError);
      return;
    }
    
    console.log('👥 ユーザー一覧:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });
    
    // サブスクリプション一覧取得
    console.log('\\n💳 サブスクリプション確認...');
    const { data: subscriptions, error: subError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*');
    
    if (subError) {
      console.error('❌ サブスクリプション取得エラー:', subError);
      return;
    }
    
    console.log(`✅ サブスクリプション: ${subscriptions.length}件`);
    subscriptions.forEach(sub => {
      console.log(`  - ${sub.userId}: ${sub.priceId} (${sub.status})`);
    });
    
    // 特定ユーザーのサブスクリプション確認
    if (users.length > 0) {
      const testUser = users.find(u => u.email === 'kimny1143@gmail.com') || users[0];
      console.log(`\\n🔍 ${testUser.email} のサブスクリプション詳細...`);
      
      const { data: userSub, error: userSubError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('userId', testUser.id)
        .maybeSingle();
      
      if (userSubError) {
        console.error('❌ ユーザーサブスクリプション取得エラー:', userSubError);
        return;
      }
      
      if (userSub) {
        console.log('✅ サブスクリプション詳細:', userSub);
      } else {
        console.log('⚠️ このユーザーのサブスクリプションは見つかりませんでした');
      }
    }
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

testSubscriptionApi(); 
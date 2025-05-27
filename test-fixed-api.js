// 修正後のサブスクリプションAPIのテスト
async function testFixedAPI() {
  console.log('🔍 修正後のサブスクリプションAPIテスト...\n');
  
  try {
    // 開発サーバーが起動していることを前提として、
    // ローカルAPIエンドポイントを直接呼び出し
    const response = await fetch('http://localhost:3000/api/user/subscription', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 実際の認証ヘッダーが必要ですが、ここではテスト用
      }
    });
    
    console.log('APIレスポンスステータス:', response.status);
    console.log('APIレスポンスOK:', response.ok);
    
    if (!response.ok) {
      console.error('APIエラー:', response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('APIレスポンスデータ:', data);
    
    if (data.subscription) {
      console.log('✅ サブスクリプション情報取得成功!');
      console.log('   - Status:', data.subscription.status);
      console.log('   - Price ID:', data.subscription.price_id);
      console.log('   - User ID:', data.subscription.user_id);
    } else {
      console.log('❌ サブスクリプション情報が空');
      console.log('   - Message:', data.message);
      console.log('   - Details:', data.details);
    }
    
  } catch (error) {
    console.error('APIテストエラー:', error.message);
    console.log('\n💡 このテストは開発サーバーが起動している必要があります。');
    console.log('   次のコマンドでサーバーを起動してください: npm run dev');
  }
}

// テスト実行の確認メッセージ
console.log('📋 修正内容の確認:');
console.log('   1. テーブル存在チェック（count()クエリ）を削除');
console.log('   2. 直接データ取得を試行するように変更');
console.log('   3. 成功ログを追加');
console.log('');
console.log('🚀 次の手順:');
console.log('   1. 開発サーバーを起動: npm run dev');
console.log('   2. ブラウザでサイトを確認');
console.log('   3. ログをチェックしてサブスクリプション取得状況を確認');
console.log('');

// Nodeとブラウザ両対応
if (typeof window === 'undefined') {
  // Node.js環境
  console.log('🔧 Node.js環境では直接APIテストはスキップします');
  console.log('   ブラウザで確認してください');
} else {
  // ブラウザ環境
  testFixedAPI();
} 
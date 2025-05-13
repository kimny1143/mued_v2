// 環境変数チェックスクリプト
console.log('環境変数チェックスクリプト実行中...');

// 基本的な環境情報
console.log('\n=== 基本環境情報 ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`VERCEL: ${process.env.VERCEL || 'なし'}`);
console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || 'なし'}`);
console.log(`VERCEL_REGION: ${process.env.VERCEL_REGION || 'なし'}`);
console.log(`VERCEL_URL: ${process.env.VERCEL_URL || 'なし'}`);

// Stripe関連の環境変数チェック
console.log('\n=== Stripe環境変数 ===');
const stripeVars = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

for (const varName of stripeVars) {
  const value = process.env[varName];
  if (value) {
    console.log(`${varName}: ${value.substring(0, 10)}...（${value.length}文字）`);
    // 改行チェック
    if (value.includes('\n')) {
      console.log(`⚠️ 警告: ${varName}に改行が含まれています！`);
      // 改行を表示
      const lines = value.split('\n');
      console.log(`  改行数: ${lines.length - 1}`);
      console.log(`  最初の行: ${lines[0].substring(0, 20)}...`);
      if (lines.length > 1) {
        console.log(`  2行目: ${lines[1].substring(0, 20)}...`);
      }
    }
  } else {
    console.log(`${varName}: 未設定`);
  }
}

// Supabase関連の環境変数
console.log('\n=== Supabase環境変数 ===');
const supabaseVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const varName of supabaseVars) {
  const value = process.env[varName];
  if (value) {
    console.log(`${varName}: ${value.substring(0, 10)}...（${value.length}文字）`);
  } else {
    console.log(`${varName}: 未設定`);
  }
}

// 重要な環境変数のチェック結果
console.log('\n=== チェック結果 ===');
// Stripe関連のチェック
const hasStripeSecretKey = !!process.env.STRIPE_SECRET_KEY;
const hasStripePublishableKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
console.log(`Stripe基本設定: ${hasStripeSecretKey && hasStripePublishableKey ? '✅' : '❌'}`);

// Supabase関連のチェック
const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const hasSupabaseAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log(`Supabase基本設定: ${hasSupabaseUrl && hasSupabaseAnonKey ? '✅' : '❌'}`);

// 環境変数の出力フォーマット
console.log('\n環境変数チェック完了');

// ローカルテスト用に、意図的に改行を含む環境変数を設定する例
if (process.env.NODE_ENV === 'development') {
  console.log('\n=== 改行テスト ===');
  const testKey = 'sk_test_REMOVED_SECRET_KEY\nREMOVED_PART ';
  console.log(`改行を含むキー: ${testKey.substring(0, 10)}...（${testKey.length}文字）`);
  if (testKey.includes('\n')) {
    console.log(`⚠️ 警告: テストキーに改行が含まれています！`);
    const lines = testKey.split('\n');
    console.log(`  改行数: ${lines.length - 1}`);
    console.log(`  最初の行: ${lines[0].substring(0, 20)}...`);
    console.log(`  2行目: ${lines[1].substring(0, 20)}...`);
  }
} 
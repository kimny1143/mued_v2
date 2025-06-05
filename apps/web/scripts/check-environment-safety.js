/**
 * 環境変数安全性チェックスクリプト
 * 本番環境での誤実行を防ぐためのセーフガード
 */

function checkEnvironmentSafety() {
  console.log('🔒 環境安全性チェック開始...\n');

  const checks = [];
  let isProduction = false;
  let warnings = [];

  // 1. Stripe環境チェック
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    if (stripeKey.startsWith('sk_live_')) {
      checks.push('❌ Stripe: 本番環境キー検出');
      isProduction = true;
    } else if (stripeKey.startsWith('sk_test_')) {
      checks.push('✅ Stripe: テスト環境キー');
    } else {
      checks.push('⚠️  Stripe: 不明なキー形式');
      warnings.push('Stripeキーの形式が不明です');
    }
  } else {
    checks.push('❌ Stripe: キーが設定されていません');
    warnings.push('STRIPE_SECRET_KEYが設定されていません');
  }

  // 2. Supabase環境チェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    if (supabaseUrl.includes('localhost') || 
        supabaseUrl.includes('127.0.0.1') || 
        supabaseUrl.includes('dev') ||
        supabaseUrl.includes('test') ||
        supabaseUrl.includes('staging')) {
      checks.push('✅ Supabase: 開発/テスト環境URL');
    } else {
      checks.push('⚠️  Supabase: 本番環境の可能性');
      warnings.push('Supabase URLが本番環境の可能性があります');
    }
  } else {
    checks.push('❌ Supabase: URLが設定されていません');
    warnings.push('NEXT_PUBLIC_SUPABASE_URLが設定されていません');
  }

  // 3. Node環境チェック
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    checks.push('⚠️  Node.js: 本番環境モード');
    warnings.push('NODE_ENVが本番環境に設定されています');
  } else {
    checks.push('✅ Node.js: 開発環境モード');
  }

  // 4. Vercel環境チェック
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') {
    checks.push('❌ Vercel: 本番環境');
    isProduction = true;
  } else if (vercelEnv) {
    checks.push('✅ Vercel: 非本番環境');
  } else {
    checks.push('✅ Vercel: ローカル環境');
  }

  // 結果表示
  console.log('📊 環境チェック結果:');
  checks.forEach(check => console.log(`  ${check}`));

  if (warnings.length > 0) {
    console.log('\n⚠️  警告:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  // 安全性判定
  if (isProduction) {
    console.log('\n🚨 危険: 本番環境が検出されました！');
    console.log('リセットスクリプトの実行は中止してください。');
    return false;
  } else if (warnings.length > 0) {
    console.log('\n⚠️  注意: 警告があります。続行前に確認してください。');
    return 'warning';
  } else {
    console.log('\n✅ 安全: テスト環境です。リセット実行可能です。');
    return true;
  }
}

// 実行
if (require.main === module) {
  const result = checkEnvironmentSafety();
  
  if (result === false) {
    process.exit(1); // 本番環境の場合は異常終了
  } else if (result === 'warning') {
    process.exit(2); // 警告の場合は警告コードで終了
  } else {
    process.exit(0); // 安全な場合は正常終了
  }
}

module.exports = { checkEnvironmentSafety }; 
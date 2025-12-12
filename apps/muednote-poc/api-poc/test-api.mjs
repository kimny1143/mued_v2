/**
 * MUEDnote v7 API PoC
 * Expo → Next.js API Routes 接続テスト
 */

// ========================================
// 設定
// ========================================

// 開発環境: ローカル Next.js サーバー
// 本番環境: Vercel デプロイ URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// 開発用トークン（本番ではClerk認証を使用）
const DEV_TOKEN = process.env.DEV_AUTH_TOKEN || 'dev_token_kimny';

// ========================================
// API クライアント
// ========================================

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 認証ヘッダー追加（トークンがある場合）
  if (options.auth !== false) {
    headers['Authorization'] = `Bearer ${DEV_TOKEN}`;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const elapsed = Date.now() - startTime;
    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
      elapsed,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
      elapsed: Date.now() - startTime,
    };
  }
}

// ========================================
// テスト関数
// ========================================

async function testHealthEndpoint() {
  console.log('\n📡 Test 1: Health Endpoint (認証なし)');
  console.log('-'.repeat(40));

  const result = await apiRequest('/api/health', { auth: false });

  if (result.ok) {
    console.log('✅ Status:', result.status);
    console.log('   Response:', JSON.stringify(result.data, null, 2));
    console.log('   Elapsed:', result.elapsed, 'ms');
  } else {
    console.log('❌ Failed:', result.error || result.data);
  }

  return result.ok;
}

async function testFragmentsGet() {
  console.log('\n📡 Test 2: GET /api/muednote/fragments (認証あり)');
  console.log('-'.repeat(40));

  const result = await apiRequest('/api/muednote/fragments?limit=5');

  if (result.ok) {
    console.log('✅ Status:', result.status);
    console.log('   Total fragments:', result.data.pagination?.total || 0);
    console.log('   Returned:', result.data.fragments?.length || 0);
    console.log('   Elapsed:', result.elapsed, 'ms');

    if (result.data.fragments?.length > 0) {
      console.log('\n   Sample fragment:');
      const sample = result.data.fragments[0];
      console.log('   - ID:', sample.id);
      console.log('   - Content:', sample.content?.substring(0, 50) + '...');
      console.log('   - Status:', sample.status);
    }
  } else {
    console.log('❌ Failed:', result.error || result.data);
  }

  return result.ok;
}

async function testFragmentsPost() {
  console.log('\n📡 Test 3: POST /api/muednote/fragments (新規作成)');
  console.log('-'.repeat(40));

  const testContent = `[API PoC テスト] ${new Date().toISOString()}
んーーー、このコード、、、動くかな、、、
Expo から API 呼び出し、、、認証どうしよう、、、
あ、dev_token で、、、いけるか、、、`;

  const result = await apiRequest('/api/muednote/fragments', {
    method: 'POST',
    body: JSON.stringify({
      content: testContent,
      importance: 'medium',
    }),
  });

  if (result.ok) {
    console.log('✅ Status:', result.status);
    console.log('   Created ID:', result.data.fragment?.id);
    console.log('   Message:', result.data.message);
    console.log('   Elapsed:', result.elapsed, 'ms');
    return result.data.fragment?.id;
  } else {
    console.log('❌ Failed:', result.error || result.data);
    return null;
  }
}

async function testFragmentsDelete(fragmentId) {
  if (!fragmentId) {
    console.log('\n⏭️ Test 4: DELETE skipped (no fragment ID)');
    return false;
  }

  console.log('\n📡 Test 4: DELETE /api/muednote/fragments (テストデータ削除)');
  console.log('-'.repeat(40));

  const result = await apiRequest(`/api/muednote/fragments?id=${fragmentId}`, {
    method: 'DELETE',
  });

  if (result.ok) {
    console.log('✅ Status:', result.status);
    console.log('   Message:', result.data.message);
    console.log('   Elapsed:', result.elapsed, 'ms');
  } else {
    console.log('❌ Failed:', result.error || result.data);
  }

  return result.ok;
}

async function testUnauthorized() {
  console.log('\n📡 Test 5: 認証なしでの保護エンドポイントアクセス');
  console.log('-'.repeat(40));

  const result = await apiRequest('/api/muednote/fragments', { auth: false });

  if (result.status === 401) {
    console.log('✅ 正しく401 Unauthorizedが返された');
    console.log('   Response:', result.data);
  } else {
    console.log('❌ 予期しないレスポンス:', result.status, result.data);
  }

  return result.status === 401;
}

// ========================================
// メイン実行
// ========================================

async function main() {
  console.log('='.repeat(50));
  console.log('MUEDnote v7 API PoC');
  console.log('Expo → Next.js API Routes 接続テスト');
  console.log('='.repeat(50));
  console.log('\nAPI Base URL:', API_BASE_URL);
  console.log('Dev Token:', DEV_TOKEN.substring(0, 10) + '...');

  const results = {
    health: false,
    fragmentsGet: false,
    fragmentsPost: false,
    fragmentsDelete: false,
    unauthorized: false,
  };

  // Test 1: Health
  results.health = await testHealthEndpoint();

  // Test 2: GET fragments
  results.fragmentsGet = await testFragmentsGet();

  // Test 3: POST fragment
  const createdId = await testFragmentsPost();
  results.fragmentsPost = !!createdId;

  // Test 4: DELETE fragment
  results.fragmentsDelete = await testFragmentsDelete(createdId);

  // Test 5: Unauthorized access
  results.unauthorized = await testUnauthorized();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('テスト結果サマリー');
  console.log('='.repeat(50));

  const tests = [
    ['Health endpoint', results.health],
    ['GET fragments (認証)', results.fragmentsGet],
    ['POST fragment (作成)', results.fragmentsPost],
    ['DELETE fragment (削除)', results.fragmentsDelete],
    ['401 Unauthorized (認証なし)', results.unauthorized],
  ];

  let passed = 0;
  tests.forEach(([name, ok]) => {
    console.log(`  ${ok ? '✅' : '❌'} ${name}`);
    if (ok) passed++;
  });

  console.log(`\n結果: ${passed}/${tests.length} テスト成功`);

  if (passed === tests.length) {
    console.log('\n🎉 全テスト成功！Expo → API Routes 接続は問題なし。');
  } else {
    console.log('\n⚠️ 一部テストが失敗しました。');
  }
}

main().catch(console.error);

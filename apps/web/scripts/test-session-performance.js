#!/usr/bin/env node
/**
 * セッション処理のパフォーマンステスト
 * 最適化版と従来版の比較
 */

const https = require('https');
const http = require('http');

// テスト設定
const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  endpoints: [
    '/api/lesson-slots/active',
    '/api/reservations',
    '/api/sessions/v2/today'
  ],
  iterations: 100,
  concurrency: 10
};

// 認証トークン（実際のトークンに置き換える必要あり）
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

/**
 * APIリクエストを実行
 */
async function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Cookie': process.env.TEST_COOKIE || '',
        ...headers
      }
    };

    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        resolve({
          status: res.statusCode,
          time: endTime - startTime,
          cached: res.headers['x-session-cached'] === 'true'
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * 並列リクエストを実行
 */
async function runConcurrentTests(endpoint, iterations, concurrency) {
  const results = [];
  
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = Math.min(concurrency, iterations - i);
    const promises = [];
    
    for (let j = 0; j < batch; j++) {
      promises.push(makeRequest(`${TEST_CONFIG.baseUrl}${endpoint}`));
    }
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 統計情報を計算
 */
function calculateStats(results) {
  const times = results.map(r => r.time);
  const sorted = times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const cached = results.filter(r => r.cached).length;
  
  return {
    avg: avg.toFixed(2),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    cacheHitRate: `${(cached / results.length * 100).toFixed(2)}%`
  };
}

/**
 * メインテスト実行
 */
async function runTests() {
  console.log('🚀 セッション処理パフォーマンステスト開始\n');
  console.log(`設定:
- ベースURL: ${TEST_CONFIG.baseUrl}
- イテレーション: ${TEST_CONFIG.iterations}
- 並列度: ${TEST_CONFIG.concurrency}
- 最適化フラグ: ${process.env.NEXT_PUBLIC_USE_OPTIMIZED_SESSION || 'false'}\n`);

  if (!AUTH_TOKEN) {
    console.error('❌ 認証トークンが設定されていません。TEST_AUTH_TOKENを設定してください。');
    process.exit(1);
  }

  for (const endpoint of TEST_CONFIG.endpoints) {
    console.log(`\n📊 テスト中: ${endpoint}`);
    
    try {
      // ウォームアップ
      console.log('  ウォームアップ中...');
      await runConcurrentTests(endpoint, 10, 5);
      
      // 本番テスト
      console.log('  本番テスト実行中...');
      const results = await runConcurrentTests(
        endpoint, 
        TEST_CONFIG.iterations, 
        TEST_CONFIG.concurrency
      );
      
      const stats = calculateStats(results);
      
      console.log(`\n  結果:
    平均: ${stats.avg}ms
    最小: ${stats.min}ms
    最大: ${stats.max}ms
    P50: ${stats.p50}ms
    P95: ${stats.p95}ms
    P99: ${stats.p99}ms
    キャッシュヒット率: ${stats.cacheHitRate}`);
      
    } catch (error) {
      console.error(`  ❌ エラー: ${error.message}`);
    }
  }
  
  console.log('\n✅ テスト完了');
}

// 実行
runTests().catch(console.error);
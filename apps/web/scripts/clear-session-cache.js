#!/usr/bin/env node
/**
 * セッションキャッシュをクリアするスクリプト
 * Vercel環境のキャッシュ問題を解決するため
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

async function clearCache() {
  const baseUrl = process.argv[2] || 'https://dev.mued.jp';
  const authToken = process.argv[3];
  
  if (!authToken) {
    console.error(`
使用方法:
  node scripts/clear-session-cache.js [BASE_URL] [AUTH_TOKEN]

例:
  node scripts/clear-session-cache.js https://dev.mued.jp "eyJhbGciOiJIUzI1..."

AUTH_TOKENの取得方法:
1. ブラウザの開発者ツールを開く
2. Networkタブを開く
3. 任意のAPIリクエストのAuthorizationヘッダーからBearerトークンをコピー
`);
    process.exit(1);
  }

  console.log('🔄 セッションキャッシュのクリア開始...');
  console.log(`URL: ${baseUrl}/api/auth/clear-cache`);

  const url = new URL(`${baseUrl}/api/auth/clear-cache`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ キャッシュクリア成功:');
          console.log(`  - セッションキャッシュ: ${result.stats.clearedEntries.session}件`);
          console.log(`  - JWTキャッシュ: ${result.stats.clearedEntries.jwt}件`);
          resolve(result);
        } else {
          console.error('❌ エラー:', res.statusCode, data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ リクエストエラー:', error);
      reject(error);
    });
    
    req.end();
  });
}

// 実行
clearCache()
  .then(() => {
    console.log('\n✅ 完了！ブラウザをリロードしてロール表示を確認してください。');
  })
  .catch((error) => {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  });
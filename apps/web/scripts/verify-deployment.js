#!/usr/bin/env node
/**
 * Vercelにデプロイされたコードが最新かを確認
 */

const fetch = require('node-fetch');

async function verifyDeployment() {
  console.log('🔍 Vercelデプロイ確認\n');
  
  const productionUrl = 'https://mued-lms-fgm-git-develop-glasswerks.vercel.app';
  
  try {
    // APIのソースコードを確認（開発者ツールから）
    const response = await fetch(`${productionUrl}/api/lesson-slots`, {
      method: 'OPTIONS'
    });
    
    console.log('APIステータス:', response.status);
    console.log('レスポンスヘッダー:');
    console.log('  Cache-Control:', response.headers.get('cache-control'));
    console.log('  X-Vercel-Cache:', response.headers.get('x-vercel-cache'));
    console.log('  X-Vercel-Id:', response.headers.get('x-vercel-id'));
    
    // 特定のスロットを直接取得してみる
    const testResponse = await fetch(`${productionUrl}/api/lesson-slots/0e3d913c-9f98-4e02-979c-eaa2e8a16b36`);
    
    if (testResponse.ok) {
      const data = await testResponse.text();
      console.log('\n単体スロット取得テスト:');
      console.log('  レスポンス長:', data.length);
      console.log('  Zサフィックスの検索:', data.includes('Z"') ? '見つかりました' : '見つかりません');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

verifyDeployment();
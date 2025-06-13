#!/usr/bin/env node
/**
 * APIを直接呼び出してレスポンスを確認
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// fetchのpolyfill
const fetch = require('node-fetch');
global.fetch = fetch;

async function testAPIDirectly() {
  console.log('🧪 API直接テスト\n');
  
  try {
    // 認証を取得
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'mentor1@example.com',
      password: 'test123456'
    });
    
    if (!authData?.session) {
      console.error('❌ ログインに失敗しました');
      return;
    }
    
    const token = authData.session.access_token;
    console.log('✅ ログイン成功\n');
    
    // APIを呼び出し
    const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/lesson-slots?viewMode=own`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ APIエラー:', response.status);
      return;
    }
    
    // レスポンスのテキストを取得
    const responseText = await response.text();
    console.log('📝 レスポンス（生のテキスト）:');
    console.log(responseText.substring(0, 500) + '...\n');
    
    // JSONとして解析
    const slots = JSON.parse(responseText);
    console.log(`📊 取得したスロット数: ${slots.length}\n`);
    
    if (slots.length > 0) {
      const slot = slots[0];
      console.log('最初のスロットの詳細:');
      console.log('  ID:', slot.id);
      console.log('  startTime:', slot.startTime);
      console.log('  endTime:', slot.endTime);
      console.log('  startTimeの型:', typeof slot.startTime);
      console.log('  startTimeにZが含まれる:', slot.startTime.includes('Z'));
      
      // APIから返される値を検証
      if (!slot.startTime.includes('Z')) {
        console.log('\n⚠️ 警告: startTimeにZサフィックスが含まれていません！');
        console.log('  これが原因で、ブラウザでJSTとして解釈されています。');
      }
    }
    
    await supabase.auth.signOut();
    console.log('\n✅ テスト完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

console.log('⚠️  環境変数を確認:');
console.log('  NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || '未設定');
console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定');
console.log('\n');

testAPIDirectly();
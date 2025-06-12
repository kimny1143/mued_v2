#!/usr/bin/env node
/**
 * APIレスポンスのタイムゾーンを確認
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAPIResponse() {
  console.log('🧪 APIレスポンステスト\n');
  
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
    const response = await fetch('http://localhost:3000/api/lesson-slots?viewMode=own', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ APIエラー:', response.status);
      return;
    }
    
    const slots = await response.json();
    console.log(`📊 取得したスロット数: ${slots.length}\n`);
    
    if (slots.length > 0) {
      const slot = slots[0];
      console.log('最初のスロットのデータ:');
      console.log('  ID:', slot.id);
      console.log('  startTime:', slot.startTime);
      console.log('  endTime:', slot.endTime);
      
      console.log('\n時刻の解析:');
      console.log('  startTimeにZが含まれる:', slot.startTime.includes('Z'));
      console.log('  endTimeにZが含まれる:', slot.endTime.includes('Z'));
      
      console.log('\nDate解析結果:');
      const startDate = new Date(slot.startTime);
      const endDate = new Date(slot.endTime);
      console.log('  開始（UTC）:', startDate.toISOString());
      console.log('  終了（UTC）:', endDate.toISOString());
      console.log('  開始（JST）:', startDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      console.log('  終了（JST）:', endDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      
      // JSTフィールドも確認
      if (slot.startTimeJst) {
        console.log('\nJSTフィールド:');
        console.log('  startTimeJst:', slot.startTimeJst);
        console.log('  endTimeJst:', slot.endTimeJst);
      }
    }
    
    await supabase.auth.signOut();
    console.log('\n✅ テスト完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

console.log('⚠️  開発サーバー（npm run dev）が起動していることを確認してください\n');
testAPIResponse();
#!/usr/bin/env node
/**
 * APIを直接呼び出してレスポンスを確認
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAPI() {
  console.log('🧪 APIテスト開始\n');
  
  try {
    // 1. 認証を取得（生徒ユーザーでログイン）
    console.log('1️⃣ 生徒ユーザーでログイン:');
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: 'student1@example.com',
      password: 'test123456'
    });
    
    if (authError) {
      console.error('❌ ログインエラー:', authError);
      // テストユーザーでも試す
      const { data: testAuth } = await supabaseAdmin.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'testtest'
      });
      if (testAuth?.session) {
        console.log('✅ テストユーザーでログイン成功');
      }
    } else {
      console.log('✅ ログイン成功:', authData.user?.email);
    }
    
    // 2. 現在のセッションを確認
    const { data: sessionData } = await supabaseAdmin.auth.getSession();
    const token = sessionData.session?.access_token;
    
    if (!token) {
      console.error('❌ トークンが取得できません');
      return;
    }
    
    console.log('✅ トークン取得成功');
    
    // 3. APIを直接呼び出し
    console.log('\n2️⃣ /api/lesson-slots?viewMode=all を呼び出し:');
    
    const apiUrl = 'http://localhost:3000/api/lesson-slots?viewMode=all';
    console.log(`URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log(`ステータス: ${response.status}`);
    console.log(`ステータステキスト: ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ APIエラー:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ レスポンス取得成功: ${data.length}件のスロット`);
    
    if (data.length > 0) {
      console.log('\n最初の3件:');
      data.slice(0, 3).forEach((slot, index) => {
        console.log(`\n${index + 1}. スロット ID: ${slot.id}`);
        console.log(`   Teacher ID: ${slot.teacherId}`);
        console.log(`   Teacher: ${slot.teacher ? JSON.stringify(slot.teacher) : 'なし'}`);
        console.log(`   Time: ${slot.startTime} - ${slot.endTime}`);
        console.log(`   予約数: ${slot.reservations?.length || 0}`);
      });
    }
    
    // 4. teacher情報が含まれているか確認
    const slotsWithTeacher = data.filter(slot => slot.teacher);
    const slotsWithoutTeacher = data.filter(slot => !slot.teacher);
    
    console.log(`\n📊 teacher情報の統計:`);
    console.log(`   - teacher情報あり: ${slotsWithTeacher.length}件`);
    console.log(`   - teacher情報なし: ${slotsWithoutTeacher.length}件`);
    
    if (slotsWithoutTeacher.length > 0) {
      console.log('\n⚠️  teacher情報がないスロット（最初の3件）:');
      slotsWithoutTeacher.slice(0, 3).forEach(slot => {
        console.log(`   - ${slot.id} (Teacher ID: ${slot.teacherId})`);
      });
    }
    
    // 5. ログアウト
    await supabaseAdmin.auth.signOut();
    console.log('\n✅ ログアウト完了');
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

// 開発サーバーが起動していることを確認
console.log('⚠️  このスクリプトを実行する前に、開発サーバー（npm run dev）が起動していることを確認してください\n');

testAPI();
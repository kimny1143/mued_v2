#!/usr/bin/env node
/**
 * lesson_slotsテーブルへの直接書き込みテスト
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLessonSlotCreation() {
  console.log('🧪 lesson_slotsテーブルへの書き込みテスト\n');
  
  try {
    // 1. まず既存のスロットを確認
    console.log('1️⃣ 既存のスロットを確認:');
    const { data: existingSlots, error: selectError } = await supabaseAdmin
      .from('lesson_slots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (selectError) {
      console.error('❌ SELECT エラー:', selectError);
    } else {
      console.log(`✅ 最新${existingSlots?.length || 0}件のスロット:`, existingSlots?.map(s => ({
        id: s.id,
        teacher_id: s.teacher_id,
        start_time: s.start_time,
        created_at: s.created_at
      })));
    }
    
    // 2. メンターユーザーを取得
    console.log('\n2️⃣ メンターユーザーを取得:');
    const { data: mentorUser } = await supabaseAdmin
      .from('users')
      .select('id, email, role_id, roles(name)')
      .eq('email', 'glasswerkskimny@gmail.com')
      .single();
    
    if (!mentorUser) {
      console.error('❌ メンターユーザーが見つかりません');
      return;
    }
    
    console.log('✅ メンターユーザー:', {
      id: mentorUser.id,
      email: mentorUser.email,
      role: mentorUser.roles?.name
    });
    
    // 3. テストスロットを作成
    console.log('\n3️⃣ テストスロットを作成:');
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 明日
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2時間後
    
    const testSlot = {
      id: crypto.randomUUID(),
      teacher_id: mentorUser.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      hourly_rate: 5000,
      currency: 'JPY',
      min_duration: 30,
      max_duration: 120,
      is_available: true,
      description: 'RLSテスト用スロット',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('作成するデータ:', testSlot);
    
    const { data: newSlot, error: insertError } = await supabaseAdmin
      .from('lesson_slots')
      .insert(testSlot)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ INSERT エラー:', insertError);
      console.error('エラー詳細:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
    } else {
      console.log('✅ スロット作成成功:', newSlot);
      
      // 4. 作成したスロットを再度確認
      console.log('\n4️⃣ 作成したスロットを再確認:');
      const { data: verifySlot, error: verifyError } = await supabaseAdmin
        .from('lesson_slots')
        .select('*')
        .eq('id', newSlot.id)
        .single();
      
      if (verifyError) {
        console.error('❌ 検証エラー:', verifyError);
      } else {
        console.log('✅ スロットが存在します:', verifySlot);
      }
      
      // 5. テストスロットを削除
      console.log('\n5️⃣ テストスロットを削除:');
      const { error: deleteError } = await supabaseAdmin
        .from('lesson_slots')
        .delete()
        .eq('id', newSlot.id);
      
      if (deleteError) {
        console.error('❌ 削除エラー:', deleteError);
      } else {
        console.log('✅ テストスロットを削除しました');
      }
    }
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

testLessonSlotCreation();
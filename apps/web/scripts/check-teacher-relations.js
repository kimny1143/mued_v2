#!/usr/bin/env node
/**
 * teacher_idとusersテーブルの関係を確認
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTeacherRelations() {
  console.log('🔍 teacher_idとusersテーブルの関係を確認\n');
  
  try {
    // 1. usersテーブルの全ユーザーを確認
    console.log('1️⃣ usersテーブルの内容:');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role_id');
    
    if (usersError) {
      console.error('❌ users取得エラー:', usersError);
      return;
    }
    
    console.log(`✅ ユーザー数: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.id}: ${user.email} (${user.name || 'No name'}) [Role: ${user.role_id}]`);
    });
    
    // 2. lesson_slotsで使用されているteacher_idを確認
    console.log('\n2️⃣ lesson_slotsで使用されているteacher_id:');
    const { data: teacherIds } = await supabaseAdmin
      .from('lesson_slots')
      .select('teacher_id')
      .limit(1000);
    
    const uniqueTeacherIds = [...new Set(teacherIds.map(s => s.teacher_id))];
    console.log(`✅ ユニークなteacher_id: ${uniqueTeacherIds.length}個`);
    uniqueTeacherIds.forEach(id => {
      console.log(`  - ${id}`);
    });
    
    // 3. 存在しないteacher_idを確認
    console.log('\n3️⃣ usersテーブルに存在しないteacher_id:');
    const userIds = users.map(u => u.id);
    const missingTeacherIds = uniqueTeacherIds.filter(id => !userIds.includes(id));
    
    if (missingTeacherIds.length > 0) {
      console.log(`⚠️  ${missingTeacherIds.length}個のteacher_idがusersテーブルに存在しません:`)
      missingTeacherIds.forEach(id => {
        console.log(`  - ${id}`);
      });
    } else {
      console.log('✅ すべてのteacher_idがusersテーブルに存在します');
    }
    
    // 4. JOINテストを実行
    console.log('\n4️⃣ JOINテストを実行:');
    
    // 方法1: 標準的なJOIN
    const { data: slotsWithTeacher1, error: joinError1 } = await supabaseAdmin
      .from('lesson_slots')
      .select(`
        id,
        teacher_id,
        start_time,
        teacher:users(id, name, email)
      `)
      .limit(5);
    
    if (joinError1) {
      console.error('❌ JOIN方法1エラー:', joinError1);
    } else {
      console.log('✅ JOIN方法1成功:');
      slotsWithTeacher1?.forEach(slot => {
        console.log(`  - Slot ${slot.id}: Teacher = ${JSON.stringify(slot.teacher)}`);
      });
    }
    
    // 方法2: !inner付きJOIN
    const { data: slotsWithTeacher2, error: joinError2 } = await supabaseAdmin
      .from('lesson_slots')
      .select(`
        id,
        teacher_id,
        start_time,
        users!inner(id, name, email)
      `)
      .limit(5);
    
    if (joinError2) {
      console.error('❌ JOIN方法2エラー:', joinError2);
    } else {
      console.log('\n✅ JOIN方法2成功:');
      slotsWithTeacher2?.forEach(slot => {
        console.log(`  - Slot ${slot.id}: Users = ${JSON.stringify(slot.users)}`);
      });
    }
    
    // 5. active_lesson_slotsビューでもテスト
    console.log('\n5️⃣ active_lesson_slotsビューでJOINテスト:');
    const { data: activeWithTeacher, error: activeError } = await supabaseAdmin
      .from('active_lesson_slots')
      .select(`
        id,
        teacher_id,
        start_time,
        teacher:users(id, name, email)
      `)
      .limit(5);
    
    if (activeError) {
      console.error('❌ active_lesson_slotsでのJOINエラー:', activeError);
    } else {
      console.log('✅ active_lesson_slotsでのJOIN成功:');
      activeWithTeacher?.forEach(slot => {
        console.log(`  - Slot ${slot.id}: Teacher = ${JSON.stringify(slot.teacher)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

checkTeacherRelations();
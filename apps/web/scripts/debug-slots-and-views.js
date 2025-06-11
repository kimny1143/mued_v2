#!/usr/bin/env node
/**
 * lesson_slotsテーブルとactive_lesson_slotsビューのデータを比較
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSlotsAndViews() {
  console.log('🔍 lesson_slotsとactive_lesson_slotsの比較\n');
  
  try {
    // 1. lesson_slotsテーブルのデータ数とサンプル
    console.log('1️⃣ lesson_slotsテーブル:');
    const { data: allSlots, error: slotsError } = await supabaseAdmin
      .from('lesson_slots')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (slotsError) {
      console.error('❌ lesson_slots取得エラー:', slotsError);
    } else {
      const { count: totalCount } = await supabaseAdmin
        .from('lesson_slots')
        .select('*', { count: 'exact', head: true });
      
      console.log(`✅ 総レコード数: ${totalCount}`);
      console.log('最新10件:');
      allSlots?.forEach(slot => {
        console.log(`  - ID: ${slot.id}`);
        console.log(`    Teacher: ${slot.teacher_id}`);
        console.log(`    Time: ${slot.start_time} - ${slot.end_time}`);
        console.log(`    Available: ${slot.is_available}`);
        console.log(`    Created: ${slot.created_at}`);
        console.log('');
      });
    }
    
    // 2. active_lesson_slotsビューのデータ数とサンプル
    console.log('\n2️⃣ active_lesson_slotsビュー:');
    const { data: activeSlots, error: activeError } = await supabaseAdmin
      .from('active_lesson_slots')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (activeError) {
      console.error('❌ active_lesson_slots取得エラー:', activeError);
    } else {
      const { count: activeCount } = await supabaseAdmin
        .from('active_lesson_slots')
        .select('*', { count: 'exact', head: true });
      
      console.log(`✅ 総レコード数: ${activeCount}`);
      console.log('最新10件:');
      activeSlots?.forEach(slot => {
        console.log(`  - ID: ${slot.id}`);
        console.log(`    Teacher: ${slot.teacher_id}`);
        console.log(`    Time: ${slot.start_time} - ${slot.end_time}`);
        console.log(`    Available: ${slot.is_available}`);
        console.log('');
      });
    }
    
    // 3. 現在時刻以降のスロットを確認
    console.log('\n3️⃣ 現在時刻以降のスロット:');
    const now = new Date().toISOString();
    const { data: futureSlots, count: futureCount } = await supabaseAdmin
      .from('lesson_slots')
      .select('*', { count: 'exact' })
      .gte('end_time', now)
      .order('start_time', { ascending: true })
      .limit(10);
    
    console.log(`✅ 未来のスロット数: ${futureCount}`);
    if (futureSlots && futureSlots.length > 0) {
      console.log('最初の10件:');
      futureSlots.forEach(slot => {
        console.log(`  - ${slot.start_time} - ${slot.end_time} (Teacher: ${slot.teacher_id})`);
      });
    }
    
    // 4. teacher_idごとの集計
    console.log('\n4️⃣ teacher_idごとの集計:');
    const { data: teacherStats } = await supabaseAdmin
      .rpc('get_teacher_slot_stats'); // この関数が存在しない場合はエラーになる
    
    if (!teacherStats) {
      // 手動で集計
      const { data: allTeacherSlots } = await supabaseAdmin
        .from('lesson_slots')
        .select('teacher_id, id');
      
      if (allTeacherSlots) {
        const teacherCounts = {};
        allTeacherSlots.forEach(slot => {
          teacherCounts[slot.teacher_id] = (teacherCounts[slot.teacher_id] || 0) + 1;
        });
        
        console.log('Teacher別スロット数:');
        Object.entries(teacherCounts).forEach(([teacherId, count]) => {
          console.log(`  - ${teacherId}: ${count}件`);
        });
      }
    }
    
    // 5. 最近作成されたスロット（24時間以内）
    console.log('\n5️⃣ 最近作成されたスロット（24時間以内）:');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSlots, count: recentCount } = await supabaseAdmin
      .from('lesson_slots')
      .select('*', { count: 'exact' })
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });
    
    console.log(`✅ 24時間以内に作成されたスロット: ${recentCount}件`);
    if (recentSlots && recentSlots.length > 0) {
      recentSlots.forEach(slot => {
        console.log(`  - ID: ${slot.id}`);
        console.log(`    Teacher: ${slot.teacher_id}`);
        console.log(`    Time: ${slot.start_time} - ${slot.end_time}`);
        console.log(`    Created: ${slot.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

debugSlotsAndViews();
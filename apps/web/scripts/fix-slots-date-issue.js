#!/usr/bin/env node
/**
 * スロットの日付を現在の日付に合わせて更新
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSlotDates() {
  console.log('🔧 スロットの日付を修正\n');
  
  try {
    // 1. 現在の日付を確認
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    
    console.log(`📅 現在の日付: ${now.toLocaleDateString('ja-JP')}`);
    console.log(`📅 現在のUTC: ${now.toISOString()}`);
    
    // 2. 既存のスロットを確認
    const { data: existingSlots, error: fetchError } = await supabaseAdmin
      .from('lesson_slots')
      .select('id, start_time, end_time, teacher_id')
      .order('start_time', { ascending: true });
    
    if (fetchError) {
      console.error('❌ スロット取得エラー:', fetchError);
      return;
    }
    
    console.log(`\n📊 既存スロット数: ${existingSlots.length}`);
    
    // 3. 最初のスロットの日付を確認
    if (existingSlots.length > 0) {
      const firstSlot = existingSlots[0];
      const firstSlotDate = new Date(firstSlot.start_time);
      console.log(`📅 最初のスロット日付: ${firstSlotDate.toLocaleDateString('ja-JP')}`);
      
      // 年の差を計算
      const yearDiff = currentYear - firstSlotDate.getFullYear();
      
      if (yearDiff !== 0) {
        console.log(`\n⚠️  スロットの年が ${yearDiff} 年ずれています`);
        console.log(`🔄 全スロットの日付を ${yearDiff} 年シフトしますか？`);
        
        // ここでは自動的に修正せず、問題を報告するだけにする
        console.log('\n💡 解決方法:');
        console.log('1. Supabaseダッシュボードで手動で日付を更新');
        console.log('2. 新しいシードデータを作成');
        console.log('3. このスクリプトを拡張して自動修正機能を追加');
      } else {
        console.log('✅ スロットの年は正しいです');
      }
    }
    
    // 4. 現在時刻より未来のスロット数を確認
    const futureSlots = existingSlots.filter(slot => {
      return new Date(slot.end_time) > now;
    });
    
    console.log(`\n📊 未来のスロット数: ${futureSlots.length}`);
    
    if (futureSlots.length === 0) {
      console.log('⚠️  未来のスロットがありません！');
      console.log('💡 新しいスロットを作成する必要があります');
    } else {
      console.log('✅ 未来のスロットが存在します');
      
      // 最初の5件を表示
      console.log('\n最初の5件:');
      futureSlots.slice(0, 5).forEach(slot => {
        const start = new Date(slot.start_time);
        const end = new Date(slot.end_time);
        console.log(`  - ${start.toLocaleString('ja-JP')} - ${end.toLocaleString('ja-JP')} (${slot.teacher_id})`);
      });
    }
    
    // 5. 2024年のデータが混在していないか確認
    const oldSlots = existingSlots.filter(slot => {
      const slotYear = new Date(slot.start_time).getFullYear();
      return slotYear < currentYear;
    });
    
    if (oldSlots.length > 0) {
      console.log(`\n⚠️  古いデータが ${oldSlots.length} 件見つかりました`);
      console.log('最初の5件:');
      oldSlots.slice(0, 5).forEach(slot => {
        const start = new Date(slot.start_time);
        console.log(`  - ${start.toLocaleString('ja-JP')} (${slot.teacher_id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

fixSlotDates();
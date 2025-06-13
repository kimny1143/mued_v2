#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSlotTimezones() {
  console.log('🔍 レッスンスロットの時刻データを確認中...\n');

  try {
    // 最新のスロットを取得
    const { data: slots, error } = await supabase
      .from('lesson_slots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!slots || slots.length === 0) {
      console.log('⚠️ スロットが見つかりません');
      return;
    }

    console.log(`📊 最新${slots.length}件のスロットを表示:\n`);

    slots.forEach((slot, index) => {
      console.log(`\n[スロット ${index + 1}]`);
      console.log(`ID: ${slot.id}`);
      console.log(`講師ID: ${slot.teacher_id}`);
      
      // UTC時刻（データベースに保存されている値）
      const startUTC = new Date(slot.start_time);
      const endUTC = new Date(slot.end_time);
      
      console.log('\n📅 データベース保存値（UTC）:');
      console.log(`  開始: ${slot.start_time}`);
      console.log(`  終了: ${slot.end_time}`);
      
      console.log('\n🌏 日本時間（JST）表示:');
      console.log(`  開始: ${startUTC.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`  終了: ${endUTC.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      
      console.log('\n🕐 ローカル時間表示:');
      console.log(`  開始: ${startUTC.toLocaleString()}`);
      console.log(`  終了: ${endUTC.toLocaleString()}`);
      
      // 時差の計算
      const jstOffset = 9; // JST is UTC+9
      const localOffset = new Date().getTimezoneOffset() / -60; // Local timezone offset in hours
      
      console.log('\n⏰ タイムゾーン情報:');
      console.log(`  JSTオフセット: UTC+${jstOffset}`);
      console.log(`  ローカルオフセット: UTC${localOffset >= 0 ? '+' : ''}${localOffset}`);
      console.log(`  時差: ${jstOffset - localOffset}時間`);
      
      console.log('\n' + '='.repeat(50));
    });

    // 特定の時間帯のスロットを検索（例：10:00-20:00 JST）
    console.log('\n\n🔎 日本時間 10:00-20:00 のスロットを検索中...');
    
    // 今日の日付でテスト
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // JST 10:00 = UTC 01:00
    const jst10am = new Date(today);
    jst10am.setUTCHours(1, 0, 0, 0); // UTC 01:00 = JST 10:00
    
    // JST 20:00 = UTC 11:00
    const jst8pm = new Date(today);
    jst8pm.setUTCHours(11, 0, 0, 0); // UTC 11:00 = JST 20:00
    
    console.log(`\n検索条件（UTC）:`);
    console.log(`  開始時刻が ${jst10am.toISOString()} 以降`);
    console.log(`  終了時刻が ${jst8pm.toISOString()} 以前`);
    
    const { data: targetSlots, error: searchError } = await supabase
      .from('lesson_slots')
      .select('*')
      .gte('start_time', jst10am.toISOString())
      .lte('end_time', jst8pm.toISOString())
      .order('start_time', { ascending: true });

    if (searchError) throw searchError;

    if (targetSlots && targetSlots.length > 0) {
      console.log(`\n✅ ${targetSlots.length}件の該当スロットが見つかりました:`);
      targetSlots.forEach((slot, index) => {
        const start = new Date(slot.start_time);
        const end = new Date(slot.end_time);
        console.log(`\n  ${index + 1}. ID: ${slot.id.substring(0, 8)}...`);
        console.log(`     UTC: ${slot.start_time} - ${slot.end_time}`);
        console.log(`     JST: ${start.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} - ${end.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      });
    } else {
      console.log('\n⚠️ 該当するスロットが見つかりませんでした');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// 実行
checkSlotTimezones();
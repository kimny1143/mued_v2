#!/usr/bin/env node
/**
 * タイムゾーン表示問題のテスト
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// formatJst関数の実装をテスト
function formatJst(date, formatStr) {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  // Intl.DateTimeFormatを使用して日本時間を取得
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(inputDate);
  const dateMap = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateMap[part.type] = part.value;
    }
  });
  
  // 簡易的なフォーマット
  if (formatStr === 'HH:mm') {
    return `${dateMap.hour}:${dateMap.minute}`;
  }
  return `${dateMap.year}-${dateMap.month}-${dateMap.day} ${dateMap.hour}:${dateMap.minute}:${dateMap.second}`;
}

async function testTimeZoneDisplay() {
  console.log('🧪 タイムゾーン表示テスト\n');
  
  // 1. 問題のあるデータを取得
  const { data: slot } = await supabase
    .from('lesson_slots')
    .select('*')
    .eq('id', '0e3d913c-9f98-4e02-979c-eaa2e8a16b36')
    .single();
  
  if (!slot) {
    console.log('❌ スロットが見つかりません');
    return;
  }
  
  console.log('1️⃣ データベースの生の値:');
  console.log(`  start_time: ${slot.start_time}`);
  console.log(`  end_time: ${slot.end_time}`);
  
  console.log('\n2️⃣ JavaScriptのDate解釈（問題の原因）:');
  const startDate = new Date(slot.start_time);
  const endDate = new Date(slot.end_time);
  console.log(`  開始: ${startDate.toISOString()} (UTC)`);
  console.log(`  終了: ${endDate.toISOString()} (UTC)`);
  console.log(`  開始（JST）: ${startDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  console.log(`  終了（JST）: ${endDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  
  console.log('\n3️⃣ ensureUTCTimestamp適用後:');
  const startWithZ = slot.start_time + 'Z';
  const endWithZ = slot.end_time + 'Z';
  const startDateZ = new Date(startWithZ);
  const endDateZ = new Date(endWithZ);
  console.log(`  開始: ${startDateZ.toISOString()} (UTC)`);
  console.log(`  終了: ${endDateZ.toISOString()} (UTC)`);
  console.log(`  開始（JST）: ${startDateZ.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  console.log(`  終了（JST）: ${endDateZ.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  
  console.log('\n4️⃣ formatJst関数でのテスト:');
  console.log(`  元データで formatJst: ${formatJst(slot.start_time, 'HH:mm')} - ${formatJst(slot.end_time, 'HH:mm')}`);
  console.log(`  Zサフィックス付きで formatJst: ${formatJst(startWithZ, 'HH:mm')} - ${formatJst(endWithZ, 'HH:mm')}`);
  
  console.log('\n5️⃣ 正しい解釈（データベースの値がUTCと仮定）:');
  console.log('  期待される表示: 10:00 - 20:00');
  console.log(`  実際の表示（Zサフィックス）: ${formatJst(startWithZ, 'HH:mm')} - ${formatJst(endWithZ, 'HH:mm')}`);
}

testTimeZoneDisplay();
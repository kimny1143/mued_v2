#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

async function testTimezoneFix() {
  const apiUrl = 'http://localhost:3000/api/lesson-slots?viewMode=own';
  
  console.log('🔍 APIレスポンスのタイムゾーン修正をテスト中...\n');
  
  try {
    // APIを呼び出し
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 必要に応じて認証ヘッダーを追加
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const slots = await response.json();
    
    if (!Array.isArray(slots) || slots.length === 0) {
      console.log('⚠️ スロットが見つかりません');
      return;
    }

    console.log(`📊 ${slots.length}件のスロットを取得:\n`);

    // 最初の3件を詳細表示
    slots.slice(0, 3).forEach((slot, index) => {
      console.log(`\n[スロット ${index + 1}]`);
      console.log(`ID: ${slot.id}`);
      
      console.log('\n📅 APIレスポンスの時刻データ:');
      console.log(`  startTime: ${slot.startTime}`);
      console.log(`  endTime: ${slot.endTime}`);
      
      if (slot.startTimeJst) {
        console.log(`  startTimeJst: ${slot.startTimeJst}`);
        console.log(`  endTimeJst: ${slot.endTimeJst}`);
      }
      
      // Zサフィックスの確認
      const hasZSuffix = slot.startTime && slot.startTime.endsWith('Z');
      console.log(`\n✅ Zサフィックス: ${hasZSuffix ? 'あり（UTC明示）' : 'なし'}`);
      
      // JavaScript Date解析
      const startDate = new Date(slot.startTime);
      const endDate = new Date(slot.endTime);
      
      console.log('\n🕐 JavaScript Date解析結果:');
      console.log(`  開始（UTC）: ${startDate.toISOString()}`);
      console.log(`  終了（UTC）: ${endDate.toISOString()}`);
      console.log(`  開始（JST）: ${startDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`  終了（JST）: ${endDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      
      // formatJst関数の動作をシミュレート
      const formatJstSimulation = (dateStr) => {
        const date = new Date(dateStr);
        const formatter = new Intl.DateTimeFormat('ja-JP', {
          timeZone: 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return formatter.format(date);
      };
      
      console.log('\n🎯 formatJst関数シミュレーション:');
      console.log(`  開始時刻: ${formatJstSimulation(slot.startTime)}`);
      console.log(`  終了時刻: ${formatJstSimulation(slot.endTime)}`);
      
      console.log('\n' + '='.repeat(50));
    });
    
    // 診断結果
    console.log('\n\n📋 診断結果:');
    const firstSlot = slots[0];
    if (firstSlot.startTime && firstSlot.startTime.endsWith('Z')) {
      console.log('✅ 修正が適用されています - 時刻データにZサフィックスが追加されています');
      console.log('✅ JavaScriptはこれをUTC時刻として正しく解釈します');
    } else {
      console.log('❌ 修正が適用されていません - 時刻データにZサフィックスがありません');
      console.log('⚠️  開発サーバーを再起動してください');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.log('\n💡 ヒント:');
    console.log('- 開発サーバーが起動していることを確認してください');
    console.log('- 認証が必要な場合は、適切な認証ヘッダーを追加してください');
  }
}

// 実行
testTimezoneFix();
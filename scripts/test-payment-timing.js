// payment-flow.tsの時間計算ロジックをテスト

const { differenceInMinutes, isAfter } = require('date-fns');

// 新ポリシー適用開始日（JST 2025年6月3日 0:00）
// UTC時刻では 2025-06-02T15:00:00Z になる
const NEW_POLICY_START_DATE = new Date('2025-06-02T15:00:00Z');

console.log('🔍 決済タイミング計算のテスト');
console.log('NEW_POLICY_START_DATE:', NEW_POLICY_START_DATE.toISOString());
console.log('NEW_POLICY_START_DATE (JST):', NEW_POLICY_START_DATE.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

// 現在時刻
const now = new Date();
console.log('\n現在時刻:', now.toISOString());
console.log('現在時刻 (JST):', now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

// テストケース：3:00のレッスン
const lessonStartTime = new Date('2025-06-03T03:00:00+09:00'); // JST 3:00 = UTC 18:00 (6/2)
console.log('\n📅 テストレッスン:');
console.log('開始時刻:', lessonStartTime.toISOString());
console.log('開始時刻 (JST):', lessonStartTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

// 新フロー対象かチェック
const isNewFlow = isAfter(lessonStartTime, NEW_POLICY_START_DATE);
console.log('\n🔄 フロー判定:');
console.log('レッスン時刻 > ポリシー開始日:', isNewFlow);

// UTC比較の詳細
console.log('\n🌐 UTC時刻での比較:');
console.log('レッスン時刻 (UTC):', lessonStartTime.toISOString());
console.log('ポリシー開始 (UTC):', NEW_POLICY_START_DATE.toISOString());
console.log('レッスン時刻のUNIXタイム:', lessonStartTime.getTime());
console.log('ポリシー開始のUNIXタイム:', NEW_POLICY_START_DATE.getTime());
console.log('差分 (ミリ秒):', lessonStartTime.getTime() - NEW_POLICY_START_DATE.getTime());
console.log('差分 (時間):', (lessonStartTime.getTime() - NEW_POLICY_START_DATE.getTime()) / (1000 * 60 * 60));

// 2時間前の計算
const twoHoursBeforeLesson = new Date(lessonStartTime.getTime() - 2 * 60 * 60 * 1000);
console.log('\n⏰ 実行タイミング:');
console.log('2時間前:', twoHoursBeforeLesson.toISOString());
console.log('2時間前 (JST):', twoHoursBeforeLesson.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

// 現在時刻での実行判定
const minutesUntilLesson = differenceInMinutes(lessonStartTime, now);
const shouldExecuteImmediately = minutesUntilLesson <= 120;

console.log('\n📊 実行判定:');
console.log('レッスンまでの時間 (分):', minutesUntilLesson);
console.log('レッスンまでの時間 (時間):', (minutesUntilLesson / 60).toFixed(2));
console.log('120分以内か:', minutesUntilLesson <= 120);
console.log('実行すべきか:', shouldExecuteImmediately);

// 1:00時点での計算をシミュレート
const oneAM = new Date('2025-06-03T01:00:00+09:00');
const minutesAt1AM = differenceInMinutes(lessonStartTime, oneAM);
const shouldExecuteAt1AM = minutesAt1AM <= 120;

console.log('\n🕐 1:00時点での判定:');
console.log('1:00 (JST):', oneAM.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('レッスンまでの時間 (分):', minutesAt1AM);
console.log('レッスンまでの時間 (時間):', (minutesAt1AM / 60).toFixed(2));
console.log('120分以内か:', minutesAt1AM <= 120);
console.log('実行すべきか:', shouldExecuteAt1AM);

// 正しい判定ロジックの提案
console.log('\n💡 問題の原因:');
if (!isNewFlow) {
  console.log('❌ レッスン開始時刻がUTCで前日（6/2）になっているため、新フロー対象外と判定されている');
  console.log('  → JST 6/3 3:00 = UTC 6/2 18:00');
  console.log('  → NEW_POLICY_START_DATE (UTC 6/3 0:00) より前なので旧フロー扱い');
} else if (shouldExecuteAt1AM) {
  console.log('✅ 1:00時点で実行対象になるはず');
} else {
  console.log('❓ その他の問題がある可能性');
}
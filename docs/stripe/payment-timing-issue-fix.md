# Stripe決済タイミング問題の修正

## 問題の概要

予約時にSetup Intent（カード情報登録のみ）を使用しているにも関わらず、生徒の予約と決済情報登録をした際に決済が即座に実行されてしまう問題が発生していました。

本来の仕様:
- 予約作成 → Setup Intent（カード情報登録のみ）
- メンター承認 → レッスン開始2時間前に自動決済

## 原因

`app/api/reservations/[id]/approve/route.ts`でメンターが予約を承認する際、`getPaymentExecutionTiming`関数の判定が正しく機能せず、2時間以上前でも即座決済が実行されていました。

## 修正内容

### 1. approve/route.ts の修正

```typescript
// 安全チェック：実際の時間差を再計算
const hoursUntilLesson = differenceInHours(updatedReservation.booked_start_time, now);

// 環境変数による制御（デフォルトは有効）
const immediatePaymentEnabled = process.env.ENABLE_IMMEDIATE_PAYMENT_ON_APPROVAL !== 'false';

// 安全チェック：2時間以内かつ、timing判定が正しいか確認
const shouldExecuteNow = hoursUntilLesson <= 2 && timing.shouldExecuteImmediately && immediatePaymentEnabled;
```

主な改善点:
- 時間計算の二重チェック
- タイムゾーン情報を含む詳細なログ出力
- タイミング判定エラーの検出
- 環境変数による決済タイミング制御

### 2. payment-flow.ts の修正

```typescript
// レッスン開始までの時間（時間単位）を計算
const hoursUntilLesson = differenceInHours(lessonStartTime, now);

return {
  shouldExecuteImmediately: hoursUntilLesson <= 2,  // レッスンまで2時間以内なら即座実行
  executionTime: twoHoursBeforeLesson,
  hoursUntilExecution: Math.max(0, hoursUntilExecutionTime),
  isAutoExecution: true
};
```

改善点:
- より明確な時間計算ロジック
- デバッグログの追加（UTC/JST両方で表示）

### 3. 環境変数の追加

`.env`ファイルに以下を追加:
```
# 決済タイミング制御
ENABLE_IMMEDIATE_PAYMENT_ON_APPROVAL=true
```

- `true`: メンター承認時に2時間以内の予約は即座決済（デフォルト）
- `false`: すべての決済をCronジョブに委ねる

## テスト方法

1. **通常のケース（2時間以上前）**
   - 3時間後のレッスンを予約
   - メンター承認
   - 決済が実行されないことを確認
   - ログで「Cronジョブによる自動決済を待機」と表示されることを確認

2. **即座決済のケース（2時間以内）**
   - 1時間後のレッスンを予約
   - メンター承認
   - 決済が即座に実行されることを確認

3. **環境変数での制御**
   - `ENABLE_IMMEDIATE_PAYMENT_ON_APPROVAL=false`に設定
   - 1時間後のレッスンでも即座決済されないことを確認

## ログの確認ポイント

修正後は以下のようなログが出力されます:

```
⏰ 決済実行タイミング詳細: {
  currentTimeUTC: '2025-01-01T10:00:00.000Z',
  currentTimeJST: '2025/1/1 19:00:00',
  lessonStartTimeUTC: '2025-01-01T12:00:00.000Z',
  lessonStartTimeJST: '2025/1/1 21:00:00',
  hoursUntilLesson: 2,
  timingCalculation: { ... }
}
```

エラー検出時:
```
🚨 タイミング判定エラー検出: レッスンまで3時間あるのに即座決済フラグがtrue
```

## 今後の改善案

1. **決済実行ログテーブルの追加**
   - いつ、どのトリガーで決済が実行されたか記録
   - 問題の早期発見と監査証跡

2. **管理画面での可視化**
   - 決済実行履歴の表示
   - 予約ごとの決済スケジュール表示

3. **通知の改善**
   - 決済実行前の事前通知
   - 決済完了通知の内容改善
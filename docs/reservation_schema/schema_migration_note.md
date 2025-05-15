# 予約システム簡素化に伴うUI更新の注意点

## 概要

予約システムのスキーマを簡素化しました。主な変更点は以下の通りです：

1. `ReservationStatus`を`CONFIRMED`と`COMPLETED`のみに簡素化
2. `PaymentStatus`列挙型を完全に削除
3. 予約の作成を支払い完了時に行うフローに変更

## UI更新の必要なファイル

以下のファイルで型エラーが発生しているため、更新が必要です：

1. `app/dashboard/reservations/page.tsx`
   - `paymentStatus`の参照を削除
   - 型定義を更新
   - フィルタリングロジックの簡素化

2. `app/dashboard/reservations/[id]/page.tsx` 
   - 予約詳細画面の更新
   - 支払い状態表示の削除

3. `app/dashboard/reservations/success/page.tsx`
   - 成功画面の更新

## リンターエラー

現在以下のエラーが残っているため、対応をお願いします：

1. `paymentStatus`の残りの参照箇所の修正
2. `useMemo`フックの使用位置の修正
3. `any`型の使用を避ける

## 新しい予約フロー

1. ユーザーがレッスンスロットを選択
2. Stripeチェックアウトページで決済
3. 決済成功後に予約レコードが**自動的に作成される**
4. ステータスは`CONFIRMED`から開始（支払い完了=予約確定）

これにより、以前の`PENDING`→`CONFIRMED`というフローがなくなり、支払い状態の管理が不要になります。 
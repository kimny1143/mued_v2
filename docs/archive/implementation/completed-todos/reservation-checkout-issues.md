# 予約・決済関連の課題と対応計画

## 1. パフォーマンス改善

### 1.1 API ルートの分離
- [x] `/api/lessonSlots` エンドポイントの実装
  - [x] クエリパラメータ `from`, `to` で期間指定
  - [x] `isAvailable: true` のレッスンスロットのみをページング取得
  - [x] Prisma クエリの最適化（`take/skip` + `orderBy startTime asc`）
  - [x] 複合インデックス `lesson_slot(startTime, isAvailable)` の追加

- [x] `/api/myReservations` エンドポイントの実装
  - [x] ユーザー別予約情報の取得
  - [x] SWR キャッシュの設定
  - [x] Supabase Realtime による差分更新の実装

### 1.2 フロントエンド最適化
- [x] React Query の導入
  - [x] 並列フェッチの実装
  - [x] スケルトンローディングの実装
  - [x] エラーハンドリングの改善

### 1.3 追加 TODO (2025-05-17 確認分)
- [x] Prisma 複合インデックス `lesson_slots(startTime, isAvailable)` を schema.prisma に追加し、Supabaseダッシュボードで以下のSQLを実行:
  ```sql
  CREATE INDEX "lesson_slots_startTime_isAvailable_idx" ON "lesson_slots" ("startTime", "isAvailable");
  ```
- [x] `/api/myReservations` のリアルタイム更新:
  - [x] `useSupabaseChannel` を使い `reservations` テーブル (`student_id=eq.{currentUserId}` フィルタ) を購読
  - [x] Supabase から `INSERT` / `UPDATE` / `DELETE` 受信時に `queryClient.invalidateQueries(['reservations'])` を呼び出し、UI を自動リフレッシュ

## 2. 予約フローの改善

### 2.1 仮予約システムの実装
- [x] `Reservation` モデルの拡張
  - [x] `status` フィールドの追加（`PENDING`, `CONFIRMED`, `CANCELED`）
  - [x] `paymentId` フィールドの追加

- [x] チェックアウトフローの実装
  - [x] `POST /api/checkout` エンドポイントの実装
  - [x] トランザクション処理の実装
  - [x] Stripe Session の生成と `metadata` の設定

### 2.2 決済処理の改善
- [x] `Payment` モデルの作成
  - [x] `stripeSessionId`, `stripePaymentId`, `amount`, `currency`, `status` フィールドの追加
  - [x] `Reservation` との1-1関連の設定

- [x] Stripe Webhook の実装
  - [x] `checkout.session.completed` イベントの処理
  - [x] `Payment` テーブルへのデータ挿入
  - [x] `Reservation` ステータスの更新

## 3. エラー処理とテスト

### 3.1 エラー処理の改善
- [x] Prisma エラーの修正
  - `lock` 引数の削除
  - 楽観的排他制御の実装

- [x] 予約ボタンの挙動修正
  - クロージャの修正
  - 子コンポーネント（`LessonSlotCard` など）への分割

### 3.2 テストの実装
- [x] **Vitest** + Prisma Test DB concurrent execution test
- [x] Playwright E2E test (予約→決済→枠消失のフロー)
- [x] Nightly load test (k6)
- [x] Security scan (ZAP)
- [x] コアドメインのテストカバレッジ80%以上（CI閾値ブロック含む）
- [x] Playwright ブラウザ依存のインストールステップを `ci-core.yml` に追加
- [x] `npm run test:ci` で coverage 生成 & 80% 未満で失敗させる
- [x] 重複 GitHub Actions (`ci.yml`, `e2e.yml`) の削除
- [x] Playwright `@core` タグ付け & `--grep @core` 実行を `ci-core.yml` に反映
- [x] `vitest.config.ts` に `coverage.threshold` 80% を設定
- [x] `codecov.yml` の `fail_ci_if_error` を `true` に変更
- [x] 005-test-bestpractice.mdc / README にフェーズ別テストポリシーを追記
- [x] CI workflow分割 (`ci-core.yml` / `ci-nightly.yml`)
- [x] Slack通知の実装

### 3.3 CI/CD 改善タスク (追加)
- [x] `ci-core.yml` で Node 20 を使用し lint/type-check/unit/E2E を 8–10 分以内に完了させる
- [x] `ci-nightly.yml` は k6 + ZAP + Datadog/Sentry ダッシュボード更新のみ実行
- [x] Coverage レポートを Codecov に送信し、Slack へ結果を通知
- [x] すべての Secrets 名称は .env.* と一致させる（`NEXT_PUBLIC_API_URL` など）
- [x] Workflow 実行ステータスに応じて PR にチェックを付与し、main へのマージをブロック

## 4. モニタリングとデプロイ

### 4.1 モニタリングの設定
- [x] Datadog APM の設定
  - [x] プロジェクトオーナー権限にてDatadog使用を廃止
  - [x] 代替モニタリングツールの選定と稟議が必要
  - [x] `/api/lessonSlots` の p95 レスポンスタイム目標: 150ms

### 4.2 デプロイ計画
- [x] Sprint 1: Schema 変更・API 分離・フロント実装リファクタ
  - [x] Schema 変更（Reservation, Payment モデル）
  - [x] API 分離（lessonSlots, myReservations, checkout）
  - [x] フロントエンド実装（React Query, 予約テーブル）
- [x] Sprint 2: Stripe Webhook/支払テーブル/E2E 自動化
  - [x] Stripe Webhook 実装
  - [x] 支払テーブル実装
  - [x] E2E 自動化（Playwright）
  - [x] CI/CD パイプライン設定
- [x] 本番反映
  - [x] デプロイ前の最終テスト実行（GitHub Actionsで自動実行）
  - [x] 本番環境へのデプロイ（Vercel自動デプロイ）
  - [x] データベースマイグレーション（完了済み）
  - [x] 環境変数設定（完了済み）
  - [x] リンターエラーの修正
    - [x] `app/api/lesson-slots/route.ts` の未使用変数・関数の修正
    - [x] `tests/load/reservation-flow.js` の k6 環境設定の追加
- [ ] デプロイ後の動作確認
  - [ ] Vercel Preview デプロイでの確認
    - [ ] 予約フロー全体の動作確認
      - [ ] レッスンスロット一覧表示
      - [ ] 予約ボタンの動作
      - [ ] Stripe決済画面への遷移
      - [ ] 決済完了後の予約確定
    - [ ] 予約管理画面の確認
      - [ ] 予約一覧の表示
      - [ ] 予約ステータスの更新
      - [ ] キャンセル機能
    - [ ] 講師側機能の確認
      - [ ] レッスン枠作成
      - [ ] 予約状況の確認
  - [ ] エラー監視
    - [ ] Vercel ログの確認
    - [ ] Stripe Webhook の動作確認
    - [ ] データベース接続エラーの有無
  - [ ] パフォーマンス確認
    - [ ] ページロード時間
    - [ ] API レスポンス時間
    - [ ] データベースクエリの実行時間

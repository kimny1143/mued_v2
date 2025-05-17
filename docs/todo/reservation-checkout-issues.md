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
- [ ] コアドメインのテストカバレッジ80%以上
- [x] CI workflow分割 (`ci-core.yml` / `ci-nightly.yml`)
- [x] Slack通知の実装

## 4. モニタリングとデプロイ

### 4.1 モニタリングの設定
- [ ] Datadog APM の設定
  - `/api/lessonSlots` の p95 レスポンスタイム目標: 150ms

### 4.2 デプロイ計画
- [ ] Sprint 1: Schema 変更・API 分離・フロント実装リファクタ
- [ ] Sprint 2: Stripe Webhook/支払テーブル/E2E 自動化 → 本番反映

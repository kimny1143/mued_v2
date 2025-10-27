# Post-Deployment Checklist

**作成日**: 2025-10-27
**対象**: MUED LMS v2 プレ本番環境
**目的**: Push後の初期動作確認

---

## ✅ 完了した作業

### 1. Git Push
- ✅ 15コミットを main ブランチにpush完了
- ✅ TypeScriptエラー 17件 → 0件に修正
- ✅ ビルド成功確認

### 2. データベースマイグレーション
- ✅ GINインデックス適用 (0004_gin_indexes_noconcurrent.sql)
  - `idx_materials_tags_gin` - タグ検索用
  - `idx_learning_metrics_weak_spots_gin` - 弱点分析用
- ✅ サービスアカウント作成 (0005_service_accounts.sql)
  - `service_account` - BYPASSRLS権限 (Webhook用)
  - `app_user` - 通常の操作用
- ✅ RLSポリシー有効化 (rls-policies.sql)
  - 全8テーブルにRLS有効化
  - ロール別アクセス制御実装

### 3. 環境変数確認
- ✅ Clerk本番API設定 (pk_test_, sk_test_)
- ✅ Stripe Webhook Secret設定
- ✅ OpenAI API Key設定
- ✅ Database URL設定

---

## 🔍 実施すべき初期動作確認

### Phase 1: 基本機能テスト (5分)

#### 1.1 認証フロー
```bash
# ブラウザで確認
open https://mued.jp/sign-up
```

**チェック項目**:
- [ ] 新規ユーザー登録ができる
- [ ] Clerk Webhookが正常に動作（usersテーブルに登録される）
- [ ] ログイン・ログアウトが正常
- [ ] ダッシュボードにアクセスできる

**確認SQL**:
```sql
-- 最新のユーザー登録を確認
SELECT id, clerk_id, email, name, role, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
```

#### 1.2 RLS動作確認
```sql
-- RLS有効化状態を確認
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- 期待値: 8テーブル全てでrowsecurity = true
```

**チェック項目**:
- [ ] users テーブル: RLS有効
- [ ] lesson_slots テーブル: RLS有効
- [ ] reservations テーブル: RLS有効
- [ ] materials テーブル: RLS有効
- [ ] subscriptions テーブル: RLS有効
- [ ] messages テーブル: RLS有効
- [ ] learning_metrics テーブル: RLS有効
- [ ] webhook_events テーブル: RLS有効

#### 1.3 インデックス確認
```sql
-- 新規追加されたインデックスを確認
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
  'idx_lesson_slots_start_status',
  'idx_reservations_mentor_status_payment',
  'idx_learning_metrics_user_created',
  'idx_materials_tags_gin',
  'idx_learning_metrics_weak_spots_gin'
);

-- 期待値: 5個のインデックスが存在
```

**チェック項目**:
- [ ] idx_lesson_slots_start_status 存在
- [ ] idx_reservations_mentor_status_payment 存在
- [ ] idx_learning_metrics_user_created 存在
- [ ] idx_materials_tags_gin (GIN) 存在
- [ ] idx_learning_metrics_weak_spots_gin (GIN) 存在

---

### Phase 2: Webhook動作確認 (10分)

#### 2.1 Clerk Webhook (ユーザー登録)

**手順**:
1. Clerk Dashboardで新規テストユーザーを作成
2. Webhookログを確認

**確認SQL**:
```sql
-- Webhook eventログを確認
SELECT id, source, type, status, created_at, error_message
FROM webhook_events
WHERE source = 'clerk'
ORDER BY created_at DESC
LIMIT 10;
```

**チェック項目**:
- [ ] Webhook eventが記録されている
- [ ] status = 'success'
- [ ] error_message が NULL
- [ ] usersテーブルに新規ユーザーが追加されている

#### 2.2 Stripe Webhook (決済処理)

**⚠️ 注意**: テスト環境で実際に決済テストを行う場合のみ

**手順**:
1. テストカード (4242 4242 4242 4242) で決済テスト
2. Stripe Dashboardでイベント確認

**確認SQL**:
```sql
-- Stripe Webhook eventログを確認
SELECT id, source, type, status, created_at, error_message
FROM webhook_events
WHERE source = 'stripe'
ORDER BY created_at DESC
LIMIT 10;

-- 決済完了した予約を確認
SELECT id, student_id, mentor_id, status, payment_status, amount, created_at
FROM reservations
WHERE payment_status = 'succeeded'
ORDER BY created_at DESC
LIMIT 5;
```

**チェック項目**:
- [ ] Webhook eventが記録されている
- [ ] status = 'success'
- [ ] reservations.payment_status = 'succeeded'
- [ ] reservations.status = 'completed'

---

### Phase 3: 新機能動作確認 (10分)

#### 3.1 講師レベニューシェア機能

**手順**:
1. 講師アカウントでログイン
2. `/dashboard/teacher` にアクセス

**確認項目**:
- [ ] RevenueStatsコンポーネントが表示される
- [ ] 累計収益が正しく計算されている (70%配分)
- [ ] 今月の収益が表示される
- [ ] 平均収益/レッスンが表示される
- [ ] 最近のレッスン一覧が表示される

**確認SQL**:
```sql
-- 講師の収益計算を確認（mentor_idを実際のIDに置き換え）
SELECT
  COUNT(*) as total_lessons,
  SUM(amount) as total_gross,
  SUM(amount) * 0.7 as mentor_share,
  SUM(amount) * 0.3 as platform_fee,
  AVG(amount) as avg_lesson_price,
  AVG(amount) * 0.7 as avg_mentor_earnings
FROM reservations
WHERE mentor_id = 'YOUR_MENTOR_ID'
AND status = 'completed'
AND payment_status = 'succeeded';
```

**チェック項目**:
- [ ] 70/30配分が正確
- [ ] 累計・月次の計算が正確
- [ ] UIに数値が正しく表示される

#### 3.2 タグ検索機能 (GINインデックス)

**確認SQL**:
```sql
-- タグ検索のパフォーマンステスト
EXPLAIN ANALYZE
SELECT id, title, tags, difficulty
FROM materials
WHERE tags @> '["piano"]'::jsonb
AND is_public = true
LIMIT 20;

-- 期待: Index Scan using idx_materials_tags_gin
```

**チェック項目**:
- [ ] GINインデックスが使用されている
- [ ] 実行時間が高速 (<10ms目標)

#### 3.3 弱点分析機能 (GINインデックス)

**確認SQL**:
```sql
-- 弱点分析クエリのパフォーマンステスト
EXPLAIN ANALYZE
SELECT user_id, material_id, weak_spots, created_at
FROM learning_metrics
WHERE weak_spots IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 期待: Index Scan using idx_learning_metrics_weak_spots_gin (必要に応じて)
```

**チェック項目**:
- [ ] weak_spotsデータが正しく保存されている
- [ ] クエリパフォーマンスが良好

---

### Phase 4: セキュリティ確認 (5分)

#### 4.1 RLSポリシー動作確認

**テスト1: ユーザーは自分のデータのみ閲覧可能**

```sql
-- セッション変数を設定してテスト
SET LOCAL app.current_user_id = 'test_clerk_id_123';

-- 自分のデータのみ取得できるはず
SELECT * FROM users WHERE clerk_id = current_setting('app.current_user_id', TRUE);
-- 期待: 1行返る

-- 他のユーザーのデータは取得できないはず
SELECT * FROM users WHERE clerk_id != current_setting('app.current_user_id', TRUE);
-- 期待: RLSによりブロック（0行）
```

**テスト2: サービスアカウントはRLSをバイパス**

```sql
-- サービスアカウントで接続している場合
-- 全てのデータにアクセス可能なはず
SELECT COUNT(*) FROM users;
-- 期待: 全ユーザー数が返る
```

**チェック項目**:
- [ ] 通常ユーザーは自分のデータのみアクセス可能
- [ ] service_accountはRLSをバイパス
- [ ] Admin権限で全データアクセス可能

---

## 🚨 問題発生時の対処

### RLS関連の問題

**症状**: Webhookが失敗する、データが保存されない

**原因**: RLSがWebhook操作をブロック

**対処**:
```sql
-- RLSを一時的に無効化（緊急時のみ）
ALTER TABLE webhook_events DISABLE ROW LEVEL SECURITY;

-- または、サービスアカウントの権限を確認
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'service_account';
-- 期待: rolbypassrls = true
```

### インデックス関連の問題

**症状**: クエリが遅い、タイムアウトする

**対処**:
```sql
-- インデックスの使用状況を確認
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- インデックスが使用されていない場合は、VACUUMを実行
VACUUM ANALYZE materials;
VACUUM ANALYZE learning_metrics;
```

### Webhook関連の問題

**症状**: Webhookイベントが届かない

**確認項目**:
1. Clerk/Stripe DashboardでWebhook URL確認
2. HTTPS証明書の有効性
3. Webhookシークレットの一致
4. ログを確認: `SELECT * FROM webhook_events WHERE status = 'failed';`

**対処**:
- Clerk: Dashboardでリトライ実行
- Stripe: Dashboardでイベント再送

---

## 📝 完了報告

以下のフォーマットで完了報告を作成してください：

```
### 初期動作確認完了報告

**実施日時**: YYYY-MM-DD HH:MM

**Phase 1: 基本機能テスト**
- 認証フロー: ✅/❌
- RLS動作確認: ✅/❌
- インデックス確認: ✅/❌

**Phase 2: Webhook動作確認**
- Clerk Webhook: ✅/❌
- Stripe Webhook: ✅/❌

**Phase 3: 新機能動作確認**
- 講師レベニューシェア: ✅/❌
- タグ検索機能: ✅/❌
- 弱点分析機能: ✅/❌

**Phase 4: セキュリティ確認**
- RLSポリシー: ✅/❌

**発見された問題**:
- (問題があれば記載)

**総合評価**: ✅ 正常 / ⚠️ 軽微な問題あり / ❌ 重大な問題あり
```

---

## 🔗 関連ドキュメント

- [FINAL_COMPREHENSIVE_REPORT_2025-10-27.md](./FINAL_COMPREHENSIVE_REPORT_2025-10-27.md) - 最終検証レポート
- [IMPLEMENTATION_TRACKER.md](./IMPLEMENTATION_TRACKER.md) - 実装追跡
- [db/production-deployment.md](../db/production-deployment.md) - 本番適用ガイド

---

**重要**: 問題が発生した場合は、すぐに報告し、必要に応じてロールバックを検討してください。

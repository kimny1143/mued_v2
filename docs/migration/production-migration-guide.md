# 本番環境マイグレーションガイド

## 実行日時: 2025-06-11

## 1. 事前確認事項

### 環境情報
- [ ] Supabaseダッシュボードへのアクセス権限
- [ ] 本番環境のデータベース接続情報
- [ ] ロールバック手順の確認

### バックアップ
- [ ] データベースのバックアップ取得
- [ ] 現在のスキーマ情報を記録

## 2. マイグレーション実行手順

### Step 1: Supabaseダッシュボードにログイン
1. [Supabase Dashboard](https://app.supabase.com)にアクセス
2. 本番プロジェクトを選択
3. SQL Editorに移動

### Step 2: ビュー作成SQLの実行

以下のSQLを実行してください：

```sql
-- ============================================
-- データベースビュー作成マイグレーション
-- 実行日: 2025-06-11
-- 目的: アプリケーションレベルのフィルタリングをDBレベルに移行
-- ============================================

-- 1. アクティブなレッスンスロットビュー
CREATE OR REPLACE VIEW active_lesson_slots AS
SELECT * FROM lesson_slots
WHERE end_time > CURRENT_TIMESTAMP
  AND is_available = true;

-- 2. アクティブな予約ビュー
CREATE OR REPLACE VIEW active_reservations AS
SELECT * FROM reservations
WHERE slot_id IN (
  SELECT id FROM lesson_slots
  WHERE end_time > CURRENT_TIMESTAMP
)
AND status NOT IN ('CANCELED', 'REJECTED');

-- 権限付与（Supabaseのロール用）
GRANT SELECT ON active_lesson_slots TO authenticated;
GRANT SELECT ON active_reservations TO authenticated;

-- 公開エンドポイント用にanonロールにも権限付与
GRANT SELECT ON active_lesson_slots TO anon;
GRANT SELECT ON active_reservations TO anon;

-- 注意: lesson_sessionsテーブルが存在しないため、upcoming_sessionsビューは作成しません
```

### Step 3: 実行確認

```sql
-- ビューが正しく作成されたか確認
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name IN ('active_lesson_slots', 'active_reservations');

-- 権限が正しく付与されたか確認
SELECT grantee, privilege_type, table_name
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('active_lesson_slots', 'active_reservations')
  AND grantee IN ('authenticated', 'anon');
```

### Step 4: 動作テスト

```sql
-- 各ビューからデータが取得できるか確認
SELECT COUNT(*) as active_slots_count FROM active_lesson_slots;
SELECT COUNT(*) as active_reservations_count FROM active_reservations;

-- サンプルデータの確認（最大5件）
SELECT * FROM active_lesson_slots LIMIT 5;
SELECT * FROM active_reservations LIMIT 5;
```

## 3. 環境変数の設定

### Vercelダッシュボードで設定
1. Vercelプロジェクトの設定ページに移動
2. Environment Variablesセクションで以下を追加：

```
NEXT_PUBLIC_USE_DB_VIEWS=false
NEXT_PUBLIC_USE_V2_APIS=false
NEXT_PUBLIC_USE_IMPROVED_JWT=false
```

**注意**: 最初は`false`で設定し、動作確認後に段階的に`true`に変更

## 4. デプロイと確認

1. Vercelで再デプロイをトリガー
2. デプロイ完了後、以下を確認：
   - アプリケーションが正常に動作
   - エラーログがないこと
   - パフォーマンスメトリクス

## 5. 段階的な有効化

### Phase 1: 10%のトラフィックで検証
```
NEXT_PUBLIC_USE_DB_VIEWS=true
NEXT_PUBLIC_USE_V2_APIS=true
```

### Phase 2: 問題なければ50%に拡大
- エラー率の監視
- レスポンスタイムの比較

### Phase 3: 全トラフィックに適用
- 最終的な動作確認
- パフォーマンス改善の測定

## 6. ロールバック手順

問題が発生した場合：

### 即座の対応
1. 環境変数を`false`に戻す
```
NEXT_PUBLIC_USE_DB_VIEWS=false
NEXT_PUBLIC_USE_V2_APIS=false
```

### ビューの削除（必要な場合のみ）
```sql
-- ビューを削除する場合のSQL
DROP VIEW IF EXISTS active_lesson_slots CASCADE;
DROP VIEW IF EXISTS active_reservations CASCADE;
```

## 7. モニタリング項目

- [ ] APIレスポンスタイム
- [ ] エラー率
- [ ] データベース負荷
- [ ] ユーザーからのフィードバック

## 8. 成功基準

- ✅ 2つのビューが正常に作成される
  - active_lesson_slots
  - active_reservations
- ✅ 権限が正しく設定される
- ✅ APIが正常に動作する
- ✅ パフォーマンスが改善される（目標: 50%以上の高速化）
- ✅ エラー率が喉加しない

## トラブルシューティング

### ビュー作成エラー
- 権限不足: Supabase管理者権限を確認
- 既存オブジェクト: `CREATE OR REPLACE`を使用

### パフォーマンス問題
- インデックスの確認
- クエリプランの分析

### データ不整合
- タイムゾーンの確認
- フィルタ条件の検証
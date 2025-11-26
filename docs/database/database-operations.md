# Neon PostgreSQL データベース運用詳細

## データベース構成

- **プロバイダー**: Neon (Serverless PostgreSQL)
- **ORM**: Drizzle ORM
- **接続方法**: `@neondatabase/serverless` パッケージ
- **環境変数**: `DATABASE_URL` (`.env.local`に設定)

---

## マイグレーション管理

### 基本コマンド

```bash
# データベース接続テスト
npm run db:test-connection

# マイグレーション実行
npm run db:migrate:phase2

# Drizzle Studio（データベースGUI）
npm run db:studio
```

---

## マイグレーションファイルの作成ルール

**重要: Neon PostgreSQLでは以下の構文に注意**

### 1. ENUM型の作成 - 存在チェック必須

```sql
-- ❌ NG: 再実行時にエラー
CREATE TYPE content_type AS ENUM ('material', 'note_article');

-- ✅ OK: 冪等性を保証
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    CREATE TYPE content_type AS ENUM ('material', 'note_article');
  END IF;
END $$;
```

### 2. インデックスの作成 - IF NOT EXISTS必須

```sql
-- ❌ NG: 再実行時にエラー
CREATE INDEX idx_user_email ON users(email);

-- ✅ OK: 冪等性を保証
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
```

### 3. 外部キー制約 - 存在チェック必須

```sql
-- ❌ NG: ALTER TABLE ADD CONSTRAINT IF NOT EXISTSは非対応
ALTER TABLE ai_dialogue_log
ADD CONSTRAINT IF NOT EXISTS fk_user
FOREIGN KEY (user_id) REFERENCES users(id);

-- ✅ OK: DO $$ブロックで存在チェック
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user'
  ) THEN
    ALTER TABLE ai_dialogue_log
    ADD CONSTRAINT fk_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
```

### 4. トリガーの作成 - 存在チェック必須

```sql
-- ✅ OK: トリガーも DO $$ブロックで
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_table_updated_at'
  ) THEN
    CREATE TRIGGER update_table_updated_at
      BEFORE UPDATE ON table_name
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
```

---

## マイグレーション実行のベストプラクティス

1. **テスト接続**: 必ず最初に接続テスト
   ```bash
   npm run db:test-connection
   ```

2. **冪等性の確保**: 全てのDDL文は再実行可能に
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - ENUM/制約/トリガーは`DO $$`ブロックで存在チェック

3. **トランザクション管理**: Neon SDKの制約
   - 単一のSQL文のみサポート
   - 複数文を実行する場合は個別に分割
   - `BEGIN; ... COMMIT;`は使用不可（自動トランザクション）

4. **ロールバック準備**: 緊急時のロールバックスクリプトを用意
   ```bash
   npx tsx scripts/rollback-phase2.ts
   ```

---

## Neon固有の制約と対処法

| 制約 | 対処法 |
|------|--------|
| 複数SQL文の一括実行不可 | 文を分割して個別実行 |
| `ALTER TABLE ADD CONSTRAINT IF NOT EXISTS` 非対応 | `DO $$`ブロックで存在チェック |
| ローカルpostgresqlとの接続方法の違い | `@neondatabase/serverless`を使用 |

---

## トラブルシューティング

### `type "xxx" already exists` エラー

- **原因**: ENUM型を`CREATE TYPE`で直接作成している
- **解決**: `DO $$`ブロックで存在チェックを追加

### `relation "xxx" already exists` エラー（インデックス）

- **原因**: `CREATE INDEX`に`IF NOT EXISTS`がない
- **解決**: `CREATE INDEX IF NOT EXISTS`に変更

### `trigger "xxx" for relation "yyy" already exists`

- **原因**: トリガーが`DO $$`ブロック外で作成されている
- **解決**: 存在チェック付き`DO $$`ブロックに移動

### `cannot insert multiple commands into a prepared statement`

- **原因**: 複数のSQL文を一度に実行しようとしている
- **解決**: SQL文を分割して個別に実行

---

## 現在のマイグレーション構成

```
db/migrations/
├── 0006_add_rag_metrics.sql        # RAGメトリクステーブル作成
├── 0007_optimize_rag_indexes.sql   # パフォーマンス最適化インデックス
├── 0008_add_foreign_keys_fixed.sql # 外部キー制約
└── rollback_0006_add_rag_metrics.sql # 緊急ロールバック用
```

### 作成されるテーブル

- `ai_dialogue_log` - AIチャット履歴とRAGメトリクス
- `provenance` - データプロヴェナンス管理
- `rag_metrics_history` - 日次集計メトリクス
- `plugin_registry` - プラグイン登録情報

### 作成されるENUM型

- `content_type` - コンテンツタイプ
- `acquisition_method` - 取得方法
- `license_type` - ライセンス種別

---
name: database-operations
description: PostgreSQL/Neon データベース操作、Drizzle ORMスキーマ設計、マイグレーション作成・実行、クエリ最適化。DB操作、スキーマ変更、マイグレーション、データベース設計時に使用。
---

# データベース運用 (MUED LMS v2)

## 基本情報

- **プロバイダー**: Neon (Serverless PostgreSQL)
- **ORM**: Drizzle ORM
- **接続**: `@neondatabase/serverless`

## コマンド

```bash
npm run db:test-connection  # 接続テスト
npm run db:studio           # Drizzle Studio (GUI)
npm run db:migrate:phase2   # マイグレーション実行
```

## マイグレーションルール

**重要: 冪等性を確保すること**

### ENUM型: 存在チェック必須

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'my_enum') THEN
    CREATE TYPE my_enum AS ENUM ('value1', 'value2');
  END IF;
END $$;
```

### インデックス: IF NOT EXISTS 必須

```sql
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

### 外部キー: DO $$ブロックで存在チェック

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_name'
  ) THEN
    ALTER TABLE t ADD CONSTRAINT fk_name FOREIGN KEY (col) REFERENCES other(id);
  END IF;
END $$;
```

## スキーマファイルの場所

- `db/schema/` - Drizzle スキーマ定義
- `db/migrations/` - マイグレーションSQL

## 詳細ドキュメント

[docs/database/database-operations.md](docs/database/database-operations.md)

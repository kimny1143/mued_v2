# データベースリストア手順書

## 🚨 緊急時用クイックリファレンス

### 最速リストア（5分以内）
```bash
# 最新のバックアップから完全リストア
psql "${DATABASE_URL}" < /backups/snapshots/latest.sql
```

### Supabase Point-in-Time Recovery
```bash
supabase db restore --project-ref <project-ref> \
  --backup-id <backup-id> \
  --point-in-time "2025-06-11 10:00:00"
```

---

## 目次
1. [事前準備](#1-事前準備)
2. [リストアシナリオ](#2-リストアシナリオ)
3. [詳細手順](#3-詳細手順)
4. [検証手順](#4-検証手順)
5. [トラブルシューティング](#5-トラブルシューティング)

## 1. 事前準備

### 1.1 必要な情報の確認
- [ ] データベースURL
- [ ] 管理者権限
- [ ] バックアップファイルの場所
- [ ] 影響を受けるサービスの一覧

### 1.2 環境変数の設定
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
export BACKUP_DIR="/var/backups/mued"
export RESTORE_LOG="/tmp/restore_$(date +%Y%m%d_%H%M%S).log"
```

## 2. リストアシナリオ

### シナリオA: 完全データ損失
**症状**: すべてのテーブルが空、または削除されている
**推定復旧時間**: 30分〜2時間

### シナリオB: 部分的データ損失
**症状**: 特定のテーブルのみデータが失われている
**推定復旧時間**: 15分〜30分

### シナリオC: データ破損
**症状**: データは存在するが整合性が失われている
**推定復旧時間**: 1時間〜4時間

### シナリオD: 誤操作からの復旧
**症状**: DELETE/UPDATE文の誤実行
**推定復旧時間**: 15分（PITR使用時）

## 3. 詳細手順

### 3.0 Supabase初期状態からの完全復旧手順

Supabaseでデータベースをリセットした後、現在の状態を完全に復旧するための手順です。

```bash
#!/bin/bash
# restore-from-scratch.sh
# Supabase初期状態から完全復旧するスクリプト

set -euo pipefail

echo "=== Supabase初期状態からの完全復旧 ==="
echo "開始時刻: $(date)"

# バックアップディレクトリの確認
BACKUP_DIR=$1
if [ -z "$BACKUP_DIR" ]; then
    echo "使用方法: ./restore-from-scratch.sh <backup_directory>"
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "エラー: バックアップディレクトリが見つかりません: $BACKUP_DIR"
    exit 1
fi

echo "使用するバックアップ: $BACKUP_DIR"

# 1. PostgreSQL拡張機能の有効化
echo "ステップ1: PostgreSQL拡張機能を有効化中..."
if [ -f "$BACKUP_DIR/metadata/extensions.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/metadata/extensions.sql" || {
        echo "警告: 一部の拡張機能の有効化に失敗しました"
    }
fi

# 2. Supabaseロールの設定
echo "ステップ2: Supabaseロールを設定中..."
if [ -f "$BACKUP_DIR/metadata/roles.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/metadata/roles.sql" || {
        echo "警告: 一部のロール設定に失敗しました"
    }
fi

# 3. カスタム型（ENUM等）の作成
echo "ステップ3: カスタム型を作成中..."
if [ -f "$BACKUP_DIR/metadata/custom_types.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/metadata/custom_types.sql" || {
        echo "エラー: カスタム型の作成に失敗しました"
        exit 1
    }
fi

# 4. スキーマ権限の設定
echo "ステップ4: スキーマ権限を設定中..."
if [ -f "$BACKUP_DIR/metadata/schema_permissions.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/metadata/schema_permissions.sql"
fi

# 5. スキーマ（テーブル、インデックス、制約）の復元
echo "ステップ5: データベーススキーマを復元中..."
if [ -f "$BACKUP_DIR/schema/full_schema.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/schema/full_schema.sql" || {
        echo "エラー: スキーマの復元に失敗しました"
        exit 1
    }
fi

# 6. ビューの作成（依存関係順）
echo "ステップ6: ビューを作成中..."
if [ -f "$BACKUP_DIR/schema/views.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/schema/views.sql" || {
        echo "警告: 一部のビューの作成に失敗しました"
    }
fi

# 7. 関数とストアドプロシージャの復元
echo "ステップ7: 関数を復元中..."
if [ -f "$BACKUP_DIR/schema/functions.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/schema/functions.sql"
fi

# 8. トリガーの復元
echo "ステップ8: トリガーを復元中..."
if [ -f "$BACKUP_DIR/schema/triggers.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/schema/triggers.sql"
fi

# 9. インデックスの作成
echo "ステップ9: インデックスを作成中..."
if [ -f "$BACKUP_DIR/schema/indexes.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/schema/indexes.sql"
fi

# 10. 外部キー制約の追加
echo "ステップ10: 外部キー制約を追加中..."
if [ -f "$BACKUP_DIR/schema/constraints.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/schema/constraints.sql"
fi

# 11. データの復元
echo "ステップ11: データを復元中..."
if [ -f "$BACKUP_DIR/data/data_backup.custom" ]; then
    pg_restore \
        --data-only \
        --no-owner \
        --no-privileges \
        --disable-triggers \
        --dbname="${DATABASE_URL}" \
        "$BACKUP_DIR/data/data_backup.custom" || {
        echo "警告: カスタム形式からの復元に失敗、SQLファイルを試行中..."
        if [ -f "$BACKUP_DIR/data/data_backup.sql" ]; then
            psql "${DATABASE_URL}" < "$BACKUP_DIR/data/data_backup.sql"
        fi
    }
elif [ -f "$BACKUP_DIR/data/data_backup.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/data/data_backup.sql"
fi

# 12. シーケンスの現在値を復元
echo "ステップ12: シーケンス値を復元中..."
if [ -f "$BACKUP_DIR/data/sequences.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/data/sequences.sql"
fi

# 13. RLS（Row Level Security）の設定
echo "ステップ13: Row Level Securityを設定中..."
if [ -f "$BACKUP_DIR/metadata/rls_policies.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/metadata/rls_policies.sql"
fi

# 14. 権限の付与
echo "ステップ14: 権限を付与中..."
if [ -f "$BACKUP_DIR/metadata/permissions.sql" ]; then
    psql "${DATABASE_URL}" < "$BACKUP_DIR/metadata/permissions.sql"
fi

# 15. 統計情報の更新
echo "ステップ15: 統計情報を更新中..."
psql "${DATABASE_URL}" << EOF
ANALYZE;
EOF

# 16. 復旧の検証
echo "ステップ16: 復旧を検証中..."
psql "${DATABASE_URL}" << EOF
-- テーブル数の確認
SELECT 'Tables' as object_type, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
-- ビュー数の確認
SELECT 'Views', COUNT(*)
FROM information_schema.views
WHERE table_schema = 'public'
UNION ALL
-- 関数数の確認
SELECT 'Functions', COUNT(*)
FROM information_schema.routines
WHERE routine_schema = 'public'
UNION ALL
-- トリガー数の確認
SELECT 'Triggers', COUNT(*)
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
-- RLSポリシー数の確認
SELECT 'RLS Policies', COUNT(*)
FROM pg_policies
WHERE schemaname = 'public';

-- 主要テーブルのレコード数
SELECT table_name, COUNT(*) as record_count
FROM (
    SELECT 'users' as table_name, COUNT(*) FROM users
    UNION ALL SELECT 'lesson_slots', COUNT(*) FROM lesson_slots
    UNION ALL SELECT 'reservations', COUNT(*) FROM reservations
    UNION ALL SELECT 'roles', COUNT(*) FROM roles
) counts
ORDER BY table_name;
EOF

echo "=== 復旧完了 ==="
echo "完了時刻: $(date)"
```

### 3.1 完全リストア手順

```bash
#!/bin/bash
# restore-full.sh

echo "=== 完全リストア開始 ==="
echo "開始時刻: $(date)"

# 1. 現在の接続を切断
echo "既存接続を切断中..."
psql "${DATABASE_URL}" << EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
EOF

# 2. バックアップファイルの確認
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/snapshots/*.sql | head -1)
echo "使用するバックアップ: ${LATEST_BACKUP}"
echo "ファイルサイズ: $(ls -lh ${LATEST_BACKUP} | awk '{print $5}')"

# 3. リストア実行
echo "リストア実行中..."
psql "${DATABASE_URL}" < "${LATEST_BACKUP}" 2>&1 | tee "${RESTORE_LOG}"

# 4. 基本的な検証
echo "基本検証中..."
psql "${DATABASE_URL}" << EOF
-- テーブル数の確認
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 主要テーブルのレコード数
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'lesson_slots', COUNT(*) FROM lesson_slots
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations;
EOF

echo "=== リストア完了 ==="
echo "ログファイル: ${RESTORE_LOG}"
```

### 3.2 部分リストア手順

```bash
#!/bin/bash
# restore-partial.sh

TABLE_NAME=$1
BACKUP_FILE=$2

if [ -z "$TABLE_NAME" ] || [ -z "$BACKUP_FILE" ]; then
    echo "使用方法: ./restore-partial.sh <table_name> <backup_file>"
    exit 1
fi

echo "=== ${TABLE_NAME}テーブルの部分リストア ==="

# 1. 既存データのバックアップ
echo "既存データをバックアップ中..."
pg_dump --table="${TABLE_NAME}" "${DATABASE_URL}" > "/tmp/${TABLE_NAME}_before_restore.sql"

# 2. トランザクション内でリストア
psql "${DATABASE_URL}" << EOF
BEGIN;

-- 既存データを一時テーブルに退避
CREATE TEMP TABLE ${TABLE_NAME}_backup AS SELECT * FROM ${TABLE_NAME};

-- テーブルをクリア
TRUNCATE ${TABLE_NAME} CASCADE;

-- CSVからデータをインポート
\COPY ${TABLE_NAME} FROM '${BACKUP_FILE}' WITH CSV HEADER;

-- データ件数を確認
SELECT '復旧前' as status, COUNT(*) FROM ${TABLE_NAME}_backup
UNION ALL
SELECT '復旧後', COUNT(*) FROM ${TABLE_NAME};

-- 問題なければコミット（問題があればROLLBACK）
COMMIT;
EOF
```

### 3.3 Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# restore-pitr.sh

TARGET_TIME=$1  # 例: "2025-06-11 14:30:00"

if [ -z "$TARGET_TIME" ]; then
    echo "使用方法: ./restore-pitr.sh \"YYYY-MM-DD HH:MM:SS\""
    exit 1
fi

echo "=== Point-in-Time Recovery ==="
echo "復旧目標時刻: ${TARGET_TIME}"

# Supabaseの場合
if [ -n "$SUPABASE_PROJECT_REF" ]; then
    supabase db restore \
        --project-ref "${SUPABASE_PROJECT_REF}" \
        --point-in-time "${TARGET_TIME}"
else
    # 手動PITRの場合
    echo "WALアーカイブからの復旧を実行..."
    # pg_basebackup と WALアーカイブを使用した復旧
    # 詳細は PostgreSQL のドキュメントを参照
fi
```

### 3.4 RLS設定の復旧

```sql
-- restore-rls.sql
-- RLS設定を復旧するSQL

-- 1. 既存のポリシーを削除
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. バックアップからポリシーを復元
-- (バックアップファイルの内容をここに挿入)

-- 3. RLSの有効化状態を復元
-- (バックアップファイルから生成されたALTER TABLE文を実行)
```

## 4. 検証手順

### 4.1 データ整合性チェック

```sql
-- check-integrity.sql

-- 外部キー制約の検証
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
  );

-- 主キーの重複チェック
DO $$
DECLARE
    r RECORD;
    dup_count INTEGER;
BEGIN
    FOR r IN (
        SELECT table_name, column_name
        FROM information_schema.key_column_usage
        WHERE constraint_name LIKE '%_pkey'
    ) LOOP
        EXECUTE format('
            SELECT COUNT(*) - COUNT(DISTINCT %I)
            FROM %I',
            r.column_name, r.table_name
        ) INTO dup_count;
        
        IF dup_count > 0 THEN
            RAISE WARNING 'Duplicate primary keys in table %: %',
                r.table_name, dup_count;
        END IF;
    END LOOP;
END $$;
```

### 4.2 アプリケーション動作確認

```typescript
// test-connection.ts
import { createClient } from '@supabase/supabase-js';

async function testDatabaseConnection() {
  const tests = [
    // 接続テスト
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      return { test: 'Connection', success: !error };
    },
    
    // 書き込みテスト
    async () => {
      const { error } = await supabase
        .from('test_table')
        .insert({ test_data: new Date().toISOString() });
      return { test: 'Write', success: !error };
    },
    
    // RLSテスト
    async () => {
      const { data, error } = await supabase
        .from('protected_table')
        .select('*');
      return { test: 'RLS', success: !error || error.code === 'PGRST301' };
    }
  ];
  
  for (const test of tests) {
    const result = await test();
    console.log(`${result.test}: ${result.success ? '✓' : '✗'}`);
  }
}
```

## 5. トラブルシューティング

### 問題: リストア中にエラー「role does not exist」

**解決策**:
```sql
-- 必要なロールを作成（Supabase標準ロール）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN;
    END IF;
END $$;

-- ロールの継承関係を設定
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT usage ON SCHEMA public TO anon, authenticated, service_role;
```

### 問題: 拡張機能のインストールに失敗

**解決策**:
```sql
-- Supabaseで利用可能な拡張機能を確認
SELECT * FROM pg_available_extensions WHERE name IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'btree_gist');

-- 必要な拡張機能を手動でインストール
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

### 問題: ENUM型の作成でエラー

**解決策**:
```sql
-- 既存の型を確認
SELECT n.nspname, t.typname 
FROM pg_type t 
JOIN pg_namespace n ON t.typnamespace = n.oid 
WHERE t.typtype = 'e';

-- 型が既に存在する場合は削除してから再作成
DROP TYPE IF EXISTS public.reservation_status CASCADE;
CREATE TYPE public.reservation_status AS ENUM (
    'pending_approval',
    'approved',
    'pending_payment',
    'confirmed',
    'completed',
    'cancelled',
    'rejected'
);
```

### 問題: ビューの作成で依存関係エラー

**解決策**:
```bash
# ビューの依存関係を確認し、正しい順序で作成
psql "${DATABASE_URL}" << 'EOF'
-- ビューの依存関係を取得
WITH RECURSIVE view_deps AS (
    SELECT 
        v.oid::regclass::text as view_name,
        array_agg(DISTINCT d.refobjid::regclass::text) as depends_on
    FROM pg_class v
    JOIN pg_rewrite r ON r.ev_class = v.oid
    JOIN pg_depend d ON d.objid = r.oid
    JOIN pg_class c ON c.oid = d.refobjid AND c.relkind IN ('r', 'v', 'm')
    WHERE v.relkind IN ('v', 'm')
      AND v.relnamespace = 'public'::regnamespace
    GROUP BY v.oid
)
SELECT * FROM view_deps ORDER BY view_name;
EOF
```

### 問題: リストア後にアプリケーションが接続できない

**解決策**:
1. 接続プールをリセット
2. アプリケーションを再起動
3. 接続文字列を確認

### 問題: パフォーマンスが劣化

**解決策**:
```sql
-- 統計情報を更新
ANALYZE;

-- インデックスを再構築
REINDEX DATABASE current_database();

-- 自動バキュームを実行
VACUUM ANALYZE;
```

### 問題: RLSが正しく動作しない

**解決策**:
```sql
-- RLS状態を確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- ポリシーを確認
SELECT * FROM pg_policies
WHERE schemaname = 'public';
```

## 6. 手動復旧手順（スクリプトが使用できない場合）

### 6.1 最小限の復旧手順

```sql
-- 1. 必須拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. 基本ロールの作成
CREATE ROLE IF NOT EXISTS anon NOLOGIN;
CREATE ROLE IF NOT EXISTS authenticated NOLOGIN;
CREATE ROLE IF NOT EXISTS service_role NOLOGIN;

-- 3. スキーマ権限の付与
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;

-- 4. Prismaマイグレーションの実行
-- ローカル環境から実行:
-- npx prisma migrate deploy

-- 5. シーケンスのリセット（データインポート後）
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;
SELECT setval(pg_get_serial_sequence('lesson_slots', 'id'), COALESCE(MAX(id), 1)) FROM lesson_slots;
SELECT setval(pg_get_serial_sequence('reservations', 'id'), COALESCE(MAX(id), 1)) FROM reservations;
```

### 6.2 必須データの手動インポート

```sql
-- ロールデータ（必須）
INSERT INTO roles (name, display_name, description) VALUES
('student', '生徒', '音楽レッスンを受講する生徒'),
('mentor', 'メンター', '音楽レッスンを提供するメンター'),
('admin', '管理者', 'システム全体の管理者');

-- テストユーザーの作成（開発環境のみ）
INSERT INTO users (email, name, role_id, created_at) VALUES
('admin@example.com', 'Admin User', (SELECT id FROM roles WHERE name = 'admin'), NOW()),
('mentor@example.com', 'Test Mentor', (SELECT id FROM roles WHERE name = 'mentor'), NOW()),
('student@example.com', 'Test Student', (SELECT id FROM roles WHERE name = 'student'), NOW());
```

## 7. 復旧完了チェックリスト

### 7.1 データベースオブジェクト確認

- [ ] **拡張機能**
  ```sql
  SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql');
  -- 期待: uuid-ossp, pgcrypto等
  ```

- [ ] **カスタム型**
  ```sql
  SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e';
  -- 期待: reservation_status, payment_status等
  ```

- [ ] **テーブル**
  ```sql
  SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
  -- 期待: 10以上のテーブル
  ```

- [ ] **ビュー**
  ```sql
  SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';
  ```

- [ ] **関数**
  ```sql
  SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';
  ```

- [ ] **トリガー**
  ```sql
  SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';
  ```

### 7.2 セキュリティ確認

- [ ] **RLS有効化**
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables 
  WHERE schemaname = 'public' AND rowsecurity = true;
  ```

- [ ] **RLSポリシー**
  ```sql
  SELECT tablename, COUNT(*) as policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public' 
  GROUP BY tablename;
  ```

- [ ] **権限設定**
  ```sql
  SELECT grantee, string_agg(privilege_type, ', ') as privileges
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
  GROUP BY grantee;
  ```

### 7.3 データ整合性確認

- [ ] **外部キー制約**
  ```sql
  SELECT conname FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace;
  ```

- [ ] **主キー重複チェック**
- [ ] **NULL値チェック（NOT NULL制約）**
- [ ] **シーケンス値の確認**

### 7.4 アプリケーション動作確認

- [ ] データベース接続テスト
- [ ] 認証機能の動作確認
- [ ] CRUD操作の確認
- [ ] リアルタイム機能の確認

## 連絡先

### エスカレーション
- **レベル1**: DevOpsチーム (Slack: #devops)
- **レベル2**: テックリード
- **レベル3**: CTO

### 外部サポート
- Supabase Support: support@supabase.io
- PostgreSQL Community: https://www.postgresql.org/community/

### 関連ドキュメント
- [データベースバックアップ計画書](./database-backup-plan.md)
- [自動バックアップスクリプト](../../scripts/automated-backup.sh)
- [Prismaマイグレーションガイド](../migration/prisma-migration-guide.md)

---

---

## 8. schema.prismaベースの完全復旧手順

### 8.1 概要
`prisma migrate reset`等でデータベースがリセットされた場合に、schema.prismaをベースに完全な環境を再構築する手順です。

### 8.2 使用するスクリプト

#### A. 完全初期構築スクリプト
**ファイル**: `/scripts/supabase-complete-init.sql`

このスクリプトには以下が含まれます：
- テーブル構造（schema.prismaと完全一致）
- ENUMタイプ定義
- インデックス・外部キー制約
- RLSポリシー
- auth.users → public.users同期トリガー
- ビュー（active_lesson_slots, active_reservations）

#### B. サンプルデータ投入スクリプト
**ファイル**: `/scripts/supabase-sample-data.sql`

開発環境用のテストデータが含まれます。

### 8.3 実行手順

#### Step 1: Supabaseダッシュボードにログイン
```
https://app.supabase.com
```

#### Step 2: SQL Editorで初期構築スクリプトを実行
1. SQL Editorを開く
2. `/scripts/supabase-complete-init.sql`の内容をコピー
3. 実行

#### Step 3: サンプルデータ投入（開発環境のみ）
```sql
-- /scripts/supabase-sample-data.sql の内容を実行
```

#### Step 4: 実行確認
スクリプトの最後に以下の確認結果が表示されます：
- テーブル一覧
- RLS有効状態
- トリガー一覧

### 8.4 既存のPrismaマイグレーションとの使い分け

#### Prismaマイグレーションを使う場合
```bash
cd apps/web
npx prisma migrate deploy
```

**メリット**: 
- マイグレーション履歴が管理される
- スキーマの変更履歴が追跡可能

**デメリット**:
- RLSポリシーが含まれない
- auth同期が設定されない
- Supabase固有の設定が不足

#### 完全初期構築スクリプトを使う場合
**メリット**:
- RLSポリシーを含む完全な環境構築
- auth.users同期の自動設定
- 1回の実行で全て完了

**デメリット**:
- マイグレーション履歴が残らない
- スキーマ変更時は手動でスクリプト更新が必要

### 8.5 トラブルシューティング

#### エラー: "column does not exist"
原因: テーブル構造が不完全
対処: 
```bash
cd apps/web
npx prisma db push --force-reset
```

#### エラー: "type already exists"
原因: ENUM型が既に存在
対処: スクリプトの最初に既に含まれているDROP文が実行されるはずですが、それでもエラーが出る場合：
```sql
DROP TYPE IF EXISTS "ReservationStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
```

#### auth.users同期が動作しない
確認手順:
```sql
-- トリガーの存在確認
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_deleted');

-- 手動でトリガーを再作成する場合は supabase-complete-init.sql の該当部分を実行
```

### 8.6 重要な注意事項

1. **本番環境での実行前には必ずバックアップを取得**
2. **サンプルデータは開発環境のみで使用**
3. **既存データがある場合は上書きされる可能性があるため注意**

**最終更新**: 2025-06-11
**次回レビュー予定**: 2025-09-11
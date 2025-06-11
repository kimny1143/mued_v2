# データベースバックアップ計画書

## エグゼクティブサマリー
本計画書は、MUED LMSのデータベースバックアップ戦略を定義し、データ損失リスクを最小化することを目的とします。今回のインシデント（開発環境でのデータ損失）を教訓に、本番環境での大規模障害を防ぐための包括的な計画を策定します。

## 1. バックアップ戦略

### 1.1 バックアップの種類と頻度

| バックアップタイプ | 頻度 | 保持期間 | 目的 |
|------------------|------|----------|------|
| フルバックアップ | 日次（深夜2時） | 30日間 | 完全復旧用 |
| 増分バックアップ | 1時間ごと | 7日間 | 直近の変更を復旧 |
| Point-in-Time Recovery | 継続的 | 7日間 | 任意の時点に復旧 |
| スキーマバックアップ | 変更時 | 永続 | 構造変更の履歴 |
| RLS設定バックアップ | 変更時 | 永続 | セキュリティ設定の履歴 |
| 拡張機能バックアップ | 変更時 | 永続 | PostgreSQL拡張機能の設定 |
| カスタム型バックアップ | 変更時 | 永続 | ENUM型とカスタム型の定義 |
| ビュー/関数バックアップ | 変更時 | 永続 | ビュー、関数、トリガーの定義 |

### 1.2 Supabaseネイティブ機能の活用

```yaml
supabase_backup:
  automatic_backups:
    enabled: true
    frequency: daily
    retention_days: 30
  
  point_in_time_recovery:
    enabled: true
    retention_days: 7
    
  wal_archiving:
    enabled: true
    compression: true
```

## 2. 包括的バックアップシステム（Supabase初期状態からの完全復旧対応）

### 2.1 包括的バックアップスクリプト

包括的バックアップスクリプト（`/scripts/backup/comprehensive-backup.sh`）は、Supabaseデータベースを初期状態から完全に復旧するために必要なすべての要素をバックアップします：

**バックアップ対象：**
1. **PostgreSQL拡張機能** - uuid-ossp, pgcrypto などの拡張機能一覧
2. **ロール設定** - anon, authenticated, service_role などSupabase特有のロール
3. **カスタム型（ENUM等）** - reservation_status などのカスタム型定義
4. **スキーマ** - テーブル、インデックス、制約の完全な定義
5. **ビュー** - 依存関係を考慮した順序でのビュー定義
6. **関数・トリガー** - ストアドプロシージャとトリガーの定義
7. **RLS設定** - Row Level Securityの有効化状態とポリシー
8. **権限設定** - テーブル、シーケンス、関数への詳細な権限
9. **シーケンスの現在値** - 自動採番の現在値
10. **データ** - 圧縮形式とSQL形式の両方でバックアップ

**実行方法：**
```bash
# 手動実行
export DATABASE_URL="postgresql://user:password@host:port/database"
./scripts/backup/comprehensive-backup.sh

# cron設定（毎日深夜2時）
0 2 * * * DATABASE_URL='...' /path/to/comprehensive-backup.sh
```

### 2.2 包括的リストアスクリプト

包括的リストアスクリプト（`/scripts/backup/comprehensive-restore.sh`）により、Supabaseの初期状態から完全復旧が可能です：

**リストア手順：**
1. 拡張機能の有効化
2. ロールの作成（Supabase特有のロールを含む）
3. カスタム型の作成
4. スキーマの復元
5. ビューの作成（依存関係順）
6. 関数とトリガーの作成
7. インデックスの作成
8. RLS設定の復元
9. 権限設定の復元
10. データの復元
11. シーケンスの値を復元

**実行方法：**
```bash
# ドライラン（確認のみ）
DRY_RUN=true DATABASE_URL='...' ./scripts/backup/comprehensive-restore.sh /path/to/backup

# 実際のリストア
DATABASE_URL='...' ./scripts/backup/comprehensive-restore.sh /path/to/backup
```

### 2.3 スキーマとRLS設定の定期エクスポート

```bash
#!/bin/bash
# /scripts/backup-schema-rls.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/schema/${DATE}"
mkdir -p "${BACKUP_DIR}"

# PostgreSQL拡張機能のバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/extensions.sql"
SELECT 
  'CREATE EXTENSION IF NOT EXISTS "' || extname || '" WITH SCHEMA ' || nspname || ';' as create_statement
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname NOT IN ('plpgsql')
ORDER BY extname;
EOF

# ENUM型とカスタム型のバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/custom_types.sql"
SELECT 
  'CREATE TYPE ' || n.nspname || '.' || t.typname || ' AS ENUM (' ||
  string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) || ');' as create_statement
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE n.nspname = 'public'
GROUP BY n.nspname, t.typname
ORDER BY t.typname;
EOF

# シーケンスの現在値のバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/sequences.sql"
SELECT 
  'SELECT setval(''' || schemaname || '.' || sequencename || ''', ' || last_value || ', true);' as setval_statement
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;
EOF

# スキーマのエクスポート（拡張版）
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-unlogged-table-data \
  "${DATABASE_URL}" > "${BACKUP_DIR}/schema.sql"

# ビューの定義のバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/views.sql"
SELECT 
  'CREATE OR REPLACE VIEW ' || schemaname || '.' || viewname || ' AS ' || definition as create_statement
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
EOF

# 関数とストアドプロシージャのバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/functions.sql"
SELECT 
  pg_get_functiondef(p.oid) || ';' as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind IN ('f', 'p', 'a', 'w')
ORDER BY p.proname;
EOF

# トリガーのバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/triggers.sql"
SELECT 
  'CREATE TRIGGER ' || trigger_name || 
  ' ' || action_timing || ' ' || event_manipulation || 
  ' ON ' || event_object_schema || '.' || event_object_table ||
  ' FOR EACH ' || action_orientation ||
  ' ' || action_statement || ';' as create_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
EOF

# Supabase特有のロール設定のバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/roles.sql"
-- ロールの作成
SELECT 
  'CREATE ROLE ' || rolname || 
  CASE 
    WHEN rolsuper THEN ' SUPERUSER'
    WHEN rolcreaterole THEN ' CREATEROLE'
    WHEN rolcreatedb THEN ' CREATEDB'
    WHEN rolcanlogin THEN ' LOGIN'
    ELSE ''
  END || ';' as create_statement
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role', 'authenticator', 'dashboard_user', 'supabase_admin')
  AND rolname NOT IN (SELECT rolname FROM pg_roles WHERE rolname LIKE 'pg_%')
ORDER BY rolname;

-- ロールの権限設定
SELECT DISTINCT
  'GRANT ' || privilege_type || ' ON SCHEMA public TO ' || grantee || ';' as grant_statement
FROM information_schema.role_usage_grants
WHERE object_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grant_statement;
EOF

# RLS設定のエクスポート（改良版）
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/rls_policies.sql"
-- RLSの有効化
SELECT 
  'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;' as enable_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    SELECT tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  )
ORDER BY tablename;

-- RLSポリシーの作成
SELECT 
  'CREATE POLICY "' || policyname || '" ON ' || 
  schemaname || '.' || tablename || 
  ' AS ' || CASE WHEN permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END ||
  ' FOR ' || cmd || 
  ' TO ' || array_to_string(roles, ', ') ||
  CASE 
    WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' 
    ELSE '' 
  END ||
  CASE 
    WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' 
    ELSE '' 
  END || ';' as create_policy
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
EOF

# 権限設定のエクスポート（詳細版）
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/permissions.sql"
-- テーブル権限
SELECT 
  'GRANT ' || privilege_type || ' ON ' || table_schema || '.' || table_name || 
  ' TO ' || grantee || ';' as grant_statement
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- シーケンス権限
SELECT 
  'GRANT ' || privilege_type || ' ON SEQUENCE ' || sequence_schema || '.' || sequence_name || 
  ' TO ' || grantee || ';' as grant_statement
FROM information_schema.role_usage_grants
WHERE object_schema = 'public'
  AND object_type = 'SEQUENCE'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY object_name, grantee, privilege_type;

-- 関数権限
SELECT 
  'GRANT EXECUTE ON FUNCTION ' || routine_schema || '.' || routine_name || 
  '(' || pg_get_function_identity_arguments(p.oid) || ') TO ' || grantee || ';' as grant_statement
FROM information_schema.role_routine_grants r
JOIN pg_proc p ON p.proname = r.routine_name
JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = r.routine_schema
WHERE routine_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY routine_name, grantee;
EOF

# インデックスのバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/indexes.sql"
SELECT 
  pg_get_indexdef(indexrelid) || ';' as create_index
FROM pg_index i
JOIN pg_class c ON i.indexrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT i.indisprimary
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conindid = i.indexrelid
  )
ORDER BY c.relname;
EOF

# 制約のバックアップ
psql "${DATABASE_URL}" << EOF > "${BACKUP_DIR}/constraints.sql"
SELECT 
  'ALTER TABLE ' || n.nspname || '.' || c.relname || 
  ' ADD CONSTRAINT ' || con.conname || ' ' ||
  pg_get_constraintdef(con.oid) || ';' as add_constraint
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND con.contype NOT IN ('p', 'u') -- プライマリキーとユニーク制約は除外（スキーマに含まれる）
ORDER BY c.relname, con.conname;
EOF

echo "Complete database structure backup created at: ${BACKUP_DIR}"
```

### 2.2 データバックアップスクリプト

```bash
#!/bin/bash
# /scripts/backup-data.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/data/mued_backup_${DATE}.sql"

# 完全バックアップ（圧縮）
pg_dump \
  --clean \
  --if-exists \
  --verbose \
  --format=custom \
  --file="${BACKUP_FILE}" \
  "${DATABASE_URL}"

# S3へのアップロード（オプション）
aws s3 cp "${BACKUP_FILE}" "s3://mued-backups/daily/${DATE}/" \
  --storage-class GLACIER_IR

# 古いバックアップの削除
find /backups/data -name "*.sql" -mtime +30 -delete
```

## 3. 自動化システム

### 3.1 包括的バックアップの自動化

**crontab設定例：**
```bash
# 本番環境の包括的バックアップ（毎日深夜2時）
0 2 * * * DATABASE_URL='prod_url' /opt/mued/scripts/backup/comprehensive-backup.sh

# ステージング環境（毎日深夜3時）
0 3 * * * DATABASE_URL='staging_url' /opt/mued/scripts/backup/comprehensive-backup.sh

# 開発環境（週次）
0 2 * * 0 DATABASE_URL='dev_url' /opt/mued/scripts/backup/comprehensive-backup.sh
```

### 3.2 GitHub Actions による自動バックアップ

```yaml
# .github/workflows/database-backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # 毎日午前2時（UTC）
  workflow_dispatch:      # 手動実行も可能

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PostgreSQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client
      
      - name: Backup Schema and RLS
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          ./scripts/backup-schema-rls.sh
      
      - name: Upload to S3
        uses: aws-actions/aws-cli@v2
        with:
          args: s3 sync /backups/ s3://mued-backups/
```

### 3.2 監視とアラート

```typescript
// /lib/monitoring/backup-monitor.ts
import { createClient } from '@supabase/supabase-js';
import { sendAlert } from './alerts';

export async function checkBackupHealth() {
  const checks = {
    lastBackupTime: await getLastBackupTime(),
    backupSize: await getBackupSize(),
    rlsIntegrity: await checkRLSIntegrity(),
    schemaConsistency: await checkSchemaConsistency()
  };
  
  // 24時間以内にバックアップがない場合アラート
  if (Date.now() - checks.lastBackupTime > 24 * 60 * 60 * 1000) {
    await sendAlert({
      severity: 'critical',
      message: 'Database backup is overdue',
      details: checks
    });
  }
  
  return checks;
}
```

## 4. リストア手順

### 4.1 緊急時リストア手順

```markdown
## 🚨 緊急リストア手順

### 1. 影響範囲の確認
- [ ] データ損失の範囲を特定
- [ ] 最後の正常なバックアップを確認
- [ ] ステークホルダーへの通知

### 2. リストア実行
```bash
# Point-in-Time Recovery（推奨）
supabase db restore --project-ref <project-ref> \
  --backup-id <backup-id> \
  --point-in-time "2025-06-11 10:00:00"

# または手動リストア
pg_restore --clean --if-exists --verbose \
  --dbname="${DATABASE_URL}" \
  /backups/data/mued_backup_20250611_020000.sql
```

### 3. 検証
- [ ] データ整合性チェック
- [ ] RLS設定の確認
- [ ] アプリケーション動作確認
```

### 4.2 部分リストア

```sql
-- 特定テーブルのみリストア
BEGIN;
  -- 既存データのバックアップ
  CREATE TABLE lesson_slots_backup AS SELECT * FROM lesson_slots;
  
  -- リストア実行
  DELETE FROM lesson_slots;
  \COPY lesson_slots FROM '/backup/lesson_slots_20250611.csv' CSV HEADER;
  
  -- 検証
  SELECT COUNT(*) FROM lesson_slots;
  
  -- 問題なければコミット、問題があればロールバック
COMMIT; -- or ROLLBACK;
```

## 5. テスト計画

### 5.1 定期リストアテスト

| テスト項目 | 頻度 | 担当 | 成功基準 |
|-----------|------|------|----------|
| フルリストア | 四半期 | DevOps | 全データ復旧、RTO < 4時間 |
| 部分リストア | 月次 | DBA | 特定テーブル復旧、RTO < 1時間 |
| PITR テスト | 月次 | DevOps | 任意時点への復旧成功 |
| RLS設定復旧 | 変更時 | Security | 権限設定の完全復旧 |

### 5.2 災害復旧訓練

```yaml
disaster_recovery_drill:
  frequency: quarterly
  scenarios:
    - complete_data_loss
    - partial_corruption
    - ransomware_attack
    - accidental_deletion
  
  success_metrics:
    rto: 4_hours    # Recovery Time Objective
    rpo: 1_hour     # Recovery Point Objective
    data_integrity: 100%
```

## 6. インシデント対応

### 6.1 エスカレーションフロー

```mermaid
graph TD
    A[データ損失検知] --> B{影響範囲}
    B -->|軽微| C[L1: DevOpsチーム対応]
    B -->|中程度| D[L2: テックリード承認]
    B -->|重大| E[L3: CTO判断]
    
    C --> F[リストア実行]
    D --> F
    E --> G[緊急対策会議]
    G --> F
    
    F --> H[検証]
    H --> I[報告書作成]
```

### 6.2 コミュニケーション計画

| ステークホルダー | 通知タイミング | 通知方法 | 内容 |
|----------------|---------------|----------|------|
| 開発チーム | 即座 | Slack | 技術詳細、対応状況 |
| プロダクトチーム | 15分以内 | Slack + Email | 影響範囲、復旧見込み |
| 経営陣 | 30分以内 | 電話 + Email | ビジネス影響、対応計画 |
| ユーザー | 1時間以内 | ステータスページ | サービス状況、復旧予定 |

## 7. 予防措置

### 7.1 開発環境での保護

```sql
-- 危険なコマンドの実行前確認
CREATE OR REPLACE FUNCTION confirm_dangerous_operation()
RETURNS event_trigger AS $$
BEGIN
  IF current_database() != 'development' THEN
    RAISE EXCEPTION 'This operation requires explicit confirmation in production';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER prevent_drop_table
ON sql_drop
EXECUTE FUNCTION confirm_dangerous_operation();
```

### 7.2 アクセス制御

```yaml
database_access:
  production:
    read_write: ["dba_team"]
    read_only: ["dev_team", "analytics_team"]
    restricted_commands:
      - DROP
      - TRUNCATE
      - DELETE without WHERE
    
  staging:
    read_write: ["dev_team", "dba_team"]
    
  development:
    read_write: ["all_developers"]
```

## 8. コンプライアンスと監査

### 8.1 規制要件

- **データ保持**: 最低3年間の監査ログ
- **暗号化**: 保存時および転送時の暗号化
- **アクセスログ**: 全てのデータアクセスを記録
- **GDPR対応**: ユーザーデータの削除要求に対応

### 8.2 監査ログ

```sql
-- 監査テーブル
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT,
  action TEXT,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT
);

-- トリガー例
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_log (
    user_id, action, table_name, record_id,
    old_values, new_values
  ) VALUES (
    current_user, TG_OP, TG_TABLE_NAME, NEW.id,
    to_jsonb(OLD), to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 9. 予算とリソース

### 9.1 コスト見積もり

| 項目 | 月額費用 | 年額費用 | 備考 |
|------|---------|---------|------|
| Supabase Pro Plan | $25 | $300 | PITR含む |
| S3 Glacier Storage | $50 | $600 | 1TB想定 |
| 監視ツール | $100 | $1,200 | Datadog等 |
| 人件費（DBA 0.2FTE） | $2,000 | $24,000 | - |
| **合計** | **$2,175** | **$26,100** | - |

### 9.2 ROI分析

- **データ損失による想定損害**: $500,000/インシデント
- **年間投資額**: $26,100
- **ROI**: 1インシデント防止で19倍のリターン

## 10. 継続的改善

### 10.1 KPI

- バックアップ成功率: 目標 99.9%
- RTO達成率: 目標 95%
- RPO達成率: 目標 99%
- リストアテスト成功率: 目標 100%

### 10.2 四半期レビュー

- バックアップ戦略の見直し
- インシデントからの学習
- 新技術の評価（例: Postgres 16の新機能）
- コスト最適化

## 承認

| 役職 | 氏名 | 承認日 | 署名 |
|------|------|--------|------|
| CTO | | | |
| インフラマネージャー | | | |
| セキュリティマネージャー | | | |

---

**改訂履歴**
- v1.0 2025-06-11 初版作成（開発環境インシデントを受けて）
- v1.1 2025-06-11 包括的バックアップシステムを追加（Supabase初期状態からの完全復旧対応）
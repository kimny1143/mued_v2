# データベースビュー移行ステータス

## 概要
このドキュメントは、データベースビュー移行プロジェクトの現在の進捗状況を追跡します。

最終更新: 2025-06-11

## 完了済みタスク ✅

### 1. 基盤整備
- [x] マイグレーションファイル作成
  - 場所: `/apps/web/prisma/migrations/20250610_add_active_views/migration.sql`
  - 内容: 3つのビュー（active_lesson_slots, active_reservations, upcoming_sessions）

- [x] フィーチャーフラグシステム実装
  - 場所: `/apps/web/lib/config/features.ts`
  - 環境変数: `NEXT_PUBLIC_USE_DB_VIEWS`, `NEXT_PUBLIC_USE_V2_APIS`

### 2. API移行
- [x] `/api/lesson-slots` 
  - フィーチャーフラグ対応完了
  - パフォーマンス: 65.1%改善確認
  - 状態: 本番準備完了

- [x] `/api/reservations`
  - フィーチャーフラグ対応完了
  - active_reservationsビュー使用
  - 状態: 本番準備完了

- [x] `/api/my-reservations`
  - フィーチャーフラグ対応完了
  - active_reservationsビュー使用
  - 状態: 本番準備完了

- [x] `/api/lesson-slots/by-mentor/[id]`
  - フィーチャーフラグ対応完了
  - active_lesson_slotsビュー使用
  - 状態: 本番準備完了

- [x] `/api/sessions`
  - フィーチャーフラグ対応完了
  - upcoming_sessionsビュー使用
  - 状態: 本番準備完了

## 進行中タスク 🔄
- [ ] 本番環境へのビュー作成
  - マイグレーションガイド作成済み
  - SQL検証スクリプト作成済み
  - 統合実行SQL作成済み（`/scripts/execute-in-supabase.sql`）
  - 実行ガイド作成済み（`/docs/migration/supabase-execution-guide.md`）

## 次のアクション 🎯

### 即座に実行可能：
1. **SupabaseでのSQL実行**
   - `/scripts/execute-in-supabase.sql` を実行
   - lesson_sessionsテーブルとビューを作成
   - 実行ガイド: `/docs/migration/supabase-execution-guide.md`

2. **検証の実行**
   - `/scripts/verify-db-views.sql` で確認
   - すべてのオブジェクトが作成されていることを確認

3. **Vercel環境変数設定**
   - 初期値: `false`で設定
   - 動作確認後に`true`に変更

### Phase 2-2 ✅ 全API移行完了
すべてのAPIのフィーチャーフラグ実装が完了しました：
- `/api/lesson-slots` ✅
- `/api/reservations` ✅
- `/api/my-reservations` ✅
- `/api/lesson-slots/by-mentor/[id]` ✅
- `/api/sessions` ✅

### Phase 3: JWT処理改善
- URL-safeなbase64デコード実装
- エラーハンドリング強化

## 技術的課題

### 1. データベーススキーマ不整合 🔴
- **問題**: lesson_sessionsテーブルがPrismaスキーマに存在するが、マイグレーションに含まれていない
- **影響**: 
  - upcoming_sessionsビューが作成できない
  - /api/sessions APIが機能しない
- **対策**: `/scripts/create-missing-tables.sql` でテーブルを作成

### 2. データ損失の可能性
- **原因**: `prisma migrate reset` コマンドの実行
- **対策**: 
  - Supabaseのバックアップから復元
  - またはポイントインタイムリカバリ使用

### 3. Prisma prepared statement エラー
- 症状: `prepared statement "s3" does not exist`
- 影響: dashboard layoutでのユーザー情報取得
- 対策: 開発サーバー完全再起動で一時的に解決

## パフォーマンス測定結果

| API | v1 (現在) | v2 (ビュー使用) | 改善率 |
|-----|----------|----------------|--------|
| /api/lesson-slots | 718.90ms | 235.00ms | 67.3% |

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| ビュー権限エラー | 高 | 事前にSQLで権限付与 |
| パフォーマンス劣化 | 中 | フィーチャーフラグで即座に切り戻し |
| データ不整合 | 高 | 並行稼働期間で比較検証 |

## 環境別ステータス

| 環境 | ビュー作成 | API移行 | 状態 |
|------|-----------|---------|------|
| 開発 | ✅ | ✅ | 稼働中 |
| ステージング | ❌ | ❌ | 未着手 |
| 本番 | ❌ | ❌ | 未着手 |

## 重要なファイル一覧

### 実行用SQL
- **統合実行SQL**: `/scripts/execute-in-supabase.sql`
  - lesson_sessionsテーブル作成
  - 3つのビュー作成
  - 権限設定

- **検証SQL**: `/scripts/verify-db-views.sql`
  - オブジェクトの存在確認
  - 権限の確認
  - データ件数の確認

### ガイド文書
- **実行ガイド**: `/docs/migration/supabase-execution-guide.md`
- **本番移行ガイド**: `/docs/migration/production-migration-guide.md`

## コマンドメモ

```bash
# 開発サーバー完全再起動
rm -rf .next node_modules/.cache && npm run dev

# テストページアクセス
http://localhost:3000/dashboard/test-v2-api

# 環境変数確認
grep "USE_DB_VIEWS\|USE_V2_APIS" .env.local
```

## バックアップ体制 🛡️

### 包括的バックアップシステム完成 ✅
- **バックアップスクリプト**: `/scripts/backup/comprehensive-backup.sh`
  - Supabase初期状態からの完全復旧対応
  - RLS設定、権限、ロールを含む

- **リストアスクリプト**: `/scripts/backup/comprehensive-restore.sh`
  - ドライラン機能付き
  - 正しい順序での復元

- **ドキュメント**: `/docs/operations/database-backup-plan.md`
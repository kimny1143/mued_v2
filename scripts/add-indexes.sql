-- ========================================
-- MUED LMS v2 Database Index Optimization
-- 実施日: 2025-10-18
-- 環境: Neon PostgreSQL (Production)
-- 方式: 無停止（CONCURRENTLY）
-- ========================================

-- 接続確認
SELECT current_database(), current_user, version();

-- ========================================
-- Phase 1-1: 外部キーインデックス（基本）
-- ========================================

-- 1. lesson_slots.mentor_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_slots_mentor_id
  ON lesson_slots(mentor_id);

-- 2. reservations.slot_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_slot_id
  ON reservations(slot_id);

-- 3. reservations.student_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_student_id
  ON reservations(student_id);

-- 4. reservations.mentor_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_mentor_id
  ON reservations(mentor_id);

-- 5. subscriptions.user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions(user_id);

-- 6. messages.sender_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id
  ON messages(sender_id);

-- 7. messages.receiver_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_id
  ON messages(receiver_id);

-- 8. materials.creator_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_creator_id
  ON materials(creator_id);

-- ========================================
-- Phase 1-2: 複合インデックス（検索最適化）
-- ========================================

-- 9. 利用可能スロット検索（最頻出クエリ）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_slots_status_start_time
  ON lesson_slots(status, start_time)
  WHERE status = 'available';

-- 10. 予約ステータス検索
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_status_created
  ON reservations(status, created_at DESC);

-- 11. サブスクリプション有効状態
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status)
  WHERE status = 'active';

-- 12. メッセージ未読検索
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_unread
  ON messages(receiver_id, is_read, created_at DESC)
  WHERE is_read = false;

-- ========================================
-- Phase 1-3: 部分インデックス（高速化）
-- ========================================

-- 13. 予約可能スロット（現在時刻以降）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_slots_future_available
  ON lesson_slots(start_time, mentor_id)
  WHERE status = 'available' AND start_time > NOW();

-- ========================================
-- 検証
-- ========================================

-- インデックス一覧確認
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- インデックスサイズ確認
SELECT
  schemaname || '.' || tablename AS table,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- テーブル毎のインデックス数
SELECT
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

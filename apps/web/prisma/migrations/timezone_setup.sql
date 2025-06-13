-- 1. 現在のタイムゾーン設定を確認
SHOW timezone;

-- 2. セッションレベルでタイムゾーンを設定（テスト用）
SET TIME ZONE 'Asia/Tokyo';

-- 3. データベース全体のデフォルトタイムゾーンを設定
-- 注意：これはSupabaseの管理者権限が必要な場合があります
ALTER DATABASE postgres SET timezone TO 'Asia/Tokyo';

-- 4. 既存のテーブルにタイムゾーン対応のビューを作成
CREATE OR REPLACE VIEW lesson_slots_jst AS
SELECT 
    id,
    teacher_id,
    start_time AT TIME ZONE 'Asia/Tokyo' as start_time_jst,
    end_time AT TIME ZONE 'Asia/Tokyo' as end_time_jst,
    start_time,
    end_time,
    hourly_rate,
    currency,
    min_hours,
    max_hours,
    min_duration,
    max_duration,
    is_available,
    description,
    created_at AT TIME ZONE 'Asia/Tokyo' as created_at_jst,
    updated_at AT TIME ZONE 'Asia/Tokyo' as updated_at_jst,
    created_at,
    updated_at
FROM lesson_slots;

-- 5. 予約テーブルにも同様のビューを作成
CREATE OR REPLACE VIEW reservations_jst AS
SELECT 
    id,
    slot_id,
    student_id,
    status,
    booked_start_time AT TIME ZONE 'Asia/Tokyo' as booked_start_time_jst,
    booked_end_time AT TIME ZONE 'Asia/Tokyo' as booked_end_time_jst,
    booked_start_time,
    booked_end_time,
    total_amount,
    currency,
    notes,
    hours_booked,
    duration_minutes,
    created_at AT TIME ZONE 'Asia/Tokyo' as created_at_jst,
    updated_at AT TIME ZONE 'Asia/Tokyo' as updated_at_jst,
    created_at,
    updated_at
FROM reservations;

-- 6. 将来の（アクティブな）レッスンスロットのみを返すビュー
CREATE OR REPLACE VIEW active_lesson_slots AS
SELECT * FROM lesson_slots
WHERE end_time > CURRENT_TIMESTAMP
  AND is_available = true;

-- 7. 将来の（アクティブな）予約のみを返すビュー
CREATE OR REPLACE VIEW active_reservations AS
SELECT * FROM reservations
WHERE booked_end_time > CURRENT_TIMESTAMP
  AND status NOT IN ('CANCELLED', 'COMPLETED');

-- 8. 日本時間での日付範囲検索用の関数
CREATE OR REPLACE FUNCTION get_slots_in_jst_range(
    start_date_jst timestamp,
    end_date_jst timestamp
)
RETURNS SETOF lesson_slots AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM lesson_slots
    WHERE start_time >= (start_date_jst AT TIME ZONE 'Asia/Tokyo' AT TIME ZONE 'UTC')
      AND start_time <= (end_date_jst AT TIME ZONE 'Asia/Tokyo' AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql;

-- 9. RLS（Row Level Security）ポリシーをビューに適用
-- 注意：ビューには直接RLSを適用できないので、代わりにセキュリティ関数を使用
CREATE OR REPLACE FUNCTION can_view_lesson_slot(slot_id uuid)
RETURNS boolean AS $$
DECLARE
    slot_teacher_id uuid;
BEGIN
    -- スロットの講師IDを取得
    SELECT teacher_id INTO slot_teacher_id FROM lesson_slots WHERE id = slot_id;
    
    -- 誰でも閲覧可能（予約時のため）
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. インデックスの作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_lesson_slots_end_time ON lesson_slots(end_time);
CREATE INDEX IF NOT EXISTS idx_lesson_slots_start_time ON lesson_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_booked_end_time ON reservations(booked_end_time);
CREATE INDEX IF NOT EXISTS idx_reservations_booked_start_time ON reservations(booked_start_time);

-- 11. 開発用：全データの時刻を確認
SELECT 
    'lesson_slots' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN end_time > CURRENT_TIMESTAMP THEN 1 END) as future_count,
    COUNT(CASE WHEN end_time <= CURRENT_TIMESTAMP THEN 1 END) as past_count
FROM lesson_slots
UNION ALL
SELECT 
    'reservations' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN booked_end_time > CURRENT_TIMESTAMP THEN 1 END) as future_count,
    COUNT(CASE WHEN booked_end_time <= CURRENT_TIMESTAMP THEN 1 END) as past_count
FROM reservations;
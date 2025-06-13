-- 1. 現在のタイムゾーン設定を確認
SHOW timezone;

-- 2. 最も重要：パフォーマンス最適化のためのインデックス作成
CREATE INDEX IF NOT EXISTS idx_lesson_slots_end_time ON lesson_slots(end_time);
CREATE INDEX IF NOT EXISTS idx_lesson_slots_start_time ON lesson_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_booked_end_time ON reservations(booked_end_time);
CREATE INDEX IF NOT EXISTS idx_reservations_booked_start_time ON reservations(booked_start_time);

-- 3. 将来の（アクティブな）レッスンスロットのみを返すビュー
CREATE OR REPLACE VIEW active_lesson_slots AS
SELECT * FROM lesson_slots
WHERE end_time > CURRENT_TIMESTAMP
  AND is_available = true;

-- 4. 将来の（アクティブな）予約のみを返すビュー  
CREATE OR REPLACE VIEW active_reservations AS
SELECT * FROM reservations
WHERE booked_end_time > CURRENT_TIMESTAMP
  AND status NOT IN ('CANCELED', 'COMPLETED');

-- 5. 開発用：全データの時刻を確認
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

-- 6. ビューが正しく作成されたかテスト
SELECT 'Active lesson slots:' as info, COUNT(*) as count FROM active_lesson_slots
UNION ALL
SELECT 'Active reservations:' as info, COUNT(*) as count FROM active_reservations;
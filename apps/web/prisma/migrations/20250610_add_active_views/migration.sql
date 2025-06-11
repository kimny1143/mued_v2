-- CreateView: active_lesson_slots
CREATE OR REPLACE VIEW active_lesson_slots AS
SELECT * FROM lesson_slots
WHERE end_time > CURRENT_TIMESTAMP
  AND is_available = true;

-- CreateView: active_reservations  
CREATE OR REPLACE VIEW active_reservations AS
SELECT * FROM reservations
WHERE slot_id IN (
  SELECT id FROM lesson_slots
  WHERE end_time > CURRENT_TIMESTAMP
)
AND status NOT IN ('CANCELED', 'REJECTED');

-- Grant permissions
GRANT SELECT ON active_lesson_slots TO authenticated;
GRANT SELECT ON active_reservations TO authenticated;

-- Also grant to anon for public endpoints
GRANT SELECT ON active_lesson_slots TO anon;
GRANT SELECT ON active_reservations TO anon;
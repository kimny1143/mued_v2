-- 失敗した決済のステータスを更新するSQL

-- 1. 現在の状況確認
SELECT 
  p.id,
  p.status as payment_status,
  p.amount,
  p."stripePaymentId",
  r.id as reservation_id,
  r.status as reservation_status,
  u.name as student_name,
  u.email as student_email
FROM payments p
LEFT JOIN reservations r ON r."paymentId" = p.id
LEFT JOIN users u ON r."studentId" = u.id
WHERE p.id IN (
  'eeabda7b-67ab-497f-9cb5-f86043d73460',
  'a41291b4-1b38-4b88-afa2-3f08302fadba',
  '1c6b396d-e522-49a6-a6ce-49521264a859'
);

-- 2. 決済ステータスをCANCELEDに更新
UPDATE payments 
SET 
  status = 'CANCELED',
  "updatedAt" = NOW()
WHERE id IN (
  'eeabda7b-67ab-497f-9cb5-f86043d73460',
  'a41291b4-1b38-4b88-afa2-3f08302fadba',
  '1c6b396d-e522-49a6-a6ce-49521264a859'
);

-- 3. 関連する予約のステータスも確認・更新（必要に応じて）
-- 承認済みの予約は手動決済可能な状態として残す
SELECT 
  r.id,
  r.status,
  r."bookedStartTime",
  r."bookedEndTime",
  u.name as student_name,
  mentor.name as mentor_name
FROM reservations r
LEFT JOIN users u ON r."studentId" = u.id
LEFT JOIN lesson_slots ls ON r."slotId" = ls.id
LEFT JOIN users mentor ON ls."teacherId" = mentor.id
WHERE r."paymentId" IN (
  'eeabda7b-67ab-497f-9cb5-f86043d73460',
  'a41291b4-1b38-4b88-afa2-3f08302fadba',
  '1c6b396d-e522-49a6-a6ce-49521264a859'
);

-- 4. 更新後の確認
SELECT 
  p.id,
  p.status as payment_status,
  p."updatedAt",
  r.status as reservation_status
FROM payments p
LEFT JOIN reservations r ON r."paymentId" = p.id
WHERE p.id IN (
  'eeabda7b-67ab-497f-9cb5-f86043d73460',
  'a41291b4-1b38-4b88-afa2-3f08302fadba',
  '1c6b396d-e522-49a6-a6ce-49521264a859'
); 
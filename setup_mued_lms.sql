-- ============================================================
-- MUED LMS - RLSポリシー設定とシードデータ作成
-- ============================================================

-- ---- 1. RLSを有効化し、すべてのユーザーに読み取りアクセスを許可 ----

-- テーブルのRLS有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS users_read_all ON public.users;
DROP POLICY IF EXISTS roles_read_all ON public.roles;
DROP POLICY IF EXISTS permissions_read_all ON public.permissions;
DROP POLICY IF EXISTS lesson_slots_read_all ON public.lesson_slots;
DROP POLICY IF EXISTS reservations_read_all ON public.reservations;
DROP POLICY IF EXISTS payments_read_all ON public.payments;
DROP POLICY IF EXISTS stripe_customers_read_all ON public.stripe_customers;
DROP POLICY IF EXISTS stripe_user_subscriptions_read_all ON public.stripe_user_subscriptions;
DROP POLICY IF EXISTS messages_read_all ON public.messages;

-- すべてのユーザーに読み取りアクセスを許可するポリシーを作成
CREATE POLICY users_read_all ON public.users FOR SELECT USING (true);
CREATE POLICY roles_read_all ON public.roles FOR SELECT USING (true);
CREATE POLICY permissions_read_all ON public.permissions FOR SELECT USING (true);
CREATE POLICY lesson_slots_read_all ON public.lesson_slots FOR SELECT USING (true);
CREATE POLICY reservations_read_all ON public.reservations FOR SELECT USING (true);
CREATE POLICY payments_read_all ON public.payments FOR SELECT USING (true);
CREATE POLICY stripe_customers_read_all ON public.stripe_customers FOR SELECT USING (true);
CREATE POLICY stripe_user_subscriptions_read_all ON public.stripe_user_subscriptions FOR SELECT USING (true);
CREATE POLICY messages_read_all ON public.messages FOR SELECT USING (true);

-- ---- 2. 基本シードデータの作成 ----

-- ロールデータ
INSERT INTO public.roles (id, name, description)
VALUES 
    ('admin', 'Administrator', '管理者権限を持つロール'),
    ('teacher', 'Teacher', '講師権限を持つロール'),
    ('student', 'Student', '生徒権限を持つロール')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    description = EXCLUDED.description;

-- 権限データ
INSERT INTO public.permissions (id, name, "roleId", "createdAt", "updatedAt")
VALUES 
    ('1', 'manage_users', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('2', 'create_courses', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('3', 'edit_courses', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('4', 'view_all_reservations', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('5', 'manage_payments', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('6', 'create_slots', 'teacher', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('7', 'view_own_reservations', 'teacher', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('8', 'book_lessons', 'student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('9', 'view_own_bookings', 'student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 注：サンプルユーザーデータはGoogleアカウント認証のため手動で追加します

-- 残りのシードデータはDBリセット後、ユーザー追加後に実行してください
-- 以下のコメントを解除して実行できます

/*
-- レッスンスロットデータ（現在の日付から2週間分）
DO $$
DECLARE
    teacher1_id TEXT := ''; -- 講師1のIDを入力
    teacher2_id TEXT := ''; -- 講師2のIDを入力
    start_date DATE := CURRENT_DATE;
    slot_id TEXT;
    slot_date DATE;
    slot_time TIME;
BEGIN
    -- 各講師に対して2週間分のスロットを作成
    FOR day_offset IN 0..13 LOOP
        slot_date := start_date + day_offset;
        
        -- 平日のみスロットを作成（0=日曜日、6=土曜日）
        IF EXTRACT(DOW FROM slot_date) BETWEEN 1 AND 5 THEN
            -- 講師1: 10:00-12:00, 13:00-15:00
            FOR hour IN 10..14 LOOP
                -- 昼休みをスキップ
                IF hour != 12 THEN
                    slot_id := 'slot-' || teacher1_id || '-' || slot_date || '-' || hour;
                    slot_time := (hour || ':00:00')::TIME;
                    
                    INSERT INTO public.lesson_slots (
                        id, "teacherId", "startTime", "endTime", 
                        "hourlyRate", "isAvailable", "createdAt", "updatedAt"
                    )
                    VALUES (
                        slot_id,
                        teacher1_id,
                        slot_date + slot_time,
                        slot_date + slot_time + INTERVAL '1 hour',
                        6000,
                        TRUE,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (id) DO NOTHING;
                END IF;
            END LOOP;
            
            -- 講師2: 15:00-19:00
            FOR hour IN 15..18 LOOP
                slot_id := 'slot-' || teacher2_id || '-' || slot_date || '-' || hour;
                slot_time := (hour || ':00:00')::TIME;
                
                INSERT INTO public.lesson_slots (
                    id, "teacherId", "startTime", "endTime", 
                    "hourlyRate", "isAvailable", "createdAt", "updatedAt"
                )
                VALUES (
                    slot_id,
                    teacher2_id,
                    slot_date + slot_time,
                    slot_date + slot_time + INTERVAL '1 hour',
                    7000,
                    TRUE,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- サンプル予約データ
-- 学生1が講師1のスロットを2つ予約
INSERT INTO public.reservations (
    id, "slotId", "studentId", status, "bookedStartTime", "bookedEndTime", 
    "hoursBooked", "totalAmount", notes, "createdAt", "updatedAt"
)
SELECT
    'reservation-1',
    id,
    '', -- 学生1のIDを入力
    'CONFIRMED',
    "startTime",
    "endTime",
    1,
    6000,
    'サンプル予約1',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM public.lesson_slots
WHERE "teacherId" = '' -- 講師1のIDを入力
AND "startTime" > CURRENT_TIMESTAMP
LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reservations (
    id, "slotId", "studentId", status, "bookedStartTime", "bookedEndTime", 
    "hoursBooked", "totalAmount", notes, "createdAt", "updatedAt"
)
SELECT
    'reservation-2',
    id,
    '', -- 学生1のIDを入力
    'PENDING',
    "startTime",
    "endTime",
    1,
    6000,
    'サンプル予約2（支払い前）',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM public.lesson_slots
WHERE "teacherId" = '' -- 講師1のIDを入力
AND "startTime" > CURRENT_TIMESTAMP
AND id != (SELECT "slotId" FROM public.reservations WHERE id = 'reservation-1')
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 学生2が講師2のスロットを予約
INSERT INTO public.reservations (
    id, "slotId", "studentId", status, "bookedStartTime", "bookedEndTime", 
    "hoursBooked", "totalAmount", notes, "createdAt", "updatedAt"
)
SELECT
    'reservation-3',
    id,
    '', -- 学生2のIDを入力
    'CONFIRMED',
    "startTime",
    "endTime",
    1,
    7000,
    'サンプル予約3',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM public.lesson_slots
WHERE "teacherId" = '' -- 講師2のIDを入力
AND "startTime" > CURRENT_TIMESTAMP
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 予約済みスロットは利用不可に更新
UPDATE public.lesson_slots
SET "isAvailable" = FALSE
WHERE id IN (
    SELECT "slotId" FROM public.reservations
);

-- サンプル支払いデータ
INSERT INTO public.payments (
    id, "stripeSessionId", "stripePaymentId", amount, currency, 
    status, "userId", "createdAt", "updatedAt"
)
VALUES
    (
        'payment-1',
        'sess_' || md5(random()::text),
        'pi_' || md5(random()::text),
        6000,
        'JPY',
        'SUCCEEDED',
        '', -- 学生1のIDを入力
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'payment-2',
        'sess_' || md5(random()::text),
        NULL,
        7000,
        'JPY',
        'SUCCEEDED',
        '', -- 学生2のIDを入力
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

-- 支払いと予約を紐付け
UPDATE public.reservations
SET "paymentId" = 'payment-1'
WHERE id = 'reservation-1';

UPDATE public.reservations
SET "paymentId" = 'payment-2'
WHERE id = 'reservation-3';

-- メッセージサンプルデータ
INSERT INTO public.messages (
    id, content, "senderId", sender_type, room_id, timestamp, file_urls
)
VALUES
    (
        '00000000-0000-0000-0000-000000000101',
        'こんにちは、レッスンについて質問があります。',
        '', -- 学生1のIDを入力
        'student',
        'room-1',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        '{}'
    ),
    (
        '00000000-0000-0000-0000-000000000102',
        'はい、どのような質問でしょうか？',
        '', -- 講師1のIDを入力
        'teacher',
        'room-1',
        CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '30 minutes',
        '{}'
    ),
    (
        '00000000-0000-0000-0000-000000000103',
        'レッスンの準備について教えてください。',
        '', -- 学生1のIDを入力
        'student',
        'room-1',
        CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '1 hour',
        '{}'
    ),
    (
        '00000000-0000-0000-0000-000000000104',
        'こんにちは先生、予約の変更は可能でしょうか？',
        '', -- 学生2のIDを入力
        'student',
        'room-2',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        '{}'
    ),
    (
        '00000000-0000-0000-0000-000000000105',
        '可能です。いつに変更されたいですか？',
        '', -- 講師2のIDを入力
        'teacher',
        'room-2',
        CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '45 minutes',
        '{}'
    )
ON CONFLICT (id) DO NOTHING;

-- StripeCustomerサンプルデータ
INSERT INTO public.stripe_customers (
    id, "userId", "customerId", "createdAt", "updatedAt"
)
VALUES
    (
        1,
        '', -- 学生1のIDを入力
        'cus_' || md5(random()::text),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        2,
        '', -- 学生2のIDを入力
        'cus_' || md5(random()::text),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

-- StripeUserSubscriptionサンプルデータ
INSERT INTO public.stripe_user_subscriptions (
    id, "userId", "customerId", "subscriptionId", "priceId", 
    status, "currentPeriodStart", "currentPeriodEnd", 
    "cancelAtPeriodEnd", "paymentMethodBrand", "paymentMethodLast4",
    "createdAt", "updatedAt"
)
VALUES
    (
        1,
        '', -- 学生1のIDを入力
        (SELECT "customerId" FROM public.stripe_customers WHERE "userId" = ''), -- 学生1のIDを入力
        'sub_' || md5(random()::text),
        'price_1234567890',
        'active',
        EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint,
        EXTRACT(EPOCH FROM CURRENT_TIMESTAMP + INTERVAL '1 month')::bigint,
        FALSE,
        'visa',
        '4242',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        2,
        '', -- 学生2のIDを入力
        (SELECT "customerId" FROM public.stripe_customers WHERE "userId" = ''), -- 学生2のIDを入力
        'sub_' || md5(random()::text),
        'price_0987654321',
        'active',
        EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint,
        EXTRACT(EPOCH FROM CURRENT_TIMESTAMP + INTERVAL '1 month')::bigint,
        FALSE,
        'mastercard',
        '5555',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;
*/

COMMIT; 
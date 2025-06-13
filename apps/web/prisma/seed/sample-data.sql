-- ===================================
-- MUED LMS サンプルデータ投入SQL
-- ===================================
-- 
-- 開発・テスト用のサンプルデータを投入します。
-- 実行タイミング: post-reset-init.sql実行後
-- 
-- 含まれるデータ:
-- 1. サンプルユーザー（メンター・生徒）
-- 2. レッスンスロット
-- 3. 予約データ
-- 4. メッセージデータ
-- ===================================

-- トランザクション開始
BEGIN;

-- ===================================
-- 1. サンプルユーザー作成
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 1. サンプルユーザー作成 ===';
    
    -- メンターユーザー
    INSERT INTO public.users (
        id, email, name, image, "roleId", "emailVerified"
    ) VALUES 
    (
        'mentor-001',
        'mentor1@example.com',
        '田中 太郎',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        'mentor',
        NOW()
    ),
    (
        'mentor-002', 
        'mentor2@example.com',
        '佐藤 花子',
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        'mentor',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        image = EXCLUDED.image;
    
    -- 生徒ユーザー
    INSERT INTO public.users (
        id, email, name, image, "roleId", "emailVerified"
    ) VALUES 
    (
        'student-001',
        'student1@example.com', 
        '山田 一郎',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        'student',
        NOW()
    ),
    (
        'student-002',
        'student2@example.com',
        '鈴木 二郎',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 
        'student',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        image = EXCLUDED.image;
    
    RAISE NOTICE 'サンプルユーザー作成完了';
END $$;

-- ===================================
-- 2. レッスンスロット作成
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 2. レッスンスロット作成 ===';
    
    -- 田中メンターのスロット（今週）
    INSERT INTO public.lesson_slots (
        id, "teacherId", "startTime", "endTime", "hourlyRate", currency, "minHours", "maxHours", "isAvailable", "minDuration", "maxDuration"
    ) VALUES 
    (
        'slot-001',
        'mentor-001',
        (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00')::timestamp,
        (CURRENT_DATE + INTERVAL '1 day' + TIME '12:00:00')::timestamp,
        6000,
        'JPY',
        1,
        2,
        true,
        60,
        120
    ),
    (
        'slot-002',
        'mentor-001',
        (CURRENT_DATE + INTERVAL '2 days' + TIME '14:00:00')::timestamp,
        (CURRENT_DATE + INTERVAL '2 days' + TIME '16:00:00')::timestamp,
        6000,
        'JPY',
        1,
        2,
        true,
        60,
        120
    ),
    (
        'slot-003',
        'mentor-001',
        (CURRENT_DATE + INTERVAL '3 days' + TIME '09:00:00')::timestamp,
        (CURRENT_DATE + INTERVAL '3 days' + TIME '11:00:00')::timestamp,
        6000,
        'JPY',
        1,
        2,
        true,
        60,
        120
    )
    ON CONFLICT (id) DO UPDATE SET
        "startTime" = EXCLUDED."startTime",
        "endTime" = EXCLUDED."endTime",
        "isAvailable" = EXCLUDED."isAvailable";
    
    -- 佐藤メンターのスロット（今週）
    INSERT INTO public.lesson_slots (
        id, "teacherId", "startTime", "endTime", "hourlyRate", currency, "minHours", "maxHours", "isAvailable", "minDuration", "maxDuration"
    ) VALUES 
    (
        'slot-004',
        'mentor-002',
        (CURRENT_DATE + INTERVAL '1 day' + TIME '13:00:00')::timestamp,
        (CURRENT_DATE + INTERVAL '1 day' + TIME '15:00:00')::timestamp,
        7000,
        'JPY',
        1,
        2,
        true,
        60,
        120
    ),
    (
        'slot-005',
        'mentor-002',
        (CURRENT_DATE + INTERVAL '4 days' + TIME '10:00:00')::timestamp,
        (CURRENT_DATE + INTERVAL '4 days' + TIME '12:00:00')::timestamp,
        7000,
        'JPY',
        1,
        2,
        true,
        60,
        120
    )
    ON CONFLICT (id) DO UPDATE SET
        "startTime" = EXCLUDED."startTime",
        "endTime" = EXCLUDED."endTime",
        "isAvailable" = EXCLUDED."isAvailable";
    
    RAISE NOTICE 'レッスンスロット作成完了';
END $$;

-- ===================================
-- 3. サンプル予約作成
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 3. サンプル予約作成 ===';
    
    -- 承認待ちの予約
    INSERT INTO public.reservations (
        id, "slotId", "studentId", status, "bookedStartTime", "bookedEndTime", "hoursBooked", "totalAmount", notes, "durationMinutes"
    ) VALUES 
    (
        'reservation-001',
        'slot-001',
        'student-001',
        'PENDING_APPROVAL',
        (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00')::timestamp,
        (CURRENT_DATE + INTERVAL '1 day' + TIME '11:00:00')::timestamp,
        1,
        6000,
        'ギター基礎レッスンをお願いします',
        60
    ),
    (
        'reservation-002',
        'slot-004',
        'student-002',
        'PENDING_APPROVAL',
        (CURRENT_DATE + INTERVAL '1 day' + TIME '13:00:00')::timestamp,
        (CURRENT_DATE + INTERVAL '1 day' + TIME '14:30:00')::timestamp,
        1,
        7000,
        'ピアノの基本的な弾き方を教えてください',
        90
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes;
    
    -- 承認済みの予約（過去）
    INSERT INTO public.reservations (
        id, "slotId", "studentId", status, "bookedStartTime", "bookedEndTime", "hoursBooked", "totalAmount", notes, "durationMinutes", "approvedAt", "approvedBy"
    ) VALUES 
    (
        'reservation-003',
        'slot-002',
        'student-001',
        'CONFIRMED',
        (CURRENT_DATE - INTERVAL '1 day' + TIME '14:00:00')::timestamp,
        (CURRENT_DATE - INTERVAL '1 day' + TIME '15:00:00')::timestamp,
        1,
        6000,
        '前回の続きをお願いします',
        60,
        (CURRENT_DATE - INTERVAL '2 days')::timestamp,
        'mentor-001'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        "approvedAt" = EXCLUDED."approvedAt",
        "approvedBy" = EXCLUDED."approvedBy";
    
    RAISE NOTICE 'サンプル予約作成完了';
END $$;

-- ===================================
-- 4. サンプルメッセージ作成
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 4. サンプルメッセージ作成 ===';
    
    -- 予約に関するメッセージ
    INSERT INTO public.messages (
        id, content, "senderId", sender_type, room_id, timestamp, file_urls
    ) VALUES 
    (
        'message-001',
        'レッスンの予約ありがとうございます！楽しみにしています。',
        'mentor-001',
        'mentor',
        'reservation_reservation-001',
        NOW() - INTERVAL '1 hour',
        '{}'
    ),
    (
        'message-002', 
        'こちらこそよろしくお願いします！',
        'student-001',
        'student',
        'reservation_reservation-001',
        NOW() - INTERVAL '30 minutes',
        '{}'
    ),
    (
        'message-003',
        'ピアノレッスンの件でご質問があります。初心者でも大丈夫でしょうか？',
        'student-002',
        'student', 
        'reservation_reservation-002',
        NOW() - INTERVAL '2 hours',
        '{}'
    ),
    (
        'message-004',
        'もちろんです！初心者の方も大歓迎です。基礎から丁寧にお教えします。',
        'mentor-002',
        'mentor',
        'reservation_reservation-002', 
        NOW() - INTERVAL '1 hour 30 minutes',
        '{}'
    )
    ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        timestamp = EXCLUDED.timestamp;
    
    RAISE NOTICE 'サンプルメッセージ作成完了';
END $$;

-- ===================================
-- 5. Stripeサンプルデータ（オプション）
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '=== 5. Stripeサンプルデータ作成 ===';
    
    -- サンプル顧客データ（実際のStripeデータではない）
    INSERT INTO public.stripe_customers (
        "userId", "customerId", currency
    ) VALUES 
    (
        'student-001',
        'cus_sample_student001',
        'jpy'
    ),
    (
        'student-002', 
        'cus_sample_student002',
        'jpy'
    )
    ON CONFLICT ("userId") DO UPDATE SET
        "customerId" = EXCLUDED."customerId",
        currency = EXCLUDED.currency;
    
    RAISE NOTICE 'Stripeサンプルデータ作成完了';
END $$;

-- トランザクション終了
COMMIT;

-- ===================================
-- 完了メッセージ
-- ===================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== サンプルデータ投入完了 ===';
    RAISE NOTICE '作成されたデータ:';
    RAISE NOTICE '  ✅ ユーザー: 4名 (メンター2名、生徒2名)';
    RAISE NOTICE '  ✅ レッスンスロット: 5件';
    RAISE NOTICE '  ✅ 予約: 3件 (承認待ち2件、確定済み1件)';
    RAISE NOTICE '  ✅ メッセージ: 4件';
    RAISE NOTICE '  ✅ Stripe顧客: 2件';
    RAISE NOTICE '';
    RAISE NOTICE '確認方法:';
    RAISE NOTICE '  - SELECT * FROM public.users;';
    RAISE NOTICE '  - SELECT * FROM public.lesson_slots;';
    RAISE NOTICE '  - SELECT * FROM public.reservations;';
    RAISE NOTICE '  - SELECT * FROM public.messages;';
    RAISE NOTICE '';
    RAISE NOTICE '=== 投入完了 ===';
END $$; 
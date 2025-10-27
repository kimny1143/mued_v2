-- Row Level Security (RLS) Policies for MUED LMS v2
-- Implementation ID: IMP-2025-10-27-002
-- Priority: Critical
--
-- このファイルは本番環境のNeon PostgreSQLに適用するRLSポリシーを定義します
--
-- 適用方法:
-- 1. Neon Console (https://console.neon.tech) にログイン
-- 2. プロジェクトを選択
-- 3. SQL Editor で以下のSQLを実行
--
-- 注意: RLSを有効化すると既存のクエリが失敗する可能性があります
--       段階的に適用し、各テーブルごとに動作確認を推奨

-- ============================================
-- 1. users テーブル
-- ============================================

-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロフィールのみ閲覧可能
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (clerk_id = current_setting('app.current_user_id', TRUE));

-- ユーザーは自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (clerk_id = current_setting('app.current_user_id', TRUE));

-- 管理者は全ユーザーを閲覧可能
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
      AND role = 'admin'
    )
  );

-- ============================================
-- 2. lesson_slots テーブル
-- ============================================

ALTER TABLE lesson_slots ENABLE ROW LEVEL SECURITY;

-- 全員が利用可能なスロットを閲覧可能
CREATE POLICY "Anyone can view available slots"
  ON lesson_slots FOR SELECT
  USING (status = 'available');

-- メンターは自分のスロットのみ管理可能
CREATE POLICY "Mentors manage own slots"
  ON lesson_slots FOR ALL
  USING (
    mentor_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
      AND (role = 'mentor' OR role = 'admin')
    )
  );

-- ============================================
-- 3. reservations テーブル
-- ============================================

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 生徒は自分の予約のみ閲覧・管理可能
CREATE POLICY "Students view own reservations"
  ON reservations FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- メンターは自分宛の予約を閲覧可能
CREATE POLICY "Mentors view assigned reservations"
  ON reservations FOR SELECT
  USING (
    mentor_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
      AND (role = 'mentor' OR role = 'admin')
    )
  );

-- 生徒は自分の予約のみ作成可能
CREATE POLICY "Students create own reservations"
  ON reservations FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- 生徒とメンターは関連する予約を更新可能
CREATE POLICY "Students and mentors update reservations"
  ON reservations FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
    OR mentor_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
      AND (role = 'mentor' OR role = 'admin')
    )
  );

-- ============================================
-- 4. messages テーブル
-- ============================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分が送信または受信したメッセージのみ閲覧可能
CREATE POLICY "Users view own messages"
  ON messages FOR SELECT
  USING (
    sender_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
    OR receiver_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- ユーザーはメッセージを送信可能
CREATE POLICY "Users send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- 受信者のみメッセージを既読にできる
CREATE POLICY "Receivers mark messages as read"
  ON messages FOR UPDATE
  USING (
    receiver_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- ============================================
-- 5. materials テーブル
-- ============================================

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- 全員が公開教材を閲覧可能
CREATE POLICY "Anyone can view public materials"
  ON materials FOR SELECT
  USING (is_public = TRUE);

-- 作成者は自分の教材を閲覧可能
CREATE POLICY "Creators view own materials"
  ON materials FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- メンターは教材を作成可能
CREATE POLICY "Mentors create materials"
  ON materials FOR INSERT
  WITH CHECK (
    creator_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
      AND (role = 'mentor' OR role = 'admin')
    )
  );

-- 作成者は自分の教材のみ管理可能
CREATE POLICY "Creators manage own materials"
  ON materials FOR UPDATE
  USING (
    creator_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

CREATE POLICY "Creators delete own materials"
  ON materials FOR DELETE
  USING (
    creator_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- ============================================
-- 6. subscriptions テーブル
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のサブスクリプションのみ閲覧可能
CREATE POLICY "Users view own subscriptions"
  ON subscriptions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- 管理者は全サブスクリプションを閲覧可能
CREATE POLICY "Admins view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
      AND role = 'admin'
    )
  );

-- システム（Stripe Webhook）がサブスクリプションを更新可能
-- 注意: Webhookからの呼び出しではRLSをバイパスする必要がある
-- → APIレベルでサービスアカウントまたはバイパス処理を実装

-- ============================================
-- 7. webhook_events テーブル
-- ============================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- 管理者のみWebhookイベントを閲覧可能
CREATE POLICY "Admins view webhook events"
  ON webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
      AND role = 'admin'
    )
  );

-- ============================================
-- 8. learning_metrics テーブル
-- ============================================

ALTER TABLE learning_metrics ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の学習メトリクスのみ閲覧可能
CREATE POLICY "Users view own metrics"
  ON learning_metrics FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- ユーザーは自分の学習メトリクスのみ作成・更新可能
CREATE POLICY "Users manage own metrics"
  ON learning_metrics FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- メンターは生徒の学習メトリクスを閲覧可能（予約がある場合）
CREATE POLICY "Mentors view student metrics"
  ON learning_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations r
      INNER JOIN users u ON r.mentor_id = u.id
      WHERE r.student_id = learning_metrics.user_id
      AND u.clerk_id = current_setting('app.current_user_id', TRUE)
      AND u.role IN ('mentor', 'admin')
    )
  );

-- ============================================
-- 適用確認用クエリ
-- ============================================

-- RLS有効化状況を確認
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ポリシー一覧を確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- ロールバック用SQL（問題発生時）
-- ============================================

-- RLSを無効化（緊急時のみ使用）
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lesson_slots DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE webhook_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE learning_metrics DISABLE ROW LEVEL SECURITY;

-- すべてのポリシーを削除（緊急時のみ使用）
-- DROP POLICY IF EXISTS "Users can view own profile" ON users;
-- DROP POLICY IF EXISTS "Users can update own profile" ON users;
-- DROP POLICY IF EXISTS "Admins can view all users" ON users;
-- ... (以下同様に全ポリシー)

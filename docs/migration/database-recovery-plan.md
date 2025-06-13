# データベース復旧計画

## 問題の概要
- lesson_sessionsテーブルがPrismaスキーマに定義されているが、マイグレーションに含まれていない
- SessionStatus Enumも同様に不足している
- データベースのレコードが消失している可能性がある

## 原因
`npx prisma migrate reset --skip-seed --force` コマンドの実行により、データベースがリセットされた可能性が高い。

## 復旧手順

### 1. 現在の状態確認
```sql
-- /scripts/check-db-state.sql を実行
-- 現在のテーブル構造とデータ量を確認
```

### 2. 不足しているテーブルの作成
```sql
-- /scripts/create-missing-tables.sql を実行
-- lesson_sessionsテーブルとSessionStatus Enumを作成
```

### 3. データベースビューの修正版作成
```sql
-- 1. アクティブなレッスンスロットビュー
CREATE OR REPLACE VIEW active_lesson_slots AS
SELECT * FROM lesson_slots
WHERE end_time > CURRENT_TIMESTAMP
  AND is_available = true;

-- 2. アクティブな予約ビュー
CREATE OR REPLACE VIEW active_reservations AS
SELECT * FROM reservations
WHERE slot_id IN (
  SELECT id FROM lesson_slots
  WHERE end_time > CURRENT_TIMESTAMP
)
AND status NOT IN ('CANCELED', 'REJECTED');

-- 3. 今後のセッションビュー（lesson_sessionsテーブル作成後）
CREATE OR REPLACE VIEW upcoming_sessions AS
SELECT ls.* FROM lesson_sessions ls
INNER JOIN reservations r ON ls.reservation_id = r.id
INNER JOIN lesson_slots slot ON r.slot_id = slot.id
WHERE slot.end_time > CURRENT_TIMESTAMP
  AND ls.status IN ('SCHEDULED', 'IN_PROGRESS');

-- 権限付与
GRANT SELECT ON active_lesson_slots TO authenticated;
GRANT SELECT ON active_reservations TO authenticated;
GRANT SELECT ON upcoming_sessions TO authenticated;
GRANT SELECT ON active_lesson_slots TO anon;
GRANT SELECT ON active_reservations TO anon;
```

### 4. Prismaスキーマの同期
```bash
# Prismaのスキーマを現在のDBから取得
npx prisma db pull

# 必要に応じてスキーマを修正
# その後、Prismaクライアントを再生成
npx prisma generate
```

### 5. データの復旧
もしバックアップがある場合：
- Supabaseダッシュボードからバックアップを復元
- または、SQLダンプファイルから復元

### 6. マイグレーションの修正
```bash
# 新しいマイグレーションを作成
npx prisma migrate dev --name add_lesson_sessions

# これにより、lesson_sessionsテーブルが正式にマイグレーションに含まれる
```

## 予防策
1. 本番環境では`migrate reset`を絶対に使用しない
2. マイグレーション前には必ずバックアップを取る
3. スキーマとマイグレーションの整合性を定期的に確認
4. ステージング環境で十分にテストしてから本番に適用

## 緊急対応
もしデータが完全に失われた場合：
1. Supabaseのポイントインタイムリカバリ（PITR）を使用
2. 最新のバックアップから復元
3. トランザクションログから復旧

## 注意事項
- 本番環境での作業は慎重に行う
- 各ステップごとに確認を行う
- 問題が発生した場合は即座に作業を中止
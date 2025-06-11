# データベース復元ガイド

## 状況
Supabaseデータベースがリセットされた状態からの復元手順です。

**現在の状態**:
- テーブル構造: ✅ 存在
- データ: ❌ 消失
- RLS設定: ❌ 消失
- ビュー: ❌ 未作成

## 復元手順

### 1. Supabase SQL Editorにアクセス
1. https://app.supabase.com にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択

### 2. 復元スクリプトの実行
1. 新しいクエリを作成
2. 以下のファイルの内容をコピー＆ペースト：
   ```
   /scripts/restore-database-complete.sql
   ```
3. 「Run」をクリックして実行

### 3. 実行結果の確認
成功すると以下が表示されます：
- 各テーブルのレコード数
- RLS設定状況
- 作成されたビュー
- 「✅ データベース復元が完了しました！」メッセージ

### 4. 追加の確認
```sql
-- アクティブなレッスンスロットの確認
SELECT COUNT(*) FROM active_lesson_slots;

-- 予約の確認
SELECT status, COUNT(*) 
FROM reservations 
GROUP BY status;

-- RLSポリシーの確認
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 復元内容

### 1. 構造的な要素
- ✅ lesson_sessionsテーブル作成
- ✅ SessionStatus ENUM型作成
- ✅ 3つのビュー作成（active_lesson_slots, active_reservations, upcoming_sessions）

### 2. セキュリティ設定
- ✅ RLS有効化（全テーブル）
- ✅ RLSポリシー設定
- ✅ 権限設定（authenticated, anon）

### 3. サンプルデータ
- ✅ ロール（ADMIN, MENTOR, STUDENT）
- ✅ メンター2名、生徒3名
- ✅ 今後2週間分のレッスンスロット（平日のみ）
- ✅ サンプル予約15件

## 復元後の動作確認

### ローカル環境での確認
```bash
# 開発サーバーの再起動
npm run dev

# ブラウザでアクセス
http://localhost:3000/dashboard/booking-calendar
```

### APIエンドポイントの確認
```bash
# レッスンスロット取得
curl http://localhost:3000/api/lesson-slots

# 予約一覧取得
curl http://localhost:3000/api/reservations
```

## トラブルシューティング

### エラー: "violates foreign key constraint"
外部キー制約エラーです。スクリプトを2回に分けて実行してください：
1. STEP 1-6（構造とRLS）
2. STEP 7（データ投入）

### エラー: "permission denied"
管理者権限でログインしているか確認してください。

### データが見えない
RLSが有効になっているため、適切な認証情報でアクセスする必要があります。
開発時は一時的にRLSを無効化することも可能です：
```sql
ALTER TABLE テーブル名 DISABLE ROW LEVEL SECURITY;
```

## 次のステップ

1. **バックアップの実行**
   ```bash
   DATABASE_URL='...' ./scripts/backup/comprehensive-backup.sh
   ```

2. **開発の継続**
   - データベースビュー移行の実装継続
   - パフォーマンステストの実施

## 完了チェックリスト
- [ ] 復元スクリプトの実行
- [ ] エラーがないことを確認
- [ ] データ件数の確認
- [ ] RLS設定の確認
- [ ] ローカル環境での動作確認
- [ ] バックアップの実行
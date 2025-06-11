# Supabaseデータベース移行実行ガイド

## 概要
このガイドでは、Supabaseダッシュボードでデータベースビューを作成する手順を説明します。

**実行日**: 2025-06-11  
**所要時間**: 約10分

## 前提条件
- Supabaseプロジェクトへの管理者アクセス権限
- SQLエディタへのアクセス

## 実行手順

### 1. Supabaseダッシュボードにログイン
1. https://app.supabase.com にアクセス
2. 対象プロジェクトを選択

### 2. SQLエディタを開く
1. 左側のメニューから「SQL Editor」を選択
2. 「New query」ボタンをクリック

### 3. SQLの実行
1. 以下のファイルの内容をコピー：
   ```
   /scripts/execute-in-supabase.sql
   ```

2. SQLエディタに貼り付け

3. 「Run」ボタンをクリック

4. 実行結果を確認：
   - エラーがないこと
   - 最後に「✅ データベースビュー移行が完了しました」が表示されること

### 4. 検証の実行
1. 新しいクエリタブを開く

2. 以下のファイルの内容をコピー：
   ```
   /scripts/verify-db-views.sql
   ```

3. SQLエディタに貼り付けて実行

4. 以下を確認：
   - lesson_sessionsテーブル: ✅ 作成済み
   - active_lesson_slots: ✅ 作成済み
   - active_reservations: ✅ 作成済み
   - upcoming_sessions: ✅ 作成済み
   - 権限設定: authenticated, anonに付与済み

### 5. アプリケーションでの確認

#### ローカル環境での確認
```bash
# 環境変数の確認
grep "USE_DB_VIEWS" .env.local

# テストページでの動作確認
open http://localhost:3000/dashboard/booking-calendar
```

#### APIエンドポイントの確認
- `/api/lesson-slots` - アクティブなレッスンスロット取得
- `/api/reservations` - アクティブな予約取得
- `/api/my-reservations` - ユーザーの予約取得

## トラブルシューティング

### エラー: "relation already exists"
既にビューが作成されている場合のエラーです。`CREATE OR REPLACE VIEW`を使用しているため、通常は問題ありません。

### エラー: "permission denied"
管理者権限でログインしているか確認してください。

### エラー: "relation 'lesson_sessions' does not exist"
lesson_sessionsテーブルの作成に失敗しています。SQLの前半部分を再実行してください。

## 次のステップ

1. **Vercel環境変数の設定**
   ```
   NEXT_PUBLIC_USE_DB_VIEWS=false
   NEXT_PUBLIC_USE_V2_APIS=false
   ```
   ※最初はfalseで設定し、動作確認後にtrueに変更

2. **段階的な有効化**
   - 開発環境で十分なテスト
   - ステージング環境での検証
   - 本番環境への適用

3. **パフォーマンス測定**
   - 各APIのレスポンスタイム計測
   - 67%以上の改善を確認

## 完了チェックリスト

- [ ] SQLの実行完了
- [ ] エラーがないことを確認
- [ ] 検証スクリプトの実行
- [ ] すべてのビューが作成されていることを確認
- [ ] 権限が正しく設定されていることを確認
- [ ] ローカル環境での動作確認
- [ ] パフォーマンス改善を確認
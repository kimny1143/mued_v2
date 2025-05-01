# Metabase実行方法と使い方ガイド

## Metabaseの起動方法

1. プロジェクトのルートディレクトリで次のコマンドを実行します:

```bash
# セットアップスクリプトを使う場合
./scripts/setup_metabase.sh

# 直接docker-composeを使う場合
docker-compose up -d metabase metabase-db
```

2. ブラウザで http://localhost:3000 にアクセスします
3. 初回アクセス時は、管理者アカウントの設定画面が表示されます

## Supabaseとの接続

1. Metabaseの初期設定完了後、"データソースの追加" を選択します
2. "PostgreSQL" を選択します
3. 以下の情報を入力します:
   - 表示名: `MUED Supabase`
   - ホスト名: `db.PROJECT_ID.supabase.co` (Supabaseのプロジェクトの接続情報から取得)
   - ポート: `5432`
   - データベース名: `postgres`
   - ユーザー名: (Supabaseダッシュボードのデータベース設定から取得)
   - パスワード: (Supabaseダッシュボードのデータベース設定から取得)
   - SSLモード: `require`
4. "接続テスト" をクリックし、接続が成功したら "保存" をクリックします

## ダッシュボードの作成

1. "新規作成" -> "ダッシュボード" をクリックします
2. ダッシュボードに名前を付けます (例: "MUED LMS メインダッシュボード")
3. "質問を追加" をクリックして、データを可視化します
4. クエリは2つの方法で作成できます:
   - GUI質問ビルダーを使用 (SQLの知識が不要)
   - 直接SQLを記述

## SQLクエリの例

以下のSQLクエリ例をMetabaseに入力して、基本的なKPI指標を取得できます：

```sql
-- アクティブサブスクリプションの数
SELECT 
  COUNT(*) as active_subscriptions,
  DATE_TRUNC('month', NOW()) as month
FROM stripe_subscriptions
WHERE status = 'active'
AND deleted_at IS NULL;
```

## ダッシュボードの共有

1. 作成したダッシュボードの右上にある "共有" ボタンをクリックします
2. 次のいずれかの方法で共有できます:
   - 公開リンク (パブリックな共有)
   - 特定のMetabaseユーザーと共有
   - ダッシュボードのエクスポート (PDF, PNG)

## トラブルシューティング

1. **接続エラー**の場合:
   - Supabaseの接続情報（ホスト名、ユーザー名、パスワード）を再確認
   - Supabaseプロジェクトの接続許可設定を確認
   
2. **コンテナ起動エラー**の場合:
   ```bash
   # コンテナログの確認
   docker-compose logs metabase
   
   # コンテナの再起動
   docker-compose restart metabase
   ```

3. **データベース接続の問題**の場合:
   - Metabaseデータベースをリセットする場合は:
   ```bash
   docker-compose down -v metabase-db
   docker-compose up -d metabase-db metabase
   ```

## 参考リンク

- [Metabase公式ドキュメント](https://www.metabase.com/docs/latest/)
- [Supabase PostgreSQL接続情報](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [docs/project/kpi-dashboard.md](./kpi-dashboard.md) - KPI指標とクエリ定義 
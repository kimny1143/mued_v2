# AI Service デプロイメント状況

## 🚀 現在のデプロイ状況

### Herokuアプリ情報
- **アプリ名**: `mued-api`
- **URL**: https://mued-api.herokuapp.com
- **Swagger UI**: https://mued-api.herokuapp.com/docs
- **Git Remote**: https://git.heroku.com/mued-api.git

### 動作確認済みエンドポイント
1. **ヘルスチェック**
   - GET `/health` - サービス稼働状況
   - GET `/` - ルートエンドポイント

2. **モックAPI（実装待ち）**
   - POST `/api/v1/generate/material` - 教材生成
   - POST `/api/v1/courses/generate` - コース生成
   - POST `/api/v1/exercise/logs` - 練習記録
   - POST `/api/v1/musicxml/convert` - MusicXML変換

### デプロイ方法
```bash
# developブランチからデプロイ
cd ai-service
git push heroku develop:main

# mainブランチからデプロイ
git push heroku main

# ログ確認
heroku logs --tail --app mued-api

# 環境変数確認
heroku config --app mued-api
```

## 📝 設定済み項目

### ✅ 完了
- Herokuアプリ作成
- 基本的なFastAPIサービスデプロイ
- Procfile設定
- runtime.txt (Python 3.12.0)
- 基本的なCORS設定
- OpenAPIドキュメント自動生成

### ⏳ 未設定
- AI関連の環境変数（OPENAI_API_KEY等）
- Supabase接続設定
- pgvector拡張
- Redis（キャッシュ用）
- バックグラウンドジョブ設定

## 🔧 次のステップ

1. **環境変数設定**
   ```bash
   heroku config:set OPENAI_API_KEY=xxx --app mued-api
   heroku config:set ANTHROPIC_API_KEY=xxx --app mued-api
   ```

2. **データベース拡張**
   - Supabaseでpgvector有効化
   - AIテーブル作成

3. **パッケージ追加とデプロイ**
   ```bash
   # requirements.txt更新後
   git add requirements.txt
   git commit -m "Add AI packages"
   git push heroku develop:main
   ```

## 📊 モニタリング

### アプリケーション状態確認
```bash
# ダイナソ（プロセス）状態
heroku ps --app mued-api

# メトリクス
heroku metrics --app mued-api

# 最近のデプロイ
heroku releases --app mued-api
```

### トラブルシューティング
```bash
# エラーログ確認
heroku logs --tail --app mued-api | grep ERROR

# 再起動
heroku restart --app mued-api

# スケーリング
heroku ps:scale web=1 --app mued-api
```
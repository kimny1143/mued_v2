# AI Service デプロイメント検証結果

## 現状とアーキテクチャ計画の比較

### ✅ 既存実装で計画に合致している部分

1. **基本アーキテクチャ**
   - FastAPIベースのサービス ✓
   - Herokuデプロイ対応 ✓
   - Next.jsとの分離構成 ✓
   - API Gateway経由の通信 ✓

2. **開発環境**
   - Docker対応 ✓
   - テスト環境構築済み ✓
   - OpenAPIドキュメント ✓

### 🔧 実装が必要な部分

1. **AI/LLM統合**
   ```python
   # 必要な実装
   - app/core/llm/openai_client.py
   - app/core/llm/claude_client.py
   - app/core/llm/prompt_templates.py
   ```

2. **ナレッジベース管理**
   ```python
   # 必要な実装
   - app/core/knowledge/rss_fetcher.py
   - app/core/knowledge/pdf_processor.py
   - app/core/knowledge/web_scraper.py
   - app/core/knowledge/embeddings.py
   ```

3. **文字起こし機能**
   ```python
   # 必要な実装
   - app/core/transcription/whisper_service.py
   - app/core/transcription/youtube_extractor.py
   ```

4. **データベース拡張**
   - pgvector拡張の有効化
   - AI関連テーブルの作成
   - Supabaseとの統合

### 📦 追加が必要なパッケージ

```txt
# requirements.txt に追加が必要
langchain>=0.1.0
openai>=1.0.0
anthropic>=0.7.0
youtube-transcript-api>=0.6.0
pypdf2>=3.0.0
beautifulsoup4>=4.12.0
chromadb>=0.4.0
pgvector>=0.2.0
```

## Herokuデプロイの準備状況

### ✅ 準備完了項目
- Procfile設定 ✓
- runtime.txt (Python 3.12.0) ✓
- 基本的なrequirements.txt ✓
- CORS設定（要本番URL更新） ✓

### 🔧 デプロイ前に必要な作業

1. **環境変数の設定**
   ```bash
   # Heroku環境変数に追加が必要
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   DATABASE_URL=  # Supabase接続
   YOUTUBE_API_KEY=
   ```

2. **Supabase pgvector設定**
   ```sql
   -- Supabaseで実行が必要
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **本番環境CORS設定**
   ```python
   # app/main.py のCORS設定を更新
   origins = [
       "https://dev.mued.jp",
       "https://www.mued.jp",
       # 他の許可するオリジン
   ]
   ```

## 推奨実装順序

### Phase 1: 基盤整備（1週目）
1. 環境変数とシークレット管理の設定
2. データベーススキーマの作成とマイグレーション
3. LLMクライアントの基本実装

### Phase 2: コア機能（2-3週目）
1. 教材生成エンドポイントの実装
2. ナレッジベース管理機能
3. 基本的なプロンプトテンプレート

### Phase 3: 拡張機能（4-5週目）
1. 文字起こし機能
2. ベクトル検索の実装
3. カリキュラム生成機能

## リスクと対策

1. **コスト管理**
   - LLM APIの使用量制限実装
   - キャッシング戦略の導入
   - 使用量モニタリング

2. **パフォーマンス**
   - 非同期処理の活用
   - バックグラウンドジョブの検討
   - レスポンスキャッシング

3. **セキュリティ**
   - APIキーの安全な管理
   - レート制限の実装
   - 入力検証の強化
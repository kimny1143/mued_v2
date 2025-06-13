# AI Service 実装TODOリスト

## 📅 実装タイムライン

### Week 1-2: 基盤構築 (Foundation)

#### 環境セットアップ
- [ ] Herokuアプリケーション作成
  ```bash
  heroku create mued-ai-service
  heroku addons:create heroku-postgresql:mini
  ```
- [ ] 環境変数設定
  - [ ] `OPENAI_API_KEY` 設定
  - [ ] `ANTHROPIC_API_KEY` 設定
  - [ ] `DATABASE_URL` 設定（Supabase）
  - [ ] `YOUTUBE_API_KEY` 設定
  - [ ] `REDIS_URL` 設定（キャッシュ用）

#### データベース準備
- [ ] Supabaseでpgvector拡張有効化
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] AIテーブル作成用マイグレーションファイル作成
  - [ ] `ai_knowledge_sources` テーブル
  - [ ] `ai_generated_materials` テーブル
  - [ ] `ai_curriculums` テーブル
- [ ] Prismaスキーマ更新（pgvector対応）

#### 基本パッケージ追加
- [ ] requirements.txt更新
  ```txt
  langchain>=0.1.0
  openai>=1.0.0
  anthropic>=0.7.0
  redis>=5.0.0
  celery>=5.3.0
  ```
- [ ] 依存関係のインストールとテスト

#### LLMクライアント実装
- [ ] `app/core/llm/base_client.py` - 基底クラス作成
- [ ] `app/core/llm/openai_client.py` - OpenAI統合
  - [ ] GPT-4モデル設定
  - [ ] ストリーミング対応
  - [ ] エラーハンドリング
- [ ] `app/core/llm/claude_client.py` - Claude統合
  - [ ] Claude 3モデル設定
  - [ ] トークン管理
- [ ] `app/core/llm/prompt_templates.py` - プロンプト管理
  - [ ] 教材生成テンプレート
  - [ ] カリキュラム生成テンプレート

### Week 3-4: コア機能実装 (Core Features)

#### ナレッジベース管理
- [ ] `app/core/knowledge/base_processor.py` - 基底クラス
- [ ] `app/core/knowledge/rss_fetcher.py` - RSS取得
  - [ ] noteのRSSフィード対応
  - [ ] 定期取得ジョブ設定
  - [ ] コンテンツ抽出とクリーニング
- [ ] `app/core/knowledge/pdf_processor.py` - PDF処理
  - [ ] テキスト抽出
  - [ ] メタデータ抽出
  - [ ] チャンク分割
- [ ] `app/core/knowledge/web_scraper.py` - Web検索
  - [ ] Google検索API統合
  - [ ] コンテンツ抽出
  - [ ] 構造化データ変換

#### ベクトル化とインデックス
- [ ] `app/core/knowledge/embeddings.py` - ベクトル化処理
  - [ ] OpenAI Embeddingsモデル使用
  - [ ] バッチ処理実装
  - [ ] pgvector保存
- [ ] `app/core/knowledge/vector_search.py` - 検索実装
  - [ ] 類似度検索
  - [ ] ハイブリッド検索（キーワード＋ベクトル）
  - [ ] 検索結果ランキング

#### 教材生成API
- [ ] `app/api/v1/materials/generate.py` - エンドポイント実装
  - [ ] リクエスト/レスポンスモデル定義
  - [ ] 生成パラメータ検証
  - [ ] 非同期処理対応
- [ ] `app/services/material_generator.py` - 生成ロジック
  - [ ] ナレッジ検索統合
  - [ ] プロンプト構築
  - [ ] 生成結果の後処理
- [ ] `app/services/material_formatter.py` - フォーマット処理
  - [ ] Markdown整形
  - [ ] 画像プレースホルダー挿入
  - [ ] 目次自動生成

### Week 5-6: 拡張機能 (Advanced Features)

#### 文字起こし機能
- [ ] `app/core/transcription/whisper_service.py` - 音声認識
  - [ ] Whisper API統合
  - [ ] 音声ファイルアップロード対応
  - [ ] 言語検出
- [ ] `app/core/transcription/youtube_extractor.py` - YouTube対応
  - [ ] 動画URL解析
  - [ ] 字幕取得
  - [ ] タイムスタンプ付きテキスト抽出
- [ ] `app/api/v1/transcription/` - APIエンドポイント
  - [ ] ファイルアップロード処理
  - [ ] YouTube URL処理
  - [ ] 進捗状況通知

#### カリキュラム生成
- [ ] `app/api/v1/curriculum/generate.py` - エンドポイント
  - [ ] カリキュラム要件入力
  - [ ] レベル別構成
- [ ] `app/services/curriculum_builder.py` - 構築ロジック
  - [ ] 教材の自動選択・順序付け
  - [ ] 学習パス生成
  - [ ] 期間見積もり
- [ ] `app/services/curriculum_optimizer.py` - 最適化
  - [ ] 前提知識の依存関係解析
  - [ ] 難易度カーブ調整

### Week 7-8: 品質向上と最適化 (Quality & Optimization)

#### キャッシング実装
- [ ] Redis統合
  - [ ] 生成結果キャッシュ
  - [ ] ベクトル検索結果キャッシュ
  - [ ] TTL管理
- [ ] CDNキャッシュ設定
  - [ ] 静的コンテンツ配信
  - [ ] 画像最適化

#### バックグラウンドジョブ
- [ ] Celery設定
  - [ ] ワーカープロセス設定
  - [ ] タスクキュー管理
- [ ] 定期ジョブ実装
  - [ ] RSSフィード更新
  - [ ] ベクトルインデックス更新
  - [ ] 使用量レポート生成

#### モニタリングと分析
- [ ] 使用量追跡
  - [ ] APIコール数
  - [ ] トークン使用量
  - [ ] コスト計算
- [ ] パフォーマンス監視
  - [ ] レスポンスタイム
  - [ ] エラー率
  - [ ] リソース使用率
- [ ] 品質メトリクス
  - [ ] 生成コンテンツ評価
  - [ ] ユーザーフィードバック収集

### Week 9-10: 統合とテスト (Integration & Testing)

#### フロントエンド統合
- [ ] `ai-service-client.ts` 完成
  - [ ] 型定義完備
  - [ ] エラーハンドリング
  - [ ] リトライロジック
- [ ] UI実装
  - [ ] 教材生成ページ
  - [ ] ナレッジベース管理
  - [ ] カリキュラムビルダー

#### テスト実装
- [ ] ユニットテスト
  - [ ] 各サービスのテスト
  - [ ] モック実装
- [ ] 統合テスト
  - [ ] E2Eシナリオ
  - [ ] 負荷テスト
- [ ] セキュリティテスト
  - [ ] 入力検証
  - [ ] 認証・認可
  - [ ] レート制限

#### ドキュメント整備
- [ ] API仕様書更新
- [ ] 運用マニュアル作成
- [ ] トラブルシューティングガイド

## 🎯 マイルストーン

### M1: 基本的な教材生成（Week 4）
- [ ] テキストベースの教材生成が可能
- [ ] 基本的なナレッジベース検索
- [ ] APIエンドポイント動作確認

### M2: 完全機能版（Week 6）
- [ ] 動画文字起こし対応
- [ ] カリキュラム生成機能
- [ ] 高度な検索とフィルタリング

### M3: 本番リリース（Week 10）
- [ ] パフォーマンス最適化完了
- [ ] 完全なテストカバレッジ
- [ ] 運用ドキュメント完備

## 📝 実装時の注意事項

1. **段階的リリース**
   - 各機能を独立してデプロイ可能に
   - フィーチャーフラグで制御

2. **コスト管理**
   - API使用量の厳密な追跡
   - アラート設定
   - 予算上限の実装

3. **セキュリティ**
   - すべての入力を検証
   - APIキーの暗号化保存
   - 監査ログの実装

4. **スケーラビリティ**
   - 水平スケーリング対応
   - データベース接続プール
   - 非同期処理の活用
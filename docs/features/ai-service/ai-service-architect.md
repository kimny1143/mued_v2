⏺ AI教材生成機能 - 技術スタック＆アーキテクチャ計画

  🎯 システム全体構成

  ┌─────────────────────────────────────────────────────────────┐
  │                      Next.js Frontend                         │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
  │  │ 教材生成UI      │  │ 教材管理UI      │  │ カリキュラム │ │
  │  │                 │  │                 │  │ 管理UI      │ │
  │  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
  └───────────┼────────────────────┼───────────────────┼────────┘
              │                    │                   │
  ┌───────────▼────────────────────▼───────────────────▼────────┐
  │                    API Gateway (Next.js API Routes)          │
  └─────────────────────────────┬────────────────────────────────┘
                                │
  ┌─────────────────────────────▼────────────────────────────────┐
  │                    AI Service (FastAPI)                       │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
  │  │ LLM Controller  │  │ Knowledge Base  │  │ Transcription│ │
  │  │ (OpenAI/Claude) │  │ Manager         │  │ Service     │ │
  │  └─────────────────┘  └─────────────────┘  └─────────────┘ │
  └──────────────────────────────────────────────────────────────┘
                                │
  ┌─────────────────────────────▼────────────────────────────────┐
  │              Data Layer (PostgreSQL/Supabase)                │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
  │  │ materials       │  │ ai_knowledge    │  │ curriculums │ │
  │  │ (既存)          │  │ (新規)          │  │ (新規)      │ │
  │  └─────────────────┘  └─────────────────┘  └─────────────┘ │
  └──────────────────────────────────────────────────────────────┘

  📋 技術スタック詳細

  1. AI Service層（Python/FastAPI）

  # ai-service/app/main.py の構成案

  /ai-service/
  ├── app/
  │   ├── api/
  │   │   ├── v1/
  │   │   │   ├── materials/         # 教材生成エンドポイント
  │   │   │   ├── transcription/     # 文字起こしエンドポイント
  │   │   │   └── curriculum/        # カリキュラム生成
  │   ├── core/
  │   │   ├── llm/
  │   │   │   ├── openai_client.py  # OpenAI API統合
  │   │   │   ├── claude_client.py   # Claude API統合
  │   │   │   └── prompt_templates.py
  │   │   ├── knowledge/
  │   │   │   ├── rss_fetcher.py    # RSS取得
  │   │   │   ├── pdf_processor.py  # PDF処理
  │   │   │   ├── web_scraper.py    # Web検索・スクレイピング
  │   │   │   └── embeddings.py     # ベクトル化処理
  │   │   └── transcription/
  │   │       ├── whisper_service.py # 音声文字起こし
  │   │       └── youtube_extractor.py
  │   ├── schemas/
  │   │   ├── material.py
  │   │   └── curriculum.py
  │   └── services/
  │       ├── material_generator.py
  │       └── curriculum_builder.py

  主要パッケージ：
  - FastAPI + Pydantic v2
  - LangChain（知識ベース管理）
  - OpenAI SDK / Anthropic SDK
  - Whisper（音声認識）
  - youtube-transcript-api
  - PyPDF2 / pdfplumber
  - BeautifulSoup4（スクレイピング）
  - chromadb / pgvector（ベクトルDB）

  2. データベース設計（PostgreSQL拡張）

  -- AI関連の新規テーブル

  -- ナレッジベース管理
  CREATE TABLE ai_knowledge_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL, -- 'rss', 'pdf', 'video', 'web'
      source_url TEXT,
      content TEXT NOT NULL,
      metadata JSONB,
      embeddings vector(1536), -- pgvector使用
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 生成された教材
  CREATE TABLE ai_generated_materials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL, -- Markdown形式
      theme VARCHAR(255),
      knowledge_source_ids UUID[],
      generation_params JSONB, -- プロンプト、モデル設定など
      creator_id UUID REFERENCES users(id),
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- カリキュラム
  CREATE TABLE ai_curriculums (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      material_ids UUID[],
      structure JSONB, -- 階層構造、順序など
      target_level VARCHAR(50),
      duration_weeks INTEGER,
      creator_id UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  3. フロントエンド統合（Next.js）

  // apps/web/lib/ai-service-client.ts
  export class AIServiceClient {
    private baseUrl: string;

    async generateMaterial(params: {
      theme: string;
      knowledgeSources: string[];
      format: 'blog' | 'tutorial' | 'exercise';
    }): Promise<GeneratedMaterial> {
      // AI-serviceへのAPI呼び出し
    }

    async transcribeVideo(params: {
      source: 'youtube' | 'upload';
      url?: string;
      file?: File;
    }): Promise<Transcript> {
      // 文字起こしAPI
    }
  }

  // 新規ページ構成
  /dashboard/ai-materials/
    ├── generate/     # 教材生成UI
    ├── knowledge/    # ナレッジベース管理
    └── curriculum/   # カリキュラム作成

  🔄 処理フロー

  教材生成フロー：

  1. ナレッジ収集
    - RSS/Web/PDFからコンテンツ取得
    - 動画の文字起こし（必要に応じて）
    - ベクトル化してDBに保存
  2. 生成プロセス
    - ユーザーがテーマ・形式を指定
    - 関連ナレッジをベクトル検索
    - LLMプロンプトに含めて生成
    - Markdown形式で保存
  3. 品質管理
    - 生成後のレビュー・編集機能
    - バージョン管理
    - 公開承認フロー

  🚀 実装フェーズ計画

  Phase 1: 基盤構築（2週間）
  - AI-serviceの基本構造セットアップ
  - LLM統合（OpenAI/Claude）
  - データベーススキーマ作成
  - 基本的なAPI実装

  Phase 2: ナレッジベース（2週間）
  - RSS/PDF処理実装
  - Web検索統合
  - ベクトルDB導入
  - ナレッジ管理UI

  Phase 3: 教材生成（3週間）
  - 生成エンジン実装
  - プロンプトテンプレート設計
  - 教材生成UI
  - プレビュー・編集機能

  Phase 4: 拡張機能（3週間）
  - 動画文字起こし機能
  - カリキュラム生成
  - 品質評価システム
  - 統計・分析機能

  🔐 セキュリティ・コスト管理

  1. APIキー管理
    - 環境変数での管理
    - レート制限実装
    - 使用量モニタリング
  2. コスト最適化
    - キャッシング戦略
    - バッチ処理
    - モデル選択の最適化
  3. アクセス制御
    - プラン別の利用制限
    - 承認フロー
    - 監査ログ

  📊 技術選定の理由

  1. FastAPI選択理由
    - 非同期処理でLLM APIの並列実行
    - 自動APIドキュメント生成
    - Pythonエコシステムの活用
  2. pgvector選択理由
    - Supabaseとの統合が容易
    - スケーラビリティ
    - SQLでのベクトル検索
  3. LangChain活用
    - LLMオーケストレーション
    - ナレッジベース管理
    - プロンプトチェーン構築
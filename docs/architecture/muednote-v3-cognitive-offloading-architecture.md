# MUEDnote v3.0 - Cognitive Offloading Architecture

**Version**: 1.0.0
**Created**: 2025-11-24
**Author**: MUED Architecture Team
**Status**: Initial Design

---

## Executive Summary

このドキュメントは、MUEDnote v3.0の技術アーキテクチャを定義します。v3.0は、「対話型教育ツール」から「コグニティブ・オフローディングツール（制作脳の拡張メモリ）」へのピボットを実現するための全面的な設計変更を伴います。

### 主要な変更点

| 項目 | v2.x (現行) | v3.0 (新設計) |
|------|-------------|---------------|
| **プラットフォーム** | Next.js Web App | Tauri Desktop App |
| **UX** | Chat Interface | Silent Console (1-line overlay) |
| **入力方法** | Web UI フォーム | Global Hotkey (Cmd+Shift+M) |
| **AI動作** | 対話型（返答あり） | Silent Structuring（バックグラウンド処理） |
| **データ構造** | Session → Message | Fragment → Context → Project |
| **ターゲット** | 初心者 | プロ・ハイアマチュア |
| **価値提案** | 学習支援 | 認知負荷の外部化 |

### ビジネス目標

- **Phase 1 (0-4ヶ月)**: DAU 100名、1日平均10回入力
- **Phase 2 (5-10ヶ月)**: Pro Plan 転換率 10%、MRR 196万円
- **Phase 3 (11-18ヶ月)**: B2B導入、MRR 300万円

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Global Overlay (Tauri Window)                   │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │  [Cmd+Shift+M] ▶ Fragment Input Bar              │  │    │
│  │  │  > "サビ ベース ぶつかってる"                    │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                                                          │    │
│  │  Status: ● Processing (0.5s) → Disappear               │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Smart Recall UI (Tauri Window)                  │    │
│  │  Search: "前回スランプの時どうした？"                  │    │
│  │  Results: [Timeline + Context + Suggestions]            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Auto Liner Notes UI (Tauri Window)              │    │
│  │  Generate: "楽曲解説文を生成"                          │    │
│  │  Output: [Markdown + Timeline + Export]                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Rust)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Hotkey     │  │  Clipboard   │  │   DAW        │         │
│  │   Manager    │  │  Monitor     │  │   Detector   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────┐        │
│  │          Fragment Processing Engine                  │        │
│  │  - Capture Fragment                                  │        │
│  │  - Detect Active DAW/Project                         │        │
│  │  - Enqueue to Processing Queue                       │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI PROCESSING LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │       Silent Structuring Engine (Background)         │        │
│  │                                                       │        │
│  │  1. Tag Extraction (gpt-4.1-mini)                     │        │
│  │     Input: "サビ ベース ぶつかってる"                │        │
│  │     Output: [#Mix, #Bass, #Arrangement]              │        │
│  │     Latency: ~200ms                                  │        │
│  │                                                       │        │
│  │  2. Sentiment Analysis (gpt-4.1-mini)                 │        │
│  │     Output: {type: "issue", urgency: "medium"}       │        │
│  │     Latency: ~100ms                                  │        │
│  │                                                       │        │
│  │  3. Context Linking (RAG + Vector Search)            │        │
│  │     Query: Semantic search in past fragments         │        │
│  │     Output: Related fragments [ID: 123, 456, ...]    │        │
│  │     Latency: ~150ms                                  │        │
│  │                                                       │        │
│  │  Total Processing Time: ~500ms (UX target)           │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │       Embedding Generation (Background)              │        │
│  │  Model: text-embedding-3-small (OpenAI)              │        │
│  │  Dimension: 1536                                      │        │
│  │  Store: Qdrant Vector DB (local)                     │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  PostgreSQL      │  │  Qdrant          │  │  Local       │ │
│  │  (Neon)          │  │  (Vector DB)     │  │  Storage     │ │
│  │                  │  │                  │  │              │ │
│  │  - Fragments     │  │  - Embeddings    │  │  - Cache     │ │
│  │  - Projects      │  │  - Semantic      │  │  - Temp      │ │
│  │  - Contexts      │  │    Search Index  │  │  - Settings  │ │
│  │  - Tags          │  │                  │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack Decision Matrix

#### クライアント層: Tauri vs Electron

| 評価項目 | Tauri | Electron | 推奨 |
|---------|-------|----------|------|
| **バンドルサイズ** | 2.5-3 MB | 80-120 MB | **Tauri** |
| **メモリ使用量** | 30-40 MB (idle) | 200-300 MB (idle) | **Tauri** |
| **起動時間** | < 500ms | 1-2s | **Tauri** |
| **セキュリティ** | Rust memory-safe, sandboxed | Node.js full access | **Tauri** |
| **開発体験** | Rust + TypeScript | JavaScript/TypeScript | Electron |
| **エコシステム** | 新興 (2024-2025急成長) | 成熟（VS Code, Slack） | Electron |
| **Global Hotkey** | ネイティブプラグイン | サードパーティ | **Tauri** |
| **システムリソース** | OS WebView | Chromium bundled | **Tauri** |

**最終推奨: Tauri**

**理由:**
1. **パフォーマンス優先**: 常駐型アプリとして、メモリ使用量50%削減は決定的な優位性
2. **セキュリティ**: 音楽制作現場のプロフェッショナルは機密情報（未発表楽曲）を扱う
3. **2025年の成長**: Tauri 2.0リリース以降、採用率35%増加、エコシステムが成熟
4. **ホットキー実装**: `tauri-plugin-global-shortcut` により簡単に実装可能
5. **MUEDnoteの価値**: UXの摩擦ゼロを実現するには、アプリ自体の軽量性が不可欠

**リスク対策:**
- Rust学習曲線: Tauriの提供するJavaScript APIで大部分をカバー、Rust実装は最小限
- エコシステム: 必要なプラグイン（hotkey, clipboard, window management）は全て揃っている

**参考資料:**
- [Tauri vs Electron 2025 Comparison](https://codeology.co.nz/articles/tauri-vs-electron-2025-desktop-development.html)
- [Tauri Global Shortcut Plugin](https://v2.tauri.app/plugin/global-shortcut/)
- [Tauri vs Electron Performance Analysis](https://www.gethopp.app/blog/tauri-vs-electron)

---

#### Vector Database: Qdrant vs Pinecone vs Weaviate

| 評価項目 | Qdrant | Pinecone | Weaviate | 推奨 |
|---------|--------|----------|----------|------|
| **ローカル実行** | ✅ 可能 | ❌ Cloud only | ✅ 可能 | **Qdrant** |
| **言語** | Rust (高速) | Managed service | Go | **Qdrant** |
| **フィルタリング** | 高度な複合条件 | 基本的 | 中程度 | **Qdrant** |
| **組み込み** | Docker / Binary | - | Docker | **Qdrant** |
| **RAG適正** | ✅ 最適化 | ✅ 良好 | ✅ 良好 | Qdrant |
| **料金** | Free (self-host) | $70+/月 | Free (self-host) | **Qdrant** |
| **パフォーマンス** | 低レイテンシ | 低レイテンシ | 中程度 | Qdrant |

**最終推奨: Qdrant (Self-hosted)**

**理由:**
1. **ローカルファースト**: Free Planでも7日間のログ保持が必要なため、ローカル実行が必須
2. **Rust実装**: Tauriと同じRust言語、統合が容易
3. **高度なフィルタリング**: プロジェクト・タグ・日時での複合検索が必須要件
4. **コスト**: 初期段階ではサーバーコストを最小化
5. **データ主権**: 未発表楽曲の情報を外部に送信しないことが信頼の鍵

**アーキテクチャ:**
```
Phase 1 (MVP): Qdrant in-process (embedded mode)
  - データ: ユーザーのローカルマシン
  - 同期: なし（ローカルのみ）

Phase 2 (Cloud Sync): Qdrant + PostgreSQL
  - データ: PostgreSQL (Neon) にメタデータ
  - ベクトル: Qdrant Cloud (オプション)
  - 同期: 暗号化して同期
```

**参考資料:**
- [Vector Database Comparison 2025](https://sysdebug.com/posts/vector-database-comparison-guide-2025/)
- [Qdrant for RAG Applications](https://digitaloneagency.com.au/best-vector-database-for-rag-in-2025-pinecone-vs-weaviate-vs-qdrant-vs-milvus-vs-chroma/)

---

#### AI Models

| 用途 | モデル | レイテンシ | コスト | 理由 |
|------|--------|-----------|--------|------|
| **Tag Extraction** | gpt-4.1-mini | 200ms | $0.4/1M tokens | 高速、軽量 |
| **Sentiment Analysis** | gpt-4.1-mini | 100ms | $0.4/1M tokens | 短文処理に最適 |
| **Context Linking (RAG)** | text-embedding-3-small | 50ms | $0.02/1M tokens | 1536次元、高速 |
| **Smart Recall (検索)** | gpt-4.1-mini + RAG | 500ms | $0.4/1M tokens | 要約生成 |
| **Auto Liner Notes** | gpt-5-mini | 2-5s | $0.25/$2.0 per 1M tokens | 長文生成、推論 |

**重要な設計原則:**
- **500ms ルール**: Fragment入力から消失までの処理時間を500ms以内に収める
- **非同期処理**: Embedding生成はバックグラウンドキューで実行
- **段階的な品質向上**: Phase 1では速度優先、Phase 2で精度向上

---

## 2. Data Model Design

### 2.1 Core Entities

#### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER                                     │
│  id, clerkId, email, plan, createdAt                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌────────▼────────┐
│    PROJECT      │    │   PREFERENCE    │
│  id, userId     │    │  id, userId     │
│  name, daw      │    │  settings JSON  │
│  status, dates  │    └─────────────────┘
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────────────────────────────────────────────────┐
│                    FRAGMENT                                  │
│  id, userId, projectId, contextId                           │
│  rawText (乱文入力)                                         │
│  processedAt, embeddings (vector)                           │
│  sentiment {type, urgency, emotion}                         │
│  metadata {daw, trackName, timestamp}                       │
└────────┬────────────────────────────────────────────────────┘
         │
         │ M:N
         │
┌────────▼────────┐    ┌──────────────────┐
│      TAG        │    │    CONTEXT       │
│  id, name       │    │  id, userId      │
│  category       │    │  name, type      │
│  (Mix, Vocal)   │    │  description     │
└─────────────────┘    │  relatedFrags    │
                       └──────────────────┘
```

### 2.2 Schema Definitions

#### fragments テーブル

```sql
CREATE TABLE fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  context_id UUID REFERENCES contexts(id) ON DELETE SET NULL,

  -- Core data
  raw_text TEXT NOT NULL, -- ユーザーの乱文入力 "サビ ベース ぶつかってる"
  normalized_text TEXT, -- 正規化後 "サビのベースがぶつかっている"

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ, -- AI処理完了時刻

  -- AI Analysis Results
  sentiment JSONB, -- {type: "issue", urgency: "medium", emotion: "frustrated"}
  tags TEXT[], -- ["Mix", "Bass", "Arrangement"]

  -- Vector Embeddings (stored in Qdrant, reference only)
  embedding_id TEXT, -- Qdrant のポイントID

  -- DAW Integration
  metadata JSONB, -- {daw: "Logic Pro", trackName: "Bass_01", bpm: 120}

  -- Indexes
  INDEX idx_fragments_user_created (user_id, created_at DESC),
  INDEX idx_fragments_project (project_id, created_at DESC),
  INDEX idx_fragments_tags (tags) USING GIN
);
```

#### projects テーブル

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Project Info
  name TEXT NOT NULL,
  daw TEXT, -- "Logic Pro", "Ableton Live", etc.
  status TEXT DEFAULT 'active', -- active, completed, archived

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Statistics
  fragment_count INTEGER DEFAULT 0,
  last_fragment_at TIMESTAMPTZ,

  INDEX idx_projects_user_status (user_id, status, updated_at DESC)
);
```

#### contexts テーブル

```sql
CREATE TABLE contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Context Definition
  name TEXT NOT NULL, -- "ボーカルミックスの試行錯誤"
  type TEXT, -- "workflow", "problem_solving", "creative_process"
  description TEXT, -- AI生成の要約

  -- Related Data
  related_fragments UUID[], -- Fragment IDの配列
  related_tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  INDEX idx_contexts_user (user_id, updated_at DESC)
);
```

#### tags テーブル

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tag Definition
  name TEXT NOT NULL UNIQUE, -- "Mix", "Vocal", "EQ"
  category TEXT, -- "technical", "creative", "emotion"
  description TEXT,

  -- Hierarchy (optional for Phase 2)
  parent_tag_id UUID REFERENCES tags(id),

  -- Usage Stats
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fragment_tags (
  fragment_id UUID NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  confidence FLOAT, -- AI の確信度 0.0 ~ 1.0

  PRIMARY KEY (fragment_id, tag_id)
);
```

### 2.3 Qdrant Vector Schema

```json
{
  "collection_name": "fragments",
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  },
  "payload_schema": {
    "fragment_id": "string (UUID)",
    "user_id": "string (UUID)",
    "project_id": "string (UUID) | null",
    "raw_text": "string",
    "tags": "string[]",
    "sentiment_type": "string",
    "created_at": "integer (unix timestamp)",
    "metadata": {
      "daw": "string",
      "trackName": "string"
    }
  }
}
```

**検索クエリ例 (RAG):**

```rust
// Semantic Search + Filtering
let search_result = qdrant_client.search_points(
    &SearchPoints {
        collection_name: "fragments".to_string(),
        vector: query_embedding,
        filter: Some(Filter {
            must: vec![
                Condition::matches("user_id", user_id),
                Condition::matches("tags", "Mix"),
                Condition::range("created_at", gte = last_7_days),
            ],
        }),
        limit: 10,
        with_payload: true,
    }
).await?;
```

---

## 3. Core UX Flows

### 3.1 Fragment Input Flow (500ms以内)

```
1. User Action: Cmd+Shift+M (Global Hotkey)
   ├─ Tauri: register_global_shortcut("Cmd+Shift+M")
   └─ Trigger: Show Overlay Window

2. Overlay Display (50ms)
   ├─ Position: Center of active monitor
   ├─ Style: Floating, semi-transparent, 1-line input
   └─ Focus: Auto-focus on input field

3. User Input: "サビ ベース ぶつかってる" + Enter
   ├─ Validate: min 2 chars
   └─ Capture: timestamp, active window (DAW detection)
n
4. Background Processing (450ms)
   ├─ [Parallel Execution]
   │  ├─ Tag Extraction (gpt-4.1-mini) → 200ms
   │  │  Output: ["Mix", "Bass", "Arrangement"]
   │  │
   │  ├─ Sentiment Analysis (gpt-4.1-mini) → 100ms
   │  │  Output: {type: "issue", urgency: "medium"}
   │  │
   │  └─ Save to PostgreSQL → 50ms
   │     Fragment record created
   │
   ├─ [Sequential - Non-blocking]
   │  └─ Embedding Generation (queued) → ~1-2s (background)
   │     - text-embedding-3-small
   │     - Store in Qdrant
   │     - Update fragment.embedding_id

5. UI Feedback (500ms total)
   ├─ Visual: Input bar fades out with "✓ Saved" animation
   └─ Return: Focus to DAW (active window before overlay)

6. User Experience: Seamless, no interruption to workflow
```

**Critical Performance Optimizations:**

1. **Parallel AI Calls**: Tag extraction と Sentiment analysis を並列実行
2. **Lazy Embedding**: Embedding生成はバックグラウンドキューで実行（検索に影響しない）
3. **Local Caching**: 頻出タグや最近のプロジェクト情報をメモリキャッシュ
4. **Rust Performance**: I/O処理（DB書き込み、API呼び出し）を非同期化

### 3.2 Smart Recall Flow

```
1. User Action: 検索ウィンドウを開く (Cmd+Shift+R)

2. Search Input: "前回スランプの時どうした？"

3. Processing (1-2s)
   ├─ Query Embedding (text-embedding-3-small) → 50ms
   │
   ├─ Vector Search in Qdrant → 150ms
   │  Filter: user_id, sentiment.emotion: "frustrated" | "stuck"
   │  Sort by: relevance + recency
   │  Limit: 20 candidates
   │
   ├─ Context Assembly (gpt-4.1-mini) → 500ms
   │  Input: Top 20 fragments + user query
   │  Output: {
   │    summary: "3週間前、ボーカルミックスで悩んでいた時...",
   │    timeline: [...],
   │    suggestions: [...]
   │  }
   │
   └─ Related Context Fetching → 100ms
      - Related projects
      - Related tags

4. Display Results
   ├─ Summary Card: AI生成の要約
   ├─ Timeline: 時系列でのフラグメント表示
   ├─ Related Contexts: "似た状況の別プロジェクト"
   └─ Actions: "この解決策を今のプロジェクトに適用"
```

### 3.3 Auto Liner Notes Flow

```
1. User Action: プロジェクト完了時に "ライナーノーツを生成"

2. Data Collection (500ms)
   ├─ Fetch all fragments for project
   ├─ Fetch related contexts
   └─ Calculate statistics (fragment count, active days, etc.)

3. AI Generation (5-10s) with streaming
   ├─ Model: gpt-5-mini (推論モデル)
   │
   ├─ Prompt Structure:
   │  - 全フラグメントの時系列データ
   │  - プロジェクト統計情報
   │  - ユーザーの好み（過去のライナーノーツから学習）
   │
   └─ Output: Markdown形式
      - 楽曲の制作意図
      - 試行錯誤のストーリー
      - 使用した技法・機材
      - 感情的な軌跡

4. User Editing & Export
   ├─ Markdown Editor (リアルタイムプレビュー)
   ├─ Export: Markdown, HTML, PDF
   └─ Publish: ブログ連携（Phase 3）
```

---

## 4. DAW Integration Strategy

### 4.1 Passive Detection (Phase 1 MVP)

**Approach**: ウィンドウタイトルとクリップボード監視による簡易検出

```rust
// Tauri Rust Backend
use tauri::Manager;

#[tauri::command]
async fn detect_active_daw() -> Result<DawInfo, String> {
    // 1. Get active window title
    let active_window = get_active_window_title()?;

    // 2. Pattern matching for known DAWs
    let daw = match &active_window {
        title if title.contains("Logic Pro") => "Logic Pro",
        title if title.contains("Ableton Live") => "Ableton Live",
        title if title.contains("Pro Tools") => "Pro Tools",
        title if title.contains("Cubase") => "Cubase",
        title if title.contains("FL Studio") => "FL Studio",
        _ => "Unknown"
    };

    // 3. Extract project name from window title
    // Example: "My Song - Logic Pro X"
    let project_name = extract_project_name(&active_window, daw);

    Ok(DawInfo {
        daw: daw.to_string(),
        project_name,
        track_name: None, // Phase 2で対応
    })
}

#[tauri::command]
async fn monitor_clipboard() -> Result<String, String> {
    // Clipboard APIでトラック名のコピーを検知
    // ユーザーがDAWでトラック名をコピー → 自動検出
    let clipboard_content = get_clipboard_content()?;

    Ok(clipboard_content)
}
```

**Limitations**:
- トラック名の自動検出は困難（ユーザーがコピーした場合のみ）
- DAWの種類は検出できるが、詳細な情報は取得できない
- プロジェクトファイル名はウィンドウタイトルから推測

### 4.2 Active Integration (Phase 3)

**Approach**: DAW Pluginまたはスクリプトによる双方向連携

**Logic Pro / GarageBand (AppleScript):**

```applescript
tell application "Logic Pro"
    -- Get current project info
    set projectName to name of front document
    set currentTempo to tempo

    -- Get selected track
    set selectedTrack to name of track 1 of front document

    -- Return as JSON
    return "{ \"project\": \"" & projectName & "\", \"track\": \"" & selectedTrack & "\", \"bpm\": " & currentTempo & " }"
end tell
```

**Ableton Live (Python Remote Script):**

```python
# MUEDnote_RemoteScript.py
from _Framework.ControlSurface import ControlSurface
import socket

class MUEDnoteRemoteScript(ControlSurface):
    def __init__(self, c_instance):
        super().__init__(c_instance)
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect(('localhost', 9999)) # Tauriアプリのローカルサーバー

    def on_track_list_changed(self):
        tracks = [track.name for track in self.song().tracks]
        self.send_to_muednote({'event': 'tracks_changed', 'tracks': tracks})
```

**Implementation Priority**:
- Phase 1: Passive detection (ウィンドウタイトル)
- Phase 2: Clipboard monitoring (トラック名コピー検知)
- Phase 3: Active integration (DAW Plugin/Script)

---

## 5. Implementation Roadmap

### Phase 1: MVP - "The Console" (0-4ヶ月)

**目標**: DAU 100名、1日平均10回入力

#### Milestone 1.1: Tauri App Foundation (1ヶ月)

**Deliverables:**
- [x] Tauri project setup with React + TypeScript
- [x] Global hotkey (Cmd+Shift+M) implementation
- [x] Overlay window with 1-line input
- [x] Basic DAW detection (window title)
- [x] PostgreSQL schema (fragments, projects, users)

**Testing:**
- Unit tests: Hotkey registration, window management
- E2E tests: Overlay display, input capture

**Success Criteria:**
- Overlay表示: < 50ms
- ホットキー反応: 100%成功率
- クロスプラットフォーム: Mac + Windows

---

#### Milestone 1.2: AI Processing Pipeline (1.5ヶ月)

**Deliverables:**
- [x] OpenAI API integration (gpt-4.1-mini)
- [x] Tag extraction service (200ms target)
- [x] Sentiment analysis service (100ms target)
- [x] Background job queue (Rust async)
- [x] PostgreSQL data persistence

**API Structure:**

```typescript
// Frontend (React + Tauri API)
import { invoke } from '@tauri-apps/api/core';

async function submitFragment(text: string) {
  const result = await invoke('process_fragment', {
    rawText: text,
    metadata: {
      daw: await invoke('detect_active_daw'),
      timestamp: Date.now()
    }
  });

  return result; // {fragmentId, processingStatus}
}
```

```rust
// Backend (Tauri Rust)
#[tauri::command]
async fn process_fragment(
    raw_text: String,
    metadata: FragmentMetadata,
    state: State<'_, AppState>
) -> Result<FragmentResult, String> {
    // 1. Save to DB immediately (non-blocking)
    let fragment_id = state.db.insert_fragment(&raw_text, &metadata).await?;

    // 2. Parallel AI processing
    let (tags, sentiment) = tokio::join!(
        extract_tags(&raw_text, &state.openai_client),
        analyze_sentiment(&raw_text, &state.openai_client)
    );

    // 3. Update fragment with AI results
    state.db.update_fragment_analysis(fragment_id, tags?, sentiment?).await?;

    // 4. Queue embedding generation (background)
    state.job_queue.enqueue(GenerateEmbedding { fragment_id }).await?;

    Ok(FragmentResult {
        fragment_id,
        processing_status: "completed"
    })
}
```

**Testing:**
- Performance tests: 500ms以内の処理完了率
- Integration tests: OpenAI API mock + DB transactions

**Success Criteria:**
- 処理時間: 95%が500ms以内
- エラー率: < 1%
- データ整合性: トランザクション保証

---

#### Milestone 1.3: Qdrant Integration (1ヶ月)

**Deliverables:**
- [x] Qdrant embedded mode setup
- [x] Embedding generation service (text-embedding-3-small)
- [x] Vector indexing pipeline
- [x] Basic semantic search

**Qdrant Setup:**

```rust
use qdrant_client::{client::QdrantClient, qdrant::*};

pub async fn init_qdrant() -> Result<QdrantClient, Box<dyn std::error::Error>> {
    // Embedded mode (local file storage)
    let client = QdrantClient::from_url("http://localhost:6333").build()?;

    // Create collection
    client.create_collection(&CreateCollection {
        collection_name: "fragments".to_string(),
        vectors_config: Some(VectorsConfig {
            config: Some(Config::Params(VectorParams {
                size: 1536, // text-embedding-3-small
                distance: Distance::Cosine as i32,
                ..Default::default()
            })),
        }),
        ..Default::default()
    }).await?;

    Ok(client)
}

pub async fn search_similar_fragments(
    client: &QdrantClient,
    query_embedding: Vec<f32>,
    user_id: &str,
    limit: u64
) -> Result<Vec<FragmentMatch>, Box<dyn std::error::Error>> {
    let search_result = client.search_points(&SearchPoints {
        collection_name: "fragments".to_string(),
        vector: query_embedding,
        filter: Some(Filter {
            must: vec![Condition::matches("user_id", user_id)],
        }),
        limit,
        with_payload: Some(WithPayloadSelector {
            selector_options: Some(SelectorOptions::Enable(true)),
        }),
        ..Default::default()
    }).await?;

    Ok(search_result.result.iter().map(|point| {
        FragmentMatch {
            fragment_id: point.payload.get("fragment_id").unwrap().to_string(),
            score: point.score,
            raw_text: point.payload.get("raw_text").unwrap().to_string(),
        }
    }).collect())
}
```

**Testing:**
- Vector search accuracy tests
- Performance: 検索レイテンシ < 150ms

**Success Criteria:**
- Semantic search precision: > 80% (manual evaluation)
- Index size: < 100MB (1000 fragments)

---

#### Milestone 1.4: Smart Recall UI (0.5ヶ月)

**Deliverables:**
- [x] Search window UI (Tauri window)
- [x] Query input + results display
- [x] Timeline visualization (chronological)

**UI Components:**

```tsx
// components/SmartRecall.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function SmartRecall() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecallResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await invoke<RecallResult>('smart_recall_search', {
        query,
        userId: getCurrentUserId()
      });
      setResults(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="smart-recall">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="前回スランプの時どうした？"
        className="search-input"
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? '検索中...' : '検索'}
      </button>

      {results && (
        <div className="results">
          <h3>{results.summary}</h3>
          <Timeline fragments={results.fragments} />
        </div>
      )}
    </div>
  );
}
```

**Testing:**
- E2E tests: 検索フロー
- UI tests: レスポンシブ、アクセシビリティ

---

### Phase 2: Context & Cloud (5-10ヶ月)

**目標**: Pro Plan 転換率 10%、MRR 196万円

#### Milestone 2.1: Context Auto-Generation (2ヶ月)

**Deliverables:**
- [ ] Context clustering algorithm
- [ ] gpt-5-mini integration (推論モデル)
- [ ] Context UI (contexts list + detail)

**Context Generation Logic:**

```rust
// services/context_generator.rs
pub async fn generate_contexts_for_project(
    project_id: &str,
    fragments: Vec<Fragment>,
    openai_client: &OpenAIClient
) -> Result<Vec<Context>, Error> {
    // 1. Cluster fragments by semantic similarity
    let clusters = cluster_by_embeddings(&fragments, min_cluster_size = 3)?;

    // 2. For each cluster, generate context
    let mut contexts = Vec::new();
    for cluster in clusters {
        let prompt = format!(
            "以下のフラグメント群から、共通するテーマ・コンテキストを抽出してください:\n{}",
            cluster.iter().map(|f| f.raw_text.clone()).collect::<Vec<_>>().join("\n")
        );

        let response = openai_client.chat()
            .model("gpt-5-mini")
            .messages(vec![Message::user(prompt)])
            .await?;

        let context = Context {
            name: extract_context_name(&response),
            description: response.choices[0].message.content.clone(),
            related_fragments: cluster.iter().map(|f| f.id).collect(),
            ...
        };

        contexts.push(context);
    }

    Ok(contexts)
}
```

---

#### Milestone 2.2: Auto Liner Notes (2ヶ月)

**Deliverables:**
- [ ] gpt-5-mini streaming integration
- [ ] Markdown editor UI
- [ ] Export (Markdown, HTML, PDF)

**Liner Notes Generation:**

```rust
#[tauri::command]
async fn generate_liner_notes(
    project_id: String,
    state: State<'_, AppState>
) -> Result<String, String> {
    // 1. Fetch project data
    let project = state.db.get_project(&project_id).await?;
    let fragments = state.db.get_fragments_by_project(&project_id).await?;
    let contexts = state.db.get_contexts_by_project(&project_id).await?;

    // 2. Build prompt
    let prompt = build_liner_notes_prompt(&project, &fragments, &contexts);

    // 3. Streaming generation
    let stream = state.openai_client.chat()
        .model("gpt-5-mini")
        .messages(vec![Message::user(prompt)])
        .stream()
        .await?;

    // 4. Stream to frontend
    let mut markdown = String::new();
    for chunk in stream {
        markdown.push_str(&chunk.choices[0].delta.content);
        // Send to frontend via Tauri event
        state.emit("liner_notes_chunk", &chunk.choices[0].delta.content).await?;
    }

    Ok(markdown)
}
```

---

#### Milestone 2.3: Cloud Sync (1.5ヶ月)

**Deliverables:**
- [ ] Neon PostgreSQL production setup
- [ ] End-to-end encryption for sync
- [ ] Conflict resolution strategy

**Sync Architecture:**

```
┌────────────────────────────────────────────────────────────┐
│                    Local (Tauri App)                        │
├────────────────────────────────────────────────────────────┤
│  SQLite (cache) + Qdrant (embedded)                        │
│  ├─ Write: Immediate local storage                         │
│  └─ Read: Local-first, fallback to cloud                   │
└────────────────┬───────────────────────────────────────────┘
                 │
                 │ Sync (background)
                 │ - Incremental updates
                 │ - E2E encrypted
                 │ - Conflict resolution: last-write-wins
                 │
┌────────────────▼───────────────────────────────────────────┐
│                    Cloud (Neon PostgreSQL)                  │
├────────────────────────────────────────────────────────────┤
│  PostgreSQL + Qdrant Cloud (optional)                      │
│  ├─ Master data store                                      │
│  └─ Multi-device sync                                      │
└────────────────────────────────────────────────────────────┘
```

**Encryption Strategy:**

```rust
use aes_gcm::{Aes256Gcm, Key, Nonce};

pub async fn encrypt_fragment(fragment: &Fragment, user_key: &[u8]) -> Result<Vec<u8>, Error> {
    let cipher = Aes256Gcm::new(Key::from_slice(user_key));
    let nonce = Nonce::from_slice(b"unique_nonce"); // 実際はランダム生成

    let plaintext = serde_json::to_vec(fragment)?;
    let ciphertext = cipher.encrypt(nonce, plaintext.as_ref())
        .map_err(|e| Error::Encryption(e.to_string()))?;

    Ok(ciphertext)
}
```

---

#### Milestone 2.4: Subscription System (1ヶ月)

**Deliverables:**
- [ ] Stripe integration
- [ ] Plan management (Free, Pro, Studio)
- [ ] Usage tracking (fragment count, storage)

---

### Phase 3: Ecosystem (11-18ヶ月)

**目標**: B2B導入、MRR 300万円

#### Milestone 3.1: DAW Plugin Integration (3ヶ月)

**Deliverables:**
- [ ] Logic Pro AppleScript integration
- [ ] Ableton Live Remote Script
- [ ] Real-time track name detection

---

#### Milestone 3.2: Mobile App (4ヶ月)

**Deliverables:**
- [ ] React Native app (iOS + Android)
- [ ] Voice input (Whisper API)
- [ ] Sync with desktop app

---

#### Milestone 3.3: Education Dashboard (2ヶ月)

**Deliverables:**
- [ ] Instructor dashboard (学生の制作ログ可視化)
- [ ] Auto report generation (試行錯誤レポート)
- [ ] Group management (学校・クラス単位)

---

## 6. Risk Assessment & Mitigation

### Technical Risks

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| **Tauri学習曲線がチームの生産性を下げる** | Medium | Medium | - JavaScriptレイヤーで大部分を実装<br>- Rust実装は最小限（ホットキー、ウィンドウ管理のみ）<br>- 公式プラグインを最大活用 |
| **500ms以内の処理が達成できない** | Low | High | - パフォーマンステストを早期実施<br>- 並列処理の最適化<br>- フォールバック: 1秒まで許容（ユーザーテストで検証） |
| **Qdrant embeddings生成が遅い** | Low | Medium | - Background queueで非同期化<br>- 検索に影響しない設計<br>- バッチ処理で効率化 |
| **DAW検出が不正確** | High | Low | - Phase 1では「推測」として扱う<br>- ユーザーが手動で修正可能<br>- Phase 3でプラグイン対応 |
| **OpenAI API コストが想定を超える** | Medium | Medium | - gpt-4.1-mini（$0.4/1M tokens）を優先<br>- キャッシュ活用<br>- 月次コスト監視ダッシュボード |

### Business Risks

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| **ターゲット（プロ/ハイアマ）が有料化に抵抗** | Medium | High | - Free Planで7日間のログ保持を提供<br>- Pro Plan のROI明確化（時間節約 → 金銭価値換算） |
| **ChatGPT等の汎用AIが同機能を追加** | Medium | Medium | - 差別化: 500ms入力 + DAW統合<br>- ロックイン: 独自語彙学習、暗黙知の資産化 |
| **DAWベンダーが同機能を標準搭載** | Low | High | - ニッチ戦略: 複数DAW横断のデータ統合<br>- M&A exit strategy（DAWベンダーへの売却） |

---

## 7. Success Metrics & KPIs

### Phase 1 (MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **DAU** | 100名 | Tauri telemetry |
| **平均入力回数/日** | 10回 | Fragment count per user |
| **処理時間 (P95)** | < 500ms | Performance logs |
| **エラー率** | < 1% | Sentry error tracking |
| **ユーザー定着率 (7日)** | > 40% | Cohort analysis |

### Phase 2 (Cloud Sync)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Pro Plan 転換率** | 10% | Stripe subscriptions |
| **MRR** | 196万円 | Stripe revenue |
| **Churn Rate** | < 5%/月 | Subscription cancellations |
| **検索利用率** | > 50% | Smart Recall usage |
| **ライナーノーツ生成回数** | > 100/月 | Feature usage tracking |

### Phase 3 (Ecosystem)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **B2B契約数** | 3校 | Enterprise dashboard |
| **MRR** | 300万円 | Total revenue |
| **DAW統合利用率** | > 30% | Plugin activation |
| **モバイルアプリDAU** | 500名 | Mobile analytics |

---

## 8. Appendix

### A. Technology Stack Summary

**Frontend:**
- React 19.x + TypeScript
- TailwindCSS 4
- Vite (build tool)

**Desktop App:**
- Tauri 2.0
- Rust 1.77.2+

**Backend:**
- PostgreSQL (Neon) - Relational data
- Qdrant (embedded → cloud) - Vector DB
- OpenAI API - AI processing

**AI Models:**
- gpt-4.1-mini: Tag extraction, Sentiment analysis
- text-embedding-3-small: Embeddings
- gpt-5-mini: Context generation, Liner notes

**DevOps:**
- GitHub Actions - CI/CD
- Sentry - Error tracking
- Stripe - Payment processing

---

### B. Related Documents

- [MUEDnote事業計画書v3.0](../business/MUEDnote事業計画書v3.md)
- [MUEDnote Interview/Reasoning Architecture](./muednote-interview-reasoning-architecture.md)
- [MUED System Architecture](./SYSTEM_ARCHITECTURE.md)

---

### C. Research Sources

**Tauri vs Electron:**
- [Tauri vs Electron 2025 Comparison](https://codeology.co.nz/articles/tauri-vs-electron-2025-desktop-development.html)
- [Tauri vs Electron Performance Analysis](https://www.gethopp.app/blog/tauri-vs-electron)
- [Tauri Global Shortcut Plugin](https://v2.tauri.app/plugin/global-shortcut/)

**Vector Databases:**
- [Vector Database Comparison 2025](https://sysdebug.com/posts/vector-database-comparison-guide-2025/)
- [Qdrant for RAG Applications](https://digitaloneagency.com.au/best-vector-database-for-rag-in-2025-pinecone-vs-weaviate-vs-qdrant-vs-milvus-vs-chroma/)

**Desktop Integration:**
- [Tauri Global Hotkey Implementation](https://dev.to/rain9/tauri-8-implementing-global-shortcut-key-function-2336)
- [Electron vs Tauri Desktop Apps](https://www.dolthub.com/blog/2025-11-13-electron-vs-tauri/)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-24
**Next Review**: Phase 1 完了時 (2025-03頃)

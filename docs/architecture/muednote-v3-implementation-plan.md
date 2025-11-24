# MUEDnote v3.0 - Detailed Implementation Plan

**Version**: 1.0.0
**Created**: 2025-11-24
**Status**: Planning Phase

---

## Overview

このドキュメントは、MUEDnote v3.0の段階的実装計画の詳細版です。各マイルストーンの具体的なタスク、依存関係、リソース要件、品質基準を定義します。

**親ドキュメント**: [MUEDnote v3.0 Architecture](./muednote-v3-cognitive-offloading-architecture.md)

---

## Phase 1: MVP - "The Console" (0-4ヶ月)

### 目標再確認

- **ビジネス目標**: DAU 100名、1日平均10回入力
- **技術目標**: 500ms以内の処理、エラー率 < 1%
- **ユーザー目標**: フロー状態を阻害しない「透明な」入力体験

---

## Milestone 1.1: Tauri App Foundation (Month 1)

### Week 1: Project Setup & Infrastructure

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.1.1 | Tauri project初期化（`tauri init`） | P0 | 2h | Backend | - |
| T1.1.2 | React + TypeScript + Vite セットアップ | P0 | 4h | Frontend | T1.1.1 |
| T1.1.3 | TailwindCSS 4 インストール・設定 | P1 | 2h | Frontend | T1.1.2 |
| T1.1.4 | ESLint + Prettier 設定 | P1 | 2h | DevOps | T1.1.2 |
| T1.1.5 | Vitest セットアップ (unit tests) | P0 | 3h | QA | T1.1.2 |
| T1.1.6 | CI/CD パイプライン (GitHub Actions) | P1 | 4h | DevOps | T1.1.5 |

**Deliverable**: 空のTauriアプリが起動し、テスト実行可能な状態

**Quality Gate**:
- [ ] `npm run dev` で開発サーバー起動
- [ ] `npm run test` で全テストPASS（初期状態）
- [ ] CI/CD でビルド成功

---

### Week 2: Global Hotkey Implementation

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.1.7 | `tauri-plugin-global-shortcut` インストール | P0 | 1h | Backend | T1.1.1 |
| T1.1.8 | Cmd+Shift+M ホットキー登録（Rust側） | P0 | 4h | Backend | T1.1.7 |
| T1.1.9 | ホットキーイベントのフロントエンド通信 | P0 | 3h | Backend | T1.1.8 |
| T1.1.10 | Windows/Linux のキーバインド対応 | P1 | 2h | Backend | T1.1.8 |
| T1.1.11 | Unit tests: ホットキー登録・解除 | P0 | 3h | QA | T1.1.8 |

**Code Example** (Rust):

```rust
// src-tauri/src/hotkey.rs
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutEvent};

pub fn register_global_hotkeys(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    app.global_shortcut().on_shortcut("Cmd+Shift+M", |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            // Emit event to frontend
            app.emit("show-overlay", ()).expect("Failed to emit event");
        }
    })?;

    println!("Global hotkey registered: Cmd+Shift+M");
    Ok(())
}
```

**Deliverable**: ホットキー押下でフロントエンドにイベント通知

**Quality Gate**:
- [ ] ホットキー反応率 100% (10回連続テスト)
- [ ] クロスプラットフォーム動作確認 (Mac/Win)

---

### Week 3: Overlay Window UI

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.1.12 | Overlay window生成（Tauriウィンドウ設定） | P0 | 4h | Backend | T1.1.9 |
| T1.1.13 | ウィンドウ位置: モニター中央配置 | P0 | 3h | Backend | T1.1.12 |
| T1.1.14 | 1-line input UI コンポーネント作成 | P0 | 6h | Frontend | T1.1.12 |
| T1.1.15 | Auto-focus on input field | P0 | 2h | Frontend | T1.1.14 |
| T1.1.16 | Fade-out animation (500ms) | P1 | 3h | Frontend | T1.1.14 |
| T1.1.17 | Overlay UI デザイン（半透明、影、角丸） | P1 | 4h | Design | T1.1.14 |
| T1.1.18 | E2E test: Overlay表示・消失 | P0 | 4h | QA | T1.1.15 |

**UI Spec**:

```
┌─────────────────────────────────────────────────┐
│  MUEDnote Fragment Input                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  [                                           ]  │ ← 1-line input
│   Type your thought... (Cmd+Shift+M)           │
│                                                 │
│  Status: ● Processing (0.5s)                   │ ← Status indicator
│                                                 │
└─────────────────────────────────────────────────┘

Width: 600px
Height: 120px
Background: rgba(0, 0, 0, 0.85)
Border Radius: 12px
Box Shadow: 0 10px 40px rgba(0,0,0,0.3)
```

**Code Example** (React):

```tsx
// src/components/OverlayWindow.tsx
import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export function OverlayWindow() {
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing'>('idle');

  useEffect(() => {
    const unlisten = listen('show-overlay', () => {
      setVisible(true);
      setInput('');
      setStatus('idle');
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.length < 2) return;

    setStatus('processing');

    try {
      await invoke('process_fragment', { rawText: input });

      // Fade out after 500ms
      setTimeout(() => {
        setVisible(false);
        setStatus('idle');
      }, 500);
    } catch (error) {
      console.error('Failed to process fragment:', error);
      setStatus('idle');
    }
  };

  if (!visible) return null;

  return (
    <div className="overlay-window">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your thought... (Cmd+Shift+M)"
          autoFocus
          className="fragment-input"
        />
        {status === 'processing' && (
          <div className="status">● Processing...</div>
        )}
      </form>
    </div>
  );
}
```

**Deliverable**: ホットキーで表示、Enter で消失するオーバーレイUI

**Quality Gate**:
- [ ] 表示レイテンシ < 50ms
- [ ] Auto-focus 動作確認
- [ ] Fade-out animation 実装

---

### Week 4: DAW Detection & PostgreSQL Schema

#### Tasks (DAW Detection)

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.1.19 | Active window title 取得（Rust） | P0 | 4h | Backend | - |
| T1.1.20 | DAW pattern matching (Logic, Ableton, etc.) | P0 | 3h | Backend | T1.1.19 |
| T1.1.21 | Project name extraction from window title | P1 | 3h | Backend | T1.1.20 |
| T1.1.22 | Unit tests: DAW detection accuracy | P0 | 3h | QA | T1.1.20 |

**Code Example** (Rust):

```rust
// src-tauri/src/daw_detector.rs
use window_titles::get_active_window_title;

#[derive(Debug, Clone)]
pub struct DawInfo {
    pub daw: String,
    pub project_name: Option<String>,
}

pub fn detect_active_daw() -> Result<DawInfo, String> {
    let window_title = get_active_window_title()
        .map_err(|e| format!("Failed to get window title: {}", e))?;

    let (daw, project_name) = match window_title.as_str() {
        title if title.contains("Logic Pro") => {
            let name = extract_project_name_logic(title);
            ("Logic Pro".to_string(), name)
        }
        title if title.contains("Ableton Live") => {
            let name = extract_project_name_ableton(title);
            ("Ableton Live".to_string(), name)
        }
        title if title.contains("Pro Tools") => {
            ("Pro Tools".to_string(), None)
        }
        _ => ("Unknown".to_string(), None)
    };

    Ok(DawInfo { daw, project_name })
}

fn extract_project_name_logic(title: &str) -> Option<String> {
    // "My Song - Logic Pro X" → "My Song"
    title.split(" - ").next().map(|s| s.to_string())
}

fn extract_project_name_ableton(title: &str) -> Option<String> {
    // "My Project [Ableton Live 12 Suite]" → "My Project"
    title.split(" [").next().map(|s| s.to_string())
}
```

**Deliverable**: Active DAWとプロジェクト名を検出

**Quality Gate**:
- [ ] Logic Pro / Ableton Live / Pro Tools 検出成功
- [ ] プロジェクト名抽出精度 > 80%

---

#### Tasks (PostgreSQL Schema)

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.1.23 | Neon PostgreSQL プロジェクト作成 | P0 | 1h | DevOps | - |
| T1.1.24 | Drizzle ORM setup (スキーマ定義) | P0 | 4h | Backend | T1.1.23 |
| T1.1.25 | `users` テーブル作成 (Clerk連携) | P0 | 2h | Backend | T1.1.24 |
| T1.1.26 | `fragments` テーブル作成 | P0 | 3h | Backend | T1.1.24 |
| T1.1.27 | `projects` テーブル作成 | P0 | 2h | Backend | T1.1.24 |
| T1.1.28 | `tags` + `fragment_tags` テーブル作成 | P1 | 3h | Backend | T1.1.24 |
| T1.1.29 | Migration scripts 作成 | P0 | 2h | Backend | T1.1.28 |
| T1.1.30 | Database connection test (Rust + Drizzle) | P0 | 3h | Backend | T1.1.29 |

**Schema Definition** (Drizzle):

```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  plan: text('plan').default('free'), // free, pro, studio
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  daw: text('daw'), // Logic Pro, Ableton Live, etc.
  status: text('status').default('active'), // active, completed, archived
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  fragmentCount: integer('fragment_count').default(0),
}, (table) => ({
  userStatusIdx: index('idx_projects_user_status').on(table.userId, table.status, table.updatedAt),
}));

export const fragments = pgTable('fragments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  rawText: text('raw_text').notNull(),
  normalizedText: text('normalized_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  sentiment: jsonb('sentiment'), // {type, urgency, emotion}
  tags: text('tags').array(), // ["Mix", "Bass", "Arrangement"]
  embeddingId: text('embedding_id'), // Qdrant point ID
  metadata: jsonb('metadata'), // {daw, trackName, bpm}
}, (table) => ({
  userCreatedIdx: index('idx_fragments_user_created').on(table.userId, table.createdAt),
  projectIdx: index('idx_fragments_project').on(table.projectId, table.createdAt),
}));

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  category: text('category'), // technical, creative, emotion
  description: text('description'),
  usageCount: integer('usage_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const fragmentTags = pgTable('fragment_tags', {
  fragmentId: uuid('fragment_id').notNull().references(() => fragments.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  confidence: real('confidence'), // 0.0 ~ 1.0
}, (table) => ({
  pk: primaryKey(table.fragmentId, table.tagId),
}));
```

**Deliverable**: PostgreSQLスキーマ作成、接続テスト成功

**Quality Gate**:
- [ ] Migration scripts 実行成功
- [ ] Connection test PASS
- [ ] スキーマ設計レビュー完了

---

## Milestone 1.2: AI Processing Pipeline (Month 2)

### Week 5-6: OpenAI Integration & Tag Extraction

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.2.1 | OpenAI API client setup (Rust) | P0 | 4h | Backend | - |
| T1.2.2 | Tag extraction prompt エンジニアリング | P0 | 6h | AI/ML | T1.2.1 |
| T1.2.3 | Tag extraction service 実装 | P0 | 8h | Backend | T1.2.2 |
| T1.2.4 | Response parsing (JSON validation) | P0 | 4h | Backend | T1.2.3 |
| T1.2.5 | Error handling & retry logic | P0 | 4h | Backend | T1.2.3 |
| T1.2.6 | Unit tests: Tag extraction accuracy | P0 | 6h | QA | T1.2.3 |
| T1.2.7 | Performance test: < 200ms latency | P0 | 3h | QA | T1.2.3 |

**Prompt Engineering**:

```
You are a music production tag extraction AI.

Given a user's short note (fragment) about their music production process, extract relevant tags.

Rules:
1. Extract 2-5 tags maximum
2. Tags must be in English, from the following categories:
   - Technical: Mix, Master, EQ, Compression, Reverb, Delay, etc.
   - Creative: Melody, Harmony, Rhythm, Arrangement, Structure, etc.
   - Instrument: Vocal, Bass, Drums, Guitar, Piano, Synth, etc.
   - Emotion: Energetic, Calm, Dark, Bright, etc.
3. Return ONLY a JSON array of strings, no explanation

Example:
Input: "サビのベースがボーカルとぶつかってる"
Output: ["Mix", "Bass", "Vocal", "Arrangement"]

Input: "{{raw_text}}"
Output:
```

**Code Example** (Rust):

```rust
// src-tauri/src/services/tag_extractor.rs
use async_openai::{Client, types::{ChatCompletionRequestMessage, CreateChatCompletionRequest}};
use serde_json::Value;

pub struct TagExtractor {
    client: Client,
}

impl TagExtractor {
    pub fn new(api_key: String) -> Self {
        let client = Client::new().with_api_key(api_key);
        Self { client }
    }

    pub async fn extract_tags(&self, raw_text: &str) -> Result<Vec<String>, String> {
        let prompt = format!(
            "You are a music production tag extraction AI.\n\n\
             Given a user's short note, extract 2-5 relevant tags.\n\n\
             Rules:\n\
             1. Tags must be from: Technical, Creative, Instrument, Emotion\n\
             2. Return ONLY a JSON array of strings\n\n\
             Input: {}\nOutput:",
            raw_text
        );

        let request = CreateChatCompletionRequest {
            model: "gpt-4.1-mini".to_string(),
            messages: vec![
                ChatCompletionRequestMessage::User {
                    content: prompt,
                    name: None,
                }
            ],
            max_tokens: Some(100),
            temperature: Some(0.3),
            ..Default::default()
        };

        let response = self.client
            .chat()
            .create(request)
            .await
            .map_err(|e| format!("OpenAI API error: {}", e))?;

        let content = response.choices[0].message.content.clone();

        // Parse JSON array
        let tags: Vec<String> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse tags: {}", e))?;

        Ok(tags)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tag_extraction_japanese() {
        let extractor = TagExtractor::new(std::env::var("OPENAI_API_KEY").unwrap());
        let result = extractor.extract_tags("サビのベースがボーカルとぶつかってる").await;

        assert!(result.is_ok());
        let tags = result.unwrap();
        assert!(tags.contains(&"Mix".to_string()));
        assert!(tags.contains(&"Bass".to_string()));
        assert!(tags.contains(&"Vocal".to_string()));
    }

    #[tokio::test]
    async fn test_performance_under_200ms() {
        let extractor = TagExtractor::new(std::env::var("OPENAI_API_KEY").unwrap());
        let start = std::time::Instant::now();

        let _ = extractor.extract_tags("キックとベースがぶつかってる").await;

        let elapsed = start.elapsed().as_millis();
        assert!(elapsed < 200, "Tag extraction took {}ms (expected < 200ms)", elapsed);
    }
}
```

**Deliverable**: Tag extraction service（200ms以内）

**Quality Gate**:
- [ ] 精度: 手動評価で80%以上正しいタグ
- [ ] レイテンシ: P95 < 200ms
- [ ] エラー率: < 1%

---

### Week 7: Sentiment Analysis & Fragment Processing

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.2.8 | Sentiment analysis prompt エンジニアリング | P0 | 4h | AI/ML | T1.2.2 |
| T1.2.9 | Sentiment analysis service 実装 | P0 | 6h | Backend | T1.2.8 |
| T1.2.10 | Fragment processing orchestrator 実装 | P0 | 8h | Backend | T1.2.3, T1.2.9 |
| T1.2.11 | Parallel execution (tokio::join!) | P0 | 4h | Backend | T1.2.10 |
| T1.2.12 | PostgreSQL insert (fragments table) | P0 | 4h | Backend | T1.2.10 |
| T1.2.13 | Integration test: End-to-end flow | P0 | 6h | QA | T1.2.12 |

**Sentiment Analysis Prompt**:

```
Analyze the sentiment of this music production note.

Return ONLY a JSON object with:
- type: "issue", "idea", "progress", "question"
- urgency: "low", "medium", "high"
- emotion: "frustrated", "excited", "curious", "satisfied", "neutral"

Input: "{{raw_text}}"
Output:
```

**Fragment Processing Orchestrator**:

```rust
// src-tauri/src/services/fragment_processor.rs
use crate::services::{TagExtractor, SentimentAnalyzer};
use crate::db::Database;

pub struct FragmentProcessor {
    tag_extractor: TagExtractor,
    sentiment_analyzer: SentimentAnalyzer,
    db: Database,
}

#[tauri::command]
pub async fn process_fragment(
    raw_text: String,
    metadata: FragmentMetadata,
    state: tauri::State<'_, AppState>,
) -> Result<FragmentResult, String> {
    let start = std::time::Instant::now();

    // 1. Save fragment immediately (non-blocking)
    let fragment_id = state.db.insert_fragment(&raw_text, &metadata).await?;

    // 2. Parallel AI processing
    let (tags_result, sentiment_result) = tokio::join!(
        state.tag_extractor.extract_tags(&raw_text),
        state.sentiment_analyzer.analyze(&raw_text)
    );

    let tags = tags_result?;
    let sentiment = sentiment_result?;

    // 3. Update fragment with AI results
    state.db.update_fragment_analysis(fragment_id, &tags, &sentiment).await?;

    let elapsed = start.elapsed().as_millis();
    println!("Fragment processed in {}ms", elapsed);

    Ok(FragmentResult {
        fragment_id,
        processing_time_ms: elapsed as u64,
        status: "completed".to_string(),
    })
}
```

**Deliverable**: Fragment処理オーケストレーター（500ms以内）

**Quality Gate**:
- [ ] 処理時間: P95 < 500ms
- [ ] データ整合性: トランザクション保証
- [ ] エラーハンドリング: 部分失敗でもロールバック可能

---

### Week 8: Background Job Queue

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.2.14 | Job queue 設計 (in-memory → Redis Phase 2) | P1 | 4h | Backend | - |
| T1.2.15 | Background worker 実装 (tokio task) | P1 | 6h | Backend | T1.2.14 |
| T1.2.16 | Embedding generation job (stub for M1.3) | P1 | 4h | Backend | T1.2.15 |
| T1.2.17 | Job status tracking (DB) | P1 | 3h | Backend | T1.2.15 |
| T1.2.18 | Unit tests: Job enqueue/dequeue | P1 | 4h | QA | T1.2.15 |

**Code Example** (In-memory Queue):

```rust
// src-tauri/src/job_queue.rs
use tokio::sync::mpsc;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub enum Job {
    GenerateEmbedding { fragment_id: String },
    UpdateContext { project_id: String },
}

pub struct JobQueue {
    sender: mpsc::Sender<Job>,
}

impl JobQueue {
    pub fn new() -> (Self, mpsc::Receiver<Job>) {
        let (sender, receiver) = mpsc::channel(100);
        (Self { sender }, receiver)
    }

    pub async fn enqueue(&self, job: Job) -> Result<(), String> {
        self.sender.send(job).await
            .map_err(|e| format!("Failed to enqueue job: {}", e))
    }
}

pub async fn start_worker(
    mut receiver: mpsc::Receiver<Job>,
    state: Arc<AppState>
) {
    while let Some(job) = receiver.recv().await {
        match job {
            Job::GenerateEmbedding { fragment_id } => {
                // Phase 1.3 で実装
                println!("Processing embedding for fragment: {}", fragment_id);
            }
            Job::UpdateContext { project_id } => {
                // Phase 2 で実装
                println!("Updating context for project: {}", project_id);
            }
        }
    }
}
```

**Deliverable**: Background job queue（Embedding生成用）

**Quality Gate**:
- [ ] Job enqueue 成功率 100%
- [ ] Worker 起動・停止テスト成功

---

## Milestone 1.3: Qdrant Integration (Month 3)

### Week 9-10: Qdrant Setup & Embedding Generation

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.3.1 | Qdrant embedded mode setup | P0 | 4h | Backend | - |
| T1.3.2 | Collection creation (fragments) | P0 | 3h | Backend | T1.3.1 |
| T1.3.3 | OpenAI Embedding API integration | P0 | 4h | Backend | T1.2.1 |
| T1.3.4 | Embedding generation service 実装 | P0 | 6h | Backend | T1.3.3 |
| T1.3.5 | Qdrant upsert (point insertion) | P0 | 4h | Backend | T1.3.4 |
| T1.3.6 | Background job: Embedding generation | P0 | 4h | Backend | T1.2.16, T1.3.5 |
| T1.3.7 | Unit tests: Embedding generation | P0 | 4h | QA | T1.3.4 |
| T1.3.8 | Integration test: Fragment → Qdrant | P0 | 4h | QA | T1.3.6 |

**Qdrant Setup**:

```rust
// src-tauri/src/services/qdrant_service.rs
use qdrant_client::{client::QdrantClient, qdrant::*};

pub struct QdrantService {
    client: QdrantClient,
}

impl QdrantService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let client = QdrantClient::from_url("http://localhost:6333").build()?;

        // Create collection if not exists
        let collections = client.list_collections().await?;
        let collection_exists = collections.collections.iter()
            .any(|c| c.name == "fragments");

        if !collection_exists {
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
        }

        Ok(Self { client })
    }

    pub async fn upsert_fragment(
        &self,
        fragment_id: &str,
        embedding: Vec<f32>,
        payload: FragmentPayload
    ) -> Result<(), String> {
        let points = vec![PointStruct {
            id: Some(fragment_id.into()),
            vectors: Some(embedding.into()),
            payload: serde_json::to_value(&payload)
                .map_err(|e| format!("Failed to serialize payload: {}", e))?,
        }];

        self.client.upsert_points_blocking("fragments", None, points, None).await
            .map_err(|e| format!("Failed to upsert points: {}", e))?;

        Ok(())
    }
}
```

**Deliverable**: Embedding生成→Qdrant保存パイプライン

**Quality Gate**:
- [ ] Embedding生成成功率 > 99%
- [ ] Qdrant upsert レイテンシ < 50ms
- [ ] Collection size 確認（100 fragments → ~150KB）

---

### Week 11-12: Semantic Search Implementation

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.3.9 | Semantic search service 実装 | P0 | 6h | Backend | T1.3.5 |
| T1.3.10 | Query embedding generation | P0 | 3h | Backend | T1.3.9 |
| T1.3.11 | Qdrant search with filters (user_id) | P0 | 4h | Backend | T1.3.9 |
| T1.3.12 | Result ranking & deduplication | P1 | 3h | Backend | T1.3.11 |
| T1.3.13 | Search API endpoint (Tauri command) | P0 | 4h | Backend | T1.3.11 |
| T1.3.14 | Unit tests: Search accuracy | P0 | 6h | QA | T1.3.11 |
| T1.3.15 | Performance test: Search < 150ms | P0 | 3h | QA | T1.3.11 |

**Search Service**:

```rust
// src-tauri/src/services/search_service.rs
use crate::services::{QdrantService, EmbeddingGenerator};

pub struct SearchService {
    qdrant: QdrantService,
    embedder: EmbeddingGenerator,
}

#[tauri::command]
pub async fn semantic_search(
    query: String,
    user_id: String,
    limit: u64,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<FragmentMatch>, String> {
    // 1. Generate query embedding
    let query_embedding = state.embedder.generate(&query).await?;

    // 2. Search in Qdrant with filters
    let search_result = state.qdrant.client.search_points(&SearchPoints {
        collection_name: "fragments".to_string(),
        vector: query_embedding,
        filter: Some(Filter {
            must: vec![Condition::matches("user_id", &user_id)],
        }),
        limit,
        with_payload: Some(WithPayloadSelector {
            selector_options: Some(SelectorOptions::Enable(true)),
        }),
        ..Default::default()
    }).await?;

    // 3. Map results
    let matches = search_result.result.iter().map(|point| {
        FragmentMatch {
            fragment_id: point.payload["fragment_id"].as_str().unwrap().to_string(),
            score: point.score,
            raw_text: point.payload["raw_text"].as_str().unwrap().to_string(),
            tags: point.payload["tags"].as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|v| v.as_str().unwrap().to_string())
                .collect(),
            created_at: point.payload["created_at"].as_i64().unwrap(),
        }
    }).collect();

    Ok(matches)
}
```

**Deliverable**: Semantic search API（150ms以内）

**Quality Gate**:
- [ ] Search precision: > 80% (手動評価)
- [ ] レイテンシ: P95 < 150ms
- [ ] Filter 動作確認（user_id, tags, date range）

---

## Milestone 1.4: Smart Recall UI (Month 4)

### Week 13-14: Search UI Implementation

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.4.1 | Search window UI 作成 | P0 | 6h | Frontend | T1.3.13 |
| T1.4.2 | Query input + submit ハンドリング | P0 | 3h | Frontend | T1.4.1 |
| T1.4.3 | Results display (リスト表示) | P0 | 6h | Frontend | T1.4.2 |
| T1.4.4 | Timeline visualization コンポーネント | P1 | 8h | Frontend | T1.4.3 |
| T1.4.5 | Loading & error states | P0 | 3h | Frontend | T1.4.2 |
| T1.4.6 | E2E test: Search flow | P0 | 4h | QA | T1.4.5 |

**UI Component**:

```tsx
// src/components/SmartRecall/SearchWindow.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FragmentMatch } from '@/types';

export function SearchWindow() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FragmentMatch[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (query.length < 2) return;

    setLoading(true);
    try {
      const matches = await invoke<FragmentMatch[]>('semantic_search', {
        query,
        userId: getUserId(), // From auth context
        limit: 20,
      });
      setResults(matches);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-window">
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="前回スランプの時どうした？"
          className="search-input"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? '検索中...' : '検索'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="search-results">
          <h3>{results.length} 件の結果</h3>
          <Timeline fragments={results} />
        </div>
      )}
    </div>
  );
}
```

**Deliverable**: Smart Recall UI（検索→結果表示）

**Quality Gate**:
- [ ] 検索レスポンス表示 < 2秒
- [ ] UI レスポンシブ動作確認
- [ ] E2E test PASS

---

### Week 15-16: Timeline Visualization & Polish

#### Tasks

| ID | Task | Priority | Effort | Owner | Dependencies |
|----|------|----------|--------|-------|--------------|
| T1.4.7 | Timeline component (時系列表示) | P0 | 8h | Frontend | T1.4.4 |
| T1.4.8 | Fragment card design (タグ、日時表示) | P1 | 6h | Design | T1.4.7 |
| T1.4.9 | Context summary generation (gpt-4.1-mini) | P1 | 6h | Backend | T1.3.13 |
| T1.4.10 | Summary display in UI | P1 | 4h | Frontend | T1.4.9 |
| T1.4.11 | UI polish & animations | P1 | 8h | Frontend | T1.4.8 |
| T1.4.12 | User testing (alpha users) | P0 | 16h | QA/PM | T1.4.11 |

**Timeline Component**:

```tsx
// src/components/SmartRecall/Timeline.tsx
import { FragmentMatch } from '@/types';
import { format } from 'date-fns';

interface TimelineProps {
  fragments: FragmentMatch[];
}

export function Timeline({ fragments }: TimelineProps) {
  // Group by date
  const groupedByDate = fragments.reduce((acc, frag) => {
    const date = format(new Date(frag.created_at * 1000), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(frag);
    return acc;
  }, {} as Record<string, FragmentMatch[]>);

  return (
    <div className="timeline">
      {Object.entries(groupedByDate).map(([date, frags]) => (
        <div key={date} className="timeline-date-group">
          <h4 className="timeline-date">{format(new Date(date), 'yyyy年MM月dd日')}</h4>
          <div className="timeline-fragments">
            {frags.map((frag) => (
              <FragmentCard key={frag.fragment_id} fragment={frag} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FragmentCard({ fragment }: { fragment: FragmentMatch }) {
  return (
    <div className="fragment-card">
      <p className="fragment-text">{fragment.raw_text}</p>
      <div className="fragment-meta">
        <div className="tags">
          {fragment.tags.map((tag) => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
        </div>
        <span className="timestamp">
          {format(new Date(fragment.created_at * 1000), 'HH:mm')}
        </span>
      </div>
    </div>
  );
}
```

**Deliverable**: Timeline UI完成、ユーザーテスト実施

**Quality Gate**:
- [ ] Timeline 表示パフォーマンス（100件表示 < 500ms）
- [ ] ユーザーテスト結果: 満足度 > 80%
- [ ] UI/UX 改善リスト作成

---

## Phase 1 Exit Criteria

### Technical Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Fragment 処理時間 (P95) | < 500ms | - | - |
| Search レイテンシ (P95) | < 150ms | - | - |
| エラー率 | < 1% | - | - |
| Overlay 表示レイテンシ | < 50ms | - | - |
| ホットキー反応率 | 100% | - | - |

### Business Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Alpha Users | 100名 | - | - |
| DAU | 100名 | - | - |
| 平均入力回数/日 | 10回 | - | - |
| 7日定着率 | > 40% | - | - |

### Quality Gates

- [ ] 全Unit tests PASS (coverage > 80%)
- [ ] 全Integration tests PASS
- [ ] 全E2E tests PASS
- [ ] Performance benchmarks 達成
- [ ] Security audit 完了（基本的な脆弱性チェック）
- [ ] User testing 結果レビュー完了
- [ ] Documentation 完成（API docs, User guide）

---

## Resource Requirements

### Team Structure (Phase 1)

| Role | FTE | Responsibilities |
|------|-----|------------------|
| **Backend Engineer (Rust)** | 1.0 | Tauri, Qdrant, OpenAI integration |
| **Frontend Engineer (React)** | 0.5 | UI implementation, Tauri API calls |
| **AI/ML Engineer** | 0.3 | Prompt engineering, model selection |
| **QA Engineer** | 0.5 | Test automation, performance testing |
| **DevOps Engineer** | 0.2 | CI/CD, deployment, monitoring |
| **Designer (UI/UX)** | 0.3 | Overlay UI, Timeline design |
| **Product Manager** | 0.5 | Roadmap, user testing, metrics |

**Total FTE**: 3.3

### Infrastructure Costs (Phase 1)

| Service | Cost/Month | Notes |
|---------|------------|-------|
| Neon PostgreSQL (Free tier) | $0 | 0.5GB storage limit |
| OpenAI API (gpt-4.1-mini) | ~$130 | 10,000 fragments/month |
| Qdrant (self-hosted) | $0 | Local embedded mode |
| GitHub (Team plan) | $4/user | CI/CD minutes included |
| Sentry (Developer plan) | $26 | Error tracking |
| **Total** | **~$160/month** | For 100 alpha users |

---

## Next Steps

1. **Milestone 1.1 Kickoff Meeting** (Week 1 Monday)
   - Team onboarding
   - Environment setup
   - Task assignment

2. **Weekly Sync** (Every Friday)
   - Progress review
   - Blocker resolution
   - Next week planning

3. **Sprint Demo** (End of each milestone)
   - Stakeholder demo
   - Feedback collection
   - Backlog refinement

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-24
**Next Review**: End of Week 4 (Milestone 1.1 completion)

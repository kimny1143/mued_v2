# MUEDnote Phase 1.1 → Session/Interview 移行 影響範囲分析レポート

**作成日**: 2025-11-19
**対象**: MUED LMS v2 - MUEDnote 機能（Phase 1.1）
**目的**: Session/Interview 機能への移行時の影響範囲を特定

---

## エグゼクティブサマリー

### 移行の難易度: **中程度**

現在の Phase 1.1 実装は比較的モダンで、以下の点で移行に有利:

- ✅ API層とUI層の明確な分離
- ✅ データベーススキーマが既に `chat-system.ts` で設計されている
- ✅ 少ないコンポーネント数（6個）
- ✅ 既存データ（log_entries）との関係を考慮した設計

### 移行時の主要課題: **2つ**

1. **既存データ（log_entries）との共存戦略**
   - 374万+ ユーザーのPh1.1ログをどう扱うか
   - Session/Interview と log_entries の分離または統合

2. **AI応答フロー の変更**
   - 現在: リアルタイムストリーミング → 保存
   - 提案: Session → Message → Memory への多段階フロー

---

## 1. データベーススキーマ分析

### 1.1 現在の実装（Phase 1.1）

**主テーブル: `log_entries`**

```
log_entries
├─ id: UUID (PK)
├─ user_id: UUID (FK → users)
├─ type: ENUM [lesson|practice|creation|reflection|system|ear_training|structure_analysis]
├─ content: TEXT (ユーザー入力のMarkdown)
├─ ai_summary: JSONB {
│   ├─ formatted?: string
│   ├─ tags?: string[]
│   ├─ comment?: string
│   ├─ keyPoints?: string[]
│   ├─ improvements?: string[]
│   ├─ emotionalTone?: string
│   └─ technicalInsights?: string[]
│ }
├─ tags: JSONB (string[]) - AI+ユーザータグ
├─ difficulty: TEXT [easy|medium|hard|very_hard]
├─ emotion: TEXT - ユーザー感情
├─ attachments: JSONB
├─ is_public: BOOLEAN
├─ share_with_mentor: BOOLEAN
├─ created_at: TIMESTAMP
└─ updated_at: TIMESTAMP
```

**インデックス**: 7個
- idx_log_entries_user
- idx_log_entries_type
- idx_log_entries_target (target_id, target_type)
- idx_log_entries_created_at (DESC)
- idx_log_entries_user_created (user_id, created_at DESC)
- idx_log_entries_public
- idx_log_entries_tags_gin (GIN index for JSONB)

### 1.2 将来の実装（Session/Interview 対応）

**新テーブル群: `chat-system.ts` で既に定義済み**

```
chatSessions (新)
├─ id: UUID
├─ user_id: UUID
├─ title?: string
├─ summary: JSONB (SessionSummary)
├─ is_active: BOOLEAN
├─ is_pinned: BOOLEAN
├─ message_count: INTEGER
├─ last_message_at: TIMESTAMP
└─ metadata: timestamps

chatMessages (新)
├─ id: UUID
├─ session_id: UUID (FK)
├─ user_id: UUID
├─ role: ENUM [user|assistant|system]
├─ content: TEXT
├─ processed_content?: TEXT
├─ tags: JSONB (string[])
├─ metadata: JSONB (MessageMetadata)
├─ parent_message_id?: UUID
├─ is_edited: BOOLEAN
└─ created_at: TIMESTAMP

userAIProfiles (新)
├─ user_id: UUID (unique)
├─ personality_preset: ENUM
├─ response_length: ENUM
├─ formalityLevel: INTEGER
├─ questionFrequency: INTEGER
└─ [15+ カスタマイズ項目]

userAIMemories (新)
├─ user_id: UUID
├─ memory_type: ENUM [preference|pattern|feedback|knowledge]
├─ key: TEXT
├─ value: JSONB
├─ confidence: DECIMAL (0.00-1.00)
├─ frequency: INTEGER
└─ source_session_id: UUID

sessionTags (新)
├─ session_id: UUID
├─ tag: TEXT
└─ frequency: INTEGER
```

### 1.3 スキーマ互換性分析

| 項目 | log_entries | chatSessions/Messages | 互換性 | 移行策 |
|------|------------|---------------------|--------|--------|
| ユーザーID | ✓ | ✓ | 直接対応 | FK互換 |
| コンテンツ | content (TEXT) | chatMessages.content | 互換 | カラム直接コピー |
| タグ | JSONB配列 | JSONB配列 | 互換 | sessionTags へ正規化 |
| AI要約 | aiSummary (JSON) | chatMessages.metadata | 部分互換 | MessageMetadata に変換 |
| 感情/難易度 | emotion, difficulty | metadata に入る | 互換 | metadata へ移行 |
| プライバシー | is_public, share_with_mentor | chatSessions に追加 | 要追加 | マイグレーション必要 |
| タイムスタンプ | created_at, updated_at | created_at, edited_at | ほぼ互換 | updated_at 追加検討 |

**結論**: 既存 `log_entries` は「読み取り専用アーカイブ」として保持可能。新規記録は `chatSessions/Messages` に保存。

---

## 2. API エンドポイント分析

### 2.1 現在の実装（Phase 1.1）

**4つのエンドポイント**

```
POST   /api/muednote/chat         [ストリーミング]
  入力: { messages: UIMessage[] }
  出力: stream (AI SDK v5: toUIMessageStreamResponse)
  機能: OpenAI GPT-4o-mini でストリーミング応答
  -----
  依存: @ai-sdk/openai
  モデル: gpt-4o-mini (低コスト・高速)
  システムプロンプト: 整形 + タグ + 追加質問 (Phase 1.1)

POST   /api/muednote/save         [同期]
  入力: {
    userMessage: string
    aiResponse: string
    formatted?: string
    tags?: string[]
    comment?: string
  }
  出力: { success: true, logEntry: { id, createdAt } }
  機能: log_entries に保存
  -----
  実装: Drizzle ORM insert
  ランタイム: Edge (高速)
  戻り値: 新規作成されたエントリID

GET    /api/muednote/logs         [同期]
  入力: ?limit=20&offset=0&tags=tag1,tag2
  出力: { entries: LogEntry[], pagination: {...} }
  機能: ユーザーのログエントリを時系列取得
  -----
  フィルタ: tags（AND条件 = 全タグを含むエントリのみ）
  実装: JSONB containment operator (@>)
  maxLimit: 100

GET    /api/muednote/tags         [同期]
  入力: なし
  出力: { tags: Array<{ name: string; count: number }> }
  機能: ユーザーが使用したタグを集計
  -----
  実装: PostgreSQL jsonb_array_elements_text + GROUP BY
  出力: count降順, tag名昇順
```

### 2.2 新エンドポイント（Session/Interview 対応）

**推奨: 4つの新エンドポイント + 既存保持**

```
POST   /api/sessions              [同期]
  機能: セッション作成
  入力: { title?: string, initialMessage?: string }
  出力: { session: ChatSession }

GET    /api/sessions/{id}/messages [同期+ページネーション]
  機能: セッションのメッセージ取得
  入力: ?limit=50&offset=0
  出力: { messages: ChatMessage[], pagination }

POST   /api/sessions/{id}/messages [ストリーミング]
  機能: メッセージ送信 + AI応答
  入力: { content: string }
  出力: stream (AIメッセージ)
  副作用: userAIMemories に学習内容を記録

PATCH  /api/sessions/{id}          [同期]
  機能: セッション更新（アーカイブなど）
  入力: { title?: string, is_active?: boolean, is_pinned?: boolean }

GET    /api/muednote/logs         [互換性維持]
  機能: 既存エンドポイントは「ハイブリッドモード」で動作
  戻り値: log_entries + chatSessions の統合ビュー
```

### 2.3 エンドポイント移行マトリックス

| エンドポイント | 廃止 | 新規 | 互換維持 | 難易度 | 優先度 |
|-------------|------|------|--------|--------|--------|
| POST /api/muednote/chat | ✓ (廃止) |  | - | 中 | P1 |
| POST /api/muednote/save | ✓ (廃止) |  | - | 中 | P1 |
| GET /api/muednote/logs | - | - | ✓ (ハイブリッド) | 高 | P1 |
| GET /api/muednote/tags | - | - | ✓ (互換) | 低 | P3 |
| POST /api/sessions | - | ✓ | - | 低 | P1 |
| GET /api/sessions/{id}/messages | - | ✓ | - | 低 | P1 |
| POST /api/sessions/{id}/messages | - | ✓ | - | 中 | P1 |
| PATCH /api/sessions/{id} | - | ✓ | - | 低 | P2 |

**主要な廃止理由**:
- `/api/muednote/chat`: ストリーミングレスポンス → Session作成
- `/api/muednote/save`: 保存ロジック → POST /api/sessions/{id}/messages に統合

---

## 3. React コンポーネント分析

### 3.1 現在の実装（6コンポーネント）

```
components/features/muednote/
├─ ChatContainer.tsx          [465行 - クライアントコンポーネント]
│  ├─ 責務: メインチャットロジック、AI SDK統合
│  ├─ State: 
│  │  ├─ input: string (入力状態)
│  │  ├─ messages: UIMessage[] (会話履歴)
│  │  ├─ status: 'idle'|'submitted'|'streaming'
│  │  └─ onFinish: DBに保存
│  └─ 依存: useChat (AI SDK v5)
│
├─ ChatMessage.tsx            [86行]
│  ├─ 責務: 個別メッセージ表示
│  ├─ 機能: 
│  │  ├─ ユーザー/AIアイコン表示
│  │  ├─ 追加質問の黄色背景ハイライト
│  │  ├─ メッセージテキスト表示
│  │  └─ Tag表示（未実装、TODOあり）
│  └─ Props: message: UIMessage, role, metadata
│
├─ ChatInput.tsx              [68行]
│  ├─ 責務: テキスト入力フォーム
│  ├─ 機能:
│  │  ├─ Enterで送信、Shift+Enterで改行
│  │  ├─ 送信中に無効化
│  │  └─ UX心理学（ドハティの閾値対応）
│  └─ Props: input, handleInputChange, handleSubmit, isLoading
│
├─ TimelineContainer.tsx      [168行]
│  ├─ 責務: ログエントリのタイムライン表示
│  ├─ State:
│  │  ├─ entries: LogEntry[] (ページネーション対応)
│  │  ├─ selectedTags: string[]
│  │  ├─ pagination: offset/limit/hasMore
│  │  └─ isLoading, isLoadingMore
│  ├─ 機能:
│  │  ├─ /api/muednote/logs からフェッチ
│  │  ├─ タグフィルタ動的リロード
│  │  ├─ 無限スクロール（もっと見るボタン）
│  │  └─ empty state表示
│  └─ 子: TimelineEntry, TagFilter
│
├─ TimelineEntry.tsx          [97行]
│  ├─ 責務: 個別ログエントリの表示
│  ├─ 表示項目:
│  │  ├─ 日時（フォーマット済み）
│  │  ├─ オリジナルコンテンツ
│  │  ├─ AI整形後テキスト
│  │  ├─ タグ（#付き）
│  │  └─ AIコメント
│  ├─ 特徴:
│  │  ├─ 最新エントリは「最新」バッジ表示
│  │  ├─ AIサマリから情報抽出
│  │  └─ ホバー効果
│  └─ Props: entry: LogEntry, isLatest?: boolean
│
└─ TagFilter.tsx              [99行]
   ├─ 責務: タグフィルタUIコンポーネント
   ├─ State:
   │  ├─ tags: Array<{ name, count }>
   │  └─ isLoading
   ├─ 機能:
   │  ├─ /api/muednote/tags からフェッチ
   │  ├─ Badgeをクリックして選択/解除
   │  ├─ クリアボタンで一括解除
   │  └─ empty state
   └─ Props: selectedTags, onTagsChange
```

### 3.2 コンポーネント再利用可能性分析

| コンポーネント | 再利用可能性 | 対象新機能 | 修正必要度 | 優先度 |
|-------------|----------|---------|----------|--------|
| ChatContainer | 高 | Session/Interview管理 | **リファクタ必須** | P1 |
| ChatMessage | 高 | メッセージ表示 | **最小限** | P2 |
| ChatInput | 高 | メッセージ入力 | **最小限** | P2 |
| TimelineContainer | 中 | タイムライン + セッション履歴 | **統合・拡張** | P1 |
| TimelineEntry | 中 | セッション/ログ表示切替 | **条件分岐追加** | P2 |
| TagFilter | 中 | セッションタグフィルタ | **統合** | P2 |

### 3.3 ChatContainer リファクタ戦略（最重要）

**現在の流れ**:
```
useChat → messages
  ↓
onFinish → parseAIResponse
  ↓
fetch('/api/muednote/save')
```

**新しい流れ（推奨）**:
```
useChat → messages
  ↓
onFinish → (sessionId 確認)
  ↓
fetch('/api/sessions/{sessionId}/messages') [POST]
  ↓
自動でメモリ + タグ記録
```

**リファクタ項目**:

1. **useChat の置き換え** (必須)
   ```typescript
   // 削除:
   - useChat の transport: DefaultChatTransport
   
   // 追加:
   - useState<ChatSession> for current session
   - useCallback for session creation
   ```

2. **onFinish ロジック の簡略化** (必須)
   ```typescript
   // 削除:
   - parseAIResponse() [個別メッセージ単位の解析]
   
   // 追加:
   - session.summary.mainTopics 自動更新
   - userAIMemories への非同期保存
   ```

3. **セッション管理の追加** (必須)
   ```typescript
   // 新規追加:
   - SessionSelector (ドロップダウン)
   - createNewSession() ボタン
   - sessionList sidebar
   ```

---

## 4. データフロー分析

### 4.1 現在のフロー（Phase 1.1）

```
┌─────────────────────────────────────────────────────────┐
│                    MUEDnote Phase 1.1                    │
└─────────────────────────────────────────────────────────┘

[ChatContainer]
    │
    ├─→ useChat(...) { AI SDK v5 }
    │        │
    │        ├─→ POST /api/muednote/chat (ストリーミング)
    │        │        │
    │        │        ├─→ OpenAI (gpt-4o-mini) [Edge Runtime]
    │        │        │
    │        │        └─→ 整形 + タグ + コメント + 追加質問
    │        │
    │        └─→ messages: UIMessage[]
    │
    └─→ onFinish event
             │
             ├─→ parseAIResponse(aiText)
             │        │
             │        ├─ 【質問】セクション抽出
             │        ├─ 【整形後】セクション抽出
             │        ├─ 【タグ】セクション抽出
             │        └─ 【コメント】セクション抽出
             │
             └─→ POST /api/muednote/save
                      │
                      ├─→ logEntries.insert()
                      │
                      └─→ { id, createdAt }

[TimelineContainer]
    │
    ├─→ useEffect + loadEntries()
    │        │
    │        ├─→ GET /api/muednote/logs?tags=...
    │        │        │
    │        │        └─→ logEntries.select() + タグフィルタ
    │        │
    │        └─→ entries: LogEntry[] + pagination
    │
    └─→ TimelineEntry × entries.length
             │
             └─→ aiSummary 情報を表示

[TagFilter]
    │
    ├─→ useEffect + fetchTags()
    │        │
    │        └─→ GET /api/muednote/tags
    │                 │
    │                 └─→ jsonb_array_elements_text + COUNT
    │
    └─→ Badge × tags.length
             │
             └─→ onClick → TimelineContainer.setSelectedTags()
```

### 4.2 新しいフロー（Session/Interview 対応推奨）

```
┌──────────────────────────────────────────────────────────────┐
│          MUEDnote Session/Interview Phase 2.0                 │
└──────────────────────────────────────────────────────────────┘

[SessionSelector]
    │
    ├─→ GET /api/sessions
    │        └─→ chatSessions で活動中のセッション一覧
    │
    └─→ onClick → create new session
             │
             └─→ POST /api/sessions
                      │
                      └─→ chatSessions.insert()

[ChatContainer] (リファクタ版)
    │
    ├─→ currentSession 状態管理
    │
    └─→ useChat(...) { AI SDK v5 }
             │
             ├─→ POST /api/sessions/{sessionId}/messages (ストリーミング)
             │        │
             │        ├─→ OpenAI (gpt-5-mini or Claude Sonnet 4.5)
             │        │        │
             │        │        └─→ 整形 + タグ + コメント
             │        │
             │        └─→ chatMessages.insert()
             │                 │
             │                 ├─→ content (ユーザー入力)
             │                 ├─→ processedContent (AI整形)
             │                 ├─→ tags (配列)
             │                 └─→ metadata (MessageMetadata)
             │
             └─→ onFinish event
                      │
                      ├─→ Session.summary 更新
                      │        ├─ mainTopics
                      │        ├─ keyInsights
                      │        └─ actionItems
                      │
                      └─→ userAIMemories に記録 (非同期)
                               │
                               ├─ memory_type: 'pattern'|'feedback'
                               ├─ key: トピック名
                               ├─ value: 学習内容
                               ├─ confidence: 0.0-1.0
                               └─ source_session_id: 現在のセッションID

[SessionTimeline] (TimelineContainer 拡張版)
    │
    ├─→ GET /api/sessions (アクティブなセッション)
    │        └─→ chatSessions + sessionTags
    │
    ├─→ GET /api/sessions/{id}/messages (ページネーション)
    │        └─→ chatMessages.select()
    │
    └─→ SessionCard × sessions.length
             │
             ├─→ SessionSummary 表示（mainTopics, keyInsights）
             ├─→ メッセージプレビュー
             └─→ タグフィルタ

[Memory Sidebar] (新機能)
    │
    ├─→ GET /api/users/{id}/ai-memories
    │        └─→ userAIMemories.select()
    │
    └─→ MemoryCard × memories.length
             │
             ├─→ memory_type: preference|pattern|feedback|knowledge
             ├─→ confidence スコア表示
             └─→ 関連セッションへのリンク
```

### 4.3 AI SDK 統合の変更点

| 項目 | Phase 1.1 | Phase 2.0 | 影響 |
|------|-----------|----------|------|
| **モデル** | GPT-4o-mini | GPT-5-mini (本番) + Claude Sonnet (管理者) | 互換性維持 |
| **ストリーミング** | chatMessages に流し込み | chatMessages.processedContent に保存 | コンテンツ二重保存 |
| **システムプロンプト** | 固定（getMUEDnoteSystemPrompt） | userAIProfiles.personality_preset で動的 | カスタマイズ化 |
| **レスポンス解析** | クライアント側 parseAIResponse | サーバー側メタデータ抽出 | 処理移行 |
| **メモリ学習** | なし | userAIMemories に自動記録 | 機能追加 |
| **会話コンテキスト** | 単一メッセージ | Session全体でコンテキスト保持 | UX向上 |

---

## 5. 既存データ（log_entries）への対応戦略

### 5.1 マイグレーション戦略

**推奨: ハイブリッドアプローチ**

```
フェーズ1: 既存 log_entries をそのまま保持（読み取り専用）
├─ 理由: 既存ユーザーの履歴喪失を防止
├─ 期限: Phase 2.0 移行後 6ヶ月
└─ 影響: タイムラインで log_entries + chatSessions を統合表示

フェーズ2: 新規記録は chatSessions/Messages に全て保存
├─ 理由: Session/Interview 機能は新アーキテクチャ
├─ 開始: Phase 2.0 リリース日
└─ 影響: API /api/muednote/logs は両方のテーブルからフェッチ

フェーズ3: log_entries → chatSessions マイグレーション（オプション）
├─ 方法: 
│  ├─ log_entries に対してバッチマイグレーション
│  ├─ 各エントリを "archive" セッションに変換
│  └─ sessionTags に tags をコピー
├─ 実行時期: Phase 2.1 以降（ユーザーが少ないタイミング）
└─ ロールバック計画: log_entries をアーカイブテーブルに複製

フェーズ4: log_entries 削除（1年後）
├─ 条件:
│  ├─ 全ユーザーが新システム移行完了
│  ├─ バックアップ確認完了
│  └─ 監査ログで確認可能
├─ スケジュール: 2027年Q1以降
└─ 注意: 法的コンプライアンス確認必須
```

### 5.2 データマッピング定義

```typescript
// log_entries → chatSessions の変換ロジック

interface LogEntryToSessionMapping {
  logEntry: LogEntry;
  
  session = {
    id: uuid(),
    user_id: logEntry.user_id,
    title: logEntry.ai_summary?.formatted?.substring(0, 100) || 'Archive',
    summary: {
      mainTopics: extractTopics(logEntry.ai_summary),
      keyInsights: logEntry.ai_summary?.keyPoints || [],
      actionItems: logEntry.ai_summary?.improvements || [],
      emotionalTone: logEntry.emotion || 'neutral',
      progressIndicators: []
    },
    is_active: false,  // アーカイブ
    is_pinned: false,
    message_count: 1,
    last_message_at: logEntry.created_at,
    created_at: logEntry.created_at,
    updated_at: logEntry.updated_at
  };
  
  message = {
    id: uuid(),
    session_id: session.id,
    user_id: logEntry.user_id,
    role: 'user',
    content: logEntry.content,
    processed_content: logEntry.ai_summary?.formatted,
    tags: logEntry.tags || [],
    metadata: {
      source: 'migrated_from_log_entries',
      original_log_id: logEntry.id,
      difficulty: logEntry.difficulty,
      emotion: logEntry.emotion,
      attachments: logEntry.attachments
    },
    created_at: logEntry.created_at
  };
  
  // AI応答メッセージも作成（オプション）
  aiMessage?: {
    id: uuid(),
    session_id: session.id,
    role: 'assistant',
    content: logEntry.ai_summary?.formatted || '',
    tags: logEntry.tags || [],
    metadata: {
      comment: logEntry.ai_summary?.comment,
      keyPoints: logEntry.ai_summary?.keyPoints,
      improvements: logEntry.ai_summary?.improvements,
      technicalInsights: logEntry.ai_summary?.technicalInsights
    },
    created_at: new Date(logEntry.created_at.getTime() + 1000)  // 1秒後
  };
  
  sessionTags = logEntry.tags?.map(tag => ({
    id: uuid(),
    session_id: session.id,
    tag: tag,
    frequency: 1,
    created_at: logEntry.created_at
  })) || [];
}
```

### 5.3 タイムラインUIの統合戦略

```typescript
// GET /api/muednote/logs (ハイブリッド版)

export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  const showArchived = url.searchParams.get('archived') === 'true';

  // Phase 1.1: log_entries から取得
  const legacyEntries = await db
    .select()
    .from(logEntries)
    .where(eq(logEntries.userId, session.userId))
    .orderBy(desc(logEntries.createdAt))
    .limit(20);

  // Phase 2.0: chatSessions から取得
  const newSessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, session.userId))
    .orderBy(desc(chatSessions.lastMessageAt))
    .limit(20);

  // 統合ビュー（降順）
  const unified = mergeLegacyAndNew(legacyEntries, newSessions, {
    showArchived
  });

  return NextResponse.json({
    entries: unified,
    source: 'hybrid' // クライアント側で異なるUIで表示
  });
}
```

---

## 6. 破壊的変更（Breaking Changes）の範囲

### 6.1 ユーザー向けの変更（UX層）

| 変更 | 影響 | 推奨対応 |
|------|------|--------|
| チャットUI統一 | 既存UIと類似 | 互換性高い |
| セッション概念の導入 | ユーザーが「セッション」を意識 | チュートリアル追加 |
| タグの自動正規化 | タグが自動グループ化 | 既存タグはそのまま保持 |
| メモリシステム | ユーザーの学習記録が自動分析 | プライバシーポリシー更新 |
| マイメモリページ | 新機能（AI学習内容の可視化） | オプション機能で提供 |

### 6.2 開発者向けの変更（API層）

**廃止予定API**:

```
❌ POST /api/muednote/chat
   → 代替: POST /api/sessions/{id}/messages (ストリーミング)
   
❌ POST /api/muednote/save
   → 代替: 保存ロジックは POST .../messages に統合
   
⚠️ GET /api/muednote/logs
   → 変更: ハイブリッドレスポンス (source: 'hybrid')
```

**新規API**:

```
✅ POST /api/sessions
✅ GET /api/sessions
✅ PATCH /api/sessions/{id}
✅ DELETE /api/sessions/{id}
✅ GET /api/sessions/{id}/messages
✅ POST /api/sessions/{id}/messages
✅ GET /api/users/{id}/ai-memories
✅ PATCH /api/users/{id}/ai-profile
```

### 6.3 コンポーネント API の変更

```typescript
// Phase 1.1
<ChatContainer />
  // props: なし（内部で全て管理）

// Phase 2.0
<ChatContainer sessionId={string} onSessionChange={callback} />
  // props: sessionId 必須、コールバック追加

// Phase 1.1
<TimelineContainer />

// Phase 2.0
<TimelineContainer mode="hybrid" showArchived={boolean} />
  // props: ハイブリッド表示制御
```

---

## 7. 移行スケジュール（推奨）

### 7.1 Phase 2.0 タイムライン

```
Week 1-2: 設計 + スキーマ検証
├─ chat-system.ts マイグレーション実行
├─ chatSessions, chatMessages, userAIProfiles テーブル作成
└─ userAIMemories テーブル作成

Week 3-4: API実装
├─ POST /api/sessions エンドポイント開発
├─ POST /api/sessions/{id}/messages 開発（ストリーミング対応）
├─ GET /api/muednote/logs ハイブリッド化
└─ userAIMemories 自動記録ロジック実装

Week 5-6: フロントエンド実装
├─ ChatContainer リファクタ
├─ SessionSelector コンポーネント新規開発
├─ SessionTimeline コンポーネント拡張
└─ MemorySidebar コンポーネント新規開発

Week 7: テスト + QA
├─ E2E テスト作成 (Playwright)
├─ マイグレーション検証
└─ パフォーマンステスト

Week 8: リリース準備
├─ ロールアウト計画策定
├─ フェイルセーフ機能実装
└─ ユーザー向けドキュメント作成
```

### 7.2 ロールアウト戦略

```
フェーズ2.0 α (内部テスト)
├─ 対象: 開発チーム + 5-10名のベータテスター
├─ 期間: 1-2週間
└─ 目標: 重大バグ検出

フェーズ2.0 β (段階的リリース)
├─ Week 1: 10% ユーザー → 機能フラグで有効化
├─ Week 2: 25% ユーザー
├─ Week 3: 50% ユーザー
└─ Week 4: 100% ユーザー（ロールバック計画維持）

フェーズ2.0 GA (一般提供)
├─ 対象: 全ユーザー
├─ サポート: 24/7
└─ 期限: フルロールアウト完了から 2週間後にフラグ削除

フェーズ2.1 (最適化 + 機能追加)
├─ 期間: GA後 4-6週間
├─ 内容: 
│  ├─ パフォーマンス最適化
│  ├─ ユーザーフィードバック反映
│  └─ ログエントリマイグレーション開始
└─ ロールバック戦略: 解除（安定確認）
```

---

## 8. リスク分析と緩和策

### 8.1 高リスク項目

| リスク | 影響度 | 発生確率 | 対応 |
|------|-------|--------|------|
| **既存ユーザーの過去ログ喪失** | 極大 | 中 | ハイブリッド表示で回避 |
| **AI応答品質低下** | 大 | 低 | モデル比較テスト実施 |
| **セッション取得のN+1問題** | 大 | 中 | バッチロード + キャッシング |
| **ストリーミングレスポンス遅延** | 中 | 中 | Edge Runtime継続 + CDN最適化 |
| **userAIMemories の不正確性** | 中 | 高 | confidence スコア + 手動編集機能 |

### 8.2 緩和策（実装必須）

```typescript
// 1. データロール バック計画
const rollbackPlan = {
  // chatSessions, chatMessages は完全削除可能（新規データ）
  // log_entries は変更なし（既存アーカイブ）
  backupStrategy: 'daily snapshot to S3',
  recoveryTime: '< 4 hours',
  testFrequency: 'weekly dry run'
};

// 2. ハイブリッド表示の完全サポート
const hybridView = {
  // 既存ユーザーには log_entries + 新規セッション混在表示
  mergeStrategy: 'chronological union',
  sourceIndicator: 'visible badge (Archive vs Session)',
  filterOptions: {
    showArchived: true,   // デフォルト on
    showNewSessions: true
  }
};

// 3. フィーチャーフラグによる段階的リリース
const featureFlags = {
  useNewChatSystem: {
    default: false,
    rolloutPercentage: 10, // 段階的に増加
    skipList: []  // トラブルユーザーを除外
  }
};

// 4. エラーハンドリング強化
const fallback = {
  // chatSessions API がダウン → log_entries フォールバック
  onSessionServiceDown: () => redirectToLegacyLogs(),
  // AI 応答失敗 → ユーザーに明確なメッセージ
  onAIResponseError: () => showRetryableError()
};
```

---

## 9. 完全な変更範囲サマリー

### 9.1 ファイル変更マトリックス

```
DATABASE LAYER
├─ db/schema/log-entries.ts         [変更なし] 読み取り専用保持
├─ db/schema/chat-system.ts         [NEW] 統合既定義 → マイグレーション実行
├─ db/migrations/0009_...           [変更なし] 既存
├─ db/migrations/0010_chat_system   [NEW] chatSessions等作成
└─ db/edge.ts                       [変更なし] 互換性維持

API LAYER
├─ app/api/muednote/chat/route.ts        [廃止予定] → API 削除
├─ app/api/muednote/save/route.ts        [廃止予定] → API 削除
├─ app/api/muednote/logs/route.ts        [変更] ハイブリッド化
├─ app/api/muednote/tags/route.ts        [変更なし] 互換性維持
├─ app/api/sessions/route.ts             [NEW] セッション CRUD
├─ app/api/sessions/[id]/messages/route.ts [NEW] メッセージ管理
└─ app/api/users/[id]/ai-memories/route.ts [NEW] メモリ管理

COMPONENT LAYER
├─ components/features/muednote/ChatContainer.tsx   [大幅変更] リファクタ
├─ components/features/muednote/ChatMessage.tsx     [微変更] Props追加
├─ components/features/muednote/ChatInput.tsx       [変更なし] 再利用可
├─ components/features/muednote/TimelineContainer.tsx [拡張] ハイブリッド対応
├─ components/features/muednote/TimelineEntry.tsx   [微変更] 条件表示
├─ components/features/muednote/TagFilter.tsx       [変更なし] 再利用可
├─ components/features/sessions/SessionSelector.tsx [NEW] セッション選択
├─ components/features/sessions/SessionTimeline.tsx [NEW] セッションビュー
└─ components/features/memories/MemorySidebar.tsx   [NEW] メモリ表示

PAGE LAYER
├─ app/muednote/page.tsx                [変更] ChatContainer Props更新
├─ app/muednote/timeline/page.tsx       [変更] ハイブリッド表示
├─ app/sessions/page.tsx                [NEW] セッション一覧
└─ app/sessions/[id]/page.tsx           [NEW] セッション詳細

TEST LAYER
├─ e2e/muednote-phase1.spec.ts          [変更] 新APIテスト追加
├─ e2e/sessions.spec.ts                 [NEW] セッション E2E テスト
├─ e2e/ai-memories.spec.ts              [NEW] メモリ E2E テスト
└─ lib/__tests__/...                    [NEW] ユニットテスト拡充
```

### 9.2 外部依存関係の変更

```
削除:
  - なし（AI SDK v5 は継続）

追加:
  - 新しいSessionメモリ管理ロジック
  - userAIMemories の confidence スコア計算ロジック
  - Session summary生成ロジック

変更なし:
  - @ai-sdk/openai (互換性維持)
  - drizzle-orm (クエリ追加のみ)
  - shadcn/ui (コンポーネント新規、既存は互換)
```

---

## 10. 実装優先度（推奨順）

### Phase 2.0 リリース最小セット（MVP）

| # | 項目 | 努力度 | リスク | 優先度 |
|---|-----|-------|-------|--------|
| 1 | chatSessions テーブル作成 + マイグレーション | 低 | 低 | P0 |
| 2 | chatMessages テーブル作成 | 低 | 低 | P0 |
| 3 | POST /api/sessions エンドポイント | 低 | 低 | P0 |
| 4 | POST /api/sessions/{id}/messages (ストリーミング) | 高 | 中 | P0 |
| 5 | ChatContainer リファクタ | 高 | 高 | P0 |
| 6 | GET /api/muednote/logs ハイブリッド化 | 中 | 中 | P1 |
| 7 | SessionSelector コンポーネント | 中 | 低 | P1 |
| 8 | TimelineContainer ハイブリッド対応 | 中 | 低 | P1 |
| 9 | E2E テスト作成 | 中 | 中 | P1 |
| 10 | ロールアウト計画 + ドキュメント | 低 | 低 | P2 |

### Phase 2.1 以降（拡張機能）

- userAIProfiles テーブル + カスタマイズUI
- userAIMemories テーブル + MemorySidebar
- ログエントリマイグレーション バッチジョブ
- Session共有機能
- 高度な検索・フィルタリング

---

## 結論

**移行難易度**: 中程度（コンポーネント数が少ない、スキーマが設計済み）

**予想工数**: 4-6週間（4人チーム）

**主要な課題**:
1. ChatContainer のリファクタリング（UI + ロジック）
2. 既存ログエントリ（log_entries）との並存戦略
3. ハイブリッド表示の実装品質

**推奨アプローチ**:
- ハイブリッド アーキテクチャで既存ユーザーの履歴を保護
- 機能フラグを使った段階的なロールアウト
- 新API設計は既に整備済み（chat-system.ts）であるため実装に専念可能

**成功要因**:
- 充分な E2E テスト
- 綿密なロールアウト計画
- ユーザーコミュニケーション（チュートリアル + ドキュメント）


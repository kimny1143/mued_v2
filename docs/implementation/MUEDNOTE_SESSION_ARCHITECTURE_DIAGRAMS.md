# MUEDnote Session/Interview アーキテクチャ図解

**バージョン**: 1.0.0
**作成日**: 2025-11-19
**関連**: MUEDNOTE_SESSION_INTERVIEW_IMPLEMENTATION_PLAN.md

---

## 1. システム全体構成図

### 1.1 レイヤー別アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  ChatUI      │  │ SessionUI    │  │ InterviewUI  │         │
│  │              │  │              │  │              │         │
│  │ • ChatInput  │  │ • SessionList│  │ • QuestionCard│        │
│  │ • Messages   │  │ • CreateModal│  │ • AnswerInput │        │
│  │ • Timeline   │  │ • SessionCard│  │ • History     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                          API Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │/api/sessions │  │/api/interview│  │/api/analyzer │         │
│  │              │  │              │  │              │         │
│  │ • GET /      │  │ • POST /q's  │  │ • POST /     │         │
│  │ • POST /     │  │ • POST /ans  │  │   analyze    │         │
│  │ • GET /:id   │  │ • GET /hist  │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Business Logic
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Session      │  │ Analyzer     │  │ Interviewer  │         │
│  │ Service      │  │ Service      │  │ Service      │         │
│  │              │  │              │  │              │         │
│  │ • create     │  │ • analyze    │  │ • generate   │         │
│  │ • list       │  │ • extract    │  │ • save       │         │
│  │ • getDetails │  │ • fallback   │  │ • templates  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │ RAG          │  │ AI           │                           │
│  │ Service      │  │ Processor    │                           │
│  │              │  │ Service      │                           │
│  │ • embed      │  │ • format     │                           │
│  │ • search     │  │ • tag        │                           │
│  │ • templates  │  │ • comment    │                           │
│  └──────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Data Access
┌─────────────────────────────────────────────────────────────────┐
│                      Repository Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Session      │  │ Interview    │  │ RAG          │         │
│  │ Repository   │  │ Repository   │  │ Repository   │         │
│  │              │  │              │  │              │         │
│  │ • create     │  │ • createQ    │  │ • create     │         │
│  │ • findById   │  │ • createA    │  │ • search     │         │
│  │ • findMany   │  │ • findBySession│ │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Drizzle ORM
┌─────────────────────────────────────────────────────────────────┐
│                       Database Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  sessions    │  │  interview_  │  │  rag_        │         │
│  │              │  │  questions   │  │  embeddings  │         │
│  │              │  │  interview_  │  │              │         │
│  │              │  │  answers     │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  log_entries │  ← 既存スキーマ（後方互換維持）              │
│  │  + sessionId │                                              │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ SQL
┌─────────────────────────────────────────────────────────────────┐
│                  Neon PostgreSQL + pgvector                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ OpenAI       │  │ Claude       │  │ Clerk        │         │
│  │ GPT-5        │  │ (Dev Mode)   │  │ Auth         │         │
│  │ Embeddings   │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Session作成フロー詳細

### 2.1 シーケンス図

```
User          UI             API           Session      Analyzer     RAG        Interviewer    DB
 │             │              │            Service       Service    Service      Service       │
 │ 入力        │              │              │             │           │            │           │
 │────────────>│              │              │             │           │            │           │
 │             │ POST         │              │             │           │            │           │
 │             │ /sessions    │              │             │           │            │           │
 │             │─────────────>│              │             │           │            │           │
 │             │              │ create()     │             │           │            │           │
 │             │              │─────────────>│             │           │            │           │
 │             │              │              │ INSERT      │           │            │           │
 │             │              │              │────────────────────────────────────────────────>│
 │             │              │              │<───────────────────────────────────────────────│
 │             │              │              │             │           │            │           │
 │             │              │              │ analyze()   │           │            │           │
 │             │              │              │────────────>│           │            │           │
 │             │              │              │             │ LLM call  │            │           │
 │             │              │              │             │ ────────> │            │           │
 │             │              │              │             │ <──────── │            │           │
 │             │              │              │             │           │            │           │
 │             │              │              │<────────────│           │            │           │
 │             │              │              │ focusArea   │           │            │           │
 │             │              │              │ hypothesis  │           │            │           │
 │             │              │              │             │           │            │           │
 │             │              │              │ UPDATE      │           │            │           │
 │             │              │              │────────────────────────────────────────────────>│
 │             │              │              │             │           │            │           │
 │             │              │              │ searchRelevant()        │            │           │
 │             │              │              │────────────────────────>│            │           │
 │             │              │              │             │           │ query      │           │
 │             │              │              │             │           │ vector     │           │
 │             │              │              │             │           │ search     │           │
 │             │              │              │             │           │──────────────────────>│
 │             │              │              │             │           │<──────────────────────│
 │             │              │              │<────────────────────────│            │           │
 │             │              │              │ context     │           │            │           │
 │             │              │              │             │           │            │           │
 │             │              │              │ generateQuestions()     │            │           │
 │             │              │              │─────────────────────────────────────>│           │
 │             │              │              │             │           │            │ LLM call  │
 │             │              │              │             │           │            │ ────────> │
 │             │              │              │             │           │            │ <──────── │
 │             │              │              │<─────────────────────────────────────│           │
 │             │              │              │ questions   │           │            │           │
 │             │              │              │             │           │            │           │
 │             │              │              │ saveQuestions()         │            │           │
 │             │              │              │────────────────────────────────────────────────>│
 │             │              │<─────────────│             │           │            │           │
 │             │<─────────────│              │             │           │            │           │
 │             │ session +    │              │             │           │            │           │
 │             │ questions    │              │             │           │            │           │
 │<────────────│              │              │             │           │            │           │
 │             │              │              │             │           │            │           │
 │ 質問表示    │              │              │             │           │            │           │
```

### 2.2 ステップ別詳細

#### Step 1: Session基本情報保存

```typescript
// POST /api/sessions

1. リクエスト検証
   - userId（Clerk認証から取得）
   - type（SessionType enum）
   - title（必須、1行）
   - userShortNote（必須、1〜2行）

2. Session作成
   INSERT INTO sessions (
     userId, type, title, userShortNote,
     isActive, createdAt, updatedAt, lastActivityAt
   )

3. 初期Session返却
   → これ以降は非同期処理可能
```

#### Step 2: AI分析（Analyzer）

```typescript
// AnalyzerService.analyze()

1. システムプロンプト準備
   - 役割定義: 音楽制作専門分析AI
   - 出力形式: JSON { focusArea, intentHypothesis }

2. ユーザープロンプト生成
   - セッションタイプ: ${sessionType}
   - ユーザーメモ: ${userShortNote}

3. OpenAI API呼び出し
   model: gpt-5-mini
   temperature: 0.3 (保守的)
   response_format: json_object

4. 結果パース
   focusArea: harmony | melody | rhythm | mix | ...
   intentHypothesis: "〜しようとしている"
   confidence: 0.0-1.0

5. Session更新
   UPDATE sessions
   SET aiAnnotations = {
     focusArea, intentHypothesis, confidence, extractedAt
   }
   WHERE id = ${sessionId}
```

#### Step 3: RAG検索

```typescript
// RAGService.searchRelevant()

1. クエリ埋め込み生成
   OpenAI Embeddings API
   model: text-embedding-ada-002
   input: userShortNote

2. ベクトル検索（pgvector）
   SELECT content, metadata,
          1 - (embedding <=> ${queryEmbedding}) AS similarity
   FROM rag_embeddings
   WHERE userId = ${userId}
     AND sourceType IN ('session', 'answer', 'template')
   ORDER BY embedding <=> ${queryEmbedding}
   LIMIT 5

3. コンテキスト整形
   [
     { content: "...", similarity: 0.85 },
     { content: "...", similarity: 0.78 },
     ...
   ]
```

#### Step 4: 質問生成（Interviewer）

```typescript
// InterviewerService.generateQuestions()

1. システムプロンプト準備
   - 役割: 作曲家専門インタビュアー
   - ルール: 感触・比喩で答えられる質問
   - 出力: JSON { questions: [...] }

2. コンテキスト集約
   - Session情報: type, userShortNote
   - AI分析結果: focusArea, intentHypothesis
   - RAGコンテキスト: 過去の関連ログ

3. OpenAI API呼び出し
   model: gpt-5-mini
   temperature: 0.7 (多様性重視)
   response_format: json_object

4. 質問生成（2〜3問）
   [
     {
       text: "今回のコードの響き、全体的にどんな感じがした？",
       focus: "harmony",
       depth: "medium"
     },
     ...
   ]

5. 質問保存
   INSERT INTO interview_questions (
     sessionId, userId, text, focus, depth,
     questionOrder, questionGroup, isAnswered
   )
```

---

## 3. 回答フロー詳細

### 3.1 回答送信シーケンス

```
User          UI             API          Interviewer     RAG          DB
 │             │              │            Service       Service       │
 │ 回答入力    │              │              │             │           │
 │────────────>│              │              │             │           │
 │             │ POST         │              │             │           │
 │             │ /interview/  │              │             │           │
 │             │ answers      │              │             │           │
 │             │─────────────>│              │             │           │
 │             │              │ submitAnswer()│            │           │
 │             │              │─────────────>│             │           │
 │             │              │              │ INSERT      │           │
 │             │              │              │───────────────────────>│
 │             │              │              │             │           │
 │             │              │              │ UPDATE      │           │
 │             │              │              │ question    │           │
 │             │              │              │───────────────────────>│
 │             │              │              │             │           │
 │             │              │              │ addEmbedding()         │
 │             │              │              │────────────>│           │
 │             │              │              │             │ generate  │
 │             │              │              │             │ embedding │
 │             │              │              │             │ ────────> │
 │             │              │              │             │           │
 │             │              │              │             │ INSERT    │
 │             │              │              │             │─────────>│
 │             │              │<─────────────│             │           │
 │             │<─────────────│              │             │           │
 │             │ answer saved │              │             │           │
 │<────────────│              │              │             │           │
```

### 3.2 RAG蓄積プロセス

```
1. 回答保存時にトリガー
   answer.text → RAG Service

2. Q&Aペア構築
   content = `Q: ${question.text}\nA: ${answer.text}`

3. 埋め込み生成
   OpenAI Embeddings API
   model: text-embedding-ada-002
   input: content

4. メタデータ付与
   {
     sessionType: "composition",
     focusArea: "harmony",
     tags: ["コード進行", "サビ"],
     timestamp: "2025-11-19T10:30:00Z"
   }

5. DB保存
   INSERT INTO rag_embeddings (
     userId, sourceType, sourceId,
     content, metadata, embedding,
     createdAt
   )

6. 将来の検索で利用可能に
```

---

## 4. データモデル関連図

### 4.1 ER図

```
┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK)             │
│ email               │
│ createdAt           │
└─────────────────────┘
          │
          │ 1:N
          ↓
┌─────────────────────┐
│     sessions        │
│─────────────────────│
│ id (PK)             │
│ userId (FK)         │──┐
│ type                │  │
│ title               │  │
│ userShortNote       │  │
│ projectId           │  │
│ projectName         │  │
│ dawMeta (JSONB)     │  │
│ aiAnnotations       │  │   1:N
│   - focusArea       │  │
│   - intentHypothesis│  │
│   - confidence      │  │
│ isActive            │  │
│ isArchived          │  │
│ messageCount        │  ├─────────────────────────────┐
│ questionCount       │  │                             │
│ answerCount         │  │                             │
│ createdAt           │  │                             │
│ updatedAt           │  │                             │
│ lastActivityAt      │  │                             │
└─────────────────────┘  │                             │
          │              │                             │
          │ 1:N          ↓                             ↓
          ↓        ┌──────────────────┐     ┌──────────────────┐
┌─────────────────┐│ interview_questions│    │  log_entries     │
│  session_tags   ││──────────────────││    │──────────────────│
│─────────────────││ id (PK)          ││    │ id (PK)          │
│ id (PK)         ││ sessionId (FK)   ││    │ userId (FK)      │
│ sessionId (FK)  ││ userId (FK)      ││    │ sessionId (FK)   │← NULL可
│ tag             ││ text             ││    │ type             │
│ frequency       ││ focus            ││    │ targetId         │
│ createdAt       ││ depth            ││    │ targetType       │
└─────────────────┘│ questionOrder    ││    │ content          │
                   │ questionGroup    ││    │ aiSummary (JSONB)│
                   │ isAnswered       ││    │ tags (JSONB)     │
                   │ answeredAt       ││    │ createdAt        │
                   │ createdAt        ││    └──────────────────┘
                   └──────────────────┘│
                            │           │
                            │ 1:1       │
                            ↓           │
                   ┌──────────────────┐│
                   │ interview_answers││
                   │──────────────────││
                   │ id (PK)          ││
                   │ sessionId (FK)   ││
                   │ questionId (FK)  ││
                   │ userId (FK)      ││
                   │ text             ││
                   │ processedText    ││
                   │ tags (JSONB)     ││
                   │ extractedInsights││
                   │ createdAt        ││
                   │ updatedAt        ││
                   └──────────────────┘│
                            │           │
                            │           │
                            └───────────┘
                                  │
                                  │ ソース参照
                                  ↓
                        ┌──────────────────┐
                        │  rag_embeddings  │
                        │──────────────────│
                        │ id (PK)          │
                        │ userId (FK)      │
                        │ sourceType       │
                        │ sourceId         │
                        │ content          │
                        │ metadata (JSONB) │
                        │ embedding (vector)│
                        │ createdAt        │
                        └──────────────────┘
```

### 4.2 Session状態遷移図

```
           [新規作成]
               │
               ↓
        ┌─────────────┐
        │   ACTIVE    │ ← デフォルト状態
        │ isActive=T  │
        │ isArchived=F│
        └─────────────┘
               │
               │ ユーザーがアーカイブ
               ↓
        ┌─────────────┐
        │  ARCHIVED   │
        │ isActive=F  │
        │ isArchived=T│
        └─────────────┘
               │
               │ ユーザーが復元
               ↓
        ┌─────────────┐
        │   ACTIVE    │
        │ isActive=T  │
        │ isArchived=F│
        └─────────────┘
               │
               │ ユーザーが削除
               ↓
        ┌─────────────┐
        │   DELETED   │ ← 論理削除
        │ isActive=F  │   （物理削除はバッチ処理）
        │ isArchived=T│
        └─────────────┘

状態別の表示:
- ACTIVE: デフォルトで表示
- ARCHIVED: アーカイブビューでのみ表示
- DELETED: 表示しない（30日後に物理削除）
```

---

## 5. コンポーネント構成図

### 5.1 UI階層構造

```
App Layout
└── MUEDnote Page (/muednote)
    ├── Header
    │   ├── Logo
    │   └── UserMenu
    │
    ├── MainContent
    │   ├── SessionSidebar (Left)
    │   │   ├── CreateSessionButton
    │   │   ├── SessionList
    │   │   │   └── SessionCard (複数)
    │   │   │       ├── SessionTitle
    │   │   │       ├── SessionMeta
    │   │   │       └── SessionStatus
    │   │   └── ArchivedSessionsToggle
    │   │
    │   ├── CenterPanel
    │   │   ├── SessionDetail (選択時)
    │   │   │   ├── SessionHeader
    │   │   │   │   ├── Title
    │   │   │   │   ├── Type Badge
    │   │   │   │   └── Actions
    │   │   │   │
    │   │   │   ├── SessionSummary
    │   │   │   │   ├── userShortNote
    │   │   │   │   └── AI Annotations
    │   │   │   │       ├── focusArea
    │   │   │   │       └── intentHypothesis
    │   │   │   │
    │   │   │   ├── InterviewPanel
    │   │   │   │   ├── QuestionCard (複数)
    │   │   │   │   │   ├── QuestionText
    │   │   │   │   │   ├── FocusBadge
    │   │   │   │   │   └── AnswerInput
    │   │   │   │   │       ├── Textarea
    │   │   │   │   │       └── SubmitButton
    │   │   │   │   │
    │   │   │   │   └── InterviewHistory
    │   │   │   │       └── QAPair (複数)
    │   │   │   │           ├── Question
    │   │   │   │           └── Answer
    │   │   │   │
    │   │   │   └── SessionTimeline
    │   │   │       └── LogEntry (複数)
    │   │   │           ├── EntryContent
    │   │   │           ├── Tags
    │   │   │           └── Timestamp
    │   │   │
    │   │   └── TimelineView (セッション未選択時)
    │   │       └── TimelineWithSessions
    │   │           └── SessionGroup (複数)
    │   │               ├── SessionGroupHeader
    │   │               └── LogEntry (複数)
    │   │
    │   └── RightPanel (オプション)
    │       ├── TagCloud
    │       └── QuickStats
    │
    └── CreateSessionModal
        └── CreateSessionForm
            ├── TypeSelect
            ├── TitleInput
            ├── ShortNoteTextarea
            └── SubmitButton
```

### 5.2 コンポーネント責務マトリックス

| コンポーネント | 状態管理 | データ取得 | ユーザー操作 | 主要Props |
|--------------|---------|-----------|-------------|-----------|
| **SessionList** | ローカル | API呼び出し | クリック→詳細 | sessions[], onSelect |
| **SessionCard** | なし | 親から受信 | クリック | session, isSelected |
| **CreateSessionModal** | フォーム | なし | 送信 | isOpen, onClose, onCreate |
| **SessionDetail** | ローカル | API呼び出し | なし | sessionId |
| **InterviewPanel** | ローカル | API呼び出し | 回答送信 | sessionId |
| **QuestionCard** | フォーム | 親から受信 | 回答入力 | question, onSubmit |
| **InterviewHistory** | なし | 親から受信 | なし | questions[], answers[] |
| **TimelineWithSessions** | ローカル | API呼び出し | フィルタ | userId, filters |

---

## 6. API呼び出しフロー

### 6.1 Session一覧取得

```
Client                    API Route                Repository           DB
  │                          │                         │                 │
  │ GET /api/sessions        │                         │                 │
  │ ?userId=xxx              │                         │                 │
  │ &isActive=true           │                         │                 │
  │ &limit=20                │                         │                 │
  │─────────────────────────>│                         │                 │
  │                          │ sessionRepo.findMany()  │                 │
  │                          │────────────────────────>│                 │
  │                          │                         │ SELECT          │
  │                          │                         │ WHERE userId=?  │
  │                          │                         │ AND isActive=?  │
  │                          │                         │ ORDER BY        │
  │                          │                         │ lastActivityAt  │
  │                          │                         │ LIMIT 20        │
  │                          │                         │───────────────>│
  │                          │                         │<───────────────│
  │                          │<────────────────────────│                 │
  │<─────────────────────────│                         │                 │
  │ {                        │                         │                 │
  │   sessions: [...],       │                         │                 │
  │   total: 42,             │                         │                 │
  │   hasMore: true          │                         │                 │
  │ }                        │                         │                 │
```

### 6.2 Session詳細取得（複数クエリ統合）

```typescript
// GET /api/sessions/:id

async function getSessionDetails(sessionId: string) {
  // 並列実行で高速化
  const [session, messages, questions, answers] = await Promise.all([
    sessionRepo.findById(sessionId),
    sessionRepo.getMessages(sessionId),
    questionRepo.findBySession(sessionId),
    answerRepo.findBySession(sessionId),
  ]);

  return {
    session,
    messages,
    questions,
    answers,
  };
}

// クライアント側は1回のAPI呼び出しで全データ取得
```

### 6.3 質問生成（長時間処理対応）

```
Client                API Route             Service                 OpenAI
  │                      │                     │                       │
  │ POST /interview/     │                     │                       │
  │      questions       │                     │                       │
  │─────────────────────>│                     │                       │
  │                      │ Loading表示開始     │                       │
  │<─────────────────────│                     │                       │
  │ { status: "generating" }                   │                       │
  │                      │                     │                       │
  │                      │ generateQuestions() │                       │
  │                      │────────────────────>│                       │
  │                      │                     │ chat.completions.     │
  │                      │                     │ create()              │
  │                      │                     │──────────────────────>│
  │                      │                     │                       │
  │                      │                     │ ストリーミング応答     │
  │                      │                     │<──────────────────────│
  │                      │                     │ (3〜5秒)              │
  │                      │<────────────────────│                       │
  │<─────────────────────│                     │                       │
  │ {                    │                     │                       │
  │   questions: [...]   │                     │                       │
  │ }                    │                     │                       │
  │ Loading終了          │                     │                       │

// タイムアウト設定: 10秒
// フォールバック: テンプレート質問
```

---

## 7. パフォーマンス最適化戦略

### 7.1 キャッシング戦略

```
┌─────────────────────────────────────────────────┐
│              Caching Layers                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Client-Side (React Query)                   │
│     ┌─────────────────────────────────────┐    │
│     │ sessions: 5分キャッシュ              │    │
│     │ questions: 1分キャッシュ             │    │
│     │ answers: 無効化トリガー              │    │
│     └─────────────────────────────────────┘    │
│                                                 │
│  2. Edge Cache (Vercel)                         │
│     ┌─────────────────────────────────────┐    │
│     │ GET /api/sessions: 60秒             │    │
│     │ POST: キャッシュなし                 │    │
│     └─────────────────────────────────────┘    │
│                                                 │
│  3. Database Query Cache                        │
│     ┌─────────────────────────────────────┐    │
│     │ Prepared Statements                  │    │
│     │ Index活用                            │    │
│     └─────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 7.2 インデックス戦略

```sql
-- sessions テーブル
CREATE INDEX idx_sessions_user_active
  ON sessions(user_id, is_active)
  WHERE is_archived = false;

CREATE INDEX idx_sessions_last_activity
  ON sessions(last_activity_at DESC);

-- interview_questions テーブル
CREATE INDEX idx_interview_questions_session_order
  ON interview_questions(session_id, question_order);

CREATE INDEX idx_interview_questions_unanswered
  ON interview_questions(session_id)
  WHERE is_answered = false;

-- rag_embeddings テーブル（pgvector）
CREATE INDEX idx_rag_embeddings_vector
  ON rag_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);  -- ベクトル数に応じて調整

-- 複合インデックス
CREATE INDEX idx_rag_embeddings_user_source
  ON rag_embeddings(user_id, source_type);
```

### 7.3 N+1クエリ回避

```typescript
// ❌ Bad: N+1クエリ
async function getSessionsWithQuestions(userId: string) {
  const sessions = await sessionRepo.findMany({ userId });

  for (const session of sessions) {
    session.questions = await questionRepo.findBySession(session.id);
  }

  return sessions;
}

// ✅ Good: JOIN + eager loading
async function getSessionsWithQuestions(userId: string) {
  return db
    .select()
    .from(sessions)
    .leftJoin(
      interviewQuestions,
      eq(interviewQuestions.sessionId, sessions.id)
    )
    .where(eq(sessions.userId, userId))
    .groupBy(sessions.id);
}
```

---

## 8. エラーハンドリング戦略

### 8.1 エラー階層

```
Application Error Hierarchy

┌─────────────────────────────────────────┐
│         ApplicationError                │
│  - statusCode                           │
│  - code                                 │
│  - message                              │
│  - details                              │
└─────────────────────────────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
        ↓        ↓        ↓
┌──────────┐ ┌────────┐ ┌─────────┐
│Validation│ │Business│ │External │
│Error     │ │Error   │ │API Error│
└──────────┘ └────────┘ └─────────┘
   │            │            │
   │            │            │
   ↓            ↓            ↓
400 Bad      422           503
Request   Unprocessable  Service
         Entity         Unavailable
```

### 8.2 エラーハンドリングパターン

```typescript
// API Route レベル
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // バリデーション
    const validated = CreateSessionSchema.parse(body);

    // ビジネスロジック実行
    const result = await sessionService.createSession(validated);

    return Response.json(result, { status: 201 });
  } catch (error) {
    // エラー種別判定
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof BusinessError) {
      return Response.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    if (error instanceof OpenAIError) {
      // フォールバック処理
      const fallback = await sessionService.createSessionFallback(body);
      return Response.json(fallback, { status: 201 });
    }

    // 予期しないエラー
    logger.error('Unexpected error', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 9. セキュリティ考慮事項

### 9.1 認証・認可フロー

```
Request → Clerk Middleware → API Route → Repository
   │            │                │            │
   │            ↓                │            │
   │       認証チェック          │            │
   │       - JWT検証             │            │
   │       - ユーザー取得        │            │
   │            │                │            │
   │            ↓                │            │
   │       Context設定           │            │
   │       - userId              │            │
   │       - role                │            │
   │            │                │            │
   │            ↓                ↓            │
   │       API Route実行         │            │
   │            │                │            │
   │            │           認可チェック      │
   │            │           - userId一致      │
   │            │           - リソース権限    │
   │            │                ↓            │
   │            │           Repository実行    │
   │            │                ↓            │
   │            ↓                ↓            ↓
   Response ← レスポンス ← 結果 ← データ
```

### 9.2 入力サニタイゼーション

```typescript
// Zodスキーマによる厳格なバリデーション
const CreateSessionSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['composition', 'practice', 'mix', ...]),
  title: z.string()
    .min(1, '必須項目です')
    .max(100, '100文字以内で入力してください')
    .transform(sanitizeHtml), // XSS対策
  userShortNote: z.string()
    .min(1, '必須項目です')
    .max(500, '500文字以内で入力してください')
    .transform(sanitizeHtml),
});

// HTMLエスケープ関数
function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

---

**ドキュメント終了**

最終更新: 2025-11-19

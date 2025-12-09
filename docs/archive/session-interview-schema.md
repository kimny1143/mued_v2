# MUEDnote Session/Interview Database Schema

## Overview

MUEDnote Phase 2 では、AIインタビュアーが作曲家の非言語的なプロセスを質問を通じて構造化・記録する **Session/Interview システム**を実装します。

このドキュメントは、データベーススキーマ設計、RLSポリシー、インデックス戦略、既存システムとの統合について詳述します。

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   User Input Layer                       │
├─────────────────────────────────────────────────────────┤
│ 1. User creates session                                  │
│    - Type: composition/practice/mix/etc                  │
│    - Title + userShortNote (1-2 lines)                   │
│    - Optional: DAW metadata                              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  AI Analyzer Module                      │
├─────────────────────────────────────────────────────────┤
│ 2. Analyzer generates SessionAnalysis                    │
│    - MVP: Text inference                                 │
│    - Final: MIDI/WAV diff analysis                       │
│    - Output: focusArea, intentHypothesis                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                AI Interviewer Module                     │
├─────────────────────────────────────────────────────────┤
│ 3. Interviewer generates 2-5 questions                   │
│    - RAG: Past Q&A, templates, theory knowledge          │
│    - Context: SessionAnalysis + userShortNote            │
│    - Output: InterviewQuestion records                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   User Response                          │
├─────────────────────────────────────────────────────────┤
│ 4. User answers questions                                │
│    - Chat-like UI                                        │
│    - Answers saved as InterviewAnswer records            │
│    - AI extracts insights (key phrases, tone)            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   RAG Integration                        │
├─────────────────────────────────────────────────────────┤
│ 5. Answers fed back to RAG system                        │
│    - Future question generation                          │
│    - Auto-material generation (Phase 3)                  │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### ER Diagram

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │ 1:N
       ↓
┌─────────────┐       1:1        ┌──────────────────┐
│  sessions   │◄─────────────────│ session_analyses │
└──────┬──────┘                  └──────────────────┘
       │ 1:N
       ↓
┌──────────────────────┐
│ interview_questions  │
└──────────┬───────────┘
           │ 1:1
           ↓
┌──────────────────────┐
│ interview_answers    │
└──────────────────────┘
```

---

## Table Definitions

### 1. `sessions` テーブル

制作・練習セッションの基本情報を保存。

```typescript
interface Session {
  id: UUID;
  userId: UUID;                // FK: users.id
  type: SessionType;           // composition | practice | mix | ear_training | listening | theory | other
  status: SessionStatus;       // draft | interviewing | completed | archived
  title: string;               // セッションタイトル（1行）
  projectId?: UUID;            // 将来的な拡張用
  projectName?: string;
  userShortNote: string;       // ユーザーの最初の短文（1-2行）
  dawMeta?: DAWMetadata;       // JSONB: DAWメタデータ
  aiAnnotations?: AIAnnotations; // JSONB: AI推定結果
  attachments?: SessionAttachment[]; // JSONB: 添付ファイル
  isPublic: boolean;
  shareWithMentor: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

#### DAWMetadata 構造

```typescript
{
  dawName?: string;            // "Logic Pro", "Ableton Live"等
  tempo?: number;              // BPM
  timeSignature?: string;      // "4/4", "3/4"等
  keyEstimate?: string;        // "C", "Dm"等
  barsTouched?: {
    from: number;
    to: number;
  };
  projectFileName?: string;
  totalBars?: number;
  trackCount?: number;
}
```

#### AIAnnotations 構造

```typescript
{
  focusArea?: string;          // "harmony", "melody"等
  intentHypothesis?: string;   // "落ち着かせようとしている"等
  confidence?: number;         // 0.0-1.0
  analysisMethod?: 'text_inference' | 'midi_analysis' | 'wav_analysis';
}
```

#### Indexes

- `idx_sessions_user` (user_id)
- `idx_sessions_type` (type)
- `idx_sessions_status` (status)
- `idx_sessions_user_created` (user_id, created_at DESC) - ユーザータイムライン用
- `idx_sessions_user_status` (user_id, status) - フィルタリング用
- `idx_sessions_public` (is_public) WHERE is_public = TRUE
- `idx_sessions_project` (project_id) WHERE project_id IS NOT NULL
- `idx_sessions_daw_meta_gin` (daw_meta) USING GIN - JSONB検索用
- `idx_sessions_ai_annotations_gin` (ai_annotations) USING GIN

---

### 2. `session_analyses` テーブル

Analyzerモジュールの詳細な分析結果（セッションあたり1レコード）。

```typescript
interface SessionAnalysis {
  id: UUID;
  sessionId: UUID;             // FK: sessions.id (UNIQUE)
  analysisData: SessionAnalysisData; // JSONB: 構造化分析データ
  analysisVersion: string;     // "mvp-1.0", "final-2.0"等
  confidence: number;          // 0-100
  createdAt: Date;
  updatedAt: Date;
}
```

#### SessionAnalysisData 構造

```typescript
{
  focusArea: string;           // harmony | melody | rhythm | mix | emotion | image | structure
  intentHypothesis: string;
  barsChanged?: number[];
  tracksChanged?: string[];
  // MIDI解析データ（Final版）
  pitchClassHistogram?: number[];
  simultaneity?: number;
  onsetDensity?: number;
  quantizeDeviation?: number;
  // WAV解析データ（Final版）
  lufs?: number;
  dynamicRange?: number;
  spectralBalance?: {
    low: number;
    mid: number;
    high: number;
  };
}
```

#### Indexes

- `idx_session_analyses_session` (session_id) - UNIQUE制約と組み合わせ
- `idx_session_analyses_data_gin` (analysis_data) USING GIN

---

### 3. `interview_questions` テーブル

AIが生成する質問。

```typescript
interface InterviewQuestion {
  id: UUID;
  sessionId: UUID;             // FK: sessions.id
  text: string;                // 質問文
  focus: InterviewFocus;       // harmony | melody | rhythm | mix | emotion | image | structure
  depth: InterviewDepth;       // shallow | medium | deep
  order: number;               // 表示順（0-indexed）
  generatedBy: string;         // "ai" | "template" | "custom"
  templateId?: string;         // RAG用
  ragContext?: object;         // JSONB: RAG使用コンテキスト
  createdAt: Date;
}
```

#### Indexes

- `idx_interview_questions_session` (session_id)
- `idx_interview_questions_session_order` (session_id, order) - 表示順取得用
- `idx_interview_questions_focus` (focus) - フォーカス分析用

---

### 4. `interview_answers` テーブル

ユーザーの回答。

```typescript
interface InterviewAnswer {
  id: UUID;
  sessionId: UUID;             // FK: sessions.id
  questionId: UUID;            // FK: interview_questions.id (UNIQUE)
  text: string;                // 回答テキスト
  aiInsights?: {               // JSONB: AI抽出インサイト
    keyPhrases?: string[];
    technicalTerms?: string[];
    emotionalTone?: string;
    suggestedTags?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Indexes

- `idx_interview_answers_session` (session_id)
- `idx_interview_answers_question` (question_id) - UNIQUE制約と組み合わせ
- `idx_interview_answers_session_question` (session_id, question_id)

---

## Row Level Security (RLS) Policies

### Design Principles

1. **Principle of Least Privilege**: デフォルトで全アクセス拒否、必要な権限のみ付与
2. **Defense in Depth**: 複数のセキュリティ層（RLS + アプリケーションロジック）
3. **Performance**: RLSポリシーはインデックス活用を前提に設計

### Authentication Context

Clerk `userId` を使用した認証：

```sql
-- アプリケーション側で実行（トランザクション開始時）
SET LOCAL app.current_user_id = 'user_2abc...';
```

### Helper Functions

#### 1. `get_internal_user_id(clerk_user_id TEXT)`

Clerk IDから内部UUIDに変換。

```sql
SELECT get_internal_user_id('user_2abc...');
-- Returns: UUID of internal user record
```

#### 2. `is_session_owner(session_user_id UUID)`

セッションの所有者かチェック。

```sql
SELECT is_session_owner('550e8400-e29b-41d4-a716-446655440000');
-- Returns: TRUE or FALSE
```

#### 3. `is_session_mentor(session_user_id UUID)`

メンターとして閲覧権限があるかチェック（過去に授業実績があるか）。

```sql
SELECT is_session_mentor('550e8400-e29b-41d4-a716-446655440000');
-- Returns: TRUE or FALSE
```

---

### Sessions Table Policies

| Policy Name | Operation | Rule |
|------------|-----------|------|
| `sessions_select_own` | SELECT | 自分のセッションを閲覧可能 |
| `sessions_select_public` | SELECT | 公開セッションを全員が閲覧可能 |
| `sessions_select_mentor` | SELECT | メンターがshare_with_mentor=TRUEのセッションを閲覧可能 |
| `sessions_insert_own` | INSERT | 自分のセッションのみ作成可能 |
| `sessions_update_own` | UPDATE | 自分のセッションのみ更新可能 |
| `sessions_delete_own` | DELETE | 自分のセッションのみ削除可能 |

**Example Query (as user):**

```sql
-- ユーザーは自分のセッションのみ取得
SELECT * FROM sessions WHERE user_id = current_user_uuid;
-- RLS policy automatically applies
```

---

### Session Analyses Table Policies

| Policy Name | Operation | Rule |
|------------|-----------|------|
| `session_analyses_select_own` | SELECT | 自分のセッションの分析を閲覧可能 |
| `session_analyses_select_public` | SELECT | 公開セッションの分析を全員が閲覧可能 |
| `session_analyses_select_mentor` | SELECT | メンターが共有セッションの分析を閲覧可能 |

**Note**: INSERT/UPDATE は Service Account のみ（RLS bypass）

---

### Interview Questions Table Policies

| Policy Name | Operation | Rule |
|------------|-----------|------|
| `interview_questions_select_own` | SELECT | 自分のセッションの質問を閲覧可能 |
| `interview_questions_select_public` | SELECT | 公開セッションの質問を全員が閲覧可能 |
| `interview_questions_select_mentor` | SELECT | メンターが共有セッションの質問を閲覧可能 |

**Note**: INSERT は Service Account のみ（AI生成のため）

---

### Interview Answers Table Policies

| Policy Name | Operation | Rule |
|------------|-----------|------|
| `interview_answers_select_own` | SELECT | 自分のセッションの回答を閲覧可能 |
| `interview_answers_select_public` | SELECT | 公開セッションの回答を全員が閲覧可能 |
| `interview_answers_select_mentor` | SELECT | メンターが共有セッションの回答を閲覧可能 |
| `interview_answers_insert_own` | INSERT | 自分のセッションの質問にのみ回答可能 |
| `interview_answers_update_own` | UPDATE | 自分の回答のみ更新可能 |
| `interview_answers_delete_own` | DELETE | 自分の回答のみ削除可能 |

---

## Index Strategy

### Performance Optimization Rationale

1. **User Timeline Queries**: 複合インデックス `(user_id, created_at DESC)` で高速化
2. **JSONB Search**: GINインデックスでDAWメタデータ・分析データ検索を最適化
3. **Foreign Key Indexes**: JOINパフォーマンス向上のため全外部キーにインデックス
4. **Partial Indexes**: 公開セッション用に `WHERE is_public = TRUE` で空間節約

### Expected Query Patterns

#### 1. User Timeline (Most Frequent)

```sql
SELECT * FROM sessions
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

**Uses**: `idx_sessions_user_created`

#### 2. Session with Analysis & Q&A

```sql
SELECT
  s.*,
  sa.analysis_data,
  (SELECT json_agg(q.*) FROM interview_questions q WHERE q.session_id = s.id) as questions,
  (SELECT json_agg(a.*) FROM interview_answers a WHERE a.session_id = s.id) as answers
FROM sessions s
LEFT JOIN session_analyses sa ON s.id = sa.session_id
WHERE s.id = $1;
```

**Uses**: `idx_session_analyses_session`, `idx_interview_questions_session`, `idx_interview_answers_session`

#### 3. Public Session Discovery

```sql
SELECT * FROM sessions
WHERE is_public = TRUE
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 50;
```

**Uses**: `idx_sessions_public` (partial index)

#### 4. DAW-specific Search (JSONB)

```sql
SELECT * FROM sessions
WHERE daw_meta->>'dawName' = 'Logic Pro'
  AND user_id = $1;
```

**Uses**: `idx_sessions_daw_meta_gin`

---

## Views

### 1. `v_sessions_with_user`

セッション + ユーザー情報 + Q&A数。

```sql
SELECT * FROM v_sessions_with_user
WHERE user_id = $1
ORDER BY created_at DESC;
```

### 2. `v_session_details`

セッション詳細ページ用（分析結果・カウント含む）。

```sql
SELECT * FROM v_session_details
WHERE id = $1;
```

### 3. `v_interview_qa_pairs`

チャットUI用Q&Aペア。

```sql
SELECT * FROM v_interview_qa_pairs
WHERE session_id = $1
ORDER BY "order";
```

### 4. `v_public_sessions`

公開セッション一覧（Discovery機能用）。

```sql
SELECT * FROM v_public_sessions
LIMIT 50;
```

---

## Relationship with Existing Tables

### Integration with `log_entries` (Phase 1)

**既存の log_entries との関係:**

- `log_entries`: 一般的な学習・制作ログ（自由記述）
- `sessions`: 構造化されたAIインタビュー駆動ログ

**統合戦略:**

1. Session完了時に自動的に `log_entries` レコードを生成
2. `log_entries.target_type = 'user_creation'` として参照
3. RAGシステムは両方のテーブルを検索対象とする

**Example Integration Code:**

```typescript
// Session完了時
async function completeSession(sessionId: string) {
  // 1. Sessionをcompletedにする
  await db.update(sessions)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  // 2. log_entriesにサマリーを作成
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { questions: true, answers: true }
  });

  await db.insert(logEntries).values({
    userId: session.userId,
    type: 'creation',
    targetId: sessionId,
    targetType: 'user_creation',
    content: generateSessionSummary(session),
    aiSummary: {
      formatted: session.title,
      tags: [session.type, ...extractTags(session)],
      comment: `AI Interview completed with ${session.answers.length} answers`
    },
    isPublic: session.isPublic,
    shareWithMentor: session.shareWithMentor
  });
}
```

---

## Migration Guide

### Prerequisites

- Neon PostgreSQL database
- `@neondatabase/serverless` package installed
- `.env.local` with `DATABASE_URL` set

### Migration Steps

#### 1. Test Database Connection

```bash
npm run db:test-connection
```

#### 2. Run Migration

```bash
npm run db:migrate:sessions
```

This will execute:
- `0010_add_sessions_phase2.sql` (tables, indexes, views)
- `0011_add_sessions_rls_policies.sql` (RLS policies)

#### 3. Verify Migration

```bash
# Open Drizzle Studio
npm run db:studio
```

Check:
- All 4 tables exist (sessions, session_analyses, interview_questions, interview_answers)
- All ENUMs exist
- All indexes exist
- All views exist

#### 4. Rollback (if needed)

```bash
npm run db:rollback:sessions
```

⚠️ **Warning**: This will permanently delete all session data!

---

## Usage Examples

### 1. Create a New Session

```typescript
import { db } from '@/db';
import { sessions } from '@/db/schema';

const newSession = await db.insert(sessions).values({
  userId: user.id,
  type: 'composition',
  title: 'Verse melody refinement',
  userShortNote: 'Worked on the verse melody to make it more memorable.',
  dawMeta: {
    dawName: 'Logic Pro',
    tempo: 120,
    timeSignature: '4/4',
    barsTouched: { from: 8, to: 16 }
  },
  status: 'draft'
}).returning();
```

### 2. Generate Interview Questions

```typescript
import { interviewQuestions } from '@/db/schema';

// After Analyzer runs and creates SessionAnalysis
const questions = [
  {
    sessionId: session.id,
    text: 'What feeling were you going for with the new melody?',
    focus: 'emotion',
    depth: 'medium',
    order: 0,
    generatedBy: 'ai'
  },
  {
    sessionId: session.id,
    text: 'How did you decide on the note choices?',
    focus: 'melody',
    depth: 'shallow',
    order: 1,
    generatedBy: 'ai'
  }
];

await db.insert(interviewQuestions).values(questions);
```

### 3. Submit User Answer

```typescript
import { interviewAnswers } from '@/db/schema';

const answer = await db.insert(interviewAnswers).values({
  sessionId: session.id,
  questionId: question.id,
  text: 'I wanted it to feel more hopeful, so I raised the melody at the end.',
  aiInsights: {
    keyPhrases: ['hopeful', 'raised melody'],
    emotionalTone: 'positive',
    suggestedTags: ['emotion', 'melody-contour']
  }
}).returning();
```

### 4. Get Complete Session Details

```typescript
const sessionWithDetails = await db.query.sessions.findFirst({
  where: eq(sessions.id, sessionId),
  with: {
    analysis: true,
    questions: {
      with: {
        answers: true
      },
      orderBy: (questions, { asc }) => [asc(questions.order)]
    }
  }
});
```

---

## Performance Considerations

### Query Optimization Tips

1. **Use Views for Complex Queries**: `v_session_details` はJOINを最適化済み
2. **Pagination**: 必ず `LIMIT` + `OFFSET` を使用
3. **JSONB Queries**: GINインデックスを活用（`daw_meta @> '{"dawName": "Logic Pro"}'`）
4. **Avoid N+1**: Drizzle の `with` clause で一括取得

### Monitoring Queries

```sql
-- Slow query check
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%sessions%'
ORDER BY mean_time DESC
LIMIT 10;

-- Index usage check
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('sessions', 'interview_questions', 'interview_answers')
ORDER BY idx_scan ASC;
```

---

## Testing Strategy

### Unit Tests

- Repository layer テスト（CRUD操作）
- RLS policy テスト（異なるユーザーロールでの権限確認）

### Integration Tests

- Session作成 → Analysis → Questions → Answers のフロー
- log_entries との連携テスト

### E2E Tests

- セッション作成UI
- インタビューチャットUI
- セッション一覧・詳細ページ

---

## Future Enhancements

### Phase 2.1 (MVP → Final)

- MIDI/WAV差分解析の実装
- Analyzer精度向上
- RAG context の強化

### Phase 3 (Auto-Material Generation)

- Interview回答から教材自動生成
- 学習者の弱点分析
- パーソナライズされた練習プラン

---

## Troubleshooting

### Common Issues

#### 1. RLS Policy Error: "new row violates row-level security policy"

**原因**: `app.current_user_id` が設定されていない

**解決**:

```typescript
import { db } from '@/db';

// Before queries
await db.execute(sql`SET LOCAL app.current_user_id = ${clerkUserId}`);
```

#### 2. JSONB Query Not Using Index

**原因**: クエリ構文がGINインデックスに最適化されていない

**解決**:

```sql
-- ❌ NG
WHERE daw_meta->>'dawName' = 'Logic Pro'

-- ✅ OK
WHERE daw_meta @> '{"dawName": "Logic Pro"}'
```

#### 3. Foreign Key Constraint Violation

**原因**: 参照先レコードが存在しない、またはRLSで見えない

**解決**:

1. 参照先レコードの存在確認
2. Service Accountで実行（RLS bypass）

---

## References

- [MUEDnote企画書 v1](../business/MUEDnote企画v1.md)
- [Neon PostgreSQL Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL RLS Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## Contributors

Database Schema designed by: Claude Code (Anthropic)

Date: 2025-11-19

Version: 1.0

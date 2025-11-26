# MUEDnote Phase 1.1 → MVP 移行ガイド

**バージョン**: 1.0.0
**作成日**: 2025-11-19
**対象**: log_entries → sessions への段階的移行

---

## エグゼクティブサマリー

本ガイドは、既存のlog_entriesベースのシステムから、Session概念を中心とした新アーキテクチャへ安全に移行するための手順書です。

### 移行方針

1. **後方互換性の維持**: 既存の log_entries は削除せず、段階的に拡張
2. **段階的ロールアウト**: 新機能を追加しながら、既存機能を維持
3. **ゼロダウンタイム**: ユーザーに影響を与えない移行

---

## 1. 移行フェーズ概要

### フェーズ1: 並行運用（Week 1-2）

**目標**: 既存機能を壊さず、新テーブルを追加

```
現状:
  log_entries のみ

移行後:
  log_entries（既存のまま）
  + sessions（新規）
  + interview_questions（新規）
  + interview_answers（新規）
  + rag_embeddings（新規）

動作:
  - 既存のログ作成APIは変更なし
  - 新規のSession作成APIを追加
  - UIは既存と新規を並行表示
```

### フェーズ2: Session優先（Week 3-4）

**目標**: 新規ログは必ずSessionに紐付ける

```
現状:
  log_entries.sessionId は NULL 許容

移行後:
  新規ログ作成時:
    - sessionId を必須化（デフォルトSession自動作成）
    - log_entries.sessionId に値が入る

動作:
  - ログ作成前にSession選択/作成を促す
  - 既存ログ（sessionId=NULL）は引き続き表示
```

### フェーズ3: 完全統合（Phase 1.2以降）

**目標**: 既存ログをSessionにマッピング

```
現状:
  sessionId=NULL のログが存在

移行後:
  バッチ処理で既存ログをSessionにグループ化
    - ユーザー × 日付でグループ化
    - 自動Session生成
    - log_entries.sessionId を更新

動作:
  - 全てのログがSessionに紐付く
  - タイムライン表示がSession単位に
```

---

## 2. データベースマイグレーション

### 2.1 マイグレーション順序

#### Migration 1: 新規テーブル作成

```sql
-- db/migrations/0009_create_sessions.sql

-- SessionTypeEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
    CREATE TYPE session_type AS ENUM (
      'composition',
      'practice',
      'mix',
      'ear_training',
      'listening',
      'theory',
      'other'
    );
  END IF;
END $$;

-- sessions テーブル
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  type session_type NOT NULL,

  title TEXT NOT NULL,
  user_short_note TEXT NOT NULL,

  project_id UUID,
  project_name TEXT,

  daw_meta JSONB,
  ai_annotations JSONB,

  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,

  message_count INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  answer_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_type
  ON sessions(type);

CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_last_activity
  ON sessions(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active
  ON sessions(user_id, is_active)
  WHERE is_archived = false;
```

#### Migration 2: Interview テーブル作成

```sql
-- db/migrations/0010_create_interviews.sql

-- FocusTypeEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'focus_type') THEN
    CREATE TYPE focus_type AS ENUM (
      'harmony',
      'melody',
      'rhythm',
      'mix',
      'emotion',
      'image',
      'structure'
    );
  END IF;
END $$;

-- DepthEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'depth_enum') THEN
    CREATE TYPE depth_enum AS ENUM (
      'shallow',
      'medium',
      'deep'
    );
  END IF;
END $$;

-- interview_questions テーブル
CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,

  text TEXT NOT NULL,
  focus focus_type NOT NULL,
  depth depth_enum NOT NULL,

  question_order INTEGER NOT NULL,
  question_group TEXT,

  is_answered BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- interview_answers テーブル
CREATE TABLE IF NOT EXISTS interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  question_id UUID NOT NULL,
  user_id UUID NOT NULL,

  text TEXT NOT NULL,

  processed_text TEXT,
  tags JSONB,
  extracted_insights JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_interview_questions_session
  ON interview_questions(session_id);

CREATE INDEX IF NOT EXISTS idx_interview_questions_session_order
  ON interview_questions(session_id, question_order);

CREATE INDEX IF NOT EXISTS idx_interview_answers_session
  ON interview_answers(session_id);

CREATE INDEX IF NOT EXISTS idx_interview_answers_question
  ON interview_answers(question_id);
```

#### Migration 3: log_entries 拡張

```sql
-- db/migrations/0011_extend_log_entries.sql

-- sessionId カラム追加（NULLable - 既存データ保護）
ALTER TABLE log_entries
ADD COLUMN IF NOT EXISTS session_id UUID;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_log_entries_session
  ON log_entries(session_id)
  WHERE session_id IS NOT NULL;
```

#### Migration 4: 外部キー制約追加

```sql
-- db/migrations/0012_add_foreign_keys.sql

-- log_entries → sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_log_entries_session'
  ) THEN
    ALTER TABLE log_entries
    ADD CONSTRAINT fk_log_entries_session
    FOREIGN KEY (session_id)
    REFERENCES sessions(id)
    ON DELETE SET NULL;  -- Session削除時は NULL に
  END IF;
END $$;

-- interview_questions → sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_questions_session'
  ) THEN
    ALTER TABLE interview_questions
    ADD CONSTRAINT fk_interview_questions_session
    FOREIGN KEY (session_id)
    REFERENCES sessions(id)
    ON DELETE CASCADE;  -- Session削除時は質問も削除
  END IF;
END $$;

-- interview_answers → sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_answers_session'
  ) THEN
    ALTER TABLE interview_answers
    ADD CONSTRAINT fk_interview_answers_session
    FOREIGN KEY (session_id)
    REFERENCES sessions(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- interview_answers → questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_answers_question'
  ) THEN
    ALTER TABLE interview_answers
    ADD CONSTRAINT fk_interview_answers_question
    FOREIGN KEY (question_id)
    REFERENCES interview_questions(id)
    ON DELETE CASCADE;
  END IF;
END $$;
```

#### Migration 5: RAG テーブル作成（Phase 1.3）

```sql
-- db/migrations/0013_create_rag_embeddings.sql

-- pgvector拡張有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- SourceTypeEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type_enum') THEN
    CREATE TYPE source_type_enum AS ENUM (
      'session',
      'answer',
      'template',
      'knowledge'
    );
  END IF;
END $$;

-- rag_embeddings テーブル
CREATE TABLE IF NOT EXISTS rag_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  source_type source_type_enum NOT NULL,
  source_id UUID NOT NULL,

  content TEXT NOT NULL,
  metadata JSONB,

  embedding vector(1536),  -- OpenAI ada-002

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_user
  ON rag_embeddings(user_id);

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source
  ON rag_embeddings(source_type, source_id);

-- ベクトル検索用インデックス（IVFFlat）
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON rag_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 2.2 マイグレーション実行手順

```bash
# 1. ローカル環境でテスト
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2

# Drizzle設定確認
cat drizzle.config.ts

# マイグレーション生成
npx drizzle-kit generate:pg

# 生成されたSQLファイル確認
ls -la db/migrations/

# ローカルDBに適用
npx drizzle-kit push:pg

# 2. Neon（開発環境）に適用
npm run db:migrate:dev

# 3. スキーマ確認
npx drizzle-kit studio

# 4. 本番環境へのデプロイ
npm run db:migrate:prod
```

---

## 3. バックエンド移行

### 3.1 Repository層の段階的移行

#### Step 1: 新規Repository追加（既存は変更なし）

```typescript
// lib/repositories/session.repository.ts（新規）
export class SessionRepository {
  // 実装
}

// lib/repositories/log.repository.ts（既存のまま）
export class LogRepository {
  // 既存実装を維持
}
```

#### Step 2: Service層で両方をサポート

```typescript
// lib/services/log.service.ts（拡張）

export class LogService {
  constructor(
    private logRepo: LogRepository,
    private sessionRepo: SessionRepository  // 追加
  ) {}

  async createLog(input: CreateLogInput): Promise<LogEntry> {
    // 1. 既存のlog保存（後方互換）
    const logEntry = await this.logRepo.create(input);

    // 2. sessionIdがあれば、Session統計を更新
    if (input.sessionId) {
      await this.sessionRepo.incrementMessageCount(input.sessionId);
      await this.sessionRepo.updateLastActivity(input.sessionId);
    }

    return logEntry;
  }

  // 既存メソッドはそのまま維持
  async listLogs(filters: LogEntryFilter): Promise<LogEntry[]> {
    return this.logRepo.findMany(filters);
  }
}
```

### 3.2 API Routes の段階的移行

#### 既存APIの維持

```typescript
// app/api/muednote/logs/route.ts（変更なし）

export async function GET(request: Request) {
  // 既存実装を維持
  const logs = await logService.listLogs(filters);
  return Response.json({ logs });
}

export async function POST(request: Request) {
  // sessionId を受け取るように拡張（オプション）
  const body = await request.json();
  const log = await logService.createLog({
    ...body,
    sessionId: body.sessionId || null,  // NULLable
  });
  return Response.json({ log });
}
```

#### 新規APIの追加

```typescript
// app/api/sessions/route.ts（新規）

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const sessions = await sessionService.listSessions({ userId });
  return Response.json({ sessions });
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = await sessionService.createSession(body);
  return Response.json(result, { status: 201 });
}
```

---

## 4. フロントエンド移行

### 4.1 コンポーネント追加（既存は維持）

```
既存:
/components/features/muednote/
  ├── ChatContainer.tsx（既存のまま）
  ├── ChatInput.tsx（既存のまま）
  ├── ChatMessage.tsx（既存のまま）
  ├── TimelineContainer.tsx（既存のまま）
  ├── TimelineEntry.tsx（既存のまま）
  └── TagFilter.tsx（既存のまま）

追加:
/components/features/muednote/
  ├── sessions/（新規ディレクトリ）
  │   ├── SessionList.tsx
  │   ├── SessionCard.tsx
  │   ├── CreateSessionModal.tsx
  │   └── SessionSidebar.tsx
  │
  └── interview/（新規ディレクトリ）
      ├── InterviewPanel.tsx
      ├── QuestionCard.tsx
      ├── AnswerInput.tsx
      └── InterviewHistory.tsx
```

### 4.2 UIの段階的切り替え

#### フェーズ1: タブ切り替え

```typescript
// app/muednote/page.tsx（拡張）

'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimelineContainer } from '@/components/features/muednote/TimelineContainer';
import { SessionList } from '@/components/features/muednote/sessions/SessionList';

export default function MUEDnotePage() {
  const [view, setView] = useState<'timeline' | 'sessions'>('timeline');

  return (
    <div className="container mx-auto p-4">
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="timeline">タイムライン（従来）</TabsTrigger>
          <TabsTrigger value="sessions">セッション（新機能）</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          {/* 既存のタイムライン表示 */}
          <TimelineContainer />
        </TabsContent>

        <TabsContent value="sessions">
          {/* 新しいSession表示 */}
          <SessionList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### フェーズ2: デフォルト切り替え

```typescript
// Feature Flagで制御

const DEFAULT_VIEW = process.env.NEXT_PUBLIC_MUEDNOTE_DEFAULT_VIEW || 'timeline';

export default function MUEDnotePage() {
  const [view, setView] = useState<'timeline' | 'sessions'>(DEFAULT_VIEW);

  // ...
}
```

#### フェーズ3: 完全移行

```typescript
// タブを削除し、Session表示のみに

export default function MUEDnotePage() {
  return (
    <div className="container mx-auto p-4">
      <SessionList />
    </div>
  );
}
```

---

## 5. データ移行スクリプト

### 5.1 既存ログのSessionへのグループ化

```typescript
// scripts/migrate-logs-to-sessions.ts

import { db } from '@/db';
import { logEntries, sessions } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function migrateLogs() {
  console.log('Starting log migration...');

  // 1. sessionId = NULL のログを取得
  const orphanedLogs = await db
    .select()
    .from(logEntries)
    .where(isNull(logEntries.sessionId))
    .orderBy(logEntries.createdAt);

  console.log(`Found ${orphanedLogs.length} orphaned logs`);

  // 2. ユーザー × 日付でグループ化
  const grouped = groupByUserAndDate(orphanedLogs);

  console.log(`Grouped into ${Object.keys(grouped).length} sessions`);

  // 3. 各グループをSessionに変換
  for (const [key, logs] of Object.entries(grouped)) {
    const [userId, dateStr] = key.split('_');

    // Session作成
    const sessionTitle = generateSessionTitle(logs);
    const sessionType = inferSessionType(logs);
    const userShortNote = generateShortNote(logs);

    const [session] = await db
      .insert(sessions)
      .values({
        id: randomUUID(),
        userId,
        type: sessionType,
        title: sessionTitle,
        userShortNote,
        messageCount: logs.length,
        createdAt: new Date(logs[0].createdAt),
        updatedAt: new Date(),
        lastActivityAt: new Date(logs[logs.length - 1].createdAt),
      })
      .returning();

    console.log(`Created session: ${session.id} (${logs.length} logs)`);

    // 4. ログにsessionIdを付与
    await db
      .update(logEntries)
      .set({ sessionId: session.id })
      .where(
        and(
          eq(logEntries.userId, userId),
          inArray(logEntries.id, logs.map((l) => l.id))
        )
      );

    console.log(`Updated ${logs.length} logs with sessionId`);
  }

  console.log('Migration completed!');
}

/**
 * ユーザー × 日付でグループ化
 */
function groupByUserAndDate(logs: LogEntry[]): Record<string, LogEntry[]> {
  const grouped: Record<string, LogEntry[]> = {};

  for (const log of logs) {
    const dateStr = formatDate(log.createdAt); // YYYY-MM-DD
    const key = `${log.userId}_${dateStr}`;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(log);
  }

  return grouped;
}

/**
 * Sessionタイトル生成
 */
function generateSessionTitle(logs: LogEntry[]): string {
  // 最初のログの内容から抽出
  const firstLog = logs[0];
  const content = firstLog.content.slice(0, 50);

  const dateStr = formatDate(firstLog.createdAt);

  return `${dateStr} - ${content}...`;
}

/**
 * SessionType推定
 */
function inferSessionType(logs: LogEntry[]): SessionType {
  // log_entries.type から推定
  const types = logs.map((l) => l.type);

  if (types.includes('creation')) return 'composition';
  if (types.includes('practice')) return 'practice';
  if (types.includes('ear_training')) return 'ear_training';

  return 'other';
}

/**
 * userShortNote生成
 */
function generateShortNote(logs: LogEntry[]): string {
  // 最初のログの要約
  const summaries = logs
    .slice(0, 3)
    .map((l) => l.aiSummary?.formatted || l.content)
    .join(' ');

  return summaries.slice(0, 200) + '...';
}

/**
 * 日付フォーマット
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// 実行
migrateLogs().catch(console.error);
```

### 5.2 実行手順

```bash
# 1. Dry Run（確認のみ）
DRY_RUN=true npx tsx scripts/migrate-logs-to-sessions.ts

# 2. 本実行（少数でテスト）
LIMIT=10 npx tsx scripts/migrate-logs-to-sessions.ts

# 3. 全件実行
npx tsx scripts/migrate-logs-to-sessions.ts

# 4. 結果確認
npx drizzle-kit studio
# → sessions テーブルを確認
# → log_entries の sessionId が埋まっているか確認
```

---

## 6. テスト戦略

### 6.1 後方互換性テスト

```typescript
// __tests__/migration/backward-compatibility.test.ts

describe('Backward Compatibility', () => {
  it('should still create logs without sessionId', async () => {
    const log = await logService.createLog({
      userId: 'test-user',
      type: 'practice',
      content: 'Test log',
      // sessionId を指定しない
    });

    expect(log.id).toBeDefined();
    expect(log.sessionId).toBeNull();
  });

  it('should list logs regardless of sessionId', async () => {
    const logs = await logService.listLogs({
      userId: 'test-user',
    });

    // sessionId有り・無し両方が取得できること
    expect(logs.length).toBeGreaterThan(0);
  });
});
```

### 6.2 Session統合テスト

```typescript
// __tests__/integration/session-creation.test.ts

describe('Session Creation Flow', () => {
  it('should create session with questions', async () => {
    const result = await sessionService.createSession({
      userId: 'test-user',
      type: 'composition',
      title: 'Test Session',
      userShortNote: 'サビのコード進行を調整',
    });

    expect(result.session.id).toBeDefined();
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.questions.length).toBeLessThanOrEqual(3);
  });

  it('should update session when log is added', async () => {
    const session = await createTestSession();

    const log = await logService.createLog({
      userId: 'test-user',
      sessionId: session.id,
      type: 'creation',
      content: 'Additional work',
    });

    const updatedSession = await sessionRepo.findById(session.id);

    expect(updatedSession.messageCount).toBe(session.messageCount + 1);
    expect(updatedSession.lastActivityAt.getTime()).toBeGreaterThan(
      session.lastActivityAt.getTime()
    );
  });
});
```

### 6.3 E2Eテスト

```typescript
// e2e/muednote-session-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('MUEDnote Session Flow', () => {
  test('should create session and answer questions', async ({ page }) => {
    await page.goto('/muednote');

    // Sessionタブに切り替え
    await page.click('button:has-text("セッション（新機能）")');

    // 新規セッション作成
    await page.click('button:has-text("新規セッション")');

    await page.selectOption('select[name="type"]', 'composition');
    await page.fill('input[name="title"]', 'Test Session');
    await page.fill('textarea[name="userShortNote"]', 'サビのコード進行を調整');

    await page.click('button:has-text("セッション開始")');

    // 質問が表示されるまで待つ
    await page.waitForSelector('.question-card', { timeout: 10000 });

    // 質問数確認
    const questions = await page.$$('.question-card');
    expect(questions.length).toBeGreaterThanOrEqual(2);

    // 最初の質問に回答
    await page.fill('textarea[data-question-id]', 'コードの響きは落ち着いた感じ');
    await page.click('button:has-text("回答を送信")');

    // 回答が保存されたことを確認
    await page.waitForSelector('.interview-history');
  });

  test('should display both timeline and sessions', async ({ page }) => {
    await page.goto('/muednote');

    // タイムラインタブ
    await page.click('button:has-text("タイムライン（従来）")');
    await expect(page.locator('.timeline-entry')).toBeVisible();

    // セッションタブ
    await page.click('button:has-text("セッション（新機能）")');
    await expect(page.locator('.session-card')).toBeVisible();
  });
});
```

---

## 7. ロールバック計画

### 7.1 緊急ロールバック手順

```bash
# 1. Feature Flag で新機能を無効化
# .env.local
MUEDNOTE_SESSION_ENABLED=false
MUEDNOTE_INTERVIEW_ENABLED=false

# 2. Vercel に再デプロイ
vercel --prod

# 3. データベースのロールバック（必要な場合）
# マイグレーションを戻す
npx drizzle-kit drop:pg --migration 0009_create_sessions

# 4. ログ確認
tail -f /var/log/muednote.log
```

### 7.2 部分的ロールバック

```typescript
// 特定のSessionを無効化

async function disableSession(sessionId: string) {
  await db
    .update(sessions)
    .set({
      isActive: false,
      isArchived: true,
    })
    .where(eq(sessions.id, sessionId));

  // 関連するログのsessionIdをクリア
  await db
    .update(logEntries)
    .set({ sessionId: null })
    .where(eq(logEntries.sessionId, sessionId));
}
```

---

## 8. 監視とアラート

### 8.1 メトリクス収集

```typescript
// lib/monitoring/metrics.ts

export const sessionMetrics = {
  // Session作成の成功率
  sessionCreationSuccess: new Counter({
    name: 'muednote_session_creation_success_total',
    help: 'Total number of successful session creations',
  }),

  sessionCreationFailure: new Counter({
    name: 'muednote_session_creation_failure_total',
    help: 'Total number of failed session creations',
  }),

  // Analyzer処理時間
  analyzerDuration: new Histogram({
    name: 'muednote_analyzer_duration_seconds',
    help: 'Duration of analyzer processing',
    buckets: [0.1, 0.5, 1, 2, 5],
  }),

  // Interview質問生成の成功率
  questionGenerationSuccess: new Counter({
    name: 'muednote_question_generation_success_total',
    help: 'Total number of successful question generations',
  }),

  // RAG検索の実行時間
  ragSearchDuration: new Histogram({
    name: 'muednote_rag_search_duration_seconds',
    help: 'Duration of RAG search',
    buckets: [0.05, 0.1, 0.2, 0.5, 1],
  }),
};
```

### 8.2 アラート設定

```yaml
# monitoring/alerts.yaml

alerts:
  - name: HighSessionCreationFailureRate
    expr: |
      rate(muednote_session_creation_failure_total[5m])
      /
      rate(muednote_session_creation_success_total[5m])
      > 0.1
    for: 5m
    annotations:
      summary: Session作成失敗率が10%を超えています

  - name: SlowAnalyzerProcessing
    expr: |
      histogram_quantile(0.95, muednote_analyzer_duration_seconds)
      > 3
    for: 10m
    annotations:
      summary: Analyzer処理が遅延しています（95%ile > 3秒）

  - name: NoSessionsCreated
    expr: |
      increase(muednote_session_creation_success_total[1h]) == 0
    for: 1h
    annotations:
      summary: 過去1時間でSessionが1つも作成されていません
```

---

## 9. チェックリスト

### 移行前チェックリスト

- [ ] データベースバックアップ取得
- [ ] マイグレーションファイル作成・レビュー完了
- [ ] ローカル環境でのマイグレーション動作確認
- [ ] 既存APIの動作確認（後方互換性）
- [ ] 新規APIのE2Eテスト作成
- [ ] Feature Flag設定
- [ ] ロールバック手順書作成
- [ ] チーム全体への移行計画共有

### 移行中チェックリスト

- [ ] マイグレーション実行（開発環境）
- [ ] 既存機能の動作確認
- [ ] 新規機能の動作確認
- [ ] パフォーマンステスト
- [ ] エラーログ監視
- [ ] ユーザーフィードバック収集

### 移行後チェックリスト

- [ ] 全ての新規ログがSessionに紐付いているか確認
- [ ] 既存ログ（sessionId=NULL）の表示確認
- [ ] Session作成率の確認
- [ ] Interview回答率の確認
- [ ] パフォーマンス指標の確認
- [ ] エラー率の確認
- [ ] ユーザー満足度アンケート実施

---

## 10. FAQ

### Q1: 既存のログはどうなりますか？

**A**: 既存のログは削除されません。`sessionId=NULL` として引き続き保存され、タイムライン表示で確認できます。将来的にバッチ処理でSessionにグループ化する予定です。

### Q2: 移行中にユーザーに影響はありますか？

**A**: ダウンタイムはありません。既存機能はそのまま動作し、新機能が追加される形です。ユーザーはタブ切り替えで新旧両方の表示を選択できます。

### Q3: ロールバックは可能ですか？

**A**: はい。Feature Flagで新機能を無効化することで、即座に既存機能のみの状態に戻せます。

### Q4: Session作成が失敗したらどうなりますか？

**A**: フォールバック処理により、最低限のSession（タイトル・メモのみ）が作成されます。Interview質問は後から追加生成可能です。

### Q5: RAG検索が遅い場合は？

**A**: RAG検索はオプションです。MVP版では質問テンプレートのみで動作し、RAGは将来的に有効化します。

---

**ドキュメント終了**

最終更新: 2025-11-19
次回レビュー: 移行完了後

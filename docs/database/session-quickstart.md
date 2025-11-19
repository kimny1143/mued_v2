# Session/Interview Schema - Quick Start Guide

## 🚀 5分でセットアップ

### 1. データベース接続確認

```bash
npm run db:test-connection
```

✅ 成功したら次へ

---

### 2. マイグレーション実行

```bash
npm run db:migrate:sessions
```

これで以下が作成されます：
- ✅ 4つのテーブル（sessions, session_analyses, interview_questions, interview_answers）
- ✅ 4つのENUM型
- ✅ 14個のインデックス
- ✅ 4つのビュー
- ✅ 18個のRLSポリシー

---

### 3. Drizzle Studioで確認

```bash
npm run db:studio
```

ブラウザで `https://local.drizzle.studio` を開き、テーブルを確認。

---

## 📝 基本的な使い方

### セッション作成

```typescript
import { db } from '@/db';
import { sessions } from '@/db/schema';

// 1. セッションを作成
const session = await db.insert(sessions).values({
  userId: user.id,
  type: 'composition',
  title: 'Verse melody refinement',
  userShortNote: 'Worked on making the verse melody more memorable.',
  status: 'draft'
}).returning();
```

### 質問生成（AI）

```typescript
import { interviewQuestions } from '@/db/schema';

// 2. AIが質問を生成
const questions = await db.insert(interviewQuestions).values([
  {
    sessionId: session.id,
    text: 'What feeling were you going for with the new melody?',
    focus: 'emotion',
    depth: 'medium',
    order: 0
  },
  {
    sessionId: session.id,
    text: 'How did you decide on the note choices?',
    focus: 'melody',
    depth: 'shallow',
    order: 1
  }
]).returning();
```

### ユーザー回答

```typescript
import { interviewAnswers } from '@/db/schema';

// 3. ユーザーが回答
const answer = await db.insert(interviewAnswers).values({
  sessionId: session.id,
  questionId: questions[0].id,
  text: 'I wanted it to feel hopeful, so I raised the melody at the end.'
}).returning();
```

### セッション完了

```typescript
import { eq } from 'drizzle-orm';

// 4. セッションを完了
await db.update(sessions)
  .set({
    status: 'completed',
    completedAt: new Date()
  })
  .where(eq(sessions.id, session.id));
```

---

## 🔍 よく使うクエリ

### ユーザーのセッション一覧

```typescript
const userSessions = await db.query.sessions.findMany({
  where: eq(sessions.userId, user.id),
  orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
  limit: 20
});
```

### セッション詳細（Q&A含む）

```typescript
const sessionDetails = await db.query.sessions.findFirst({
  where: eq(sessions.id, sessionId),
  with: {
    analysis: true,
    questions: {
      with: { answers: true },
      orderBy: (q, { asc }) => [asc(q.order)]
    }
  }
});
```

### 公開セッション検索

```typescript
const publicSessions = await db.query.sessions.findMany({
  where: and(
    eq(sessions.isPublic, true),
    eq(sessions.status, 'completed')
  ),
  orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
  limit: 50
});
```

---

## 🛠️ トラブルシューティング

### Q: マイグレーションが失敗する

```bash
# 接続確認
npm run db:test-connection

# ロールバック後に再実行
npm run db:rollback:sessions
npm run db:migrate:sessions
```

### Q: RLSエラーが出る

```typescript
// アプリケーションコードで必ずこれを実行
import { sql } from 'drizzle-orm';

await db.execute(
  sql`SET LOCAL app.current_user_id = ${clerkUserId}`
);
```

### Q: テーブルが見つからない

```bash
# Drizzle型を再生成
npm run db:generate

# スキーマをプッシュ
npm run db:push
```

---

## 📚 次のステップ

1. **詳細ドキュメント**: [session-interview-schema.md](./session-interview-schema.md)
2. **API実装**: `/app/api/sessions` エンドポイントを作成
3. **UI実装**: `/app/(dashboard)/sessions` ページを作成
4. **テスト**: `tests/integration/sessions.test.ts` を作成

---

## 🗑️ ロールバック（削除）

**⚠️ 警告: 全データが削除されます！**

```bash
npm run db:rollback:sessions
```

確認プロンプトが出るので `yes` を入力。

---

## 📞 サポート

問題が発生した場合：

1. [トラブルシューティングガイド](./session-interview-schema.md#troubleshooting)
2. [Neon ログ確認](https://console.neon.tech/)
3. [Issue作成](https://github.com/your-repo/issues)

---

**Happy Coding! 🎵**

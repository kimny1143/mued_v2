<!-- ⚠️ DEPRECATED DOCUMENT ⚠️ -->
<!-- This document has been archived on 2025-11-19 -->
<!-- Reason: Superseded by Session/Interview Architecture -->
<!-- See: /docs/archive/phase1.1-deprecated/README.md for details -->
<!-- DO NOT USE FOR NEW DEVELOPMENT -->

---

# Phase 1.1 Implementation Plan: MUEDnote 対話品質向上

**Status**: ❌ **DEPRECATED** (2025-11-19)
**Superseded By**: Session/Interview Architecture
**See**: `/docs/implementation/MUEDNOTE_SESSION_INTERVIEW_IMPLEMENTATION_PLAN.md`

---

## ⚠️ DEPRECATION NOTICE

**This document represents an abandoned implementation approach and should not be used for new development.**

### Why This Was Deprecated

This plan described a simple `log_entries` table approach with basic AI formatting and tagging. This does **not align** with the business plan's vision for MUEDnote, which requires a **Session/Interview architecture**.

**Correct Implementation**: See `/docs/business/MUEDnote企画v1.md` for the Session/Interview architecture.

---

## Original Content (Archived for Historical Reference)

**Priority**: P1 (High) - **SUPERSEDED**
**Dependencies**: Phase 1.0 MVP Complete ✅ - **SUPERSEDED**
**Target Completion**: 1-2 weeks - **SUPERSEDED**

---

## 📋 Overview

Phase 1.1では、Phase 1.0で実装した基本的なチャット機能に対して、以下の3つの改善を加えます：

1. **曖昧性検知と追加質問** - ユーザーの入力が不十分な場合、AIが追加質問を行う
2. **AI性格システム（基本）** - AIの応答にパーソナリティを付与
3. **タグフィルタリング** - タイムラインでタグ別の絞り込み表示

---

## 🎯 Feature 1: 曖昧性検知と追加質問

### 背景・課題

Phase 1.0では、ユーザーが「CMの作曲をした」のような簡潔な入力を行った場合、AIはそのまま応答を返していました。しかし、教育的な観点からは、より詳細な情報を引き出すべきです。

**例:**
- **入力**: "CMの作曲をした"
- **Phase 1.0の応答**: そのまま記録
- **Phase 1.1の期待動作**: "どんなことをした？（メロディ出し？トラックメイク？）"

### 実装戦略

#### 1. プロンプト改善（システムメッセージ）

AIに「曖昧な入力を検知し、追加質問を行う」ための指示を追加します。

**ファイル**: `/app/api/muednote/chat/route.ts`

```typescript
const systemPrompt = `あなたはMUEDnoteの音楽学習アシスタントです。

【役割】
- ユーザーの音楽活動を記録し、整理します
- 不足している情報があれば、追加質問を行います
- 教育的な観点から、具体的な情報を引き出します

【曖昧性検知ルール】
以下の場合は、追加質問を行ってください：

1. **活動内容が不明確**
   - 例: "作曲をした" → "どんなジャンルの曲ですか？メロディ作り？アレンジ？"

2. **練習内容が抽象的**
   - 例: "ピアノを練習した" → "どの曲を？どんな技術を練習しましたか？"

3. **感情表現のみ**
   - 例: "楽しかった" → "何が楽しかったですか？具体的に教えてください"

【応答フォーマット】
追加質問が必要な場合:
【質問】
<追加質問の内容>

【整形後】
<現在わかっている範囲で整形>

【タグ】
<仮のタグ>

【コメント】
もう少し詳しく教えてもらえると、より良い記録になります！

情報が十分な場合:
【整形後】
<整形されたテキスト>

【タグ】
#tag1 #tag2

【コメント】
<AIからのコメント>
`;
```

#### 2. UI改善（質問表示）

AIからの質問を視覚的に区別して表示します。

**ファイル**: `/components/features/muednote/ChatMessage.tsx`

```typescript
// 質問を含む応答の検出
const hasQuestion = message.parts.some(part =>
  part.type === 'text' && part.text.includes('【質問】')
);

// 質問部分の抽出
const questionMatch = aiText.match(/【質問】\s*([\s\S]*?)(?=【整形後】|$)/);
const question = questionMatch ? questionMatch[1].trim() : null;

// UIで質問を強調表示
{question && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-2">
    <p className="font-medium text-yellow-800">追加情報をお聞きしたいです：</p>
    <p className="text-yellow-700">{question}</p>
  </div>
)}
```

#### 3. 会話コンテキストの保持

追加質問への応答を元の入力と関連付けて保存します。

**ファイル**: `/app/api/muednote/save/route.ts`

```typescript
// 会話履歴を考慮した保存
const aiSummary: AISummary = {
  formatted: parsed.formatted,
  tags: parsed.tags,
  comment: parsed.comment,
  hasFollowUp: parsed.hasQuestion, // 追加質問があったか
  conversationContext: {
    originalInput: userMessage,
    followUpQuestion: parsed.question || null,
    followUpAnswer: null, // 次の応答で更新
  }
};
```

### 成功基準

- [ ] AIが不十分な入力に対して80%以上の確率で追加質問を行う
- [ ] 追加質問がUI上で視覚的に区別される
- [ ] 会話の流れがデータベースに正しく保存される

---

## 🎭 Feature 2: AI性格システム（基本）

### 背景・課題

現在のAIは機械的な応答を返します。Phase 1.1では、ユーザーに寄り添う「パーソナリティ」を持たせます。

### 実装戦略

#### 1. パーソナリティ定義

**ファイル**: `/lib/ai/muednote-personality.ts`

```typescript
export const MUEDNOTE_PERSONALITY = {
  name: "MUEDnoteアシスタント",
  traits: [
    "励ましが上手で、ポジティブなフィードバックを心がける",
    "音楽用語に詳しく、適切なアドバイスができる",
    "ユーザーの小さな進歩も見逃さず、褒める",
    "難しすぎる目標ではなく、達成可能なステップを提案する"
  ],
  tone: "フレンドリーだが、教育的",
  examples: {
    encouragement: [
      "すごい！その調子です！",
      "いいアプローチですね！",
      "着実に進歩していますよ！"
    ],
    advice: [
      "次は〜を試してみるのはどうでしょう？",
      "〜を意識すると、さらに良くなりますよ",
      "この練習は〜に効果的です"
    ],
    questions: [
      "どんな感じでしたか？",
      "難しかった部分はありますか？",
      "次はどんなことに挑戦したいですか？"
    ]
  }
};
```

#### 2. システムプロンプトへの統合

```typescript
const systemPrompt = `${MUEDNOTE_PERSONALITY.traits.join('\n')}

【応答スタイル】
- トーン: ${MUEDNOTE_PERSONALITY.tone}
- 励まし: 小さな進歩も見逃さず、具体的に褒める
- アドバイス: 押し付けがましくなく、選択肢を提示する
- 質問: オープンエンド型で、詳細を引き出す

【例】
✅ 良い応答:
"Cメジャースケールの練習、お疲れ様です！指の動きがスムーズになってきているのではないでしょうか？次は少しテンポを上げてみるのも良いかもしれませんね。"

❌ 避けるべき応答:
"練習しました。次回も頑張ってください。"
`;
```

### 成功基準

- [ ] AIの応答が機械的でなく、励ましや共感を含む
- [ ] ユーザーテストで「親しみやすい」と評価される（80%以上）
- [ ] 応答の一貫性が保たれる（パーソナリティのブレがない）

---

## 🏷️ Feature 3: タグフィルタリング

### 背景・課題

Phase 1.0ではタグは表示されるものの、フィルタリング機能がありません。ユーザーが過去の記録を振り返る際に不便です。

### 実装戦略

#### 1. タグ一覧取得API

**ファイル**: `/app/api/muednote/tags/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/edge';
import { logEntries } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Get all tags used by the user with counts
 * GET /api/muednote/tags
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // PostgreSQL JSONB array aggregation
    const result = await db.execute(sql`
      SELECT
        tag,
        COUNT(*) as count
      FROM (
        SELECT DISTINCT jsonb_array_elements_text(tags) as tag
        FROM ${logEntries}
        WHERE user_id = ${session.userId}
      ) t
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `);

    return NextResponse.json({
      tags: result.rows.map(row => ({
        name: row.tag,
        count: parseInt(row.count as string),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
```

#### 2. タグフィルタUI

**ファイル**: `/components/features/muednote/TagFilter.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Tag {
  name: string;
  count: number;
}

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/muednote/tags');
      const data = await response.json();
      setTags(data.tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearFilters = () => {
    onTagsChange([]);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">読み込み中...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">タグで絞り込み</h3>
        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            クリア
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag.name}
            variant={selectedTags.includes(tag.name) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleTag(tag.name)}
          >
            {tag.name} ({tag.count})
          </Badge>
        ))}
      </div>
    </div>
  );
}
```

#### 3. タグフィルタ統合（タイムライン）

**ファイル**: `/components/features/muednote/TimelineContainer.tsx`

```typescript
// 追加: タグフィルタ状態
const [selectedTags, setSelectedTags] = useState<string[]>([]);

// API呼び出し時にタグフィルタを適用
const loadEntries = async (offset: number) => {
  const tagParams = selectedTags.length > 0
    ? `&tags=${selectedTags.join(',')}`
    : '';

  const response = await fetch(
    `/api/muednote/logs?limit=${pagination.limit}&offset=${offset}${tagParams}`
  );
  // ...
};

// UI
return (
  <div className="space-y-4">
    <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} />
    {/* ... existing timeline */}
  </div>
);
```

#### 4. API修正（タグフィルタ対応）

**ファイル**: `/app/api/muednote/logs/route.ts`

```typescript
// タグフィルタパラメータの取得
const tagsParam = url.searchParams.get('tags');
const tagFilter = tagsParam ? tagsParam.split(',') : [];

// Drizzle ORMでのタグフィルタ
let query = db
  .select()
  .from(logEntries)
  .where(eq(logEntries.userId, session.userId));

if (tagFilter.length > 0) {
  // PostgreSQL JSONB contains operator
  query = query.where(
    sql`${logEntries.tags} @> ${JSON.stringify(tagFilter)}::jsonb`
  );
}

const entries = await query
  .orderBy(desc(logEntries.createdAt))
  .limit(Math.min(limit, 100))
  .offset(offset);
```

### 成功基準

- [ ] タグ一覧が正しく取得・表示される
- [ ] タグをクリックすると、該当するエントリのみが表示される
- [ ] 複数タグのAND検索が機能する
- [ ] フィルタのクリアが正常に動作する

---

## 📅 Implementation Timeline

### Week 1: Core Features
- **Day 1-2**: 曖昧性検知プロンプト実装
- **Day 3**: AI性格システム実装
- **Day 4-5**: タグフィルタリング実装

### Week 2: Testing & Refinement
- **Day 1-2**: E2Eテスト追加
- **Day 3**: ユーザビリティテスト
- **Day 4**: バグ修正
- **Day 5**: デプロイ

---

## 🧪 Testing Strategy

### E2E Test Scenarios

**ファイル**: `/e2e/muednote-phase1.1.spec.ts`

```typescript
test.describe('MUEDnote Phase 1.1', () => {
  test('should ask follow-up questions for ambiguous input', async ({ page }) => {
    await page.goto('/muednote');

    // Send ambiguous message
    await page.fill('textarea', 'CMの作曲をした');
    await page.click('button[type="submit"]');

    // Wait for AI response
    await page.waitForSelector('text=/追加情報をお聞きしたいです/');
    await expect(page.getByText(/どんなことをした/)).toBeVisible();
  });

  test('should filter timeline by tags', async ({ page }) => {
    await page.goto('/muednote/timeline');

    // Click on a tag filter
    await page.click('text=/#作曲/');

    // Verify filtered results
    const entries = await page.locator('[data-testid="timeline-entry"]').all();
    for (const entry of entries) {
      await expect(entry).toContainText('#作曲');
    }
  });

  test('should show AI personality in responses', async ({ page }) => {
    await page.goto('/muednote');

    await page.fill('textarea', 'ピアノでCメジャースケールを練習した');
    await page.click('button[type="submit"]');

    // Wait for encouraging response
    await page.waitForSelector('text=/すごい|良いですね|お疲れ様/');
  });
});
```

---

## 🚀 Deployment Checklist

- [ ] プロンプト変更をステージング環境でテスト
- [ ] タグフィルタAPIのパフォーマンステスト（1000タグ以上）
- [ ] AIの応答品質を10サンプル以上で確認
- [ ] E2Eテスト全通過
- [ ] ユーザビリティテスト（5名以上）
- [ ] Vercelデプロイ成功

---

## 📊 Success Metrics

### Technical
- [ ] API応答時間 < 200ms (p95)
- [ ] タグフィルタ応答時間 < 100ms
- [ ] AIの追加質問率: 20-40%（適切な範囲）

### User Experience
- [ ] ユーザー満足度 > 4.0/5.0
- [ ] 「AIが親しみやすい」評価 > 80%
- [ ] タグフィルタ使用率 > 50%

---

**Created**: 2025-11-19
**Deprecated**: 2025-11-19
**Target Completion**: ~~2025-12-03~~ CANCELLED
**Owner**: ~~Development Team~~ DEPRECATED

---

<!-- END OF ARCHIVED DOCUMENT -->

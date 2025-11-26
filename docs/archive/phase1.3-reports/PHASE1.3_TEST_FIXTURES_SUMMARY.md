# Phase 1.3 Test Fixtures Summary

**作成日**: 2025-11-20
**対象**: InterviewerService, RAGService, Interview API テスト用フィクスチャ
**ステータス**: ✅ Complete

---

## エグゼクティブサマリー

Phase 1.3の実装に必要な包括的なテストフィクスチャとヘルパー関数を作成しました。

### 作成ファイル

1. **`tests/fixtures/phase1.3-fixtures.ts`** (600+ lines)
   - 7つのfocusArea別サンプルセッション
   - 21個の質問テンプレート（7 focusArea × 3 depth）
   - 14個のサンプル埋め込みベクトル（1536次元）
   - 10個のRAGグラウンドトゥルースクエリ
   - Factory関数（動的テストデータ生成）
   - Helper関数（検索・評価）

2. **`tests/mocks/openai.mock.ts`** (更新)
   - Embeddings API モック追加
   - 決定的なベクトル生成関数
   - Interviewer専用レスポンス（harmony/melody/rhythm）

3. **`tests/utils/test-helpers.ts`** (550+ lines)
   - ベクトル演算関数（コサイン類似度、ユークリッド距離）
   - RAG品質メトリクス計算（Precision, Recall, F1, MRR, NDCG）
   - データベースシード関数
   - テスト用ユーティリティ

4. **`scripts/verify-phase1.3-fixtures.ts`**
   - フィクスチャ検証スクリプト
   - 実行結果: **🎉 All checks passed!**

---

## 1. Mock Sessions（サンプルセッション）

### 概要
7つのfocusAreaそれぞれに対応したサンプルセッションを提供。

```typescript
export const mockSessions: MockSession[] = [
  {
    id: 'session-001',
    userId: 'user-001',
    type: 'composition',
    title: 'Dメジャーのバラード制作',
    userShortNote: 'サビのコード進行をFからGに変更した',
    aiAnnotations: {
      focusArea: 'harmony',
      intentHypothesis: 'サビへの流れを滑らかにする意図',
      confidence: 0.85,
    },
    createdAt: new Date('2025-01-15T10:00:00Z'),
  },
  // ... 他6セッション
];
```

### カバレッジ

| FocusArea | Session ID | User Note Example |
|-----------|------------|-------------------|
| harmony | session-001 | サビのコード進行をFからGに変更した |
| melody | session-002 | サビのメロディラインを高音域に移動した |
| rhythm | session-003 | ドラムのハイハットパターンを16分音符に変更した |
| mix | session-004 | ベースの音量を少し下げてギターを前に出した |
| emotion | session-005 | 短調のコードを増やして、テンポを遅くした |
| image | session-006 | シンセパッドで波の音を追加した |
| structure | session-007 | サビの後にブリッジセクションを追加した |

---

## 2. Question Templates（質問テンプレート）

### 概要
7 focusArea × 3 depth = **21個**の質問テンプレート。

### 深さ（Depth）の定義

- **shallow**: 事実確認レベル（「どのコードを使いましたか？」）
- **medium**: 意図確認レベル（「なぜ変更しましたか？」）
- **deep**: 本質探求レベル（「この変更が表現したい感情の本質は？」）

### サンプル

```typescript
// harmony × shallow
{
  id: 'qt-harmony-shallow-001',
  focus: 'harmony',
  depth: 'shallow',
  template: 'どのコードを使いましたか？',
  priority: 10,
}

// harmony × medium
{
  id: 'qt-harmony-medium-001',
  focus: 'harmony',
  depth: 'medium',
  template: 'コード進行を変更した理由は何ですか？',
  priority: 5,
}

// harmony × deep
{
  id: 'qt-harmony-deep-001',
  focus: 'harmony',
  depth: 'deep',
  template: 'この和音進行が表現したい感情の本質は何ですか？',
  priority: 1,
}
```

### 全質問テンプレート数

| FocusArea | Shallow | Medium | Deep | Total |
|-----------|---------|--------|------|-------|
| harmony | 1 | 1 | 1 | 3 |
| melody | 1 | 1 | 1 | 3 |
| rhythm | 1 | 1 | 1 | 3 |
| mix | 1 | 1 | 1 | 3 |
| emotion | 1 | 1 | 1 | 3 |
| image | 1 | 1 | 1 | 3 |
| structure | 1 | 1 | 1 | 3 |
| **Total** | **7** | **7** | **7** | **21** |

---

## 3. Mock Embeddings（埋め込みベクトル）

### 概要
OpenAI `text-embedding-ada-002` 互換の**1536次元ベクトル**。

### 特徴

1. **決定的な生成**: 同じテキストは常に同じベクトルを生成
2. **正規化**: 値範囲 `[-1, 1]`
3. **ハッシュベース**: テキストのハッシュ値からsin関数で生成

### 生成アルゴリズム

```typescript
function generateDeterministicVector(text: string, seed = 0): number[] {
  const dim = 1536;
  const hashCode = text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, seed);

  return Array.from({ length: dim }, (_, i) => {
    const value = Math.sin(hashCode + i * 0.1);
    return Math.max(-1, Math.min(1, value));
  });
}
```

### サンプルデータ

- セッションノート用: 7個
- クエリ用: 7個
- 合計: **14個**

---

## 4. RAG Ground Truth（グラウンドトゥルース）

### 概要
RAG検索品質テスト用の正解ラベル。

### データ構造

```typescript
export interface RAGGroundTruth {
  query: string;
  expectedResults: string[]; // Session IDs
  minSimilarity?: number;
}
```

### サンプル

```typescript
{
  query: 'コード進行を変更した',
  expectedResults: ['session-001', 'session-005'],
  minSimilarity: 0.7,
}
```

### 統計

- クエリ数: **10個**
- 平均期待結果数: **1.4個/クエリ**
- 類似度閾値範囲: 0.6 ~ 0.75

---

## 5. Factory Functions（動的データ生成）

### Phase13FixtureFactory

```typescript
// セッション作成
const session = Phase13FixtureFactory.createSession({
  userId: 'custom-user',
  aiAnnotations: { focusArea: 'melody', ... },
});

// 質問作成
const question = Phase13FixtureFactory.createQuestion('session-001', {
  focus: 'harmony',
  depth: 'deep',
});

// 回答作成
const answer = Phase13FixtureFactory.createAnswer('q-001', {
  text: 'カスタム回答',
});

// バッチ作成
const sessions = Phase13FixtureFactory.createBatchSessions(5, 'harmony');
```

---

## 6. Helper Functions（ヘルパー関数）

### ベクトル演算

```typescript
// コサイン類似度
const similarity = cosineSimilarity(vec1, vec2); // 0.0 ~ 1.0

// ユークリッド距離
const distance = euclideanDistance(vec1, vec2);

// 正規化
const normalized = normalizeVector(vec);

// Top-K検索
const topK = findTopKSimilar(queryVec, corpus, k);
```

### RAG品質メトリクス

```typescript
// Precision, Recall, F1
const metrics = calculateRAGMetrics(retrievedResults, expectedResults);
// => { precision: 0.8, recall: 0.75, f1: 0.77 }

// Mean Reciprocal Rank
const mrr = calculateMRR(retrievedResults, expectedResults);

// Normalized Discounted Cumulative Gain
const ndcg = calculateNDCG(retrievedResults, expectedWithRelevance);
```

### データベースシード

```typescript
await seedTestDatabase(db, {
  sessions: mockSessions,
  questionTemplates: mockQuestionTemplates,
  embeddings: mockRAGEmbeddings,
  questions: mockInterviewQuestions,
  answers: mockInterviewAnswers,
});
```

---

## 7. OpenAI Mock拡張

### Embeddings API

```typescript
const mockOpenAI = new MockOpenAI();

// 埋め込み生成
const response = await mockOpenAI.embeddings.create({
  input: 'テキスト',
  model: 'text-embedding-ada-002',
});

// => { data: [{ embedding: [0.1, 0.2, ...] }] }
```

### Interviewer専用レスポンス

```typescript
mockResponses.interviewQuestionsHarmony // harmony用質問
mockResponses.interviewQuestionsMelody  // melody用質問
mockResponses.interviewQuestionsRhythm  // rhythm用質問
```

---

## 8. 検証結果

### 実行コマンド

```bash
npx tsx scripts/verify-phase1.3-fixtures.ts
```

### 検証項目

| 項目 | 期待値 | 実測値 | 結果 |
|------|--------|--------|------|
| Mock Sessions | 7 (7 focusAreas) | 7 | ✅ |
| Question Templates | 21 (7×3) | 21 | ✅ |
| Embeddings Dimension | 1536 | 1536 | ✅ |
| Deterministic Vectors | Yes | Yes | ✅ |
| RAG Ground Truth | ≥10 queries | 10 | ✅ |
| RAG Embeddings | 7 (match sessions) | 7 | ✅ |
| Factory Functions | All working | All working | ✅ |
| Helper Functions | All working | All working | ✅ |

**総合結果**: 🎉 **All checks passed!**

---

## 9. 使用例

### InterviewerService テスト

```typescript
import { mockSessions, phase13Helpers } from '../fixtures/phase1.3-fixtures';

test('should generate questions for harmony focusArea', async () => {
  const session = phase13Helpers.getSessionByFocus('harmony');
  const templates = phase13Helpers.getTemplatesByFocus('harmony');

  const result = await interviewer.generateQuestions({
    sessionId: session.id,
    focusArea: session.aiAnnotations.focusArea,
    intentHypothesis: session.aiAnnotations.intentHypothesis,
    userShortNote: session.userShortNote,
  });

  expect(result.questions.length).toBeGreaterThanOrEqual(2);
  expect(result.questions.length).toBeLessThanOrEqual(3);
});
```

### RAGService テスト

```typescript
import { mockEmbeddings, ragGroundTruth, calculateRAGMetrics } from '../fixtures/phase1.3-fixtures';

test('should retrieve similar sessions', async () => {
  const gt = ragGroundTruth[0]; // 'コード進行を変更した'
  const queryEmbedding = mockEmbeddings[gt.query];

  const results = await rag.findSimilarLogs(queryEmbedding, 5);
  const resultIds = results.map(r => r.sessionId);

  const metrics = calculateRAGMetrics(resultIds, gt.expectedResults);
  expect(metrics.precision).toBeGreaterThan(0.7);
});
```

### Interview API テスト

```typescript
import { mockSessions, mockInterviewQuestions } from '../fixtures/phase1.3-fixtures';

test('POST /api/interview/questions', async () => {
  const session = mockSessions[0];

  const response = await fetch('/api/interview/questions', {
    method: 'POST',
    body: JSON.stringify({ sessionId: session.id }),
  });

  const data = await response.json();
  expect(data.questions.length).toBeGreaterThan(0);
});
```

---

## 10. ファイル構成

```
tests/
├── fixtures/
│   └── phase1.3-fixtures.ts          (600+ lines) ✅
├── mocks/
│   └── openai.mock.ts                (更新) ✅
├── utils/
│   └── test-helpers.ts               (550+ lines) ✅
└── unit/
    └── fixtures/
        └── phase1.3-fixtures.test.ts (検証テスト) ✅

scripts/
└── verify-phase1.3-fixtures.ts       (検証スクリプト) ✅
```

---

## 11. 次のステップ

### Day 13-15: InterviewerService実装

フィクスチャを使用してTDD（テスト駆動開発）で実装：

1. **`lib/services/interviewer.service.ts`** 作成
   - `generateQuestions()` メソッド
   - `mockQuestionTemplates` を使用したテンプレート検索
   - OpenAI GPT-5-mini 統合

2. **ユニットテスト**
   - `mockSessions` を使用した7 focusAreaテスト
   - `mockOpenAI` を使用したAPI応答モック
   - エッジケース（API失敗時のフォールバック）

3. **統合テスト**
   - `seedTestDatabase()` でフィクスチャ投入
   - 実際のRAG検索フロー検証

---

## 12. まとめ

### 成果物

✅ **3つの主要ファイル作成**
- `tests/fixtures/phase1.3-fixtures.ts` (600+ lines)
- `tests/utils/test-helpers.ts` (550+ lines)
- `scripts/verify-phase1.3-fixtures.ts` (検証スクリプト)

✅ **1つのファイル拡張**
- `tests/mocks/openai.mock.ts` (Embeddings API追加)

✅ **包括的なカバレッジ**
- 7 focusArea × 3 depth = 21 質問テンプレート
- 14個の埋め込みベクトル（1536次元）
- 10個のRAGグラウンドトゥルース
- Factory & Helper関数

✅ **検証済み**
- 全チェック項目合格
- 決定的なベクトル生成確認
- 型安全性確認（TypeScript strict mode）

### 品質基準達成

- [x] 7つの focusArea すべてに対応したサンプル
- [x] 21個の質問テンプレート（7 focus × 3 depth）
- [x] 10個以上のサンプル埋め込みベクトル
- [x] 10個以上のRAGグラウンドトゥルースクエリ
- [x] 型安全性（TypeScript strict mode対応）

---

**作成日**: 2025-11-20
**検証日**: 2025-11-20
**ステータス**: ✅ Complete & Verified

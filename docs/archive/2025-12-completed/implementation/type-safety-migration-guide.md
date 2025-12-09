# Type Safety Migration Guide

**最終更新:** 2025-11-12
**対象:** 開発者・技術リード
**ステータス:** ✅ Phase 2.5 実装完了

---

## 目次

1. [移行概要](#1-移行概要)
2. [現状分析](#2-現状分析)
3. [移行戦略](#3-移行戦略)
4. [実装パターン](#4-実装パターン)
5. [移行手順](#5-移行手順)
6. [テスト戦略](#6-テスト戦略)
7. [チーム教育](#7-チーム教育)
8. [メトリクスと評価](#8-メトリクスと評価)
9. [ベストプラクティス](#9-ベストプラクティス)
10. [トラブルシューティング](#10-トラブルシューティング)

---

## 1. 移行概要

### 1.1 目的と期待効果

**主要目的:**
- コンパイル時型エラー検出の向上
- IDE 補完機能の改善
- リファクタリング容易性の向上
- バグの早期発見

**期待効果:**

| 項目 | Before | After | 改善率 |
|------|--------|-------|--------|
| `any` 型使用箇所 | 28 | 12 | **57%削減** |
| TypeScript エラー | 多数 | 0 | **100%解消** |
| 型カバレッジ | 推定 60% | 推定 85% | **+25pt** |
| リファクタリング時間 | - | 推定 30%短縮 | - |

### 1.2 対象範囲

**Phase 2.5 で完了した範囲:**
- ✅ OpenAI API 型定義（`types/openai.d.ts`）
- ✅ abcjs ライブラリ型定義（`types/abcjs.d.ts`）
- ✅ AI 生成関連ファイル（4ファイル）
- ✅ API routes（1ファイル）

**Phase 3 での実施予定:**
- ⏳ コンポーネント Props 型の厳格化
- ⏳ ユーティリティ関数の型定義
- ⏳ 残りの `any` 型（12箇所）の削減

### 1.3 タイムライン

```
Phase 2.5（完了）: 2025-11-01 〜 2025-11-12
├─ OpenAI API 型定義作成
├─ abcjs 型定義作成
└─ 28 → 12 any 削減

Phase 3a（予定）: 2025-11-15 〜 2025-11-30
├─ コンポーネント Props 型
├─ ユーティリティ関数型
└─ 12 → 5 any 削減

Phase 3b（予定）: 2025-12-01 〜 2025-12-15
├─ 残りの any 削減
├─ strict mode 有効化
└─ 型カバレッジ 90%+ 達成
```

---

## 2. 現状分析

### 2.1 型安全性の問題箇所

#### Phase 2.5 実施前の状況

**any 型の使用箇所（28箇所）:**

| カテゴリ | 箇所数 | 優先度 |
|---------|--------|--------|
| OpenAI API 呼び出し | 8 | **Critical** |
| abcjs ライブラリ使用 | 12 | **High** |
| イベントハンドラー | 3 | Medium |
| ユーティリティ関数 | 5 | Low |

**具体例（修正前）:**

```typescript
// ❌ Bad: any 型の乱用
const params: any = {
  model: 'gpt-5-mini',
  messages: [...],
};

const response: any = await openai.chat.completions.create(params);
```

#### Phase 2.5 実施後の改善

**any 型削減: 28 → 12（57%削減）**

| カテゴリ | Before | After | 削減率 |
|---------|--------|-------|--------|
| OpenAI API | 8 | 1 | **87%** |
| abcjs ライブラリ | 12 | 5 | **58%** |
| イベントハンドラー | 3 | 2 | 33% |
| ユーティリティ | 5 | 4 | 20% |

**改善例（修正後）:**

```typescript
// ✅ Good: 型定義の使用
import type { OpenAICompletionParams } from '@/types/openai';

const params: OpenAICompletionParams = {
  model: 'gpt-5-mini',
  messages: [...],
  max_completion_tokens: 2000,
};

const response: OpenAICompletionResponse = await openai.chat.completions.create(params);
```

### 2.2 優先度評価

#### Critical: ビジネスロジック

**対象ファイル:**
- `lib/ai/quick-test-generator.ts` ✅ 完了
- `lib/ai/weak-drill-generator.ts` ✅ 完了
- `lib/openai.ts` ✅ 部分完了（1箇所保持）

**理由:** 型エラーがビジネスロジックの誤動作に直結

#### High: API レスポンス

**対象ファイル:**
- `app/api/ai/parse-material-request/route.ts` ✅ 完了
- `app/api/materials/generate/route.ts` ⏳ Phase 3

**理由:** クライアントとの契約違反を防ぐ

#### Medium: UI コンポーネント

**対象ファイル:**
- `components/features/materials/*.tsx` ⏳ Phase 3
- `components/ui/*.tsx` ⏳ Phase 3

**理由:** Props の誤用を防ぐ

---

## 3. 移行戦略

### 3.1 段階的アプローチ

#### Phase 1: スキーマ定義の厳格化（✅ 完了）

**目標:** 外部ライブラリの型定義を作成

**実施内容:**
1. OpenAI API 型定義作成（`types/openai.d.ts`）
2. abcjs ライブラリ型定義作成（`types/abcjs.d.ts`）
3. 既存コードへの適用

**成果:**
```typescript
// types/openai.d.ts
export type OpenAIMessage = ChatCompletionMessageParam;

export interface OpenAICompletionParams {
  model: string;
  messages: OpenAIMessage[];
  max_completion_tokens?: number;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: 'text' | 'json_object' };
}
```

```typescript
// types/abcjs.d.ts
export interface TuneObject {
  lines: AbcjsLine[];
  metaText?: Record<string, string>;
  formatting?: AbcjsFormatting;
}

export interface RenderOptions {
  responsive?: 'resize';
  staffwidth?: number;
  add_classes?: boolean;
}
```

#### Phase 2: API レスポンス型の統一（⏳ Phase 3a）

**目標:** API routes の型安全性を確保

**計画:**
1. 共通レスポンス型の定義
2. エラーレスポンスの統一
3. Zod スキーマの活用

**実装例:**

```typescript
// types/api.ts
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

#### Phase 3: コンポーネント Props 型（⏳ Phase 3a）

**目標:** React コンポーネントの Props を厳密に型付け

**計画:**
1. コンポーネントごとに Props interface 定義
2. 必須 / オプションの明確化
3. デフォルト値の型安全化

**実装例:**

```typescript
// components/features/materials/material-card.tsx
interface MaterialCardProps {
  material: Material;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  variant?: 'default' | 'compact';
}

export function MaterialCard({
  material,
  onEdit,
  onDelete,
  variant = 'default',
}: MaterialCardProps) {
  // ...
}
```

### 3.2 ツール活用

#### Zod によるランタイム検証

**導入:**

```typescript
import { z } from 'zod';

// スキーマ定義
const MaterialSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  type: z.enum(['music', 'text', 'video']),
  content: z.object({
    abcNotation: z.string().optional(),
    midiData: z.string().optional(),
  }),
  metadata: z.object({
    level: z.string(),
    instrument: z.string(),
  }).optional(),
});

// 型推論
type Material = z.infer<typeof MaterialSchema>;

// ランタイム検証
const validatedMaterial = MaterialSchema.parse(rawData);
```

#### ts-reset の導入（検討中）

**目的:** TypeScript のデフォルト型を改善

```bash
npm install @total-typescript/ts-reset
```

```typescript
// tsconfig.json に追加
{
  "compilerOptions": {
    "types": ["@total-typescript/ts-reset"]
  }
}
```

**効果:**
- `Array.includes()` の型推論改善
- `Promise.all()` の型推論改善
- `JSON.parse()` のデフォルトが `unknown` に

#### strict mode の段階的有効化（Phase 3b）

**現状:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,
    "strictNullChecks": false
  }
}
```

**Phase 3b での目標:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

---

## 4. 実装パターン

### 4.1 推奨パターン

#### 型ガード関数

**用途:** ランタイムでの型チェック

```typescript
function isMaterialWithMusic(material: Material): material is Material & {
  content: { abcNotation: string; midiData: string };
} {
  return (
    material.type === 'music' &&
    typeof material.content.abcNotation === 'string' &&
    typeof material.content.midiData === 'string'
  );
}

// 使用例
if (isMaterialWithMusic(material)) {
  // この中では material.content.abcNotation は string 型
  playMIDI(material.content.midiData);
}
```

#### ブランド型

**用途:** プリミティブ型の区別

```typescript
type UserId = string & { readonly __brand: 'UserId' };
type MaterialId = string & { readonly __brand: 'MaterialId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

function createMaterialId(id: string): MaterialId {
  return id as MaterialId;
}

// ✅ 型安全
function getMaterial(userId: UserId, materialId: MaterialId) {
  // ...
}

const userId = createUserId('user-123');
const materialId = createMaterialId('material-456');

getMaterial(userId, materialId); // OK
getMaterial(materialId, userId); // ❌ Type Error
```

#### テンプレートリテラル型

**用途:** 文字列パターンの制約

```typescript
type Level = 'beginner' | 'intermediate' | 'advanced';
type Instrument = 'piano' | 'guitar' | 'violin';
type MaterialCode = `${Level}-${Instrument}`;

// ✅ OK
const code1: MaterialCode = 'beginner-piano';
const code2: MaterialCode = 'advanced-guitar';

// ❌ Type Error
const code3: MaterialCode = 'expert-piano';
const code4: MaterialCode = 'beginner-drums';
```

#### Discriminated Union

**用途:** 複数の型バリエーション

```typescript
type MaterialContent =
  | { type: 'music'; abcNotation: string; midiData: string }
  | { type: 'text'; markdown: string }
  | { type: 'video'; videoUrl: string; thumbnail: string };

function renderContent(content: MaterialContent) {
  switch (content.type) {
    case 'music':
      // content.abcNotation が利用可能
      return <MusicPlayer abc={content.abcNotation} />;
    case 'text':
      // content.markdown が利用可能
      return <MarkdownRenderer markdown={content.markdown} />;
    case 'video':
      // content.videoUrl が利用可能
      return <VideoPlayer url={content.videoUrl} />;
  }
}
```

### 4.2 アンチパターン

#### ❌ 回避すべき実装

**1. any の無制限使用**

```typescript
// ❌ Bad
function processData(data: any) {
  return data.items.map((item: any) => item.value);
}

// ✅ Good
interface DataItem {
  value: string;
}

interface Data {
  items: DataItem[];
}

function processData(data: Data): string[] {
  return data.items.map(item => item.value);
}
```

**2. 型アサーションの乱用**

```typescript
// ❌ Bad
const material = response.data as Material;
const id = (material.id as string).toUpperCase();

// ✅ Good
const material = MaterialSchema.parse(response.data);
if (typeof material.id === 'string') {
  const id = material.id.toUpperCase();
}
```

**3. 暗黙的 any の放置**

```typescript
// ❌ Bad (noImplicitAny: false)
function calculate(a, b) {
  return a + b;
}

// ✅ Good
function calculate(a: number, b: number): number {
  return a + b;
}
```

#### リファクタリング例

**Before:**

```typescript
// lib/ai/material-generator.ts
async function generateMaterial(params: any) {
  const response: any = await fetch('/api/openai', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  const data: any = await response.json();
  return data;
}
```

**After:**

```typescript
import type { GenerateMaterialParams, GenerateMaterialResponse } from '@/types/material';

async function generateMaterial(
  params: GenerateMaterialParams
): Promise<GenerateMaterialResponse> {
  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data: unknown = await response.json();
  return GenerateMaterialResponseSchema.parse(data);
}
```

---

## 5. 移行手順

### 5.1 準備作業

#### tsconfig.json 設定

**現在の設定（Phase 2.5）:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": false,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Phase 3b での目標設定:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### ESLint ルール追加

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/strict-boolean-expressions': 'warn',
  },
};
```

### 5.2 実装手順

#### ファイル別チェックリスト

**Phase 2.5 で完了したファイル:**

- [x] `types/openai.d.ts` - 新規作成
- [x] `types/abcjs.d.ts` - 拡充
- [x] `lib/ai/quick-test-generator.ts` - any → OpenAICompletionParams
- [x] `lib/ai/weak-drill-generator.ts` - any → OpenAICompletionParams
- [x] `app/api/ai/parse-material-request/route.ts` - any → OpenAICompletionParams
- [x] `lib/openai.ts` - 部分的に any を保持（1箇所、SDK互換性のため）

**Phase 3a で実施予定:**

- [ ] `components/features/materials/material-card.tsx`
- [ ] `components/features/materials/abc-renderer.tsx`
- [ ] `components/ui/button.tsx`
- [ ] `lib/utils/material-utils.ts`
- [ ] `app/api/materials/[id]/route.ts`

#### レビューポイント

**コードレビュー時のチェックリスト:**

1. **型定義の正確性**
   - [ ] すべてのパラメータに型が付いているか
   - [ ] 戻り値の型が明示されているか
   - [ ] `any` が使用されている場合、理由がコメントされているか

2. **型安全性の確保**
   - [ ] 型アサーション（`as`）が最小限か
   - [ ] ランタイム検証（Zod等）が適切に使用されているか
   - [ ] 型ガードが正しく実装されているか

3. **コードの可読性**
   - [ ] 型名が分かりやすいか
   - [ ] interface / type の使い分けが適切か
   - [ ] 型の再利用性が考慮されているか

4. **パフォーマンス**
   - [ ] 複雑な型演算が避けられているか
   - [ ] 型推論に頼りすぎていないか

---

## 6. テスト戦略

### 6.1 型テストの実装

**tsd によるコンパイル時型テスト:**

```bash
npm install --save-dev tsd
```

```typescript
// tests/types/openai.test-d.ts
import { expectType, expectError } from 'tsd';
import type { OpenAICompletionParams, OpenAICompletionResponse } from '@/types/openai';

// ✅ 正しい型
const validParams: OpenAICompletionParams = {
  model: 'gpt-5-mini',
  messages: [{ role: 'user', content: 'Hello' }],
  max_completion_tokens: 2000,
};
expectType<OpenAICompletionParams>(validParams);

// ❌ 型エラーを期待
expectError<OpenAICompletionParams>({
  model: 'gpt-5-mini',
  // messages が欠落
});

// 戻り値の型チェック
declare function callOpenAI(params: OpenAICompletionParams): Promise<OpenAICompletionResponse>;
const response = await callOpenAI(validParams);
expectType<string>(response.id);
expectType<number>(response.created);
```

### 6.2 回帰テスト

**既存テストの型エラー検出:**

```bash
# 型チェックを含むテスト実行
npm run typecheck && npm run test
```

**例:**

```typescript
// tests/unit/lib/openai.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateCompletion } from '@/lib/openai';
import type { OpenAICompletionParams } from '@/types/openai';

describe('generateCompletion', () => {
  it('should call OpenAI with correct types', async () => {
    const params: OpenAICompletionParams = {
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: 'Test' }],
      max_completion_tokens: 100,
    };

    const result = await generateCompletion(params);

    // 型が正しく推論されているか確認
    expect(typeof result.id).toBe('string');
    expect(typeof result.created).toBe('number');
    expect(Array.isArray(result.choices)).toBe(true);
  });
});
```

### 6.3 型カバレッジ測定

**type-coverage によるカバレッジ計測:**

```bash
npm install --save-dev type-coverage
```

```json
// package.json
{
  "scripts": {
    "type-coverage": "type-coverage --detail"
  }
}
```

**目標値:**

| Phase | 型カバレッジ | 目標 |
|-------|------------|------|
| Phase 2.5（完了） | 推定 75% | 80% |
| Phase 3a | 推定 85% | 90% |
| Phase 3b | 推定 90% | 95%+ |

---

## 7. チーム教育

### 7.1 TypeScript ベストプラクティス

#### 社内勉強会資料

**セッション1: 型の基礎**
- プリミティブ型 vs オブジェクト型
- interface vs type の使い分け
- ジェネリクスの活用

**セッション2: 実践的なパターン**
- 型ガード関数の実装
- Discriminated Union の活用
- テンプレートリテラル型

**セッション3: 外部ライブラリの型定義**
- `.d.ts` ファイルの作成方法
- DefinitelyTyped への貢献
- 型の拡張とマージ

#### 推奨リソース

**公式ドキュメント:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive（日本語版）](https://typescript-jp.gitbook.io/deep-dive/)

**書籍:**
- "プログラミングTypeScript" by Boris Cherny
- "Effective TypeScript" by Dan Vanderkam

### 7.2 コードレビュー基準

**型安全性チェックリスト:**

1. **型定義の明示性**
   - [ ] 関数の引数と戻り値に型が明示されているか
   - [ ] `any` が使用されている場合、正当な理由があるか
   - [ ] `unknown` と `any` が適切に使い分けられているか

2. **型の再利用性**
   - [ ] 共通の型が適切に抽出されているか
   - [ ] 型定義ファイル（`types/`）に配置されているか
   - [ ] 型の命名が一貫しているか

3. **エラーハンドリング**
   - [ ] エラー型が適切に定義されているか
   - [ ] ランタイムバリデーションが実装されているか
   - [ ] 型ガードが正しく機能しているか

### 7.3 ペアプログラミング計画

**Phase 3a での実施:**

| 週 | テーマ | 参加者 |
|----|--------|--------|
| Week 1 | OpenAI API 型定義レビュー | Backend Engineer |
| Week 2 | コンポーネント Props 型定義 | Frontend Engineer |
| Week 3 | ユーティリティ関数型定義 | Full-stack Engineer |
| Week 4 | 総合レビュー | 全員 |

---

## 8. メトリクスと評価

### 8.1 型エラー削減率

**Phase 2.5 の実績:**

```
Before: 28 any types
After: 12 any types
削減率: 57%
```

**Phase 3a の目標:**

```
Before: 12 any types
After: 5 any types
目標削減率: 58%
```

### 8.2 ビルドエラー減少

**Phase 2.5 の実績:**

```bash
# Before
npm run build
# Type errors: 4

# After
npm run build
# Type errors: 0 ✅
```

### 8.3 開発速度への影響測定

**想定される効果:**

| 項目 | 改善予測 |
|------|---------|
| リファクタリング時間 | -30% |
| バグ発見時間 | -40% |
| IDE 補完精度 | +50% |
| 新規開発速度 | +20% |

**測定方法:**
- GitHub Insights での PR マージ時間
- Sentry でのランタイムエラー数
- 開発者アンケート（主観的評価）

---

## 9. ベストプラクティス

### 9.1 型定義のネーミング規則

**Interface vs Type:**

```typescript
// ✅ Interface: オブジェクトの形状を定義
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Type: Union や複雑な型演算
type Status = 'pending' | 'success' | 'error';
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

**Suffix の使い分け:**

```typescript
// Props: React コンポーネント
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

// Params: 関数パラメータ
interface GenerateMaterialParams {
  level: string;
  instrument: string;
}

// Response: API レスポンス
interface GenerateMaterialResponse {
  success: boolean;
  material?: Material;
}

// Schema: Zod スキーマから推論
const MaterialSchema = z.object({...});
type Material = z.infer<typeof MaterialSchema>;
```

### 9.2 型の配置ルール

**ファイル構成:**

```
types/
├── api.ts           # API 共通型
├── openai.d.ts      # OpenAI 型定義
├── abcjs.d.ts       # abcjs 型定義
├── material.ts      # Material 関連型
└── user.ts          # User 関連型

lib/
└── openai.ts        # 実装とローカル型

components/
└── button.tsx       # コンポーネント固有の Props 型
```

**ルール:**
- グローバルに使用される型 → `types/`
- ファイル固有の型 → 同じファイル内
- 外部ライブラリの型拡張 → `types/*.d.ts`

### 9.3 ジェネリクスの活用

**API レスポンスの統一:**

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 使用例
async function fetchMaterial(id: string): Promise<ApiResponse<Material>> {
  const response = await fetch(`/api/materials/${id}`);
  return response.json();
}

// 型推論が効く
const result = await fetchMaterial('123');
if (result.success) {
  // result.data は Material 型
  console.log(result.data.title);
}
```

---

## 10. トラブルシューティング

### 10.1 よくある問題

#### 問題1: "Type 'any' is not assignable to..."

**症状:**
```typescript
const data: any = await response.json();
const material: Material = data; // Error
```

**原因:** `any` から特定の型への暗黙的変換

**解決策:**
```typescript
const data: unknown = await response.json();
const material: Material = MaterialSchema.parse(data); // Zod で検証
```

#### 問題2: "Property 'xxx' does not exist on type 'never'"

**症状:**
```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase();
  } else if (typeof value === 'number') {
    return value.toFixed(2);
  }
  // ここで value は never 型
  return value.toString(); // Error
}
```

**解決策:**
```typescript
function process(value: string | number): string {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  // else は不要（TypeScript が推論）
  return value.toFixed(2);
}
```

#### 問題3: "Cannot find module '@/types/xxx'"

**症状:**
```typescript
import type { Material } from '@/types/material';
// Error: Cannot find module
```

**原因:** tsconfig.json の paths 設定が不適切

**解決策:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "types/**/*.d.ts"]
}
```

### 10.2 デバッグ手順

**ステップ1: 型エラーの確認**

```bash
# TypeScript コンパイラで確認
npx tsc --noEmit

# ESLint で確認
npm run lint
```

**ステップ2: 型推論の確認**

```typescript
// VS Code / Cursor で型をホバー
const result = await generateMaterial(params);
//    ^ ここにカーソルを合わせて型を確認
```

**ステップ3: 型定義ファイルの確認**

```bash
# node_modules の型定義を確認
cat node_modules/@types/node/index.d.ts
```

### 10.3 エスケープハッチ

**やむを得ず `any` を使用する場合:**

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const params: any = {
  // 理由: OpenAI SDK の複雑なオーバーロード型に対応困難
  // TODO: Phase 3b で型定義を改善
  model,
  messages,
  tools: options.tools,
  tool_choice: options.toolChoice,
};
```

**ルール:**
1. 必ず `eslint-disable` コメントを付ける
2. 理由を明記
3. TODO で将来の改善を記載
4. PR レビューで正当性を確認

---

## 関連ドキュメント

- [Phase 2 Completion Report](/docs/reports/phase2-completion-report.md)
- [OpenAI ABC Technical Guide](/docs/development/openai-abc-technical-guide.md)
- [Codebase Optimization Report](/CODEBASE_OPTIMIZATION_REPORT.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**変更履歴:**

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-11-12 | 1.0 | 初版作成（Phase 2.5 実績を反映） |

---

*最終更新: 2025-11-12*
*ステータス: ✅ 公開済み*

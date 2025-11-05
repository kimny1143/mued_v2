# MUED LMS v2 コード品質改善実装計画書

**作成日**: 2025-11-05
**対象プロジェクト**: MUED LMS v2
**実装ツール**: Claude Code Assistant
**目標**: コード品質スコア 72/100 → 85/100

---

## 📋 目次

1. [実装方針](#実装方針)
2. [フェーズ1: TypeScript型エラー・ESLint警告の解消](#フェーズ1-typescript型エラーeslint警告の解消)
3. [フェーズ2: 共通コンポーネントへの移行](#フェーズ2-共通コンポーネントへの移行)
4. [フェーズ3: テストカバレッジ向上](#フェーズ3-テストカバレッジ向上)
5. [フェーズ4: APIレスポンス形式の統一](#フェーズ4-apiレスポンス形式の統一)
6. [検証方法](#検証方法)

---

## 🎯 実装方針

### 原則
1. **段階的実装**: 小さな単位で進め、各フェーズ後に検証
2. **後方互換性**: 既存機能を壊さない
3. **テスト駆動**: 変更前にテストを確認、変更後に再実行
4. **明確な指示**: AIが理解しやすい具体的な指示

### 実装順序
```
フェーズ1: 型エラー・警告解消 (優先度: 最高)
  ↓
フェーズ2: 共通コンポーネント移行 (優先度: 高)
  ↓
フェーズ3: テストカバレッジ向上 (優先度: 高)
  ↓
フェーズ4: API標準化 (優先度: 中)
```

---

## 🔧 フェーズ1: TypeScript型エラー・ESLint警告の解消

**目標**: 型エラー17件、ESLint警告24件を解消

### タスク1-1: Response Body型エラーの修正

**対象ファイル**: 2件
- `app/api/ai/quick-test/pdf/route.ts` (行71付近)
- `app/api/export/pdf/route.ts` (行87付近)

**問題**:
```typescript
// 現在のコード（エラー）
Argument of type 'Uint8Array<ArrayBufferLike>' is not assignable to parameter of type 'BodyInit'
```

**実装手順**:

1. **ファイルを読み込む**
   - `app/api/ai/quick-test/pdf/route.ts` を読み込む
   - `app/api/export/pdf/route.ts` を読み込む

2. **エラー箇所を特定**
   - `pdfBuffer` または同様の変数が `Uint8Array` 型で `Response` コンストラクタに渡されている箇所を探す
   - 通常は `return new Response(pdfBuffer, ...)` のような形式

3. **修正を適用**
   ```typescript
   // Before
   return new Response(pdfBuffer, {
     headers: { 'Content-Type': 'application/pdf' }
   });

   // After
   return new Response(pdfBuffer.buffer, {
     headers: { 'Content-Type': 'application/pdf' }
   });
   ```
   
   または、`ArrayBuffer` に明示的に変換:
   ```typescript
   // After (別案)
   return new Response(pdfBuffer.buffer.slice(
     pdfBuffer.byteOffset,
     pdfBuffer.byteOffset + pdfBuffer.byteLength
   ), {
     headers: { 'Content-Type': 'application/pdf' }
   });
   ```

4. **検証**
   - TypeScriptコンパイルエラーが解消されているか確認
   - `npm run lint` で警告が減っているか確認

**期待される結果**:
- TypeScript型エラー: -2件
- 両ファイルで正常にPDFが返されること

---

### タスク1-2: any型の使用を適切な型に変更

**対象ファイル**: 10箇所（優先度順）

**具体的なファイル一覧（ESLint検出結果）**:
1. `app/api/admin/rag-metrics/history/route.ts` (行106:88)
2. `app/api/ai/quick-test/pdf/route.ts` (行101:56)
3. `app/api/content/route.ts` (行27:46)
4. `app/api/export/pdf/route.ts` (行19:13, 行123:32)
5. `app/api/metrics/save-session/route.ts` (行71:39, 行82:56, 行174:34)
6. `app/dashboard/teacher/quick-test/page.tsx` (行19:58)
7. `components/features/admin/rag-metrics-history.tsx` (行47:44)
8. `components/features/dashboard-stats.test.tsx` (行9:52)
9. `components/features/library/library-card.test.tsx` (行9:76, 行18:72, 行170:69, 行189:77, 行247:33, 行324:71, 行435:69)

#### 優先度1: APIルート（3ファイル）

**ファイル1**: `app/api/admin/rag-metrics/history/route.ts`
- **行106付近**: `any`型の使用
- **実装手順**:
  1. ファイルを読み込み、106行目付近のコードを確認
  2. `any`型が使用されている変数・パラメータを特定
  3. 適切な型を定義またはインポート
  4. `any`を具体的な型に置換
  5. 型エラーが出ないか確認

**ファイル2**: `app/api/ai/quick-test/pdf/route.ts`
- **行101付近**: `visualObj` が `any`型
- **実装手順**:
  1. ファイルを読み込み、101行目付近を確認
  2. `visualObj` の実際の型を特定（おそらく `abcjs.RenderObject` など）
  3. 適切な型をインポートまたは定義
  4. `any`を置換
  5. 未使用変数の場合は削除または使用箇所を確認

**ファイル3**: `app/api/content/route.ts`
- **行27付近**: `any`型の使用
- **実装手順**: 上記と同様

#### 優先度2: コンポーネント（2ファイル）

**ファイル4**: `app/api/export/pdf/route.ts`
- **行19, 123付近**: `any`型の使用
- **実装手順**: APIルートと同様

**ファイル5**: `app/api/metrics/save-session/route.ts`
- **行71, 82, 174付近**: `any`型の使用
- **実装手順**: 
  1. 各箇所で使用されているデータ構造を確認
  2. 適切な型定義を作成（`interface` または `type`）
  3. `any`を置換

#### 優先度3: その他（5ファイル）

**ファイル6-10**: 
- `app/dashboard/teacher/quick-test/page.tsx` (行19)
- `components/features/admin/rag-metrics-history.tsx` (行47)
- `components/features/dashboard-stats.test.tsx` (行9)
- その他ESLintで検出されたファイル

**実装手順（共通）**:
```typescript
// Before
function processData(data: any) {
  return data.value;
}

// After
interface ProcessDataInput {
  value: string | number;
}

function processData(data: ProcessDataInput) {
  return data.value;
}
```

**期待される結果**:
- ESLint警告: -10件（`@typescript-eslint/no-explicit-any`）
- 型安全性の向上

---

### タスク1-3: 未使用変数の削除

**対象ファイル**: 8箇所

**実装手順（共通）**:

1. **ファイルを読み込む**
   - ESLintで検出されたファイルを読み込む

2. **未使用変数を特定**
   - ESLintの警告メッセージから行番号を確認
   - 変数が実際に使用されていないか確認（将来的に使用予定の場合は `_` プレフィックスを付ける）

3. **削除または修正**
   ```typescript
   // Before
   const unusedVariable = someValue;
   // 以降で使用されていない

   // After (削除)
   // 変数を削除

   // After (将来使用予定の場合)
   const _unusedVariable = someValue; // ESLint警告を抑制
   ```

**対象ファイル（優先度順・ESLint検出結果）**:
1. `app/api/admin/plugins/route.ts` (行12:27 - `request`)
2. `app/api/ai/quick-test/pdf/route.ts` (行101:15 - `visualObj`)
3. `components/features/admin/plugin-management.tsx` (行5:10, 5:20, 5:33 - `Activity`, `CheckCircle`, `XCircle`)
4. `components/features/dashboard-stats.test.tsx` (行2:27, 4:48 - `within`, `waitForLoadingToFinish`)
5. `components/features/library/library-card.test.tsx` (行2:18, 2:27, 2:35 - `waitFor`, `within`, `fireEvent`)

**期待される結果**:
- ESLint警告: -8件（`@typescript-eslint/no-unused-vars`）

---

### タスク1-4: React Hooks依存配列の修正

**対象ファイル**: 6箇所

**実装手順**:

1. **ファイルを読み込む**
   - ESLintで検出されたファイルを読み込む

2. **依存配列の問題を特定**
   - `react-hooks/exhaustive-deps` 警告の行を確認
   - `useEffect` または `useCallback` の依存配列を確認

3. **修正方法の選択**
   ```typescript
   // パターン1: 依存配列に追加
   // Before
   useEffect(() => {
     fetchData();
   }, []); // 警告: fetchDataが依存配列にない

   // After
   useEffect(() => {
     fetchData();
   }, [fetchData]);

   // パターン2: useCallbackでメモ化
   // Before
   const navigateMonth = (direction: number) => {
     // ...
   };
   useEffect(() => {
     // navigateMonthを使用
   }, []);

   // After
   const navigateMonth = useCallback((direction: number) => {
     // ...
   }, [/* 必要な依存関係 */]);
   useEffect(() => {
     // navigateMonthを使用
   }, [navigateMonth]);
   ```

**対象ファイル（ESLint検出結果）**:
1. `components/features/accessible-calendar.tsx` (行42:9, 107付近 - `navigateMonth`関数のuseCallback化が必要)
2. `components/features/admin/rag-metrics-history.tsx` (行36:6 - `fetchHistory`を依存配列に追加)
3. その他検出されたファイル

**期待される結果**:
- ESLint警告: -6件（`react-hooks/exhaustive-deps`）
- React Hooksの正しい使用

---

## 🔄 フェーズ2: 共通コンポーネントへの移行

**目標**: 重複コード51箇所を共通コンポーネントに移行

### タスク2-1: LoadingSpinnerコンポーネントへの移行

**対象ファイル**: 7箇所
- `app/dashboard/materials/page.tsx` (行35-36付近)
- `app/dashboard/materials/[id]/page.tsx` (行62付近)
- `app/dashboard/materials/new/page.tsx` (行314付近)
- `app/payment/cancelled/page.tsx` (行49付近)
- `app/payment/success/page.tsx` (行49付近)
- `app/dashboard/lessons/[id]/book/page.tsx` (行130付近)
- その他検出されたファイル

**実装手順（各ファイル共通）**:

1. **ファイルを読み込む**
   - 対象ファイルを読み込む

2. **既存のローディングUIを特定**
   ```tsx
   // 典型的なパターン
   {isLoading && (
     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
   )}
   ```
   または
   ```tsx
   {isLoading && (
     <div className="flex items-center justify-center">
       <div className="animate-spin ..."></div>
     </div>
   )}
   ```

3. **インポートを追加**
   ```tsx
   // ファイルの先頭（他のimportの後）
   import { LoadingSpinner, PageLoading } from '@/components/ui/loading-spinner';
   ```

4. **既存コードを置換**
   ```tsx
   // Before (ページ全体のローディング)
   {isLoading && (
     <div className="flex min-h-screen items-center justify-center">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
     </div>
   )}

   // After
   {isLoading && <PageLoading label="読み込み中..." />}
   ```

   ```tsx
   // Before (インラインローディング)
   {isLoading && (
     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
   )}

   // After
   {isLoading && <LoadingSpinner size="md" />}
   ```

5. **動作確認**
   - ローディング状態が正しく表示されるか確認
   - スタイリングが適切か確認

**期待される結果**:
- 重複コード削減: 約200行
- 一貫したUX
- 保守性向上

---

### タスク2-2: ErrorBoundaryコンポーネントへの移行

**対象ファイル**: 14箇所（推定）

**実装手順**:

1. **エラー表示箇所を特定**
   - `error` 変数が使用されている箇所を検索
   - 典型的なパターン:
     ```tsx
     {error && (
       <div className="text-red-500">{error.message}</div>
     )}
     ```

2. **インポートを追加**
   ```tsx
   import { ErrorBoundary, InlineError, PageError } from '@/components/ui/error-boundary';
   ```

3. **置換パターン**
   ```tsx
   // Before (インラインエラー)
   {error && (
     <div className="text-red-500 p-4 border border-red-300 rounded">
       <p>エラー: {error.message}</p>
     </div>
   )}

   // After
   {error && <InlineError error={error} />}
   ```

   ```tsx
   // Before (ページ全体のエラー)
   {error && (
     <div className="flex min-h-screen items-center justify-center">
       <div className="text-red-500">
         <h2>エラーが発生しました</h2>
         <p>{error.message}</p>
       </div>
     </div>
   )}

   // After
   {error && <PageError error={error} onRetry={() => refetch()} />}
   ```

4. **リトライ機能の追加（可能な場合）**
   - `refetch` 関数がある場合は `onRetry` に渡す

**対象ファイル（優先度順）**:
1. `hooks/use-materials.ts`
2. `hooks/use-lessons.ts`
3. `hooks/use-reservations.ts`
4. `app/dashboard/materials/page.tsx`
5. `app/dashboard/materials/[id]/page.tsx`
6. その他 `error` 変数を使用しているコンポーネント

**期待される結果**:
- 重複コード削減: 約400行
- 統一されたエラー表示
- リトライ機能の標準化

---

### タスク2-3: useApiFetchフックへの移行

**対象ファイル**: 14箇所

**実装手順（各フックファイル）**:

1. **ファイルを読み込む**
   - 対象のフックファイル（例: `hooks/use-materials.ts`）を読み込む

2. **既存のfetch実装を特定**
   ```typescript
   // 典型的なパターン
   const [data, setData] = useState<T | null>(null);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<Error | null>(null);

   useEffect(() => {
     setIsLoading(true);
     fetch('/api/materials')
       .then(res => res.json())
       .then(setData)
       .catch(err => setError(err))
       .finally(() => setIsLoading(false));
   }, []);
   ```

3. **useApiFetchに置換**
   ```typescript
   // インポートを追加
   import { useApiFetch } from '@/hooks/use-api-fetch';

   // Before
   const [data, setData] = useState<Material[] | null>(null);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<Error | null>(null);

   useEffect(() => {
     setIsLoading(true);
     fetch('/api/materials')
       .then(res => res.json())
       .then(setData)
       .catch(err => setError(err))
       .finally(() => setIsLoading(false));
   }, []);

   // After
   const { data, isLoading, error, refetch } = useApiFetch<Material[]>('/api/materials');
   ```

4. **特殊な処理がある場合**
   - 認証ヘッダーの追加が必要な場合:
     ```typescript
     // useApiFetchを拡張するか、カスタムフックを作成
     // または、fetch関数をラップ
     ```
   - パラメータがある場合:
     ```typescript
     const { data, isLoading, error } = useApiFetch<Material[]>(
       `/api/materials?type=${type}`,
       { dependencies: [type] }
     );
     ```

5. **戻り値の型を確認**
   - 既存のフックの戻り値の型と一致するか確認
   - 必要に応じて調整

**対象ファイル（優先度順）**:
1. `hooks/use-materials.ts`
2. `hooks/use-lessons.ts`
3. `hooks/use-reservations.ts`
4. `hooks/use-payment.ts`
5. その他 `useState` + `useEffect` + `fetch` パターンを使用しているフック

**期待される結果**:
- 重複コード削減: 約500行
- 一貫したエラーハンドリング
- 保守性向上

---

## 🧪 フェーズ3: テストカバレッジ向上

**目標**: テストカバレッジ70%達成

### タスク3-1: カバレッジ測定の実施

**実装手順**:

1. **カバレッジレポートを生成**
   ```bash
   npm run test:coverage
   ```

2. **結果を確認**
   - `coverage/index.html` を開く
   - カバレッジが低いファイルを特定

3. **優先順位を決定**
   - ビジネスロジック（`lib/` 配下）
   - APIルート（`app/api/` 配下）
   - コンポーネント（`components/` 配下）

**期待される結果**:
- 現在のカバレッジ数値の把握
- 改善が必要なファイルのリスト

---

### タスク3-2: ビジネスロジックのユニットテスト追加

**対象ファイル（推定）**:
- `lib/abc-analyzer.ts`
- `lib/metrics/learning-tracker.ts`
- `lib/jobs/metrics-calculation.ts`
- その他 `lib/` 配下の関数

**実装手順**:

1. **テストファイルを作成**
   - `tests/unit/lib/[ファイル名].test.ts` を作成

2. **テストケースを記述**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { functionToTest } from '@/lib/[file]';

   describe('functionToTest', () => {
     it('should handle normal case', () => {
       const result = functionToTest(input);
       expect(result).toBe(expected);
     });

     it('should handle edge case', () => {
       // エッジケースのテスト
     });

     it('should throw error on invalid input', () => {
       expect(() => functionToTest(invalidInput)).toThrow();
     });
   });
   ```

3. **テストを実行**
   ```bash
   npm run test:unit -- tests/unit/lib/[file].test.ts
   ```

**期待される結果**:
- ビジネスロジックのカバレッジ: 80%+

---

### タスク3-3: APIエンドポイントの統合テスト追加

**対象ファイル（優先度順）**:
1. `app/api/subscription/limits/route.ts`
2. `app/api/materials/route.ts`
3. `app/api/reservations/route.ts`
4. その他主要なAPIルート

**実装手順**:

1. **テストファイルを作成**
   - `tests/integration/api/[endpoint].test.ts` を作成

2. **モック設定**
   ```typescript
   import { describe, it, expect, beforeEach } from 'vitest';
   import { GET, POST } from '@/app/api/[endpoint]/route';
   import { mockAuthUser } from '@/tests/utils/auth-helpers';

   describe('/api/[endpoint]', () => {
     beforeEach(() => {
       // 認証モック設定
       mockAuthUser();
     });

     it('should return data for GET request', async () => {
       const request = new Request('http://localhost/api/[endpoint]');
       const response = await GET(request);
       expect(response.status).toBe(200);
     });
   });
   ```

3. **テストを実行**
   ```bash
   npm run test:integration -- tests/integration/api/[endpoint].test.ts
   ```

**期待される結果**:
- APIルートのカバレッジ: 75%+

---

## 🔌 フェーズ4: APIレスポンス形式の統一

**目標**: 全APIエンドポイントで統一されたレスポンス形式

### タスク4-1: ApiResponseユーティリティの作成（既存確認）

**実装手順**:

1. **既存の実装を確認**
   - `lib/api-response.ts` が存在するか確認
   - 存在しない場合は作成

2. **実装内容**
   ```typescript
   // lib/api-response.ts
   import { NextResponse } from 'next/server';

   export interface ApiSuccessResponse<T> {
     success: true;
     data: T;
     meta?: {
       timestamp: string;
       [key: string]: unknown;
     };
   }

   export interface ApiErrorResponse {
     success: false;
     error: {
       message: string;
       code?: string;
     };
     timestamp: string;
   }

   export class ApiResponse {
     static success<T>(data: T, meta?: Record<string, unknown>, status = 200) {
       return NextResponse.json(
         {
           success: true,
           data,
           meta: {
             timestamp: new Date().toISOString(),
             ...meta,
           },
         },
         { status }
       );
     }

     static error(
       message: string,
       code?: string,
       status = 400
     ) {
       return NextResponse.json(
         {
           success: false,
           error: {
             message,
             code: code || 'UNKNOWN_ERROR',
           },
           timestamp: new Date().toISOString(),
         },
         { status }
       );
     }
   }
   ```

3. **エクスポート**
   ```typescript
   export { ApiResponse, type ApiSuccessResponse, type ApiErrorResponse };
   ```

**期待される結果**:
- 統一されたレスポンス形式のユーティリティが利用可能

---

### タスク4-2: APIルートへの適用

**対象ファイル**: 全28個のAPIエンドポイント

**実装手順（各APIルート）**:

1. **ファイルを読み込む**
   - 対象のAPIルートファイルを読み込む

2. **インポートを追加**
   ```typescript
   import { ApiResponse } from '@/lib/api-response';
   ```

3. **成功レスポンスを置換**
   ```typescript
   // Before
   return NextResponse.json({ data: result });

   // After
   return ApiResponse.success(result);
   ```

4. **エラーレスポンスを置換**
   ```typescript
   // Before
   return NextResponse.json(
     { error: 'Something went wrong' },
     { status: 500 }
   );

   // After
   return ApiResponse.error('Something went wrong', 'INTERNAL_ERROR', 500);
   ```

5. **try-catchブロックの統一**
   ```typescript
   export async function GET(request: NextRequest) {
     try {
       // ビジネスロジック
       const data = await fetchData();
       return ApiResponse.success(data);
     } catch (error) {
       console.error('[API] Error:', error);
       return ApiResponse.error(
         error instanceof Error ? error.message : 'Internal server error',
         'FETCH_ERROR',
         500
       );
     }
   }
   ```

**対象ファイル（優先度順）**:
1. `app/api/subscription/limits/route.ts`
2. `app/api/materials/route.ts`
3. `app/api/reservations/route.ts`
4. その他全APIルート

**期待される結果**:
- 統一されたAPIレスポンス形式
- フロントエンドでの一貫したエラーハンドリング

---

## ✅ 検証方法

### 各フェーズ終了時の検証

#### フェーズ1検証
```bash
# TypeScript型チェック
npx tsc --noEmit

# ESLintチェック
npm run lint

# 期待される結果
# - 型エラー: 0件
# - ESLint警告: 0件（または許容範囲内）
```

#### フェーズ2検証
```bash
# ビルドテスト
npm run build

# 開発サーバーで動作確認
npm run dev

# 期待される結果
# - ビルド成功
# - ローディング・エラー表示が統一されている
```

#### フェーズ3検証
```bash
# テスト実行
npm run test

# カバレッジ確認
npm run test:coverage

# 期待される結果
# - 全テスト通過
# - カバレッジ: 70%+
```

#### フェーズ4検証
```bash
# APIエンドポイントのテスト
npm run test:integration

# 期待される結果
# - 統一されたレスポンス形式
# - エラーハンドリングが一貫している
```

### 最終検証

```bash
# 全体的な検証
npm run lint          # ESLint
npm run test          # 全テスト
npm run build         # ビルド
npm run test:coverage # カバレッジ

# 期待される最終結果
# - コード品質スコア: 85/100+
# - 型エラー: 0件
# - ESLint警告: < 5件
# - テストカバレッジ: 70%+
# - 重複コード削減: 30%+
```

---

## 📊 進捗トラッキング

### チェックリスト形式

各タスク完了時に以下を記録:

```markdown
## 実装進捗

### フェーズ1: 型エラー・警告解消
- [ ] タスク1-1: Response Body型エラー修正 (0/2)
- [ ] タスク1-2: any型の置換 (0/10)
- [ ] タスク1-3: 未使用変数削除 (0/8)
- [ ] タスク1-4: React Hooks依存配列修正 (0/6)

### フェーズ2: 共通コンポーネント移行
- [ ] タスク2-1: LoadingSpinner移行 (0/7)
- [ ] タスク2-2: ErrorBoundary移行 (0/14)
- [ ] タスク2-3: useApiFetch移行 (0/14)

### フェーズ3: テストカバレッジ向上
- [ ] タスク3-1: カバレッジ測定
- [ ] タスク3-2: ビジネスロジックテスト追加
- [ ] タスク3-3: API統合テスト追加

### フェーズ4: API標準化
- [ ] タスク4-1: ApiResponseユーティリティ確認/作成
- [ ] タスク4-2: APIルートへの適用 (0/28)
```

---

## 🚨 注意事項

### AI実装時の注意点

1. **ファイルの完全な読み込み**
   - 変更前にファイル全体を読み込む
   - コンテキストを理解してから変更

2. **段階的な変更**
   - 一度に複数の大きな変更をしない
   - 各変更後に検証

3. **既存機能の保護**
   - 既存の動作を壊さない
   - テストが通過することを確認

4. **型安全性の維持**
   - `any`型を使わない
   - 適切な型定義を作成

5. **エラーハンドリング**
   - エラーケースを考慮
   - 適切なエラーメッセージを返す

---

## 📝 実装例（参考）

### 例1: LoadingSpinner移行

```tsx
// Before: app/dashboard/materials/page.tsx
export default function MaterialsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    fetch('/api/materials')
      .then(res => res.json())
      .then(data => {
        setMaterials(data);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <div>...</div>;
}

// After
import { PageLoading } from '@/components/ui/loading-spinner';

export default function MaterialsPage() {
  const { data: materials, isLoading } = useApiFetch<Material[]>('/api/materials');

  if (isLoading) {
    return <PageLoading label="教材を読み込み中..." />;
  }

  return <div>...</div>;
}
```

### 例2: any型の置換

```typescript
// Before: app/api/metrics/save-session/route.ts
export async function POST(request: NextRequest) {
  const body: any = await request.json();
  // ...
}

// After
interface SaveSessionRequest {
  sessionId: string;
  metrics: {
    score: number;
    timeSpent: number;
    // ...
  };
}

export async function POST(request: NextRequest) {
  const body: SaveSessionRequest = await request.json();
  // ...
}
```

---

**実装計画書 完了**

この文書をAI（Claude Code Assistant）に与えることで、段階的なコード品質改善を実施できます。


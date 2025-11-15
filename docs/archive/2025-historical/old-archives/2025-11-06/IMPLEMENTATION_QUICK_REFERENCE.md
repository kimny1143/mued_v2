# 実装クイックリファレンス

**用途**: AI（Claude Code Assistant）が実装時に参照する簡易ガイド
**メインドキュメント**: `IMPROVEMENT_IMPLEMENTATION_PLAN.md` を参照

---

## 🎯 実装の優先順位

```
1. フェーズ1: 型エラー・警告解消 (最優先)
2. フェーズ2: 共通コンポーネント移行
3. フェーズ3: テストカバレッジ向上
4. フェーズ4: API標準化
```

---

## 📋 タスク別実装パターン

### パターン1: Response Body型エラー修正

**検索**: `Uint8Array.*Response` または `new Response(pdfBuffer`

**修正**:
```typescript
// Before
return new Response(pdfBuffer, { headers: {...} });

// After
return new Response(pdfBuffer.buffer, { headers: {...} });
```

---

### パターン2: any型の置換

**検索**: `: any` または `any>`

**手順**:
1. 変数の実際の構造を確認
2. `interface` または `type` を定義
3. `any` を置換

**例**:
```typescript
// Before
function process(data: any) { ... }

// After
interface ProcessData { value: string; }
function process(data: ProcessData) { ... }
```

---

### パターン3: 未使用変数削除

**検索**: ESLint警告 `@typescript-eslint/no-unused-vars`

**修正**:
```typescript
// Before
const unusedVar = value;

// After (削除)
// または
// After (将来使用予定)
const _unusedVar = value;
```

---

### パターン4: React Hooks依存配列修正

**検索**: `react-hooks/exhaustive-deps`

**修正**:
```typescript
// Before
useEffect(() => {
  fetchData();
}, []); // 警告

// After
useEffect(() => {
  fetchData();
}, [fetchData]); // fetchDataを依存配列に追加

// または useCallbackでメモ化
const fetchData = useCallback(() => { ... }, [deps]);
useEffect(() => { fetchData(); }, [fetchData]);
```

---

### パターン5: LoadingSpinner移行

**検索**: `animate-spin.*border`

**修正**:
```tsx
// Before
{isLoading && (
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
)}

// After
import { PageLoading } from '@/components/ui/loading-spinner';
{isLoading && <PageLoading />}
```

---

### パターン6: ErrorBoundary移行

**検索**: `error.*message` または `text-red-500`

**修正**:
```tsx
// Before
{error && <div className="text-red-500">{error.message}</div>}

// After
import { InlineError } from '@/components/ui/error-boundary';
{error && <InlineError error={error} />}
```

---

### パターン7: useApiFetch移行

**検索**: `useState.*isLoading` + `useEffect.*fetch`

**修正**:
```typescript
// Before
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(false);
useEffect(() => {
  fetch('/api/...').then(...);
}, []);

// After
import { useApiFetch } from '@/hooks/use-api-fetch';
const { data, isLoading, error } = useApiFetch<Type>('/api/...');
```

---

### パターン8: APIレスポンス形式統一

**検索**: `NextResponse.json`

**修正**:
```typescript
// Before
return NextResponse.json({ data: result });

// After
import { ApiResponse } from '@/lib/api-response';
return ApiResponse.success(result);
```

---

## 🔍 ファイル検索コマンド

実装前に以下のコマンドで対象ファイルを特定:

```bash
# 型エラー検索
npx tsc --noEmit 2>&1 | grep "error TS"

# ESLint警告検索
npm run lint 2>&1 | grep "warning"

# ローディングUI検索
grep -r "animate-spin" app/ components/

# エラー表示検索
grep -r "text-red-500\|error.*message" app/ components/

# any型検索
grep -r ": any" app/ lib/ components/
```

---

## ✅ 実装チェックリスト

各ファイル変更時に以下を確認:

- [ ] TypeScriptコンパイルエラーなし (`npx tsc --noEmit`)
- [ ] ESLint警告なし (`npm run lint`)
- [ ] 既存テスト通過 (`npm run test`)
- [ ] ビルド成功 (`npm run build`)
- [ ] 動作確認（手動またはE2Eテスト）

---

## 🚨 注意事項

1. **ファイル全体を読み込んでから変更**
2. **一度に1つの変更のみ**
3. **既存機能を壊さない**
4. **型安全性を維持**
5. **テストを実行して確認**

---

**クイックリファレンス完了**

実装時はこの文書とメインドキュメント（`IMPROVEMENT_IMPLEMENTATION_PLAN.md`）を参照してください。


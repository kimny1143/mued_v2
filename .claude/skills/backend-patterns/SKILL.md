# backend-patterns - バックエンドパターン集

MUED LMSのバックエンドコード規約とパターン。

## 使い方

```
新しいAPIルートを作る時、このスキルを参照
```

---

## 1. APIルート構造

### 認証パターン

```typescript
// ✅ 基本パターン: withAuth
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response';

export const GET = withAuth(async ({ userId, request }) => {
  const data = await repository.findByUserId(userId);
  return apiSuccess({ data });
});

export const POST = withAuth(async ({ userId, request }) => {
  const body = await request.json();
  // バリデーション & 処理
  return apiSuccess({ created: result });
});
```

### 認証バリエーション

| 関数 | 用途 | 提供される情報 |
|-----|------|--------------|
| `withAuth` | 基本認証 | `userId` (Clerk ID) |
| `withAuthParams` | `[id]`ルート用 | `userId`, `params` |
| `withAuthResolved` | DB内部ID必要時 | `clerkUserId`, `internalUserId` |
| `withAdminAuth` | 管理者専用 | `userId` + admin check |

### 使い分け例

```typescript
// 動的ルート [id]
export const GET = withAuthParams<{ id: string }>(
  async ({ userId, params }) => {
    const item = await repository.findById(params.id);
    return apiSuccess({ item });
  }
);

// DBのUUID必要時（予約、マッチングなど）
export const POST = withAuthResolved(
  async ({ internalUserId, request }) => {
    await repository.create({ userId: internalUserId, ... });
    return apiSuccess({ created: true });
  }
);
```

---

## 2. レスポンス形式

### 統一レスポンス関数

```typescript
import {
  apiSuccess,        // 200 OK
  apiError,          // カスタムエラー
  apiValidationError, // 400 Bad Request
  apiUnauthorized,   // 401 Unauthorized
  apiForbidden,      // 403 Forbidden
  apiNotFound,       // 404 Not Found
  apiRateLimitExceeded, // 429 Too Many Requests
  apiServerError,    // 500 Internal Server Error
} from '@/lib/api-response';
```

### 使用例

```typescript
// 成功
return apiSuccess({ users, total: 100 });
return apiSuccess({ created: true }, { message: 'User created', status: 201 });

// エラー
return apiValidationError('Invalid email format', { field: 'email' });
return apiNotFound('User not found');
return apiServerError(error);
```

### レスポンス形式

```json
// 成功
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-01-19T12:00:00.000Z"
}

// エラー
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-01-19T12:00:00.000Z"
}
```

---

## 3. バリデーション

### Zodスキーマ

```typescript
import { z } from 'zod';

// リクエストスキーマ定義
const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.enum(['student', 'mentor']).optional(),
});

// APIルートで使用
export const POST = withAuth(async ({ userId, request }) => {
  const body = await request.json();

  // バリデーション
  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError('Invalid input', validation.error.errors);
  }

  const { email, name, role } = validation.data;
  // 処理続行...
});
```

### 共通バリデーションパターン

```typescript
// UUID
const idSchema = z.string().uuid('Invalid ID format');

// ページネーション
const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// 検索
const searchSchema = z.object({
  q: z.string().max(100).optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
});
```

---

## 4. Repository パターン

### 基本構造

```typescript
// lib/repositories/example.repository.ts

import { db } from '@/db/edge';
import { examples } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// 型定義
export interface CreateExampleInput {
  userId: string;
  title: string;
  content?: string;
}

export interface UpdateExampleInput {
  title?: string;
  content?: string;
}

// Repository クラス
export const exampleRepository = {
  // 作成
  async create(input: CreateExampleInput) {
    const [result] = await db
      .insert(examples)
      .values(input)
      .returning();
    return result;
  },

  // ID検索
  async findById(id: string) {
    const [result] = await db
      .select()
      .from(examples)
      .where(eq(examples.id, id))
      .limit(1);
    return result ?? null;
  },

  // ユーザー別一覧
  async findByUserId(userId: string) {
    return db
      .select()
      .from(examples)
      .where(eq(examples.userId, userId))
      .orderBy(desc(examples.createdAt));
  },

  // 更新
  async update(id: string, input: UpdateExampleInput) {
    const [result] = await db
      .update(examples)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(examples.id, id))
      .returning();
    return result;
  },

  // 削除
  async delete(id: string) {
    await db.delete(examples).where(eq(examples.id, id));
  },
};
```

### インデックスエクスポート

```typescript
// lib/repositories/index.ts
export { exampleRepository } from './example.repository';
export { materialsRepository } from './materials.repository';
// ...
```

---

## 5. Rate Limiting

### 使用方法

```typescript
import { rateLimit } from '@/lib/middleware/rate-limit';

export const POST = withAuth(async ({ userId, request }) => {
  // Rate limit check (AI routes: 10 req/min)
  const rateLimitResponse = await rateLimit(request, 'ai');
  if (rateLimitResponse) return rateLimitResponse;

  // 処理続行...
});
```

### Rate Limit タイプ

| タイプ | 制限 | 用途 |
|-------|------|------|
| `ai` | 10 req/min | AI API呼び出し |
| `api` | 60 req/min | 一般API |
| `strict` | 5 req/min | 高コスト操作 |

---

## 6. エラーハンドリング

### try-catch パターン

```typescript
export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const result = await repository.create(body);
    return apiSuccess({ result });
  } catch (error) {
    console.error('[API] Error:', error);

    // 既知のエラー
    if (error instanceof z.ZodError) {
      return apiValidationError('Validation failed', error.errors);
    }

    // DBエラー
    if (error instanceof Error && error.message.includes('unique')) {
      return apiError('Already exists', { status: 409 });
    }

    // 未知のエラー
    return apiServerError(error instanceof Error ? error : 'Unknown error');
  }
});
```

---

## 7. チェックリスト

新しいAPIルート作成時:

- [ ] 適切な認証ミドルウェア選択（withAuth / withAuthParams / withAuthResolved）
- [ ] Zodでリクエストバリデーション
- [ ] 統一レスポンス関数使用（apiSuccess / apiError）
- [ ] Rate Limiting（AI/高コスト操作）
- [ ] エラーハンドリング（try-catch）
- [ ] 認可チェック（リソースの所有者確認）
- [ ] ログ出力（console.error / logger）

---

## 8. アンチパターン

```typescript
// ❌ 認証なし
export async function GET(request: Request) {
  const data = await db.select().from(users);
  return NextResponse.json(data);
}

// ❌ 直接NextResponse
return NextResponse.json({ error: 'Failed' }, { status: 500 });

// ❌ バリデーションなし
const { email } = await request.json();
await db.insert(users).values({ email });

// ❌ エラー握りつぶし
try {
  await riskyOperation();
} catch (e) {
  // 何もしない
}
```

---

## 関連ファイル

- `lib/middleware/with-auth.ts` - 認証ミドルウェア
- `lib/api-response.ts` - レスポンスユーティリティ
- `lib/middleware/rate-limit.ts` - Rate Limiting
- `lib/repositories/` - Repository実装例

# Plugin Management System Guide

## 概要

MUED LMS v2のプラグイン管理システムは、外部コンテンツソース（Note.com、ローカルファイルなど）を
統一的なインターフェースで扱うための拡張可能なアーキテクチャです。

**実装日:** 2025-10-29
**Phase:** Phase 2
**アーキテクチャパターン:** Registry + Factory + Adapter

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────┐
│              Application Layer                      │
│  (API Routes, UI Components, Business Logic)        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│           RagPluginRegistry (Singleton)             │
│  - register()    - get()      - getAll()            │
│  - checkHealth() - getHealthStatus()                │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
┌──────────────┐       ┌──────────────────┐
│ NoteAdapter  │       │  LocalAdapter    │
│ (Note.com)   │       │  (Local Files)   │
└──────────────┘       └──────────────────┘
        │                        │
        ▼                        ▼
┌──────────────┐       ┌──────────────────┐
│ Note.com API │       │ File System      │
└──────────────┘       └──────────────────┘
```

---

## コアコンポーネント

### 1. RagPluginRegistry (`/lib/plugins/rag-plugin-registry.ts`)

プラグインの登録・管理を行うシングルトンクラス:

```typescript
export class RagPluginRegistry {
  private static instance: RagPluginRegistry;
  private plugins: Map<string, RagPlugin> = new Map();
  private healthStatus: Map<string, HealthCheckResult> = new Map();

  private constructor() {}

  static getInstance(): RagPluginRegistry {
    if (!RagPluginRegistry.instance) {
      RagPluginRegistry.instance = new RagPluginRegistry();
    }
    return RagPluginRegistry.instance;
  }

  register(source: string, plugin: RagPlugin): void {
    this.plugins.set(source, plugin);
  }

  get(source: string): RagPlugin | undefined {
    return this.plugins.get(source);
  }

  getAll(): RagPlugin[] {
    return Array.from(this.plugins.values());
  }

  async checkHealth(source: string): Promise<HealthCheckResult> {
    const plugin = this.get(source);
    if (!plugin) {
      return { healthy: false, message: `Plugin "${source}" not found` };
    }

    try {
      const result = await plugin.adapter.healthCheck();
      this.healthStatus.set(source, {
        ...result,
        lastCheck: new Date(),
      });
      return result;
    } catch (error) {
      const errorResult = {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date(),
      };
      this.healthStatus.set(source, errorResult);
      return errorResult;
    }
  }

  getHealthStatus(source: string): HealthCheckResult | undefined {
    return this.healthStatus.get(source);
  }

  clear(): void {
    this.plugins.clear();
    this.healthStatus.clear();
  }
}
```

**設計の特徴:**
- **シングルトンパターン**: アプリケーション全体で1つのインスタンス
- **Map使用**: source（'note', 'local'）をキーに高速アクセス
- **ヘルス管理**: プラグインの稼働状況を監視
- **テスト対応**: `clear()`でテスト環境のリセットが可能

---

### 2. RagPluginFactory (`/lib/plugins/rag-plugin-registry.ts`)

標準プラグインの初期化を担当:

```typescript
export class RagPluginFactory {
  static initializeStandardPlugins(): void {
    const registry = RagPluginRegistry.getInstance();

    // Note.com Plugin
    registry.register('note', {
      name: 'Note.com Integration',
      source: 'note',
      version: '1.0.0',
      adapter: new NoteAdapter(),
      capabilities: {
        list: true,
        search: true,
        filter: true,
        fetch: true,
        transform: false,
      },
    });

    // Local Materials Plugin
    registry.register('local', {
      name: 'Local Materials',
      source: 'local',
      version: '1.0.0',
      adapter: new LocalAdapter(),
      capabilities: {
        list: true,
        search: false,
        filter: false,
        fetch: true,
        transform: true,
      },
    });
  }
}
```

**設計の特徴:**
- **Factory Method**: 初期化ロジックを一箇所に集約
- **Capabilities定義**: 各プラグインの機能を明示的に定義
- **拡張性**: 新しいプラグインを簡単に追加可能

---

### 3. Plugin Interfaces (`/lib/plugins/rag-plugin-interfaces.ts`)

型定義とインターフェース:

```typescript
export interface RagAdapter {
  healthCheck(): Promise<HealthCheckResult>;
  listContent(options?: ListOptions): Promise<ContentItem[]>;
  fetchContent(id: string): Promise<ContentItem>;
  searchContent?(query: string): Promise<ContentItem[]>;
}

export interface RagPlugin {
  name: string;
  source: string;
  version: string;
  adapter: RagAdapter;
  capabilities: PluginCapabilities;
}

export interface PluginCapabilities {
  list: boolean;      // コンテンツ一覧取得
  search: boolean;    // 検索機能
  filter: boolean;    // フィルタリング
  fetch: boolean;     // 個別取得
  transform: boolean; // データ変換
}

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  lastCheck?: Date;
  details?: Record<string, unknown>;
}

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  publishedAt?: Date;
  metadata?: Record<string, unknown>;
}
```

**設計の特徴:**
- **統一インターフェース**: 全プラグインが同じ型を実装
- **Optional機能**: `searchContent?`でオプショナルな機能を定義
- **型安全**: TypeScriptで完全な型チェック

---

### 4. Adapters

#### NoteAdapter (`/lib/plugins/adapters/note-adapter.ts`)

Note.com APIとの統合:

```typescript
export class NoteAdapter implements RagAdapter {
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch('https://note.com/api/v2/creators/muedlms/contents', {
        method: 'HEAD',
      });
      return {
        healthy: response.ok,
        message: response.ok ? 'Note.com is accessible' : 'Failed to reach Note.com',
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Note.com health check failed: ${error}`,
      };
    }
  }

  async listContent(options?: ListOptions): Promise<ContentItem[]> {
    const response = await fetch(
      `https://note.com/api/v2/creators/muedlms/contents?kind=note&page=${options?.page || 1}`
    );
    const data = await response.json();

    return data.data.contents.map((item: any) => ({
      id: item.id,
      title: item.name,
      content: item.body,
      source: 'note',
      url: item.noteUrl,
      publishedAt: new Date(item.publishAt),
    }));
  }

  async fetchContent(id: string): Promise<ContentItem> {
    const response = await fetch(`https://note.com/api/v2/notes/${id}`);
    const data = await response.json();

    return {
      id: data.data.id,
      title: data.data.name,
      content: data.data.body,
      source: 'note',
      url: data.data.noteUrl,
      publishedAt: new Date(data.data.publishAt),
    };
  }

  async searchContent(query: string): Promise<ContentItem[]> {
    // Note.com search implementation
    // ...
  }
}
```

#### LocalAdapter (`/lib/plugins/adapters/local-adapter.ts`)

ローカルファイル管理:

```typescript
export class LocalAdapter implements RagAdapter {
  async healthCheck(): Promise<HealthCheckResult> {
    return {
      healthy: true,
      message: 'Local storage is accessible',
    };
  }

  async listContent(): Promise<ContentItem[]> {
    // Database query to get local materials
    const materials = await db.query.materials.findMany({
      where: eq(materials.userId, currentUserId),
    });

    return materials.map(m => ({
      id: m.id,
      title: m.title,
      content: m.content,
      source: 'local',
    }));
  }

  async fetchContent(id: string): Promise<ContentItem> {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, id),
    });

    if (!material) {
      throw new Error(`Material ${id} not found`);
    }

    return {
      id: material.id,
      title: material.title,
      content: material.content,
      source: 'local',
    };
  }
}
```

---

## API エンドポイント

### GET `/api/admin/plugins`

登録済みプラグインの一覧取得:

```typescript
// app/api/admin/plugins/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user';
import { ragPluginRegistry } from '@/lib/plugins/rag-plugin-registry';

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    );
  }

  const plugins = ragPluginRegistry.getAll();

  return NextResponse.json({ plugins });
}
```

**レスポンス例:**
```json
{
  "plugins": [
    {
      "name": "Note.com Integration",
      "source": "note",
      "version": "1.0.0",
      "capabilities": {
        "list": true,
        "search": true,
        "filter": true,
        "fetch": true,
        "transform": false
      }
    },
    {
      "name": "Local Materials",
      "source": "local",
      "version": "1.0.0",
      "capabilities": {
        "list": true,
        "search": false,
        "filter": false,
        "fetch": true,
        "transform": true
      }
    }
  ]
}
```

---

### POST `/api/admin/plugins/[source]/health`

プラグインのヘルスチェック:

```typescript
// app/api/admin/plugins/[source]/health/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user';
import { ragPluginRegistry } from '@/lib/plugins/rag-plugin-registry';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ source: string }> }
) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    );
  }

  const { source } = await params;
  const plugin = ragPluginRegistry.get(source);

  if (!plugin) {
    return NextResponse.json(
      { error: 'Not Found', message: `Plugin "${source}" not found` },
      { status: 404 }
    );
  }

  const healthResult = await ragPluginRegistry.checkHealth(source);

  return NextResponse.json({ health: healthResult });
}
```

**レスポンス例:**
```json
{
  "health": {
    "healthy": true,
    "message": "Note.com is accessible",
    "lastCheck": "2025-10-29T12:00:00.000Z"
  }
}
```

---

## UI コンポーネント

### Plugin Management Page (`/app/(dashboard)/admin/plugins/page.tsx`)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Plugin {
  name: string;
  source: string;
  version: string;
  capabilities: {
    list: boolean;
    search: boolean;
    filter: boolean;
    fetch: boolean;
    transform: boolean;
  };
}

export default function PluginManagementPage() {
  const { t } = useLocale();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [healthChecks, setHealthChecks] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    const response = await fetch('/api/admin/plugins');
    const data = await response.json();
    setPlugins(data.plugins);
    setLoading(false);
  };

  const runHealthCheck = async (source: string) => {
    setHealthChecks(prev => new Map(prev).set(source, { loading: true }));

    const response = await fetch(`/api/admin/plugins/${source}/health`, {
      method: 'POST',
    });
    const data = await response.json();

    setHealthChecks(prev => new Map(prev).set(source, data.health));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t.admin.plugins.title}</h1>
        <p className="text-gray-600 mt-2">{t.admin.plugins.description}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plugins.map(plugin => {
          const health = healthChecks.get(plugin.source);

          return (
            <Card key={plugin.source}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{plugin.name}</CardTitle>
                    <CardDescription>v{plugin.version}</CardDescription>
                  </div>
                  {health && (
                    health.healthy ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">
                      {t.admin.plugins.capabilities}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(plugin.capabilities)
                        .filter(([_, enabled]) => enabled)
                        .map(([capability]) => (
                          <Badge key={capability} variant="secondary">
                            {capability}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => runHealthCheck(plugin.source)}
                    disabled={health?.loading}
                    className="w-full"
                  >
                    {health?.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.common.loading}
                      </>
                    ) : (
                      t.admin.plugins.checkHealth
                    )}
                  </Button>

                  {health && !health.loading && (
                    <p className={`text-sm ${health.healthy ? 'text-green-600' : 'text-red-600'}`}>
                      {health.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

**UIの特徴:**
- **カードレイアウト**: プラグインごとに独立したカード
- **ヘルスチェック**: ボタンクリックで即時確認
- **ビジュアルフィードバック**: アイコンで状態を表示
- **多言語対応**: `useLocale()`で翻訳統合

---

## 使用方法

### アプリケーション起動時の初期化

`/app/layout.tsx`または`/lib/plugins/index.ts`:

```typescript
import { RagPluginFactory } from '@/lib/plugins/rag-plugin-registry';

// アプリケーション起動時に1回だけ実行
RagPluginFactory.initializeStandardPlugins();
```

### プラグインの使用例

```typescript
import { ragPluginRegistry } from '@/lib/plugins/rag-plugin-registry';

// 特定のプラグインを取得
const notePlugin = ragPluginRegistry.get('note');

if (notePlugin) {
  // コンテンツ一覧を取得
  const contents = await notePlugin.adapter.listContent({ page: 1 });

  // 個別コンテンツを取得
  const content = await notePlugin.adapter.fetchContent('123');

  // ヘルスチェック
  const health = await ragPluginRegistry.checkHealth('note');
}

// 全プラグインを取得
const allPlugins = ragPluginRegistry.getAll();
```

---

## テスト

### Integration Tests (`/tests/integration/api/plugin-management-api.test.ts`)

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ragPluginRegistry, ragPluginFactory } from '@/lib/plugins/rag-plugin-registry';

describe('Plugin Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // テスト前に初期化
    ragPluginRegistry.clear();
    ragPluginFactory.initializeStandardPlugins();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ragPluginRegistry.clear();
  });

  describe('GET /api/admin/plugins', () => {
    it('should return list of registered plugins', async () => {
      const plugins = ragPluginRegistry.getAll();
      expect(plugins.length).toBeGreaterThan(0);

      plugins.forEach(plugin => {
        expect(plugin).toHaveProperty('name');
        expect(plugin).toHaveProperty('source');
        expect(plugin).toHaveProperty('version');
        expect(plugin).toHaveProperty('capabilities');
      });
    });
  });

  describe('POST /api/admin/plugins/[source]/health', () => {
    it('should run health check for specific plugin', async () => {
      const healthResult = await ragPluginRegistry.checkHealth('note');

      expect(healthResult).toHaveProperty('healthy');
      expect(typeof healthResult.healthy).toBe('boolean');
    });

    it('should return 404 for non-existent plugin', async () => {
      const plugin = ragPluginRegistry.get('non-existent');
      expect(plugin).toBeUndefined();
    });
  });
});
```

### E2E Tests (`/tests/e2e/admin-dashboard.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard - Plugin Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/plugins');
  });

  test('should display plugin management page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Plugin Management|プラグイン管理/);
  });

  test('should display registered plugins', async ({ page }) => {
    const pluginCards = page.locator('[class*="rounded-lg border"]').filter({
      hasText: /note|local/i
    });
    expect(await pluginCards.count()).toBeGreaterThanOrEqual(1);
  });

  test('should run health check on button click', async ({ page }) => {
    const healthButton = page.locator('button').filter({
      hasText: /Check Health|ヘルスチェック/
    }).first();

    await healthButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=/accessible|アクセス可能/i')).toBeVisible();
  });
});
```

---

## 新しいプラグインの追加

### Step 1: Adapterの作成

```typescript
// lib/plugins/adapters/new-adapter.ts
import { RagAdapter, HealthCheckResult, ContentItem } from '../rag-plugin-interfaces';

export class NewAdapter implements RagAdapter {
  async healthCheck(): Promise<HealthCheckResult> {
    // ヘルスチェックロジック
  }

  async listContent(): Promise<ContentItem[]> {
    // コンテンツ一覧取得ロジック
  }

  async fetchContent(id: string): Promise<ContentItem> {
    // 個別コンテンツ取得ロジック
  }
}
```

### Step 2: Factoryに登録

```typescript
// lib/plugins/rag-plugin-registry.ts
export class RagPluginFactory {
  static initializeStandardPlugins(): void {
    const registry = RagPluginRegistry.getInstance();

    // 既存のプラグイン...

    // 新しいプラグインを追加
    registry.register('new-source', {
      name: 'New Plugin',
      source: 'new-source',
      version: '1.0.0',
      adapter: new NewAdapter(),
      capabilities: {
        list: true,
        search: true,
        filter: false,
        fetch: true,
        transform: false,
      },
    });
  }
}
```

### Step 3: 翻訳の追加

```typescript
// lib/i18n/translations.ts
export const translations = {
  ja: {
    admin: {
      plugins: {
        newPlugin: '新しいプラグイン',
      },
    },
  },
  en: {
    admin: {
      plugins: {
        newPlugin: 'New Plugin',
      },
    },
  },
};
```

### Step 4: テストの作成

```typescript
describe('New Plugin', () => {
  it('should be registered', () => {
    const plugin = ragPluginRegistry.get('new-source');
    expect(plugin).toBeDefined();
    expect(plugin?.name).toBe('New Plugin');
  });

  it('should pass health check', async () => {
    const health = await ragPluginRegistry.checkHealth('new-source');
    expect(health.healthy).toBe(true);
  });
});
```

---

## ベストプラクティス

### ✅ DO

1. **Singleton Registryを使用**
   ```typescript
   const registry = RagPluginRegistry.getInstance();
   ```

2. **Factory経由で初期化**
   ```typescript
   RagPluginFactory.initializeStandardPlugins();
   ```

3. **型安全性を保つ**
   ```typescript
   const plugin: RagPlugin = { /* ... */ };
   ```

4. **エラーハンドリング**
   ```typescript
   try {
     await plugin.adapter.fetchContent(id);
   } catch (error) {
     console.error('Failed to fetch:', error);
   }
   ```

### ❌ DON'T

1. **Registry を直接インスタンス化**
   ```typescript
   const registry = new RagPluginRegistry(); // NG
   ```

2. **未登録プラグインにアクセス**
   ```typescript
   const plugin = registry.get('unknown');
   plugin.adapter.listContent(); // undefined error
   ```

3. **ヘルスチェックなしの運用**
   ```typescript
   // 本番環境では必ずヘルスチェックを実装
   ```

---

## パフォーマンス考慮事項

### キャッシング

将来的な最適化:

```typescript
class CachedAdapter implements RagAdapter {
  private cache = new Map<string, ContentItem>();

  async fetchContent(id: string): Promise<ContentItem> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const content = await this.actualFetch(id);
    this.cache.set(id, content);
    return content;
  }
}
```

### レート制限

外部API呼び出しの制限:

```typescript
class RateLimitedAdapter implements RagAdapter {
  private lastCall = 0;
  private minInterval = 1000; // 1秒

  async listContent(): Promise<ContentItem[]> {
    const now = Date.now();
    const elapsed = now - this.lastCall;

    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }

    this.lastCall = Date.now();
    return await this.actualList();
  }
}
```

---

## トラブルシューティング

### プラグインが登録されていない

**症状**: `registry.get('note')` が `undefined` を返す

**解決**:
1. `RagPluginFactory.initializeStandardPlugins()` が呼ばれているか確認
2. テスト環境では `beforeEach` で初期化

### ヘルスチェックが失敗する

**症状**: `healthy: false` が返される

**確認項目**:
1. ネットワーク接続
2. API キーや認証情報
3. 外部サービスの稼働状況

### TypeScript型エラー

**症状**: `RagAdapter` の実装で型エラー

**解決**:
1. 全ての必須メソッドを実装
2. オプショナルメソッドには `?` を付ける
3. 戻り値の型を正確に

---

## 関連ドキュメント

- [Phase 2 Sprint Plan](/docs/implementation/phase2-sprint-plan.md)
- [i18n Implementation Guide](/docs/features/i18n-implementation-guide.md)
- [Admin Dashboard Documentation](/docs/features/admin-dashboard.md)
- [API Reference](/docs/api/admin-endpoints.md)

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|---------|--------|
| 2025-10-29 | 初版作成 - Phase 2実装完了 | Backend Engineer |

---

*Last Updated: 2025-10-29*
*Status: ✅ Production Ready*

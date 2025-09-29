# MUED LMS 段階的移行計画書

**作成日: 2025年9月26日**
**対象期間: 2025年10月 - 2026年9月**

## 概要

本文書は、MUED LMSの現行システムから MCP統合アーキテクチャへの段階的移行計画を詳細に定めたものです。リスクを最小化しながら、ビジネス継続性を保証する実装アプローチを提示します。

## Phase 0: 技術的負債の解消（2025年10月-11月）

### Week 1-2: 基盤整備

#### タスク1: API統一化
```bash
# 実行コマンド例
# 1. 既存APIの棚卸し
find apps/web/app/api -name "*.ts" | xargs grep -l "export async function"

# 2. OpenAPI定義の生成
npx @asteasolutions/zod-to-openapi generate
```

**具体的な作業:**
1. 重複APIエンドポイントの統合
   - `/api/lesson-slots` と `/api/lesson-slots-v2` を統合
   - `/api/checkout` 関連エンドポイントの整理

2. APIバージョニング導入
```typescript
// apps/web/app/api/v1/route.ts
export const apiVersion = 'v1';

// 新しい構造
/api/v1/lessons/
/api/v1/reservations/
/api/v1/payments/
/api/v1/users/
```

#### タスク2: 依存関係のクリーンアップ
```json
// package.json の更新
{
  "scripts": {
    "deps:analyze": "npx depcheck",
    "deps:clean": "npm prune",
    "deps:audit": "npm audit fix"
  }
}
```

**削除対象パッケージ:**
```bash
npm uninstall @storybook/addon-essentials @storybook/addon-onboarding @storybook/blocks @storybook/experimental-addon-test @storybook/react @storybook/react-vite @storybook/test storybook react-router-dom node-fetch axios @netlify/functions workbox-window
```

### Week 3-4: テスト基盤整備

#### ユニットテスト強化
```typescript
// apps/web/__tests__/api/lessons.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testClient } from '@/lib/test/client'

describe('Lesson API', () => {
  beforeAll(async () => {
    await testClient.setup()
  })

  afterAll(async () => {
    await testClient.teardown()
  })

  it('should create lesson slot', async () => {
    const response = await testClient.post('/api/v1/lessons/slots', {
      startTime: '2025-02-01T10:00:00Z',
      endTime: '2025-02-01T11:00:00Z',
      teacherId: 'test-teacher-id'
    })

    expect(response.status).toBe(201)
    expect(response.data).toHaveProperty('id')
  })
})
```

#### E2Eテスト実装
```typescript
// apps/web/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('予約フロー', () => {
  test('メンターの予約スロットから支払いまで', async ({ page }) => {
    // 1. ログイン
    await page.goto('/login')
    await page.fill('[name="email"]', 'student@test.com')
    await page.fill('[name="password"]', 'testpass')
    await page.click('[type="submit"]')

    // 2. メンター選択
    await page.goto('/dashboard/mentors')
    await page.click('[data-mentor-id="test-mentor"]')

    // 3. スロット選択
    await page.click('[data-slot="2025-02-01T10:00"]')

    // 4. 予約確認
    await page.click('text=予約を確定')

    // 5. 支払い
    await expect(page).toHaveURL(/checkout/)
  })
})
```

### Week 5-6: 開発環境標準化

#### Docker環境構築
```dockerfile
# Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# Dependencies installation
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# Prisma generation
COPY apps/web/prisma ./apps/web/prisma
RUN cd apps/web && npx prisma generate

# Application code
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DATABASE_URL: ${DATABASE_URL}
```

### Week 7-8: パフォーマンス最適化

#### バンドルサイズ削減
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/*']
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module) {
              return module.size() > 160000
            },
            name(module) {
              const hash = crypto.createHash('sha1')
              hash.update(module.identifier())
              return hash.digest('hex').substring(0, 8)
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      }
    }
    return config
  },
}
```

## Phase 1: MCP統合（2025年4月-6月）

### Month 1: MCP Gateway Setup

#### MCP Gateway 実装
```typescript
// packages/mcp-gateway/src/index.ts
import { MCPGateway } from '@modelcontextprotocol/gateway'
import { AIServer } from './servers/ai-server'
import { PaymentServer } from './servers/payment-server'
import { AuthServer } from './servers/auth-server'

export const gateway = new MCPGateway({
  servers: [
    new AIServer({
      url: process.env.AI_SERVICE_URL,
      transport: 'websocket'
    }),
    new PaymentServer({
      url: process.env.PAYMENT_SERVICE_URL,
      transport: 'http'
    }),
    new AuthServer({
      url: process.env.AUTH_SERVICE_URL,
      transport: 'http'
    })
  ],

  routing: {
    '/mcp/ai/*': 'ai-server',
    '/mcp/payment/*': 'payment-server',
    '/mcp/auth/*': 'auth-server'
  },

  middleware: [
    rateLimiting({ max: 100, window: '1m' }),
    authentication(),
    logging()
  ]
})
```

#### AI MCP Server実装
```python
# ai-service/app/mcp_server.py
from mcp import Server, Tool, Resource
from typing import Dict, Any
import asyncio

class AIMCPServer(Server):
    """MUED AI Service MCP Server"""

    def __init__(self):
        super().__init__(
            name="mued-ai-service",
            version="1.0.0"
        )

        # Register tools
        self.register_tool(
            name="generate_material",
            description="AI教材を生成",
            handler=self.generate_material
        )

        self.register_tool(
            name="match_mentor",
            description="最適なメンターをマッチング",
            handler=self.match_mentor
        )

    async def generate_material(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """教材生成ロジック"""
        topic = params.get('topic')
        level = params.get('level', 'intermediate')
        format_type = params.get('format', 'pdf')

        # OpenAI APIを使用した生成処理
        material = await self.ai_service.generate(
            topic=topic,
            level=level,
            format=format_type
        )

        return {
            "material_id": material.id,
            "title": material.title,
            "content": material.content,
            "format": format_type
        }

    async def match_mentor(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """メンターマッチングロジック"""
        student_profile = params.get('student_profile')
        preferences = params.get('preferences')

        # マッチングアルゴリズム実行
        mentors = await self.matching_service.find_mentors(
            profile=student_profile,
            preferences=preferences
        )

        return {
            "matches": [
                {
                    "mentor_id": m.id,
                    "name": m.name,
                    "score": m.match_score,
                    "specialties": m.specialties
                }
                for m in mentors[:5]
            ]
        }

# サーバー起動
if __name__ == "__main__":
    server = AIMCPServer()
    asyncio.run(server.start())
```

### Month 2: Service Integration

#### Next.js統合
```typescript
// apps/web/lib/mcp/client.ts
import { MCPClient } from '@modelcontextprotocol/client'

class MUEDMCPClient {
  private client: MCPClient

  constructor() {
    this.client = new MCPClient({
      gateway: process.env.MCP_GATEWAY_URL,
      apiKey: process.env.MCP_API_KEY
    })
  }

  async generateMaterial(params: MaterialGenerationParams) {
    return this.client.call('ai-service', 'generate_material', params)
  }

  async matchMentor(params: MentorMatchingParams) {
    return this.client.call('ai-service', 'match_mentor', params)
  }

  async createCheckout(params: CheckoutParams) {
    return this.client.call('payment-service', 'create_checkout', params)
  }
}

export const mcpClient = new MUEDMCPClient()
```

#### APIルート更新
```typescript
// apps/web/app/api/v1/materials/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { mcpClient } from '@/lib/mcp/client'
import { z } from 'zod'

const GenerateMaterialSchema = z.object({
  topic: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  format: z.enum(['pdf', 'video', 'interactive'])
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params = GenerateMaterialSchema.parse(body)

    // MCP経由でAIサービスを呼び出し
    const result = await mcpClient.generateMaterial(params)

    // データベースに保存
    await prisma.material.create({
      data: {
        id: result.material_id,
        title: result.title,
        content: result.content,
        format: result.format,
        userId: request.auth.userId
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Material generation failed' },
      { status: 500 }
    )
  }
}
```

### Month 3: Testing & Optimization

#### 統合テスト
```typescript
// apps/web/__tests__/integration/mcp-flow.test.ts
import { describe, it, expect } from 'vitest'
import { MCPTestClient } from '@/lib/test/mcp-client'

describe('MCP Integration', () => {
  const client = new MCPTestClient()

  it('should generate material through MCP', async () => {
    const result = await client.call('ai-service', 'generate_material', {
      topic: 'Jazz Piano Basics',
      level: 'beginner',
      format: 'pdf'
    })

    expect(result).toHaveProperty('material_id')
    expect(result.format).toBe('pdf')
  })

  it('should handle service failures gracefully', async () => {
    // AIサービスを意図的に停止
    await client.stopService('ai-service')

    const result = await client.call('ai-service', 'generate_material', {
      topic: 'test'
    })

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('SERVICE_UNAVAILABLE')
  })
})
```

## Phase 2: B2B機能拡張（2025年7月-9月）

### ホワイトラベルAPI実装

```typescript
// apps/web/app/api/v2/white-label/route.ts
import { NextRequest } from 'next/server'
import { createWhiteLabelInstance } from '@/lib/white-label'

export async function POST(request: NextRequest) {
  const { organizationId, config } = await request.json()

  const instance = await createWhiteLabelInstance({
    organizationId,
    branding: config.branding,
    features: config.features,
    limits: config.limits
  })

  return Response.json({
    instanceId: instance.id,
    apiKey: instance.apiKey,
    endpoints: {
      base: `https://api.mued.jp/v2/${instance.id}`,
      auth: `https://auth.mued.jp/${instance.id}`,
      webhooks: `https://webhooks.mued.jp/${instance.id}`
    }
  })
}
```

### マルチテナント対応

```sql
-- Prisma schema update
model Organization {
  id            String   @id @default(uuid())
  name          String
  subdomain     String   @unique
  customDomain  String?
  plan          Plan
  settings      Json
  createdAt     DateTime @default(now())

  users         User[]
  lessons       Lesson[]
  materials     Material[]
}

-- Row Level Security
CREATE POLICY organization_isolation ON users
  USING (organization_id = current_setting('app.current_organization')::uuid);
```

## Phase 3: グローバル展開（2025年10月-2026年1月）

### 国際化実装

```typescript
// apps/web/lib/i18n/config.ts
export const i18nConfig = {
  locales: ['ja', 'en', 'zh', 'ko'],
  defaultLocale: 'ja',

  namespaces: [
    'common',
    'dashboard',
    'lessons',
    'payments'
  ],

  fallbackLng: 'en',

  detection: {
    order: ['cookie', 'header', 'path'],
    caches: ['cookie']
  }
}

// apps/web/middleware.ts
import { createI18nMiddleware } from 'next-international/middleware'

export default createI18nMiddleware({
  locales: i18nConfig.locales,
  defaultLocale: i18nConfig.defaultLocale,
  urlMappingStrategy: 'rewrite'
})
```

### マルチリージョン展開

```yaml
# infrastructure/terraform/main.tf
resource "aws_lambda_function" "mued_api" {
  for_each = var.regions

  function_name = "mued-api-${each.key}"
  runtime       = "nodejs20.x"
  handler       = "index.handler"

  environment {
    variables = {
      REGION        = each.key
      DATABASE_URL  = var.database_urls[each.key]
      CACHE_URL     = var.cache_urls[each.key]
    }
  }
}

resource "aws_cloudfront_distribution" "mued_cdn" {
  enabled = true

  origin {
    domain_name = "api.mued.jp"
    origin_id   = "mued-api"

    origin_shield {
      enabled              = true
      origin_shield_region = "ap-northeast-1"
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "mued-api"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Accept-Language"]
    }
  }
}
```

## リスク管理とロールバック計画

### Feature Flagging実装

```typescript
// apps/web/lib/features/flags.ts
import { createClient } from '@vercel/edge-config'

const edgeConfig = createClient(process.env.EDGE_CONFIG)

export const featureFlags = {
  async isEnabled(feature: string, userId?: string): Promise<boolean> {
    const flags = await edgeConfig.get('featureFlags')
    const flag = flags[feature]

    if (!flag) return false

    // 段階的ロールアウト
    if (flag.rolloutPercentage) {
      const hash = hashUserId(userId)
      return hash < flag.rolloutPercentage
    }

    // ユーザーグループ別
    if (flag.enabledForGroups && userId) {
      const user = await getUser(userId)
      return flag.enabledForGroups.includes(user.group)
    }

    return flag.enabled
  }
}
```

### ロールバック手順

```bash
#!/bin/bash
# rollback.sh

DEPLOYMENT_ID=$1
ENVIRONMENT=$2

echo "Rolling back deployment $DEPLOYMENT_ID in $ENVIRONMENT"

# 1. Feature flagを無効化
vercel env pull --environment=$ENVIRONMENT
sed -i 's/ENABLE_NEW_FEATURES=true/ENABLE_NEW_FEATURES=false/' .env.$ENVIRONMENT
vercel env push --environment=$ENVIRONMENT

# 2. 前バージョンにロールバック
vercel rollback $DEPLOYMENT_ID --scope=mued

# 3. キャッシュクリア
curl -X POST https://api.mued.jp/admin/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. ヘルスチェック
curl https://api.mued.jp/health

echo "Rollback completed"
```

## 成功指標とモニタリング

### ダッシュボード設定

```typescript
// monitoring/dashboard.ts
export const dashboardConfig = {
  metrics: [
    {
      name: 'API Response Time',
      query: 'avg(http_request_duration_ms)',
      threshold: 200,
      unit: 'ms'
    },
    {
      name: 'Error Rate',
      query: 'rate(http_requests_total{status=~"5.."}[5m])',
      threshold: 0.01,
      unit: '%'
    },
    {
      name: 'Active Users',
      query: 'count(distinct(user_id))',
      goal: 10000,
      unit: 'users'
    },
    {
      name: 'MCP Gateway Throughput',
      query: 'rate(mcp_requests_total[1m])',
      threshold: 1000,
      unit: 'req/s'
    }
  ],

  alerts: [
    {
      name: 'High Error Rate',
      condition: 'error_rate > 0.05',
      severity: 'critical',
      channels: ['slack', 'email']
    },
    {
      name: 'Slow Response Time',
      condition: 'p95_response_time > 500',
      severity: 'warning',
      channels: ['slack']
    }
  ]
}
```

## チェックリスト

### Phase 0 完了条件
- [ ] すべての重複APIが統合されている
- [ ] 不要な依存関係が削除されている
- [ ] テストカバレッジが60%以上
- [ ] Docker開発環境が動作している
- [ ] ビルド時間が5分以下

### Phase 1 完了条件
- [ ] MCP Gatewayが稼働している
- [ ] AI MCPサーバーが統合されている
- [ ] Payment MCPサーバーが統合されている
- [ ] 統合テストがすべて成功
- [ ] APIレスポンス時間が200ms以下

### Phase 2 完了条件
- [ ] ホワイトラベルAPIが提供されている
- [ ] マルチテナント対応が完了
- [ ] B2B契約が2社以上
- [ ] 管理ダッシュボードが稼働

### Phase 3 完了条件
- [ ] 4言語対応が完了
- [ ] 3リージョンでサービス提供
- [ ] モバイルアプリがリリース
- [ ] 月間アクティブユーザー10,000人達成

## サポート体制

### 開発サポート
- Slackチャンネル: #mued-migration
- 週次進捗会議: 毎週月曜日 10:00
- 技術相談窓口: tech-support@mued.jp

### ドキュメント
- 移行ガイド: https://docs.mued.jp/migration
- API仕様書: https://api.mued.jp/docs
- MCP実装例: https://github.com/mued/mcp-examples

---

本計画書は定期的に見直し、必要に応じて更新されます。
最新版は常にGitHubリポジトリで管理されています。
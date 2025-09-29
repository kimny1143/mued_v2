# MUED LMS 即座に実施すべきアクション

**作成日: 2025年1月26日**
**優先度: 緊急**

## 今週実施すべきタスク（2025年1月27日〜2月2日）

### 1. 依存関係のクリーンアップ（月曜日）

#### 実行コマンド

```bash
# 1. 現在のディレクトリに移動
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_lms_fgm

# 2. 依存関係の分析
npx depcheck

# 3. 不要なパッケージの削除
npm uninstall @storybook/addon-essentials @storybook/addon-onboarding @storybook/blocks @storybook/experimental-addon-test @storybook/react @storybook/react-vite @storybook/test @chromatic-com/storybook storybook

# 4. 追加の不要パッケージ削除
npm uninstall react-router-dom node-fetch axios @netlify/functions workbox-window

# 5. package-lock.jsonの再生成
rm package-lock.json
npm install

# 6. ビルドテスト
npm run build
```

### 2. API統一化の開始（火曜日〜水曜日）

#### Step 1: 既存APIの整理

```typescript
// apps/web/app/api/v1/lessons/slots/route.ts
// 統合されたレッスンスロットAPI

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const LessonSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  teacherId: z.string().uuid(),
  hourlyRate: z.number().optional(),
  currency: z.string().optional()
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacherId')
  const isAvailable = searchParams.get('isAvailable')

  const slots = await prisma.lesson_slots.findMany({
    where: {
      ...(teacherId && { teacher_id: teacherId }),
      ...(isAvailable && { is_available: isAvailable === 'true' })
    },
    orderBy: { start_time: 'asc' }
  })

  return NextResponse.json(slots)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const data = LessonSlotSchema.parse(body)

  const slot = await prisma.lesson_slots.create({
    data: {
      id: crypto.randomUUID(),
      start_time: new Date(data.startTime),
      end_time: new Date(data.endTime),
      teacher_id: data.teacherId,
      hourly_rate: data.hourlyRate ?? 6000,
      currency: data.currency ?? 'JPY',
      updated_at: new Date()
    }
  })

  return NextResponse.json(slot, { status: 201 })
}
```

#### Step 2: 既存エンドポイントからリダイレクト

```typescript
// apps/web/app/api/lesson-slots/route.ts
// 旧エンドポイントから新エンドポイントへのリダイレクト

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/v1/lessons/slots'

  return NextResponse.redirect(url, { status: 301 })
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/v1/lessons/slots'

  return NextResponse.redirect(url, { status: 308 })
}
```

### 3. 環境変数の整理（木曜日）

#### .env.example の作成

```bash
# apps/web/.env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mued_lms"
DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/mued_lms"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# AI Service
AI_SERVICE_URL="http://localhost:8000"
OPENAI_API_KEY="sk-..."

# MCP (将来的に使用)
MCP_GATEWAY_URL="http://localhost:3333"
MCP_API_KEY="mcp_..."

# App Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. テスト基盤の整備（金曜日）

#### 基本的なAPIテストの追加

```typescript
// apps/web/__tests__/api/v1/lessons.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/v1/lessons/slots/route'

describe('/api/v1/lessons/slots', () => {
  describe('GET', () => {
    it('should return lesson slots', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          teacherId: 'test-teacher-id'
        }
      })

      await GET(req as any)

      expect(res._getStatusCode()).toBe(200)
      const jsonData = JSON.parse(res._getData())
      expect(Array.isArray(jsonData)).toBe(true)
    })
  })

  describe('POST', () => {
    it('should create a new lesson slot', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          startTime: '2025-02-01T10:00:00Z',
          endTime: '2025-02-01T11:00:00Z',
          teacherId: 'test-teacher-id'
        }
      })

      await POST(req as any)

      expect(res._getStatusCode()).toBe(201)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData).toHaveProperty('id')
    })
  })
})
```

## 今月中に完了すべきタスク（2月）

### Week 1-2: Docker環境構築

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: mued
      POSTGRES_PASSWORD: mued_password
      POSTGRES_DB: mued_lms
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://mued:mued_password@postgres:5432/mued_lms
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}

volumes:
  postgres_data:
```

### Week 3-4: パフォーマンス最適化

#### バンドル分析とサイズ削減

```bash
# 1. バンドル分析ツールのインストール
npm install --save-dev @next/bundle-analyzer

# 2. next.config.jsの更新
cat >> apps/web/next.config.js << 'EOF'
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // 既存の設定...
})
EOF

# 3. バンドル分析の実行
ANALYZE=true npm run build
```

## チェックリスト

### 緊急度: 高（今週中）

- [ ] 不要なパッケージの削除
- [ ] package-lock.jsonの再生成
- [ ] API v1への統一開始
- [ ] 環境変数テンプレート作成
- [ ] 基本的なテスト追加

### 緊急度: 中（2週間以内）

- [ ] Docker開発環境の構築
- [ ] CI/CDパイプラインの見直し
- [ ] エラーログの統一化
- [ ] APIドキュメント作成開始

### 緊急度: 低（1ヶ月以内）

- [ ] Storybookの完全削除と代替検討
- [ ] E2Eテストの拡充
- [ ] パフォーマンスベンチマーク確立
- [ ] セキュリティ監査実施

## 注意事項

### ⚠️ 重要な警告

1. **本番環境への影響を最小化**
   - すべての変更は開発環境でテスト
   - 段階的なデプロイメント実施
   - ロールバック計画の準備

2. **データベース変更時の注意**
   - 必ずバックアップを取得
   - マイグレーションは慎重に実施
   - ダウンタイムの事前通知

3. **API変更時の考慮事項**
   - 既存クライアントの互換性維持
   - 適切なバージョニング
   - 十分な移行期間の確保

## サポート情報

### 問い合わせ先
- 技術的な質問: Slack #mued-tech-support
- 緊急時: tech-emergency@mued.jp

### 参考リソース
- [Next.js 14 to 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [MCP Quick Start Guide](https://modelcontextprotocol.io/quickstart)

---

**最終更新**: 2025年1月26日
**次回レビュー**: 2025年2月3日
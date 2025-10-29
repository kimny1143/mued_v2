# Phase 2 実装計画: RAG観測とデータ管理
## 2週間スプリント (2025年10月30日 - 2025年11月12日)

---

## 🎯 スプリント目標

**プライマリゴール:**
- RAGメトリクス収集・可視化システムの稼働
- プロヴェナンス管理の基盤構築
- SLO監視ダッシュボードの実装

**成功基準:**
- Citation Rate 70%以上を14日間連続達成
- P50レイテンシ1.5秒以内の安定稼働
- プロヴェナンス情報の100%記録

---

## 📅 Sprint 1: Week 1 (10/30 - 11/5)

### Day 1-2: Database & Schema Setup
**担当:** Backend Engineer

#### タスク:
- [ ] Drizzle ORMスキーマファイルのレビューと調整
- [ ] マイグレーションスクリプトの実行
- [ ] データベース接続設定の更新
- [ ] 初期データのシーディング

#### 成果物:
- `/db/schema/rag-metrics.ts` - 完成版スキーマ
- `/db/migrations/0002_add_rag_metrics.sql` - 実行済みマイグレーション
- Migration実行ログ

#### 検証:
```bash
# スキーマ確認
npm run db:studio

# マイグレーション状態確認
npm run db:migrate:status
```

---

### Day 3-4: API Implementation - Core Endpoints
**担当:** Backend Engineer

#### タスク:
- [ ] `/api/admin/rag-metrics` エンドポイント実装
- [ ] `/api/admin/provenance` CRUD実装
- [ ] Clerk認証ミドルウェアの統合
- [ ] エラーハンドリングとバリデーション

#### 成果物:
```
/app/api/admin/
├── rag-metrics/
│   ├── route.ts           # GET /api/admin/rag-metrics
│   ├── history/
│   │   └── route.ts       # GET /api/admin/rag-metrics/history
│   └── realtime/
│       └── route.ts       # GET /api/admin/rag-metrics/realtime
└── provenance/
    ├── route.ts           # GET, POST /api/admin/provenance
    └── [contentId]/
        └── route.ts       # GET, PUT /api/admin/provenance/:id
```

#### テストコマンド:
```bash
# API動作確認
curl -H "Authorization: Bearer $CLERK_TOKEN" \
  http://localhost:3000/api/admin/rag-metrics

# Postmanコレクション実行
npm run test:api
```

---

### Day 5: Batch Job Implementation
**担当:** Backend Engineer

#### タスク:
- [ ] RAGメトリクス集計ジョブの実装
- [ ] Vercel Cron設定
- [ ] ローカル開発用スクリプト
- [ ] バックフィル機能の実装

#### 成果物:
- `/scripts/jobs/calculate-rag-metrics.ts` - 集計ジョブ
- `/app/api/cron/rag-metrics/route.ts` - Cronエンドポイント
- `/vercel.json` - Cron設定追加

#### Vercel Cron設定:
```json
{
  "crons": [{
    "path": "/api/cron/rag-metrics",
    "schedule": "0 17 * * *"  // 02:00 JST
  }]
}
```

#### 手動実行:
```bash
# ローカル実行
npm run job:rag-metrics

# バックフィル実行
npm run job:rag-metrics backfill 2025-10-01 2025-10-29
```

---

## 📅 Sprint 1: Week 2 (11/6 - 11/12)

### Day 6-7: Dashboard UI Development
**担当:** Frontend Engineer

#### タスク:
- [ ] RAGメトリクスダッシュボードページ作成
- [ ] リアルタイムメトリクス表示コンポーネント
- [ ] 履歴グラフコンポーネント (Recharts)
- [ ] SLOコンプライアンス表示

#### 成果物:
```
/app/(dashboard)/admin/rag-metrics/
├── page.tsx              # メインダッシュボード
├── components/
│   ├── MetricsCards.tsx  # KPIカード群
│   ├── LatencyChart.tsx  # レイテンシグラフ
│   ├── CitationRate.tsx  # 引用率表示
│   └── SloStatus.tsx     # SLO達成状況
└── loading.tsx           # ローディング状態
```

#### デザイン仕様:
- Shadcn/UI コンポーネント使用
- ダークモード対応
- レスポンシブデザイン
- リアルタイム更新（5秒間隔）

---

### Day 8-9: Plugin Registry & Factory Pattern
**担当:** Backend Engineer

#### タスク:
- [ ] Plugin Registry実装
- [ ] Note.comプラグインの登録
- [ ] ヘルスチェック機能
- [ ] プラグイン管理UI

#### 成果物:
```
/lib/plugins/
├── registry.ts          # PluginRegistry class
├── interfaces.ts        # IContentFetcher等
├── factory.ts          # PluginFactory
└── adapters/
    ├── note-adapter.ts # Note.com adapter
    └── local-adapter.ts # Local materials adapter
```

#### プラグイン登録例:
```typescript
// 起動時の登録
const registry = new PluginRegistry();

registry.register('note', {
  fetch: new NoteContentFetcher(),
  capabilities: {
    list: true,
    search: true,
    filter: true,
    fetch: true,
    transform: false
  }
});
```

---

### Day 10: Integration Testing
**担当:** QA Engineer + Backend Engineer

#### タスク:
- [ ] E2Eテストシナリオ作成
- [ ] APIインテグレーションテスト
- [ ] メトリクス計算精度検証
- [ ] 負荷テスト実施

#### テストファイル:
```
/tests/
├── e2e/
│   └── admin-dashboard.spec.ts
├── integration/
│   ├── rag-metrics-api.test.ts
│   └── provenance-api.test.ts
└── unit/
    ├── metrics-calculation.test.ts
    └── plugin-registry.test.ts
```

#### テスト実行:
```bash
# 全テスト実行
npm run test:all

# E2Eテストのみ
npm run test:e2e

# カバレッジレポート
npm run test:coverage
```

---

### Day 11-12: Production Deployment & Monitoring
**担当:** DevOps Engineer + Team Lead

#### タスク:
- [ ] Staging環境でのテスト
- [ ] Production環境へのデプロイ
- [ ] 監視設定（Vercel Analytics, Sentry）
- [ ] アラート設定

#### デプロイチェックリスト:
```markdown
## Pre-deployment
- [ ] 全テスト合格
- [ ] マイグレーション実行計画
- [ ] 環境変数確認
- [ ] ロールバック計画

## Deployment
- [ ] データベースマイグレーション
- [ ] Vercelデプロイ
- [ ] Cron Job有効化
- [ ] 初期メトリクス確認

## Post-deployment
- [ ] ダッシュボードアクセス確認
- [ ] APIレスポンス確認
- [ ] Cron実行確認
- [ ] 24時間モニタリング
```

---

## 📊 進捗管理

### Daily Standup Topics
1. 昨日の完了タスク
2. 今日の予定タスク
3. ブロッカー/課題
4. メトリクス状況（Day 6以降）

### Key Metrics to Track
| メトリクス | 目標値 | 測定頻度 |
|---------|--------|---------|
| Citation Rate | ≥70% | 毎時 |
| P50 Latency | ≤1.5s | 毎時 |
| P95 Latency | ≤3.0s | 毎時 |
| Cost/Answer | ≤¥3.0 | 日次 |
| API Uptime | ≥99.9% | 継続 |

### Risk Mitigation
| リスク | 影響度 | 対策 |
|-------|--------|------|
| DB マイグレーション失敗 | 高 | ロールバックスクリプト準備 |
| Cron Job 実行漏れ | 中 | 手動実行バックアップ |
| レイテンシSLO未達 | 中 | キャッシュ層の追加検討 |
| プラグイン統合遅延 | 低 | 静的実装で進行 |

---

## 🎯 Sprint Review Criteria

### Definition of Done
- [ ] 全ユニットテスト合格（カバレッジ80%以上）
- [ ] E2Eテスト合格
- [ ] APIドキュメント完成
- [ ] Production環境で24時間安定稼働
- [ ] SLO 14日間連続達成

### Sprint Retrospective Topics
1. 達成できたこと/できなかったこと
2. 技術的課題と解決策
3. プロセス改善点
4. Phase 3への準備状況

---

## 📝 補足資料

### 環境変数設定
```env
# .env.local
DATABASE_URL="postgresql://..."
CLERK_SECRET_KEY="sk_..."
OPENAI_API_KEY="sk-..."
VERCEL_CRON_SECRET="..."
```

### 必要なnpmパッケージ
```bash
npm install --save \
  drizzle-orm \
  @vercel/postgres \
  recharts \
  date-fns \
  date-fns-tz

npm install --save-dev \
  @types/node \
  drizzle-kit \
  vitest \
  @playwright/test
```

### 参考リンク
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Clerk Admin Auth](https://clerk.com/docs/authentication/admin)
- [Recharts Charts](https://recharts.org/)

---

*Last Updated: 2025-10-29*
*Sprint Lead: MUED Development Team*
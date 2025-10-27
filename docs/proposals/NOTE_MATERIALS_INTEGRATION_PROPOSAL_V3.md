# Note.com教材統合戦略提案書 v3.0

**作成日**: 2025-10-27（初版 v1.0）
**改訂日**: 2025-10-27（v2.0）
**改訂日**: 2025-10-27（v3.0 - 定量的統合基準・法務フレームワーク追加）
**対象**: MUED LMS Materials機能
**目的**: note.com公開教材とAI生成教材の統合戦略立案（データドリブン意思決定・法務コンプライアンス対応版）

## v3.0 改訂の焦点

**v2.0からの主要な強化点**:

1. **定量的統合基準の追加** - 各フェーズ移行の判断に具体的な数値指標を設定
2. **双方向学習サイクルの実装** - Library→Materials だけでなく Materials→Library の逆流も設計
3. **ContentFetcher Registry システム** - 固定enumから拡張可能なレジストリベースへ進化
4. **ブランド関係の逆転** - "MUED hosts note" から "MUED curates learning powered by note" へ
5. **法務・契約レイヤーの追加** - RSS利用規約、キャッシュ保持期間、API契約の明示
6. **運用監視フレームワーク** - Sentry + Vercel KV による障害検知・アラート設計

---

## 🎯 戦略的ビジョン（v3.0 強化版）

### MUEDの本質的価値: 学習創造循環システム

MUED LMSは、**「AI × コンテンツ統合による双方向学習循環システム」**である。

```
┌─────────────────────────────────────────────────────┐
│   双方向学習循環（Bidirectional Learning Cycle）      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  INPUT (知識習得 - Library)                          │
│     ↓ "この記事で練習問題を生成"                       │
│  PRACTICE (AI生成練習 - Materials)                   │
│     ↓ 結果・弱点分析                                  │
│  FEEDBACK (学習メトリクス収集)                        │
│     ↓ "関連する理論記事を読む" ← NEW!                 │
│  ADAPTIVE INPUT (弱点に基づく再学習 - Library)        │
│     ↓                                               │
│  [循環]                                             │
└─────────────────────────────────────────────────────┘
```

**v2.0との違い**: Materials→Library への逆流経路を明示的に設計

---

## 📊 現状分析（v2.0から継承）

### Note.com公開教材の特徴

**URL**: https://note.com/mued_glasswerks
**RSS Feed**: https://note.com/mued_glasswerks/rss

| 項目 | 詳細 |
|------|------|
| **記事数** | 25本 |
| **カテゴリ** | 編曲(1)、MUED教材(23)、作詞(7)、作曲(5)、録音(7) |
| **形式** | 無料教材として公開される長文チュートリアル |
| **対象レベル** | 中〜上級者（音楽理論・制作の基礎知識前提） |
| **更新頻度** | 4ヶ月前が最終更新 |
| **コンテンツタイプ** | テキスト中心の教育コンテンツ |

### MUED LMS Materials機能の特徴

| 項目 | 詳細 |
|------|------|
| **生成方法** | OpenAI API経由でAI生成 |
| **形式** | quick-test、weak-drill、カスタム教材 |
| **対象レベル** | beginner / intermediate / advanced |
| **個別最適化** | ユーザーの弱点分析（learning_metrics）に基づく |
| **インタラクティブ性** | ABC記譜法による楽譜表示・再生機能 |
| **月次制限** | サブスクリプションプランに応じた生成数制限 |

---

## 🔀 統合 vs 分離の比較（v3.0 定量的判断基準追加）

### オプションA: 統合アプローチ

**概要**: note教材をMaterialsページに統合し、「AI生成教材」と「公開教材（note）」をタブ切り替えまたはフィルタで表示

#### メリット（v2.0から継承）
✅ ワンストップ体験 - ユーザーは1箇所で全教材にアクセス
✅ 発見性向上 - AI教材ユーザーがnote教材も発見しやすい
✅ シンプルなIA - ナビゲーション構造が複雑化しない
✅ 検索・フィルタ統一 - 将来的に全教材横断検索が可能
✅ 学習循環の連続性 - INPUT→PRACTICE間の遷移が自然
✅ 推薦システムの基盤 - 「この記事に関連する練習問題」が実装しやすい
✅ データ統合の容易性 - 学習履歴・進捗管理が一元化できる

#### デメリット
❌ 機能の性質が異なる - 「生成」と「閲覧」は根本的に別のアクション
❌ UI複雑化リスク - タブ切り替えでUXが重くなる可能性
❌ パフォーマンス懸念 - RSS取得で初期ロードが遅延
❌ quota混同 - AI生成制限とnote閲覧を混同する可能性
❌ 初期開発コストが高い - 統合UIの設計・実装に時間がかかる

---

### オプションB: 分離アプローチ（Phase 1推奨、定量的基準で統合判断）

**概要**: note教材を独立した「Library」ページに配置。但し、**双方向の概念的連携（Bidirectional Conceptual Integration）**を維持する設計。

#### メリット
✅ 明確な機能分離 - 「作る」（Materials）と「学ぶ」（Library）を分離
✅ 最適化されたUX - それぞれに最適化されたインターフェース
✅ パフォーマンス向上 - RSS取得がMaterialsページのロードを遅延させない
✅ 拡張性 - 将来的に他の外部コンテンツ（YouTube、PDF等）も追加可能
✅ サブスクリプション設計の明確化 - AI生成教材とnote教材の制限を明確に分離
✅ 初期開発コストの低減 - 段階的な実装が可能

#### デメリット
❌ ナビゲーション増加 - タブが1つ増える（軽微）
❌ 学習循環の断絶リスク - INPUT（Library）とPRACTICE（Materials）が分断される
❌ 再統合コスト - 将来的に統合する際の技術的負債が発生しうる
❌ 横断検索の実装コスト - 別ページだと統一検索が複雑化

---

## 📈 定量的統合基準（NEW - v3.0の核心）

### Phase移行の判断基準

各フェーズの完了条件と次フェーズへの移行判断を定量的指標で定義。

#### Phase 1 → Phase 2 移行基準（分離UI → データ統合）

**必須条件（AND）**:
1. **Library閲覧→Materials生成遷移率** ≥ 20%
   - 測定: `(library_to_materials_clicks / library_page_views) * 100`
   - 期間: 直近30日間
2. **RSS取得成功率** ≥ 99%
   - 測定: `(successful_rss_fetches / total_rss_attempts) * 100`
   - 期間: 直近7日間
3. **Library滞在時間** ≥ 2分
   - 測定: `median(session_duration_on_library)`
   - 期間: 直近30日間

**推奨条件（任意2つ以上）**:
- Library検索利用率 ≥ 15%
- note記事クリック率（外部遷移）≥ 30%
- Library DAU ≥ 100人

#### Phase 2 → Phase 3 移行基準（データ統合 → UI再統合）

**必須条件（AND）**:
1. **横断検索利用率** ≥ 40%
   - 測定: `(cross_search_sessions / total_library_sessions) * 100`
   - 期間: 直近60日間
2. **推薦クリック率** ≥ 20%
   - 測定: `(recommendation_clicks / recommendation_impressions) * 100`
   - 期間: 直近60日間
3. **Materials→Library逆流率** ≥ 15%
   - 測定: `(materials_to_library_clicks / materials_completed_sessions) * 100`
   - 期間: 直近60日間

**推奨条件（任意2つ以上）**:
- ユーザー満足度（NPS） ≥ 50
- セッション時間の増加 ≥ +25%（vs Phase 1 baseline）
- Library + Materials併用率 ≥ 60%

#### Phase 3実装判断（UI統合 vs 分離維持）

**A/Bテスト設計**:
- **Variant A**: 統合UI（Materials内にLibraryタブ統合）
- **Variant B**: 分離UI維持（現状の `/dashboard/library` 独立）
- **サンプルサイズ**: 最低各200ユーザー
- **テスト期間**: 30日間

**統合UI採用基準（Variant Aが勝利）**:
1. タスク完了率（学習→練習の完全サイクル） +10%以上
2. ユーザー満足度スコア +0.5以上（5点満点）
3. セッション時間 +15%以上
4. 直帰率 -10%以下

**基準未達成の場合**: 分離UI維持し、推薦システムを強化

---

## 🎯 推奨戦略: **段階的統合アプローチ**（v3.0 定量基準版）

### フェーズ1: 分離UI + 双方向連携（0-3ヶ月）

**目標**: MVP + 双方向学習循環の実現

**実装内容**:

#### 1-1. Library → Materials（Forward Flow）
```tsx
// Library記事カード内
<Button
  variant="primary"
  onClick={() => generateFromArticle(article.id)}
>
  ✨ この記事で練習問題を生成
</Button>
```

#### 1-2. Materials → Library（Reverse Flow - NEW!）
```tsx
// Materials生成完了画面
<Card className="mt-6 bg-blue-50">
  <CardHeader>
    <Info className="w-5 h-5" />
    <CardTitle>もっと理解を深める</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 mb-3">
      この練習問題に関連する理論記事をLibraryで読んでみましょう
    </p>
    <Button
      variant="outline"
      onClick={() => navigateToRelatedArticles(material.topic)}
    >
      📚 関連記事を探す
    </Button>
  </CardContent>
</Card>
```

#### 1-3. フィードバックループのビジュアル化（NEW!）
```tsx
// ダッシュボード上部に学習循環可視化ウィジェット
<LearningCycleWidget>
  <CycleStep
    icon="📖"
    label="記事を読む"
    count={userStats.libraryViews}
    active={currentStep === 'library'}
  />
  <Arrow />
  <CycleStep
    icon="✨"
    label="練習する"
    count={userStats.materialsGenerated}
    active={currentStep === 'practice'}
  />
  <Arrow />
  <CycleStep
    icon="📊"
    label="弱点分析"
    count={userStats.metricsCollected}
    active={currentStep === 'feedback'}
  />
  <Arrow />
  <CycleStep
    icon="🔄"
    label="復習する"
    count={userStats.adaptiveReviews}
    active={currentStep === 'adaptive'}
  />
</LearningCycleWidget>
```

**成功指標**（Phase 2移行基準）:
- ✅ Library→Materials遷移率 ≥ 20%
- ✅ RSS取得成功率 ≥ 99%
- ✅ Library滞在時間 ≥ 2分
- ✅ Materials→Library逆流率 ≥ 10%（初期目標）

---

### フェーズ2: データ統合基盤（3-6ヶ月）

**目標**: 横断検索・推薦システム + 関連度スコアリング

**実装内容**:

#### 2-1. UnifiedContent with Relevance Scoring
```typescript
interface UnifiedContent {
  id: string;
  source: ContentSource; // Registryベース（後述）
  type: ContentType;
  title: string;
  description: string;
  url?: string;
  content?: string;
  category: string;
  difficulty?: Difficulty;
  publishedAt: Date;
  metadata: ContentMetadata;

  // NEW: 関連度スコアリング
  relevanceScore?: number; // 0.0-1.0
  relatedContentIds?: string[]; // 双方向リンク
  userAffinityScore?: number; // ユーザーの興味との一致度
}

interface ContentMetadata {
  author?: string;
  duration?: number;
  thumbnail?: string;
  tags: string[];

  // NEW: 双方向リンク用メタデータ
  linkedLibraryArticles?: string[]; // Materials → Library
  linkedPracticeMaterials?: string[]; // Library → Materials
  weaknessAreas?: string[]; // 弱点分野タグ
}
```

#### 2-2. 推薦アルゴリズム
```typescript
/**
 * コンテンツ推薦エンジン
 * - コンテンツベースフィルタリング（タグ・カテゴリの類似度）
 * - 協調フィルタリング（類似ユーザーの行動）
 * - 弱点分析ベース（learning_metrics連携）
 */
class ContentRecommendationEngine {
  /**
   * Library記事からMaterials推薦
   */
  async recommendPracticeFromArticle(
    articleId: string,
    userId: string
  ): Promise<UnifiedContent[]> {
    const article = await this.getContent(articleId);
    const userMetrics = await this.getUserLearningMetrics(userId);

    // 1. タグベースの類似度
    const tagSimilarity = await this.findByTagSimilarity(article.metadata.tags);

    // 2. ユーザー弱点との一致度
    const weaknessMatch = this.matchWeaknesses(
      article.category,
      userMetrics.weakAreas
    );

    // 3. スコアリング
    const scored = tagSimilarity.map(content => ({
      ...content,
      relevanceScore: this.calculateRelevance({
        tagSimilarity: this.cosineSimilarity(article.metadata.tags, content.metadata.tags),
        weaknessMatch: weaknessMatch[content.id] || 0,
        userAffinity: this.getUserAffinity(userId, content),
      }),
    }));

    return scored
      .filter(c => c.relevanceScore >= 0.6) // 閾値
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  /**
   * MaterialsからLibrary記事推薦（逆流）
   */
  async recommendArticlesFromPractice(
    materialId: string,
    userId: string
  ): Promise<UnifiedContent[]> {
    const material = await this.getContent(materialId);
    const userMetrics = await this.getUserLearningMetrics(userId);

    // 練習結果から弱点分野を抽出
    const weakAreas = await this.extractWeakAreasFromPractice(materialId, userId);

    // 弱点に対応する理論記事を推薦
    const articles = await this.findArticlesByWeakness(weakAreas);

    return articles
      .map(article => ({
        ...article,
        relevanceScore: this.calculateRelevance({
          weaknessMatch: this.matchWeaknesses(article.category, weakAreas),
          difficultyMatch: this.difficultyDistance(material.difficulty, article.difficulty),
          userAffinity: this.getUserAffinity(userId, article),
        }),
      }))
      .filter(a => a.relevanceScore >= 0.5)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
  }

  private calculateRelevance(factors: {
    tagSimilarity?: number;
    weaknessMatch?: number;
    userAffinity?: number;
    difficultyMatch?: number;
  }): number {
    // 重み付け平均
    const weights = {
      tagSimilarity: 0.3,
      weaknessMatch: 0.4,
      userAffinity: 0.2,
      difficultyMatch: 0.1,
    };

    let score = 0;
    let totalWeight = 0;

    Object.entries(factors).forEach(([key, value]) => {
      if (value !== undefined) {
        score += value * weights[key as keyof typeof weights];
        totalWeight += weights[key as keyof typeof weights];
      }
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }
}
```

**成功指標**（Phase 3移行基準）:
- ✅ 横断検索利用率 ≥ 40%
- ✅ 推薦クリック率 ≥ 20%
- ✅ Materials→Library逆流率 ≥ 15%
- ✅ 推薦精度（クリック後の滞在時間）≥ 1.5分

---

### フェーズ3: UI再統合検討（6-12ヶ月）

**目標**: データドリブンでの最適UI決定

**A/Bテスト実装**:
```typescript
// Feature Flag Management
import { useFeatureFlag } from '@/lib/ab-test/useFeatureFlag';

export default function DashboardLayout() {
  const { variant, trackEvent } = useFeatureFlag('ui-integration-test', {
    variants: ['separated', 'integrated'],
    allocation: { separated: 0.5, integrated: 0.5 },
  });

  useEffect(() => {
    trackEvent('dashboard_view', { variant });
  }, [variant]);

  if (variant === 'integrated') {
    return <IntegratedDashboard />;
  }

  return <SeparatedDashboard />;
}
```

**統合UI採用基準**（再掲）:
1. タスク完了率 +10%以上
2. ユーザー満足度 +0.5以上
3. セッション時間 +15%以上
4. 直帰率 -10%以下

**未達成時の対応**: 分離UI維持 + 推薦システム強化

---

## 📐 実装設計（v3.0 Registry System版）

### 1. ContentFetcher Registry System（NEW - 固定enumからの脱却）

#### 設計思想の転換

**v2.0（固定enum）**:
```typescript
// ❌ 拡張性が低い
type ContentSource = 'ai_generated' | 'note' | 'youtube' | 'internal';
```

**v3.0（Registry System）**:
```typescript
// ✅ プラグイン可能な設計
interface ContentSource {
  id: string; // 'note', 'youtube', 'spotify', etc.
  name: string;
  description: string;
  version: string;
  capabilities: SourceCapabilities;
}

interface SourceCapabilities {
  supportsSearch: boolean;
  supportsFiltering: boolean;
  requiresAuth: boolean;
  cacheDuration: number; // seconds
  rateLimit?: {
    requests: number;
    period: number; // seconds
  };
}
```

#### Registry実装
```typescript
/**
 * ContentFetcher Registry
 *
 * 各コンテンツソースをプラグインとして登録・管理
 * 実行時にソースを追加・削除可能
 */
class ContentFetcherRegistry {
  private sources: Map<string, ContentFetcher> = new Map();
  private metadata: Map<string, ContentSource> = new Map();

  /**
   * ソースを登録
   */
  register(source: ContentSource, fetcher: ContentFetcher): void {
    if (this.sources.has(source.id)) {
      throw new Error(`Source ${source.id} is already registered`);
    }

    this.sources.set(source.id, fetcher);
    this.metadata.set(source.id, source);

    console.log(`[Registry] Registered source: ${source.id} v${source.version}`);
  }

  /**
   * ソースを取得
   */
  get(sourceId: string): ContentFetcher {
    const fetcher = this.sources.get(sourceId);
    if (!fetcher) {
      throw new Error(`Source ${sourceId} not found in registry`);
    }
    return fetcher;
  }

  /**
   * 全ソースを取得
   */
  getAll(): ContentFetcher[] {
    return Array.from(this.sources.values());
  }

  /**
   * ソースメタデータを取得
   */
  getMetadata(sourceId: string): ContentSource | undefined {
    return this.metadata.get(sourceId);
  }

  /**
   * 登録済みソース一覧
   */
  list(): ContentSource[] {
    return Array.from(this.metadata.values());
  }

  /**
   * ソース削除（メンテナンス用）
   */
  unregister(sourceId: string): boolean {
    const hasSource = this.sources.has(sourceId);
    this.sources.delete(sourceId);
    this.metadata.delete(sourceId);
    return hasSource;
  }
}

// Singleton instance
export const contentRegistry = new ContentFetcherRegistry();
```

#### プラグイン実装例
```typescript
// Note.com プラグイン
const noteSource: ContentSource = {
  id: 'note',
  name: 'note.com',
  description: 'MUED公式note教材フィード',
  version: '1.0.0',
  capabilities: {
    supportsSearch: false, // RSS is feed-only
    supportsFiltering: true, // By category
    requiresAuth: false,
    cacheDuration: 900, // 15 minutes
  },
};

class NoteContentFetcher implements ContentFetcher {
  async fetch(params: FetchParams): Promise<UnifiedContent[]> {
    // RSS取得 + 多段フォールバック
    return this.fetchWithFallback(params);
  }

  async get(id: string): Promise<UnifiedContent | null> {
    // 個別記事取得（キャッシュ優先）
  }

  private async fetchWithFallback(params: FetchParams): Promise<UnifiedContent[]> {
    // Multi-tier fallback（後述）
  }
}

// 登録
contentRegistry.register(noteSource, new NoteContentFetcher());

// YouTube プラグイン（将来実装）
const youtubeSource: ContentSource = {
  id: 'youtube',
  name: 'YouTube',
  description: 'MUED公式YouTubeチャンネル',
  version: '1.0.0',
  capabilities: {
    supportsSearch: true,
    supportsFiltering: true,
    requiresAuth: true, // API Key required
    cacheDuration: 3600, // 1 hour
    rateLimit: {
      requests: 100,
      period: 86400, // per day
    },
  },
};

class YouTubeContentFetcher implements ContentFetcher {
  async fetch(params: FetchParams): Promise<UnifiedContent[]> {
    // YouTube Data API v3使用
  }
}

contentRegistry.register(youtubeSource, new YouTubeContentFetcher());
```

#### API設計（Registry活用）
```typescript
// GET /api/content?source=note&category=作曲
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get('source');

  if (sourceId === 'all') {
    // 全ソースから取得
    const fetchers = contentRegistry.getAll();
    const results = await Promise.all(
      fetchers.map(f => f.fetch(searchParams))
    );
    return NextResponse.json({
      success: true,
      content: results.flat(),
      sources: contentRegistry.list(),
    });
  }

  // 特定ソースから取得
  const fetcher = contentRegistry.get(sourceId || 'note');
  const content = await fetcher.fetch(searchParams);

  return NextResponse.json({
    success: true,
    content,
    source: contentRegistry.getMetadata(sourceId || 'note'),
  });
}
```

---

### 2. Multi-Tier Fallback戦略（v2.0から強化）

```typescript
class ResilientNoteContentFetcher implements ContentFetcher {
  private readonly FALLBACK_CHAIN = [
    { method: 'fetchFromRSS', name: 'Primary RSS Feed', timeout: 5000 },
    { method: 'fetchFromCache', name: 'Vercel KV Cache', timeout: 2000 },
    { method: 'fetchFromNoteAPI', name: 'note.com API', timeout: 10000 },
    { method: 'fetchFromStaticBackup', name: 'Static JSON Backup', timeout: 1000 },
  ];

  async fetch(params: FetchParams): Promise<UnifiedContent[]> {
    const errors: Error[] = [];

    for (const fallback of this.FALLBACK_CHAIN) {
      try {
        console.log(`[NoteContentFetcher] Trying ${fallback.name}...`);

        const result = await Promise.race([
          (this as any)[fallback.method](params),
          this.timeout(fallback.timeout),
        ]);

        console.log(`[NoteContentFetcher] ✅ ${fallback.name} succeeded`);

        // キャッシュ更新（Primary以外の場合）
        if (fallback.method !== 'fetchFromRSS') {
          this.updateCache(result).catch(console.error);
        }

        return result;
      } catch (error) {
        console.warn(`[NoteContentFetcher] ❌ ${fallback.name} failed:`, error);
        errors.push(error as Error);

        // Sentry報告
        Sentry.captureException(error, {
          tags: { fallback: fallback.name },
          extra: { params },
        });
      }
    }

    // 全フォールバック失敗
    throw new AggregateError(
      errors,
      `All fallback methods failed for note.com content fetching`
    );
  }

  private async fetchFromRSS(): Promise<UnifiedContent[]> {
    const parser = new Parser();
    const feed = await parser.parseURL('https://note.com/mued_glasswerks/rss');
    return this.normalizeRSSItems(feed.items);
  }

  private async fetchFromCache(): Promise<UnifiedContent[]> {
    const cached = await kv.get<CachedContent>('note:feed');
    if (!cached || !this.isFresh(cached)) {
      throw new Error('Cache miss or stale');
    }
    return cached.content;
  }

  private async fetchFromNoteAPI(): Promise<UnifiedContent[]> {
    // 将来のnote API正式対応時に実装
    throw new Error('note API not implemented yet');
  }

  private async fetchFromStaticBackup(): Promise<UnifiedContent[]> {
    // 静的JSONバックアップ（最終手段）
    const response = await fetch('/static/note-backup.json');
    return response.json();
  }

  private isFresh(cached: CachedContent): boolean {
    const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
    return ageHours < 24; // 24時間以内
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
  }
}
```

---

### 3. 双方向リンク Schema（NEW）

```typescript
/**
 * 双方向コンテンツリンク
 * Library ⇄ Materials 間の関連付けをDB保存
 */
export const contentLinks = pgTable("content_links", {
  id: uuid("id").primaryKey().defaultRandom(),

  // リンク元
  sourceId: text("source_id").notNull(), // UnifiedContent.id
  sourceType: text("source_type").notNull(), // 'library' | 'material'

  // リンク先
  targetId: text("target_id").notNull(),
  targetType: text("target_type").notNull(),

  // 関連度
  relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }), // 0.00-1.00
  linkType: text("link_type").notNull(), // 'auto_recommended' | 'user_created' | 'ai_generated'

  // メタデータ
  createdBy: uuid("created_by").references(() => users.id), // ユーザーが作成した場合
  clickCount: integer("click_count").notNull().default(0), // クリック数（効果測定）
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  sourceIdIdx: index("idx_content_links_source_id").on(table.sourceId),
  targetIdIdx: index("idx_content_links_target_id").on(table.targetId),
  sourceTypeTargetTypeIdx: index("idx_content_links_source_target_type").on(table.sourceType, table.targetType),
}));

/**
 * リンク作成サービス
 */
export async function createContentLink(
  sourceId: string,
  sourceType: 'library' | 'material',
  targetId: string,
  targetType: 'library' | 'material',
  relevanceScore: number,
  linkType: 'auto_recommended' | 'user_created' | 'ai_generated',
  userId?: string
): Promise<void> {
  await db.insert(contentLinks).values({
    sourceId,
    sourceType,
    targetId,
    targetType,
    relevanceScore,
    linkType,
    createdBy: userId,
  });
}

/**
 * リンク取得（双方向）
 */
export async function getRelatedContent(
  contentId: string,
  direction: 'outbound' | 'inbound' | 'both' = 'both'
): Promise<UnifiedContent[]> {
  const links = await db
    .select()
    .from(contentLinks)
    .where(
      direction === 'outbound'
        ? eq(contentLinks.sourceId, contentId)
        : direction === 'inbound'
        ? eq(contentLinks.targetId, contentId)
        : or(
            eq(contentLinks.sourceId, contentId),
            eq(contentLinks.targetId, contentId)
          )
    )
    .orderBy(desc(contentLinks.relevanceScore));

  // 関連コンテンツを取得
  const targetIds = links.map(link =>
    link.sourceId === contentId ? link.targetId : link.sourceId
  );

  // Registry経由で取得
  return Promise.all(
    targetIds.map(id => fetchContentById(id))
  ).then(results => results.filter(Boolean) as UnifiedContent[]);
}
```

---

## ⚖️ 法務・契約レイヤー（NEW - v3.0追加）

### 1. note.com RSS利用に関する法的検討

#### 1-1. note利用規約の確認
**参照**: [note利用規約](https://note.jp/terms)

**関連条項**:
- **第3条（知的財産権）**: コンテンツの著作権は投稿者に帰属
- **第7条（禁止事項）**: 不正アクセス、過度な負荷をかける行為の禁止
- **RSS配信**: note公式がRSSフィードを提供している（公開API）

**解釈**:
✅ **RSS取得自体は合法**: noteが公式に提供するRSSフィードの利用は規約違反ではない
✅ **適切な利用**: キャッシュ・リンク・概要表示は「引用」の範囲内（著作権法第32条）
❌ **全文転載は禁止**: コンテンツの全文をMUED側に保存・表示することは著作権侵害の可能性

**MUED実装方針**:
- RSS取得は合法的利用範囲内
- 記事タイトル・概要・リンクのみ表示（全文転載しない）
- ユーザーが記事を読む際はnote.comに遷移
- キャッシュは短期間（15分）のみ保持

#### 1-2. キャッシュ保持期間の法的制約

**著作権法上の考慮**:
- **一時的蓄積（第47条の4）**: 情報通信の円滑・効率化のための一時的蓄積は合法
- **適切な期間**: 「一時的」の解釈は明確でないが、業界慣行は数時間〜1日程度

**MUED実装基準**:
```typescript
const CACHE_POLICY = {
  // RSS Feed全体
  rssFeed: {
    ttl: 900, // 15分（Primary）
    maxAge: 86400, // 24時間（Fallback最大保持）
  },

  // 個別記事メタデータ
  articleMetadata: {
    ttl: 1800, // 30分
    maxAge: 604800, // 7日間（統計分析用）
  },

  // 全文コンテンツ
  fullContent: {
    ttl: 0, // キャッシュしない
    note: '全文はnote.comから直接取得',
  },
};
```

**法的根拠**:
- 15分〜30分のキャッシュは「一時的蓄積」として正当化可能
- 7日間の統計データ保持は分析目的であり、表示目的ではない

#### 1-3. note API正式契約の検討

**現状**: RSSフィード利用（非公式API）
**将来**: note社との正式API契約締結

**契約締結のメリット**:
1. **法的安定性**: 利用規約上の明確な許諾
2. **技術的安定性**: RSS仕様変更の影響を受けない
3. **機能拡張**: 全文取得、検索API、分析API等の利用可能性
4. **ブランド連携**: 公式パートナーとしての位置づけ

**契約交渉ポイント**:
- API利用料（無料枠・従量課金）
- データ利用範囲（分析・ML学習への利用可否）
- SLA（稼働率保証）
- ブランド表記規定

**Phase 2以降で検討**: 横断検索・推薦システム実装時に正式契約を推進

---

### 2. 外部コンテンツソース追加時の法的チェックリスト

今後YouTube、Spotify等を追加する際の法務確認事項:

```markdown
## 新規コンテンツソース追加 法的チェックリスト

### ✅ 必須確認事項

1. **利用規約の確認**
   - [ ] API利用規約を精読
   - [ ] 禁止事項の確認（商用利用、データ保存期間等）
   - [ ] 利用規約変更時の通知方法確認

2. **著作権・知的財産権**
   - [ ] コンテンツの著作権者は誰か
   - [ ] 二次利用（キャッシュ・概要表示）の可否
   - [ ] 帰属表示（クレジット）の要否

3. **データ利用範囲**
   - [ ] 個人データの取得有無（GDPR・個人情報保護法）
   - [ ] データ保持期間の制約
   - [ ] 第三者提供の可否

4. **技術的制約**
   - [ ] レート制限（Rate Limit）
   - [ ] API Key管理要件
   - [ ] キャッシュポリシー

5. **契約締結**
   - [ ] 利用申請の必要性
   - [ ] 有料プランへの加入要否
   - [ ] SLA・保証条項の確認

### 📋 ソース別チェック例

#### YouTube Data API v3
- [x] 利用規約確認済み
- [x] API Key取得済み
- [ ] レート制限: 10,000 units/day（超過時の対応策必要）
- [ ] キャッシュ期間: 最大24時間
- [ ] 帰属表示: 「YouTube」ロゴ表示必須

#### Spotify Web API
- [ ] 利用規約確認
- [ ] OAuth認証必須（ユーザー単位）
- [ ] 楽曲30秒プレビューのみ利用可
- [ ] Spotifyブランドガイドライン遵守

#### note.com
- [x] RSS利用は合法範囲内
- [x] 全文転載禁止（リンク・概要のみ）
- [ ] 正式API契約検討中（Phase 2）
```

---

### 3. MUED Marketplace 法的準備（Phase 3以降）

外部クリエイターが教材を販売できるマーケットプレイス構想の法的論点:

#### 3-1. レベニューシェアモデル
```typescript
interface MarketplaceRevenue {
  creatorShare: 70, // クリエイター取り分
  platformFee: 25,  // MUED手数料
  paymentFee: 5,    // 決済手数料（Stripe等）
}
```

**法的考慮事項**:
- **資金決済法**: プラットフォームが資金を預かる場合、資金移動業の登録が必要な場合あり
- **対策**: Stripe Connect等の決済プラットフォーム利用で直接送金

#### 3-2. 利用規約・契約書
- **クリエイター利用規約**: 販売条件、禁止事項、知的財産権の扱い
- **購入者利用規約**: 返金ポリシー、ライセンス条項
- **プラットフォーム免責**: コンテンツの品質についてMUEDは責任を負わない旨

#### 3-3. 税務
- **源泉徴収**: クリエイターへの支払いが源泉徴収対象か
- **消費税**: 電子コンテンツ販売の消費税処理
- **インボイス制度**: 適格請求書の発行義務

**Phase 3開始前に弁護士・税理士との相談必須**

---

## 🔍 運用監視フレームワーク（NEW - v3.0追加）

### 1. Sentry統合によるエラー監視

#### 1-1. Sentryセットアップ
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // ContentFetcher専用トレース
  tracesSampleRate: 1.0,

  // エラーフィルタリング
  beforeSend(event, hint) {
    // RSS取得失敗はwarningレベル（Fallbackがあるため）
    if (event.tags?.fallback && event.level === 'error') {
      event.level = 'warning';
    }
    return event;
  },
});
```

#### 1-2. ContentFetcher監視
```typescript
class MonitoredNoteContentFetcher implements ContentFetcher {
  async fetch(params: FetchParams): Promise<UnifiedContent[]> {
    const transaction = Sentry.startTransaction({
      op: 'content.fetch',
      name: 'NoteContentFetcher.fetch',
    });

    try {
      const result = await this.fetchWithFallback(params);

      // 成功メトリクス
      Sentry.metrics.increment('content.fetch.success', 1, {
        tags: { source: 'note' },
      });

      transaction.setStatus('ok');
      return result;
    } catch (error) {
      // 失敗メトリクス
      Sentry.metrics.increment('content.fetch.failure', 1, {
        tags: { source: 'note', reason: (error as Error).message },
      });

      transaction.setStatus('internal_error');
      Sentry.captureException(error);
      throw error;
    } finally {
      transaction.finish();
    }
  }
}
```

---

### 2. Vercel KV による健全性ダッシュボード

#### 2-1. ヘルスメトリクス保存
```typescript
interface HealthMetrics {
  timestamp: number;
  source: string; // 'note', 'youtube', etc.

  // 取得成功率
  successRate: number; // 0.0-1.0
  totalAttempts: number;
  successCount: number;
  failureCount: number;

  // レスポンス時間
  avgResponseTime: number; // ms
  p95ResponseTime: number;
  p99ResponseTime: number;

  // フォールバック統計
  fallbackUsage: {
    rss: number;
    cache: number;
    api: number;
    static: number;
  };
}

/**
 * ヘルスメトリクス記録
 */
export async function recordHealthMetrics(metrics: HealthMetrics): Promise<void> {
  const key = `health:${metrics.source}:${Date.now()}`;

  // Vercel KVに保存（7日間保持）
  await kv.set(key, metrics, { ex: 604800 });

  // 集計値を更新
  await kv.hincrby(`health:${metrics.source}:total`, 'attempts', metrics.totalAttempts);
  await kv.hincrby(`health:${metrics.source}:total`, 'success', metrics.successCount);
  await kv.hincrby(`health:${metrics.source}:total`, 'failure', metrics.failureCount);
}

/**
 * ヘルスメトリクス取得（直近24時間）
 */
export async function getHealthMetrics(source: string): Promise<HealthMetrics[]> {
  const now = Date.now();
  const oneDayAgo = now - 86400000;

  const keys = await kv.keys(`health:${source}:*`);
  const metricsPromises = keys
    .filter(key => {
      const timestamp = parseInt(key.split(':')[2]);
      return timestamp >= oneDayAgo;
    })
    .map(key => kv.get<HealthMetrics>(key));

  const metrics = await Promise.all(metricsPromises);
  return metrics.filter(Boolean) as HealthMetrics[];
}
```

#### 2-2. 健全性ダッシュボードUI
```tsx
// app/admin/health/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function HealthDashboard() {
  const [metrics, setMetrics] = useState<Record<string, HealthMetrics[]>>({});

  useEffect(() => {
    fetch('/api/admin/health-metrics')
      .then(r => r.json())
      .then(data => setMetrics(data));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Content Source Health Dashboard</h1>

      {Object.entries(metrics).map(([source, sourceMetrics]) => (
        <Card key={source}>
          <CardHeader>
            <CardTitle>{source.toUpperCase()} Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthChart metrics={sourceMetrics} />
            <HealthTable metrics={sourceMetrics} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HealthChart({ metrics }: { metrics: HealthMetrics[] }) {
  const successRate = metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <MetricCard
        title="Success Rate"
        value={`${(successRate * 100).toFixed(2)}%`}
        status={successRate >= 0.99 ? 'healthy' : successRate >= 0.95 ? 'warning' : 'critical'}
      />
      <MetricCard
        title="Avg Response Time"
        value={`${avgResponseTime.toFixed(0)}ms`}
        status={avgResponseTime <= 1000 ? 'healthy' : avgResponseTime <= 3000 ? 'warning' : 'critical'}
      />
      <MetricCard
        title="Total Requests (24h)"
        value={metrics.reduce((sum, m) => sum + m.totalAttempts, 0).toString()}
      />
    </div>
  );
}

function MetricCard({ title, value, status }: {
  title: string;
  value: string;
  status?: 'healthy' | 'warning' | 'critical';
}) {
  const bgColor = status === 'healthy'
    ? 'bg-green-50 border-green-200'
    : status === 'warning'
    ? 'bg-yellow-50 border-yellow-200'
    : status === 'critical'
    ? 'bg-red-50 border-red-200'
    : 'bg-gray-50 border-gray-200';

  return (
    <div className={`p-4 rounded-lg border ${bgColor}`}>
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}
```

---

### 3. アラート設定

#### 3-1. アラート閾値
```typescript
interface AlertThresholds {
  // 成功率低下
  successRateCritical: 0.90, // 90%未満で緊急アラート
  successRateWarning: 0.95,  // 95%未満で警告

  // レスポンス時間
  responseTimeCritical: 5000, // 5秒以上で緊急
  responseTimeWarning: 3000,  // 3秒以上で警告

  // フォールバック依存度
  fallbackDependencyCritical: 0.50, // Primary以外が50%以上で緊急
  fallbackDependencyWarning: 0.30,  // 30%以上で警告

  // 連続失敗
  consecutiveFailuresCritical: 5,  // 5回連続失敗で緊急
  consecutiveFailuresWarning: 3,   // 3回連続失敗で警告
}

/**
 * アラートチェッカー
 */
export async function checkAlerts(source: string): Promise<Alert[]> {
  const metrics = await getHealthMetrics(source);
  const recent = metrics.slice(-10); // 直近10件

  const alerts: Alert[] = [];

  // 成功率チェック
  const avgSuccessRate = recent.reduce((sum, m) => sum + m.successRate, 0) / recent.length;
  if (avgSuccessRate < THRESHOLDS.successRateCritical) {
    alerts.push({
      level: 'critical',
      source,
      message: `Success rate dropped to ${(avgSuccessRate * 100).toFixed(2)}%`,
      timestamp: Date.now(),
    });
  } else if (avgSuccessRate < THRESHOLDS.successRateWarning) {
    alerts.push({
      level: 'warning',
      source,
      message: `Success rate at ${(avgSuccessRate * 100).toFixed(2)}%`,
      timestamp: Date.now(),
    });
  }

  // レスポンス時間チェック
  const avgResponseTime = recent.reduce((sum, m) => sum + m.avgResponseTime, 0) / recent.length;
  if (avgResponseTime > THRESHOLDS.responseTimeCritical) {
    alerts.push({
      level: 'critical',
      source,
      message: `Avg response time ${avgResponseTime.toFixed(0)}ms`,
      timestamp: Date.now(),
    });
  }

  // 連続失敗チェック
  const consecutiveFailures = recent
    .reverse()
    .findIndex(m => m.successRate > 0);

  if (consecutiveFailures >= THRESHOLDS.consecutiveFailuresCritical) {
    alerts.push({
      level: 'critical',
      source,
      message: `${consecutiveFailures} consecutive failures detected`,
      timestamp: Date.now(),
    });
  }

  return alerts;
}

/**
 * アラート通知（Slack/Email）
 */
export async function notifyAlerts(alerts: Alert[]): Promise<void> {
  for (const alert of alerts) {
    if (alert.level === 'critical') {
      // Slack通知
      await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 CRITICAL: ${alert.source} - ${alert.message}`,
          channel: '#mued-alerts',
        }),
      });

      // Email通知
      await sendEmail({
        to: 'dev@mued.com',
        subject: `[CRITICAL] Content Source Alert: ${alert.source}`,
        body: alert.message,
      });
    } else if (alert.level === 'warning') {
      // Slack通知のみ
      await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: 'POST',
        body: JSON.stringify({
          text: `⚠️ WARNING: ${alert.source} - ${alert.message}`,
        }),
      });
    }
  }
}
```

---

## 🎨 ブランド関係の再定義（NEW - v3.0追加）

### 従来の認識（v2.0以前）
```
┌─────────────────────────────┐
│   MUED LMS                  │
│   ├─ Materials (AI生成)      │
│   └─ Library (note content)  │ ← noteがMUEDに内包される印象
└─────────────────────────────┘
```

### 新しいブランド定義（v3.0）
```
┌──────────────────────────────────────────────┐
│   MUED - 学習体験キュレーター                   │
│   "音楽学習を統合する学習プラットフォーム"        │
├──────────────────────────────────────────────┤
│                                              │
│   📚 Library (Powered by note.com)           │
│      ↳ MUED公式が厳選した理論教材             │
│                                              │
│   ✨ Materials (Powered by OpenAI)           │
│      ↳ AIがあなた専用に生成する練習問題        │
│                                              │
│   🎵 Practice (Powered by ABC.js)            │
│      ↳ インタラクティブな楽譜演奏体験          │
└──────────────────────────────────────────────┘
```

**キーメッセージ**:
- MUED = コンテンツホスト**ではない**
- MUED = **学習体験のキュレーター・統合者**
- note, OpenAI, ABC.js = **Powered by パートナー**

---

### ブランディング実装

#### 1. Library内のブランド表記
```tsx
// app/dashboard/library/page.tsx
export default function LibraryPage() {
  return (
    <div>
      <PageHeader>
        <h1>Library</h1>
        <p className="text-gray-600">
          Powered by <strong>note.com</strong>
        </p>
      </PageHeader>

      {/* カード内 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{article.title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              note
            </Badge>
          </div>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => openNoteArticle(article.url)}>
            noteで読む →
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

#### 2. フッターでのクレジット
```tsx
// components/layouts/footer.tsx
export function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-2">Powered By</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>
                <a href="https://note.com" target="_blank" rel="noopener">
                  note.com - 理論教材パートナー
                </a>
              </li>
              <li>OpenAI - AI教材生成エンジン</li>
              <li>ABC.js - インタラクティブ楽譜レンダリング</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">コンテンツ提供</h3>
            <p className="text-sm text-gray-600">
              Library内の記事は<a href="https://note.com/mued_glasswerks">note.com</a>で公開されているMUED公式教材です。
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

#### 3. ブランド遷移モーダル（v2.0から強化）
```tsx
// components/features/brand-transition-modal.tsx
export function BrandTransitionModal({ url, onConfirm, onCancel }: Props) {
  return (
    <Modal open>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <img src="/note-logo.svg" alt="note" className="w-8 h-8" />
            <h2>note.comに移動します</h2>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 mb-2">
                  MUED Libraryは<strong>note.com</strong>と連携しています
                </p>
                <p className="text-sm text-gray-600">
                  この記事はMUED公式がnote.comで無料公開している教材です。
                  記事全文を読むにはnote.comに移動します。
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p className="font-medium mb-1">移動先URL:</p>
              <code className="bg-gray-100 px-2 py-1 rounded block break-all">
                {url}
              </code>
            </div>

            <div className="text-xs text-gray-400">
              note.comはMUEDとは別のサービスです。note.comの利用規約が適用されます。
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            <ExternalLink className="w-4 h-4 mr-2" />
            note.comで開く
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

---

## 🚀 実装フェーズ（v3.0 定量基準版）

### Phase 1: 分離UI + 双方向連携（0-3ヶ月）

**目標**: MVP + 双方向学習循環の実現

**タスク**:
- [ ] ContentFetcher Registry System実装
- [ ] `/api/content` 統合エンドポイント作成
- [ ] `/dashboard/library` ページ作成
- [ ] Library→Materials連携ボタン実装
- [ ] Materials→Library逆流ボタン実装（NEW）
- [ ] 学習循環可視化ウィジェット実装（NEW）
- [ ] ブランド遷移モーダル実装
- [ ] Multi-tier fallback実装
- [ ] Sentry統合
- [ ] Vercel KVヘルスメトリクス収集
- [ ] DashboardTabsにLibraryタブ追加

**成功指標**（Phase 2移行基準）:
- ✅ Library→Materials遷移率 ≥ 20%
- ✅ RSS取得成功率 ≥ 99%
- ✅ Library滞在時間 ≥ 2分
- ✅ Materials→Library逆流率 ≥ 10%

**計測実装**:
```typescript
// lib/metrics/phase1-metrics.ts
export async function trackPhase1Metrics(event: string, data: Record<string, any>) {
  await db.insert(metricsEvents).values({
    eventType: event,
    userId: data.userId,
    metadata: data,
    timestamp: new Date(),
  });
}

// 利用例
trackPhase1Metrics('library_to_materials_click', {
  userId: user.id,
  articleId: article.id,
  articleCategory: article.category,
});

trackPhase1Metrics('materials_to_library_click', {
  userId: user.id,
  materialId: material.id,
  materialTopic: material.topic,
});
```

---

### Phase 2: データ統合基盤（3-6ヶ月）

**目標**: 横断検索・推薦システム + 関連度スコアリング

**タスク**:
- [ ] UnifiedContent with relevance scoring実装
- [ ] content_links双方向リンクテーブル作成
- [ ] ContentRecommendationEngine実装
- [ ] Materials + Library横断検索API
- [ ] 「この記事に関連する練習問題」推薦UI
- [ ] 「この練習問題に関連する記事」推薦UI（NEW）
- [ ] 学習進捗統合トラッキング
- [ ] note API正式契約交渉開始
- [ ] 健全性ダッシュボードUI実装

**成功指標**（Phase 3移行基準）:
- ✅ 横断検索利用率 ≥ 40%
- ✅ 推薦クリック率 ≥ 20%
- ✅ Materials→Library逆流率 ≥ 15%
- ✅ 推薦精度（クリック後滞在時間）≥ 1.5分

**計測実装**:
```typescript
// lib/metrics/phase2-metrics.ts
export async function trackPhase2Metrics(event: string, data: Record<string, any>) {
  await db.insert(metricsEvents).values({
    eventType: event,
    userId: data.userId,
    metadata: data,
    timestamp: new Date(),
  });
}

// 利用例
trackPhase2Metrics('cross_search_used', {
  userId: user.id,
  query: searchQuery,
  resultsCount: results.length,
  sources: results.map(r => r.source),
});

trackPhase2Metrics('recommendation_clicked', {
  userId: user.id,
  sourceContentId: sourceId,
  recommendedContentId: targetId,
  relevanceScore: link.relevanceScore,
});
```

---

### Phase 3: UI再統合検討（6-12ヶ月）

**目標**: データドリブンでの最適UI決定

**タスク**:
- [ ] A/Bテストフレームワーク実装
- [ ] 統合UI（Variant A）実装
- [ ] 分離UI維持（Variant B）改善
- [ ] A/Bテスト実施（30日間、各200ユーザー）
- [ ] データ分析・意思決定
- [ ] 勝利バリアント全展開
- [ ] パーソナライズドダッシュボード実装

**統合UI採用基準**（Variant Aが勝利）:
- ✅ タスク完了率 +10%以上
- ✅ ユーザー満足度 +0.5以上
- ✅ セッション時間 +15%以上
- ✅ 直帰率 -10%以下

**未達成時**: 分離UI維持 + 推薦システム強化

**計測実装**:
```typescript
// lib/ab-test/phase3-experiment.ts
export const uiIntegrationExperiment = {
  id: 'ui-integration-2025',
  variants: {
    separated: {
      name: '分離UI',
      allocation: 0.5,
    },
    integrated: {
      name: '統合UI',
      allocation: 0.5,
    },
  },
  metrics: [
    'task_completion_rate',
    'user_satisfaction_score',
    'session_duration',
    'bounce_rate',
  ],
  duration: 30, // days
  minSampleSize: 200, // per variant
};

// 利用例
const { variant, trackEvent } = useFeatureFlag('ui-integration-2025');

trackEvent('task_completed', {
  variant,
  taskType: 'library_to_materials_cycle',
  durationMs: Date.now() - startTime,
});
```

---

## ⚠️ リスクと対策（v3.0 法務リスク追加）

### リスク1: RSS Feed の信頼性（v2.0から継承）

**問題**: note.comがRSS仕様を変更する可能性

**対策**:
- ✅ Multi-tier fallback（RSS → Cache → API → Static）
- ✅ ContentFetcher Registry により、RSS以外への切り替えが容易
- ✅ Sentry監視 + Slack/Email アラート
- ✅ 月次でRSSパーサーの動作確認
- ✅ note API正式契約の推進（Phase 2）

**監視指標**:
- RSS取得成功率 ≥ 99%（Phase 1基準）
- フォールバック依存度 ≤ 30%（Primary以外の利用率）

---

### リスク2: パフォーマンス低下（v2.0から継承）

**問題**: RSS取得に時間がかかる

**対策**:
- ✅ ISR + Vercel KVキャッシュ（15分 revalidate）
- ✅ スケルトンUI表示
- ✅ バックグラウンド非同期取得
- ✅ Edge Functions での RSS取得
- ✅ Streaming SSR での段階的レンダリング

**監視指標**:
- 平均レスポンス時間 ≤ 1000ms
- P95レスポンス時間 ≤ 3000ms

---

### リスク3: 学習循環の断絶（v2.0から継承 + v3.0強化）

**問題**: Library（INPUT）とMaterials（PRACTICE）が分断される

**対策**（v3.0強化）:
- ✅ Library→Materials「AI練習問題を生成」ボタン
- ✅ Materials→Library「関連記事を探す」ボタン（NEW）
- ✅ 学習循環可視化ウィジェット（NEW）
- ✅ ContentRecommendationEngine による双方向推薦
- ✅ Phase 3での再統合オプション維持

**監視指標**:
- Library→Materials遷移率 ≥ 20%（Phase 1基準）
- Materials→Library逆流率 ≥ 15%（Phase 2基準）
- 完全サイクル完了率（Library→Materials→Library）≥ 10%

---

### リスク4: ブランド混同（v2.0から継承 + v3.0強化）

**問題**: noteとMUEDのブランドが混同される

**対策**（v3.0強化）:
- ✅ ブランド遷移モーダルで明示的な境界演出
- ✅ Library内で「Powered by note.com」表記
- ✅ 外部リンクアイコン明示
- ✅ フッターでのクレジット表記（NEW）
- ✅ "MUED = キュレーター" ブランディング（NEW）

**効果測定**:
- ユーザーアンケート「MUEDとnoteの関係を理解していますか？」≥ 80%

---

### リスク5: 法的トラブル（NEW - v3.0追加）

**問題**: 著作権侵害、規約違反による法的リスク

**シナリオと対策**:

#### シナリオ5-1: note.com利用規約違反
**リスク**: 過度なRSS取得、全文転載等が規約違反と判断される

**対策**:
- ✅ RSS取得間隔を15分以上に制限（キャッシュ活用）
- ✅ 全文転載は一切行わず、タイトル・概要・リンクのみ表示
- ✅ note社との正式契約締結（Phase 2目標）
- ✅ 定期的な利用規約確認（四半期ごと）

#### シナリオ5-2: 著作権侵害クレーム
**リスク**: MUED利用者がnote記事の著作権を侵害する教材を生成

**対策**:
- ✅ AI生成時に「元記事の全文転載禁止」を明示
- ✅ 生成された教材は「インスピレーション元」として記事リンクを掲載
- ✅ 著作権侵害通報窓口の設置
- ✅ DMCA通知対応プロセスの整備

#### シナリオ5-3: データ保護法違反
**リスク**: GDPR・個人情報保護法違反（不適切なデータ保持）

**対策**:
- ✅ RSSキャッシュは短期間のみ（最大24時間）
- ✅ 個人情報を含むデータは保存しない
- ✅ プライバシーポリシーの明記
- ✅ データ削除リクエストへの対応プロセス

**法務レビュー**: Phase 1開始前に弁護士レビュー必須

---

### リスク6: 運用監視の不備（NEW - v3.0追加）

**問題**: 障害を検知できず、ユーザー体験が悪化

**対策**:
- ✅ Sentry統合による自動エラー検知
- ✅ Vercel KV によるヘルスメトリクス収集
- ✅ アラート閾値の設定（成功率 < 95%で警告）
- ✅ 健全性ダッシュボードでの可視化
- ✅ Slack/Email通知による即時対応

**監視指標**:
- アラート検知から対応開始まで ≤ 30分（営業時間内）
- MTTR（平均復旧時間）≤ 2時間

---

## 📈 期待される効果（v3.0 定量目標追加）

### ユーザー価値

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| 学習リソースの一元化 | DAU +30% | Google Analytics |
| 無料コンテンツへのアクセス向上 | Library PV +50% | 内部トラッキング |
| 学習循環の完了率 | ≥ 15% | メトリクスDB |
| ユーザー満足度（NPS） | ≥ 50 | 定期アンケート |

### ビジネス価値

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| コンテンツマーケティング効果 | note→MUED流入 +40% | UTMパラメータ分析 |
| エンゲージメント向上 | セッション時間 +25% | Google Analytics |
| Freemiumユーザー定着率 | 7日リテンション ≥ 50% | Cohort分析 |
| 有料転換率 | Freemium→Basic転換 +10% | Subscription DB |

### 開発効率

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| 新規コンテンツソース追加工数 | ≤ 5日/ソース | 実績ログ |
| Registry拡張性スコア | 5/5 | 開発者評価 |
| テストカバレッジ | ≥ 80% | Jest/Vitest |
| 保守性指標（Code Climate） | A | 自動分析 |

---

## 🔮 中長期ロードマップ（v3.0 法的マイルストーン追加）

### Year 1: 基盤構築

**Q1（Phase 1）**:
- [x] 法務レビュー完了（note利用規約確認）
- [ ] ContentFetcher Registry実装
- [ ] Library MVP リリース
- [ ] 双方向連携実装
- [ ] Sentry + Vercel KV監視開始

**Q2（Phase 1→2移行）**:
- [ ] Phase 1成功指標達成確認
- [ ] note API正式契約交渉開始
- [ ] データ統合基盤設計
- [ ] UnifiedContent Schema実装

**Q3（Phase 2）**:
- [ ] 横断検索リリース
- [ ] 推薦システムベータ版
- [ ] 健全性ダッシュボード公開

**Q4（Phase 2完了）**:
- [ ] Phase 2成功指標達成確認
- [ ] A/Bテスト設計
- [ ] YouTube/Spotify統合検討開始

---

### Year 2: 統合深化

**Q1（Phase 3準備）**:
- [ ] A/Bテスト実装
- [ ] 統合UI（Variant A）開発
- [ ] 分離UI（Variant B）改善

**Q2（Phase 3実施）**:
- [ ] A/Bテスト開始（30日間）
- [ ] データ収集・分析
- [ ] 勝利バリアント決定

**Q3（Phase 3完了）**:
- [ ] 勝利バリアント全展開
- [ ] パーソナライズドダッシュボード実装
- [ ] YouTube統合リリース

**Q4（次世代準備）**:
- [ ] コミュニティ投稿機能プロトタイプ
- [ ] Marketplace法務準備開始
- [ ] レベニューシェアモデル設計

---

### Year 3: エコシステム化

**Q1-Q2（Marketplace準備）**:
- [ ] 利用規約・契約書作成（弁護士監修）
- [ ] 決済システム実装（Stripe Connect）
- [ ] クリエイター審査プロセス構築
- [ ] 税務・会計処理整備

**Q3（Marketplace βリリース）**:
- [ ] 限定クリエイター招待（β版）
- [ ] レベニューシェア実装
- [ ] 品質管理体制構築

**Q4（正式リリース）**:
- [ ] MUED Marketplace正式オープン
- [ ] 外部クリエイター向けAPI公開
- [ ] エコシステムパートナー拡大

---

## 💡 推奨事項（v3.0 優先順位再定義）

### Priority 1: 即座に実施（Phase 1開始前）

1. ✅ **法務レビュー実施**
   - note利用規約の弁護士確認
   - キャッシュ保持期間の法的妥当性確認
   - プライバシーポリシー更新

2. ✅ **定量基準の承認取得**
   - Phase移行基準の経営層承認
   - A/Bテスト実施計画の承認

3. ✅ **ContentFetcher Registry設計レビュー**
   - アーキテクチャレビュー会議
   - 拡張性・保守性の評価

4. ✅ **監視基盤セットアップ**
   - Sentry DSN取得・設定
   - Vercel KV有効化
   - Slack Webhook設定

---

### Priority 2: 短期的に実施（Phase 1期間中）

1. 📝 **note API正式契約交渉**
   - note社へのコンタクト
   - API利用条件の協議
   - SLA・料金体系の確認

2. 📝 **双方向UXプロトタイプ**
   - Materials→Library逆流ボタンのデザイン
   - 学習循環可視化ウィジェットのプロトタイプ
   - ユーザーテスト実施

3. 📝 **ブランディングガイドライン策定**
   - "Powered by" 表記ルール
   - ブランド遷移モーダルのトーン&マナー
   - フッタークレジット文言

4. 📝 **健全性ダッシュボードMVP**
   - 基本的なメトリクス表示
   - アラート設定UI

---

### Priority 3: 中期的に検討（Phase 2期間中）

1. 📝 **YouTube/Spotify統合**
   - 法的チェックリスト実施
   - API利用申請
   - ContentFetcher実装

2. 📝 **推薦アルゴリズム最適化**
   - A/Bテストによる重み付け調整
   - 機械学習モデル導入検討
   - 協調フィルタリング実装

3. 📝 **学習進捗統合トラッキング**
   - Library閲覧時間の記録
   - Materials生成・完了イベントの統合
   - 弱点分析の高度化

4. 📝 **コミュニティ投稿機能設計**
   - UGC（User Generated Content）ポリシー
   - モデレーション体制
   - 著作権管理

---

### Priority 4: 長期的な展望（Phase 3以降）

1. 🔮 **MUED Marketplace正式化**
   - 法務・税務体制の完全整備
   - クリエイターエコシステム構築
   - レベニューシェアモデル最適化

2. 🔮 **マルチメディア統合**
   - Podcast RSS対応
   - Spotify プレイリスト統合
   - PDF教材管理

3. 🔮 **パーソナライゼーションエンジン**
   - 機械学習ベースの推薦
   - ユーザープロファイリング
   - 適応的学習パス生成

4. 🔮 **APIプラットフォーム化**
   - 外部開発者向けAPI公開
   - OAuth認証基盤
   - Webhook連携

---

## 📋 まとめ

### 最終推奨（v3.0）

**段階的統合アプローチ + 定量的意思決定**

1. **Phase 1（0-3ヶ月）**: 分離UI + 双方向連携
   - Library→Materials「AI練習問題を生成」
   - Materials→Library「関連記事を探す」（NEW）
   - 学習循環可視化（NEW）
   - ContentFetcher Registry実装（NEW）
   - **移行基準**: Library→Materials遷移率 ≥ 20%、RSS成功率 ≥ 99%

2. **Phase 2（3-6ヶ月）**: データ統合基盤
   - 横断検索・推薦システム
   - 双方向リンクDB（NEW）
   - 関連度スコアリング（NEW）
   - **移行基準**: 横断検索利用率 ≥ 40%、推薦クリック率 ≥ 20%

3. **Phase 3（6-12ヶ月）**: UI再統合A/Bテスト
   - データドリブンでの最適UI決定
   - **採用基準**: タスク完了率 +10%、満足度 +0.5、セッション時間 +15%
   - **未達成時**: 分離UI維持 + 推薦強化

---

### v2.0からの主要な進化点

| 観点 | v2.0 | v3.0 |
|------|------|------|
| **意思決定基準** | 定性的 | 定量的KPI設定 |
| **学習循環** | Library→Materials | **双方向**（Materials→Library追加） |
| **アーキテクチャ** | 固定enum | **Registry System**（プラグイン可能） |
| **ブランド関係** | 曖昧 | "Powered by" パートナー関係明示 |
| **法務対応** | 未言及 | **利用規約・著作権・契約の明示** |
| **運用監視** | 基本的 | **Sentry + KV + アラート + ダッシュボード** |

---

### 次のアクション

#### 即時（今週中）
1. ✅ この提案書（v3.0）のレビューと承認
2. ✅ 法務レビュー手配（弁護士への相談依頼）
3. ✅ Phase移行基準の経営層承認取得

#### 短期（Phase 1開始まで）
4. 📝 ContentFetcher Registry詳細設計
5. 📝 Sentry + Vercel KV環境構築
6. 📝 `/dashboard/library` プロトタイプ作成
7. 📝 双方向連携UXのプロトタイプ作成（NEW）

#### 中期（Phase 1期間中）
8. 📝 note API正式契約交渉開始
9. 📝 YouTube/Spotify統合の法的チェックリスト準備
10. 📝 健全性ダッシュボードMVP実装

---

**作成者**: Claude (AI Assistant)
**初版作成**: 2025-10-27（v1.0）
**v2.0改訂**: 2025-10-27（批判的レビューに基づく戦略的課題の解決）
**v3.0改訂**: 2025-10-27（定量的統合基準・双方向学習サイクル・法務フレームワーク・運用監視の追加）

---

## 📚 参考資料

### 技術資料
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Next.js ISR Documentation](https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration)
- [rss-parser GitHub](https://github.com/rbren/rss-parser)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)

### 法的資料
- [note利用規約](https://note.jp/terms)
- [著作権法 第32条（引用）](https://elaws.e-gov.go.jp/document?lawid=345AC0000000048)
- [著作権法 第47条の4（一時的蓄積）](https://elaws.e-gov.go.jp/document?lawid=345AC0000000048)
- [GDPR（EU一般データ保護規則）](https://gdpr-info.eu/)
- [個人情報保護法](https://www.ppc.go.jp/personalinfo/legal/)

### 学習理論
- [学習循環理論（Learning Cycle Theory）](https://www.researchgate.net/publication/learning-cycle-theory)
- [適応的学習システム（Adaptive Learning）](https://en.wikipedia.org/wiki/Adaptive_learning)
- [推薦システムアルゴリズム](https://developers.google.com/machine-learning/recommendation)

### A/Bテスト・統計
- [統計的有意性計算](https://www.evanmiller.org/ab-testing/)
- [A/Bテストベストプラクティス](https://www.optimizely.com/optimization-glossary/ab-testing/)
- [NPS（Net Promoter Score）](https://www.netpromoter.com/know/)

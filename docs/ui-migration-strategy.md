# UI更新戦略書 - Figma AI活用によるフロントエンド刷新

**作成日**: 2025-10-03
**対象プロジェクト**: MUED LMS v2
**目的**: MVPバックエンドを維持しつつ、Figma AIを活用してフロントエンドデザインを刷新

---

## 📋 目次

1. [現状分析サマリー](#現状分析サマリー)
2. [UI更新戦略](#ui更新戦略)
3. [実装開始のための具体的アクション](#実装開始のための具体的アクション)
4. [重要な注意事項](#重要な注意事項)

---

## 現状分析サマリー

### アーキテクチャ構成

- **フレームワーク**: Next.js 15.5.4 (App Router) + React 19 + TypeScript
- **認証**: Clerk
- **データベース**: Neon PostgreSQL + Drizzle ORM
- **決済**: Stripe
- **AI機能**: OpenAI API (GPT-4o/GPT-4o-mini)
- **スタイリング**: TailwindCSS 4 (インライン設定)
- **テスト**: Vitest + Playwright

### ページ構成とAPI連携

| ページ | API エンドポイント | 主要機能 |
|--------|------------------|----------|
| `/dashboard` | - | ダッシュボード (静的UI) |
| `/dashboard/lessons` | `GET /api/lessons` | レッスン一覧・予約 |
| `/dashboard/lessons/[id]/book` | `GET /api/lessons/[id]`<br>`POST /api/reservations`<br>`POST /api/checkout` | レッスン予約・決済 |
| `/dashboard/reservations` | `GET /api/reservations`<br>`POST /api/checkout` | 予約管理・決済 |
| `/dashboard/materials` | `GET /api/ai/materials`<br>`DELETE /api/ai/materials/[id]` | AI教材一覧 |
| `/dashboard/materials/new` | `POST /api/ai/materials` | AI教材生成 |
| `/dashboard/materials/[id]` | `GET /api/ai/materials/[id]` | AI教材詳細表示 |
| `/dashboard/subscription` | `GET /api/subscription/limits`<br>`POST /api/checkout` | サブスク管理 |

### 現在のデザインシステム

#### 色使用パターン

- **Primary**: `blue-600/700` (予約・アクション)
- **Secondary**: `gray-600/700` (確認)
- **Success**: `green-600/700` (教材)
- **Warning**: `yellow-600/700` (アップグレード)
- **Danger**: `red-600/800` (削除)
- **Info**: `purple-600/700`, `indigo-600/700` (メッセージ・プロフィール)

#### コンポーネントパターン

- カードベースレイアウト (`bg-white rounded-lg shadow p-6`)
- グリッドシステム (`grid md:grid-cols-2 lg:grid-cols-3`)
- インライン状態管理 (useState/useEffect)
- ローディングUI (spinner + テキスト)

### ビジネスロジック分離度

#### ✅ 良好な分離

- `/lib/services/ai-material.service.ts`: AI生成ロジック完全分離
- `/lib/middleware/usage-limiter.ts`: クォータ管理ロジック
- `/app/api/**`: APIルートでビジネスロジック処理

#### ❌ 改善が必要

- ページコンポーネント内でfetch/状態管理が混在
- UIロジックとデータフェッチが同一ファイル
- 再利用可能なコンポーネントが未整備 (`/components/**` が空)

---

## UI更新戦略

### Phase 1: 仕様整理・UIマップ作成

#### 1.1 現状UI→Figmaインポート

```bash
# ページスクリーンショット取得
npm run dev
# 各ページをキャプチャしてFigmaにアップロード
```

**キャプチャ対象ページ**:
- `/dashboard` - ダッシュボード
- `/dashboard/lessons` - レッスン一覧
- `/dashboard/lessons/[id]/book` - レッスン予約
- `/dashboard/reservations` - 予約管理
- `/dashboard/materials` - AI教材一覧
- `/dashboard/materials/new` - AI教材生成
- `/dashboard/subscription` - サブスクリプション

#### 1.2 FigJamでUIフロー図作成

- 現状のページ遷移とAPIフローを可視化
- ユーザージャーニーマップ作成
- データフローダイアグラム (API ↔ UI)

#### 1.3 作成推奨ドキュメント

```
/docs/ui-migration/
├── current-ui-map.figjam        # 現状UIマップ
├── api-integration-matrix.md    # API連携一覧表
└── user-flows.figjam            # ユーザーフロー図
```

---

### Phase 2: Figma AI活用でデザイン刷新

#### 2.1 Figma AIプラグイン推奨

| プラグイン | 用途 |
|-----------|------|
| **Autoflow** | ユーザーフロー自動生成 |
| **Magician (by Diagram)** | テキストプロンプトからUIデザイン生成 |
| **Figma AI (公式)** | デザインバリエーション自動提案 |

#### 2.2 デザインシステム構築

```
/MUED LMS Design System (Figmaファイル構成)
├── 🎨 Foundations
│   ├── Colors (現状の色パレット + 新規提案)
│   ├── Typography (Geist Sans/Mono継承)
│   └── Spacing (Tailwind基準: 4px単位)
├── 🧩 Components
│   ├── Button (variants: primary/secondary/danger)
│   ├── Card (lesson/material/subscription)
│   ├── Input/Select
│   ├── Badge (status indicators)
│   └── Modal/Dialog
└── 📄 Pages (新デザイン案)
    ├── Dashboard (redesigned)
    ├── Lessons (calendar view追加)
    ├── Materials (カード改善)
    └── Subscription (プラン比較表改善)
```

#### 2.3 AI活用プロンプト例

```
"Create a modern dashboard design for a music lesson LMS using:
- Card-based layout with shadows
- Japanese language UI
- Color palette: blue (#2563eb), green (#16a34a), yellow (#ca8a04)
- Mentor profile cards with avatar, skills, and booking CTA
- Include reservation status indicators
- Mobile-first responsive design"
```

```
"Design a lesson booking card component with:
- Mentor profile image (circle)
- Name and skills tags
- Date/time display
- Price in JPY
- Available slots indicator
- Primary action button
- Hover state with elevation increase"
```

---

### Phase 3: コンポーネント分離・再設計

#### 3.1 コンポーネントライブラリ作成

```typescript
/components
├── ui/                        // 汎用UIコンポーネント
│   ├── button.tsx            // ボタン (primary/secondary/danger variants)
│   ├── card.tsx              // カードコンテナ
│   ├── badge.tsx             // ステータスバッジ
│   ├── skeleton.tsx          // ローディング
│   ├── input.tsx             // フォーム入力
│   ├── select.tsx            // ドロップダウン
│   └── modal.tsx             // モーダルダイアログ
├── features/                  // 機能別コンポーネント
│   ├── lesson-card.tsx       // レッスンカード (プレゼンテーション)
│   ├── material-card.tsx     // 教材カード
│   ├── quota-indicator.tsx   // クォータ表示
│   ├── reservation-card.tsx  // 予約カード
│   └── subscription-plan.tsx // プラン表示
└── layouts/                   // レイアウトコンポーネント
    ├── dashboard-layout.tsx  // ダッシュボードレイアウト
    ├── page-header.tsx       // ページヘッダー
    └── page-container.tsx    // ページコンテナ
```

#### 3.2 カスタムフック抽出

```typescript
/hooks
├── use-lessons.ts         // レッスンデータフェッチ
├── use-materials.ts       // 教材データフェッチ
├── use-reservations.ts    // 予約データフェッチ
├── use-subscription.ts    // サブスク情報
└── use-quota.ts          // クォータチェック
```

#### 3.3 実装例

**カスタムフック**: `/hooks/use-lessons.ts`

```typescript
import { useState, useEffect } from 'react';

export interface LessonSlot {
  id: string;
  mentorId: string;
  startTime: string;
  endTime: string;
  price: string;
  maxCapacity: number;
  currentCapacity: number;
  status: string;
  mentor: {
    id: string;
    name: string;
    email: string;
    profileImageUrl: string | null;
    bio: string | null;
    skills: string[] | null;
  };
}

export interface LessonFilters {
  available?: boolean;
  mentorId?: string;
}

export function useLessons(filters?: LessonFilters) {
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.available) params.append('available', 'true');
      if (filters?.mentorId) params.append('mentorId', filters.mentorId);

      const response = await fetch(`/api/lessons?${params.toString()}`);
      const data = await response.json();
      setSlots(data.slots || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lessons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [filters?.available, filters?.mentorId]);

  return { slots, loading, error, refetch: fetchSlots };
}
```

**UIコンポーネント**: `/components/features/lesson-card.tsx`

```typescript
import { LessonSlot } from '@/hooks/use-lessons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LessonCardProps {
  slot: LessonSlot;
  onBook: (slotId: string) => void;
}

export function LessonCard({ slot, onBook }: LessonCardProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(parseFloat(price));
  };

  const isFull = slot.currentCapacity >= slot.maxCapacity;

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      {/* Mentor Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {slot.mentor?.profileImageUrl ? (
            <img
              src={slot.mentor.profileImageUrl}
              alt={slot.mentor.name}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-500 text-lg">
                {slot.mentor?.name?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold">{slot.mentor?.name}</h3>
            {slot.mentor?.skills && (
              <div className="flex gap-1 mt-1">
                {slot.mentor.skills.slice(0, 2).map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">日時:</span>
          <span className="font-medium">{formatDateTime(slot.startTime)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">料金:</span>
          <span className="font-semibold text-blue-600">
            {formatPrice(slot.price)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">空き:</span>
          <span>
            {slot.maxCapacity - slot.currentCapacity} / {slot.maxCapacity}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={() => onBook(slot.id)}
        disabled={isFull}
        variant={isFull ? 'secondary' : 'primary'}
        className="w-full"
      >
        {isFull ? '満席' : '予約する'}
      </Button>
    </div>
  );
}
```

**ページコンポーネント (リファクタリング後)**: `/app/dashboard/lessons/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLessons } from '@/hooks/use-lessons';
import { LessonCard } from '@/components/features/lesson-card';
import { PageHeader } from '@/components/layouts/page-header';
import { PageContainer } from '@/components/layouts/page-container';

export default function LessonsPage() {
  const router = useRouter();
  const [selectedMentor, setSelectedMentor] = useState('');
  const { slots, loading, error } = useLessons({
    available: true,
    mentorId: selectedMentor || undefined,
  });

  const handleBooking = (slotId: string) => {
    router.push(`/dashboard/lessons/${slotId}/book`);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="レッスン予約"
        description="利用可能なレッスンスロットから予約できます"
      />

      {/* Filter */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            メンターで絞り込み:
          </label>
          <select
            value={selectedMentor}
            onChange={(e) => setSelectedMentor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全てのメンター</option>
            {Array.from(new Set(slots.map((s) => s.mentor?.id)))
              .filter(Boolean)
              .map((mentorId) => {
                const mentor = slots.find((s) => s.mentor?.id === mentorId)?.mentor;
                return mentor ? (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </option>
                ) : null;
              })}
          </select>
        </div>
      </div>

      {/* Lesson Grid */}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">現在予約可能なレッスンはありません</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
            <LessonCard key={slot.id} slot={slot} onBook={handleBooking} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
```

---

### Phase 4: Figma→Code変換

#### 4.1 推奨ツール

| ツール | 用途 | 長所 | URL |
|--------|------|------|-----|
| **Anima** | Figma→React/Tailwind | TailwindCSS直接出力 | https://www.animaapp.com/ |
| **Locofy** | Figma→Next.js | App Router対応 | https://www.locofy.ai/ |
| **Figma to Code** | コンポーネント単位変換 | 既存コード統合しやすい | VSCode拡張機能 |

#### 4.2 変換ワークフロー

```bash
# 1. Figmaプラグインでコード生成
# Anima/Locofyで各コンポーネントを変換

# 2. 生成コードを /components/ui/ に配置
# 例: button.tsx, card.tsx, badge.tsx

# 3. 既存APIロジックと統合
# /app/dashboard/lessons/page.tsx を更新
# - UIは新コンポーネント使用
# - データフェッチは use-lessons フック使用
```

#### 4.3 変換時の注意点

- **className の調整**: Figma生成コードは absolute positioning を多用するため、Flexbox/Grid に変換
- **カスタムプロパティ**: Figma変数を Tailwind CSS変数に変換
- **アクセシビリティ**: aria属性、role、alt属性を手動追加
- **レスポンシブ**: Figmaのブレークポイントを Tailwindのブレークポイント (`sm:`, `md:`, `lg:`) に変換

---

### Phase 5: 段階的移行戦略

#### 5.1 ブランチ戦略

```bash
# フィーチャーブランチでページ単位移行
git checkout -b ui/components-library      # 共通コンポーネント
git checkout -b ui/redesign-dashboard      # ダッシュボード
git checkout -b ui/redesign-lessons        # レッスン予約
git checkout -b ui/redesign-materials      # AI教材
git checkout -b ui/redesign-subscription   # サブスクリプション
```

#### 5.2 移行順序 (優先度順)

1. **共通コンポーネント** (`/components/ui/`, `/hooks/`) - 基盤整備
2. **ダッシュボード** (`/dashboard/page.tsx`) - 影響範囲小、テストケース
3. **レッスン予約** (`/dashboard/lessons/**`) - コア機能
4. **AI教材** (`/dashboard/materials/**`) - 差別化機能
5. **サブスクリプション** (`/dashboard/subscription/page.tsx`) - 収益機能
6. **予約管理** (`/dashboard/reservations/page.tsx`) - 統合機能

#### 5.3 各ページの移行チェックリスト

```markdown
### ページ移行チェックリスト: [ページ名]

#### デザイン
- [ ] Figmaデザイン確定
- [ ] デザインレビュー完了
- [ ] レスポンシブデザイン確認 (Mobile/Tablet/Desktop)

#### 実装
- [ ] コンポーネント分離 (`/components/ui/`, `/components/features/`)
- [ ] カスタムフック作成 (`/hooks/`)
- [ ] 既存APIロジック維持確認
- [ ] TypeScript型定義整備

#### テスト
- [ ] ビジュアルリグレッションテスト (Playwright)
- [ ] ユニットテスト (Vitest)
- [ ] E2Eテスト更新
- [ ] アクセシビリティチェック (axe-core)

#### リリース
- [ ] Vercelプレビューデプロイ
- [ ] ステークホルダーレビュー
- [ ] 本番デプロイ
- [ ] モニタリング (エラー率、パフォーマンス)
```

---

### Phase 6: 品質保証

#### 6.1 テスト戦略

```typescript
// 既存テストを維持しつつUI更新
// tests/unit/ - ビジネスロジックテスト (変更なし)
// tests/integration/ - API統合テスト (変更なし)
// tests/e2e/ - UI E2Eテスト (スナップショット更新)

// 新規追加: ビジュアルリグレッション
// tests/e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('dashboard redesign', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot('dashboard-new.png');
  });

  test('lessons page redesign', async ({ page }) => {
    await page.goto('/dashboard/lessons');
    await page.waitForSelector('[data-testid="lesson-card"]');
    await expect(page).toHaveScreenshot('lessons-new.png');
  });

  test('materials page redesign', async ({ page }) => {
    await page.goto('/dashboard/materials');
    await expect(page).toHaveScreenshot('materials-new.png');
  });
});
```

#### 6.2 アクセシビリティテスト

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('dashboard should not have accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('lessons page keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard/lessons');

    // Tab navigation
    await page.keyboard.press('Tab');
    const firstFocusable = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(firstFocusable);
  });
});
```

#### 6.3 段階的デプロイ

```bash
# Vercel環境変数でフィーチャーフラグ制御
NEXT_PUBLIC_NEW_UI_ENABLED=true  # 新UIを有効化
```

```typescript
// app/dashboard/page.tsx
import { NewDashboard } from './new-dashboard';
import { LegacyDashboard } from './legacy-dashboard';

export default function DashboardPage() {
  const isNewUI = process.env.NEXT_PUBLIC_NEW_UI_ENABLED === 'true';

  return isNewUI ? <NewDashboard /> : <LegacyDashboard />;
}
```

#### 6.4 パフォーマンス監視

```typescript
// lib/monitoring.ts
export function trackPagePerformance(pageName: string) {
  if (typeof window === 'undefined') return;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  const metrics = {
    page: pageName,
    loadTime: navigation.loadEventEnd - navigation.fetchStart,
    domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
  };

  console.log('Page Performance:', metrics);
  // Send to analytics service
}
```

---

## 実装開始のための具体的アクション

### 今すぐ実行できるコマンド

```bash
# 1. ディレクトリ構造作成
mkdir -p components/ui components/features components/layouts hooks docs/ui-migration

# 2. 開発サーバー起動 (スクリーンショット取得用)
npm run dev
# → http://localhost:3000 でページキャプチャ

# 3. 既存UIスクリーンショット取得
# 以下のページをキャプチャしてFigmaにアップロード:
# - /dashboard
# - /dashboard/lessons
# - /dashboard/materials
# - /dashboard/subscription
# - /dashboard/reservations

# 4. 最初のコンポーネント作成 (例: Button)
# → /components/ui/button.tsx を作成
```

### コンポーネント作成例

```bash
# Button コンポーネント作成
cat > components/ui/button.tsx << 'EOF'
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'rounded transition font-medium';

    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    const sizes = {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
EOF
```

### 推奨ツール導入

#### Shadcn/ui風のコンポーネント初期化 (オプション)

```bash
# Shadcn/ui CLI (オプション - 既存Tailwind設定と競合する可能性あり)
# npx shadcn@latest init
```

#### Figma→Code変換ツール

- **Anima**: https://www.animaapp.com/
- **Locofy**: https://www.locofy.ai/
- **VSCode拡張**: "Figma to Code" をインストール

#### 開発ツール追加

```bash
# アクセシビリティテスト
npm install -D @axe-core/playwright

# ビジュアルリグレッションテスト (Playwright標準機能)
# 追加インストール不要
```

---

## 重要な注意事項

### 🚫 変更してはいけないもの

1. **バックエンド・DB・API**: `/app/api/**`, `/lib/services/**`, `/db/**` は触らない
2. **認証フロー**: Clerk統合 (`@clerk/nextjs`) は変更しない
3. **決済フロー**: Stripe決済ロジック (`/lib/stripe.ts`, `/app/api/checkout/**`) は既存を使用
4. **環境変数**: `.env.local` の既存設定を維持

### ✅ 変更してよいもの

1. **UIコンポーネント**: `/app/**/*.tsx` のJSX部分
2. **スタイリング**: Tailwind classNames
3. **状態管理**: useState/useEffect → カスタムフック化
4. **コンポーネント構造**: ページ内コンポーネントを `/components/**` に分離

### 📋 移行時のベストプラクティス

1. **段階的移行**: 1ページずつリリースし、問題発生時はロールバック可能にする
2. **テスト重視**: 既存の自動テストを必ず維持し、UI変更後も全テスト通過を確認
3. **APIコントラクト維持**: フロントエンドがリクエスト/レスポンスする形式を変更しない
4. **型安全性**: TypeScript型定義を維持・強化
5. **パフォーマンス監視**: Lighthouse CI、Vercel Analytics でパフォーマンス劣化を監視

### 🔄 ロールバック計画

```bash
# 問題発生時のロールバック手順

# 1. Vercel環境変数で新UIを無効化
NEXT_PUBLIC_NEW_UI_ENABLED=false

# 2. または、Gitで前のコミットに戻す
git revert <commit-hash>

# 3. 即座にデプロイ
git push origin main
```

---

## 付録

### A. API連携一覧表

| API Endpoint | Method | Request | Response | 使用ページ |
|--------------|--------|---------|----------|-----------|
| `/api/lessons` | GET | `?available=true&mentorId=xxx` | `{ slots: LessonSlot[] }` | `/dashboard/lessons` |
| `/api/lessons/[id]` | GET | - | `{ slot: LessonSlot }` | `/dashboard/lessons/[id]/book` |
| `/api/reservations` | GET | - | `{ reservations: Reservation[] }` | `/dashboard/reservations` |
| `/api/reservations` | POST | `{ slotId, notes }` | `{ reservation: Reservation }` | `/dashboard/lessons/[id]/book` |
| `/api/checkout` | POST | `{ type, priceId, reservationId? }` | `{ sessionId }` | `/dashboard/subscription`, `/dashboard/reservations` |
| `/api/ai/materials` | GET | - | `{ materials: Material[], quota }` | `/dashboard/materials` |
| `/api/ai/materials` | POST | `{ subject, topic, difficulty, format }` | `{ materialId, material }` | `/dashboard/materials/new` |
| `/api/ai/materials/[id]` | GET | - | `{ material: Material }` | `/dashboard/materials/[id]` |
| `/api/ai/materials/[id]` | DELETE | - | `{ success: true }` | `/dashboard/materials` |
| `/api/subscription/limits` | GET | - | `{ tier, reservations, aiMaterials }` | `/dashboard/subscription` |

### B. 色パレット定義

```css
/* Tailwind Config での定義例 */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb', // blue-600
          hover: '#1d4ed8',   // blue-700
        },
        secondary: {
          DEFAULT: '#4b5563', // gray-600
          hover: '#374151',   // gray-700
        },
        success: {
          DEFAULT: '#16a34a', // green-600
          hover: '#15803d',   // green-700
        },
        danger: {
          DEFAULT: '#dc2626', // red-600
          hover: '#b91c1c',   // red-800
        },
        warning: {
          DEFAULT: '#ca8a04', // yellow-600
          hover: '#a16207',   // yellow-700
        },
      },
    },
  },
};
```

### C. 参考リンク

- **Figma AI活用ガイド**: https://www.figma.com/ja/ai/
- **Anima (Figma to Code)**: https://www.animaapp.com/
- **Locofy (Figma to Next.js)**: https://www.locofy.ai/
- **Next.js App Router**: https://nextjs.org/docs/app
- **TailwindCSS v4**: https://tailwindcss.com/blog/tailwindcss-v4
- **Playwright Visual Testing**: https://playwright.dev/docs/test-snapshots
- **Axe Accessibility Testing**: https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-10-03 | 1.0.0 | 初版作成 |

---

**作成者**: Claude Code
**承認者**: [プロジェクトオーナー名]
**次回レビュー日**: [UI移行完了後]

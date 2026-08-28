# Web Performance Optimization Skill

Next.js 15 App Router向けのCore Web Vitals最適化スキル。

---

## 使用タイミング

- Vercel Speed Insightsでスコアが90未満
- Lighthouseスコアが低い
- ページ読み込みが遅いと感じる
- 新しいページ/コンポーネント作成時のパフォーマンス考慮

---

## Core Web Vitals 目標値

| 指標 | Good | Needs Improvement | Poor |
|------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | < 200ms | 200ms - 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **FCP** (First Contentful Paint) | < 1.8s | 1.8s - 3.0s | > 3.0s |
| **TTFB** (Time to First Byte) | < 800ms | 800ms - 1800ms | > 1800ms |

---

## 診断フロー

### Phase 1: 計測

```bash
# Lighthouse CLI（ローカル）
npx lighthouse https://mued.jp --view --preset=desktop
npx lighthouse https://mued.jp --view --preset=perf --emulated-form-factor=mobile

# Bundle分析
npm run build
npx @next/bundle-analyzer
```

### Phase 2: 問題特定

1. **LCP が遅い場合**
   - ヒーロー画像の最適化
   - フォント読み込み
   - Server Component活用

2. **INP が遅い場合**
   - クライアントサイドJSの削減
   - イベントハンドラの最適化
   - `useTransition` / `useDeferredValue`

3. **CLS が高い場合**
   - 画像のwidth/height指定
   - フォントのfont-display: swap
   - 動的コンテンツの事前サイズ確保

4. **FCP が遅い場合**
   - 初期HTMLサイズ削減
   - クリティカルCSSのインライン化
   - render-blockingリソースの削減

---

## Next.js 15 最適化パターン

### 1. Server Components優先

```tsx
// BAD: 不要なクライアントコンポーネント
'use client'
export function StaticContent() {
  return <div>This doesn't need to be a client component</div>
}

// GOOD: Server Componentのまま
export function StaticContent() {
  return <div>Server rendered, zero JS</div>
}
```

### 2. 画像最適化

```tsx
// BAD: サイズ未指定
<img src="/hero.jpg" alt="Hero" />

// GOOD: next/image + priority + sizes
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority  // LCP要素には必須
  sizes="(max-width: 768px) 100vw, 1200px"
/>
```

### 3. フォント最適化

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',  // CLSを防ぐ
  preload: true,
})
```

### 4. 動的インポート

```tsx
// BAD: 常に読み込み
import HeavyComponent from './HeavyComponent'

// GOOD: 必要時に読み込み
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false,  // クライアントのみで必要な場合
})
```

### 5. Suspenseバウンダリ

```tsx
// BAD: 全体が待機
export default async function Page() {
  const data = await fetchSlowData()
  return <Content data={data} />
}

// GOOD: 部分的にストリーミング
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <Header />  {/* すぐに表示 */}
      <Suspense fallback={<Skeleton />}>
        <SlowContent />  {/* 後からストリーミング */}
      </Suspense>
    </div>
  )
}
```

### 6. 並列データフェッチ

```tsx
// BAD: ウォーターフォール
const user = await getUser()
const posts = await getPosts(user.id)
const comments = await getComments(posts[0].id)

// GOOD: 並列実行
const [user, settings] = await Promise.all([
  getUser(),
  getSettings(),
])
```

### 7. キャッシュ活用

```tsx
// fetch のキャッシュ
const data = await fetch(url, {
  next: { revalidate: 3600 }  // 1時間キャッシュ
})

// unstable_cache for non-fetch
import { unstable_cache } from 'next/cache'

const getCachedData = unstable_cache(
  async () => db.query(...),
  ['cache-key'],
  { revalidate: 3600 }
)
```

---

## アニメーション最適化

### Framer Motion

```tsx
// BAD: 重いアニメーション
<motion.div
  animate={{ x: 100, y: 100, rotate: 360, scale: 1.5 }}
  transition={{ duration: 2 }}
/>

// GOOD: GPU最適化プロパティのみ
<motion.div
  animate={{ x: 100, y: 100 }}  // transform
  transition={{ duration: 0.3 }}
  style={{ willChange: 'transform' }}
/>
```

### CSSでできることはCSSで

```tsx
// BAD: JSアニメーション
const [isHovered, setIsHovered] = useState(false)
<div
  onMouseEnter={() => setIsHovered(true)}
  style={{ opacity: isHovered ? 1 : 0.5 }}
/>

// GOOD: CSSトランジション
<div className="opacity-50 hover:opacity-100 transition-opacity" />
```

---

## サードパーティスクリプト

### 遅延読み込み

```tsx
// BAD: 同期読み込み
<script src="https://analytics.example.com/script.js" />

// GOOD: next/script で遅延
import Script from 'next/script'

<Script
  src="https://analytics.example.com/script.js"
  strategy="lazyOnload"  // or "afterInteractive"
/>
```

### Clerk認証の最適化

```tsx
// ClerkProvider を必要なルートのみに
// app/(auth)/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function AuthLayout({ children }) {
  return <ClerkProvider>{children}</ClerkProvider>
}

// ランディングページではClerkを読み込まない
```

---

## Bundle最適化

### 1. Import分析

```tsx
// BAD: ライブラリ全体をインポート
import _ from 'lodash'
_.debounce(fn, 300)

// GOOD: 必要な関数のみ
import debounce from 'lodash/debounce'
debounce(fn, 300)
```

### 2. Tree Shaking確認

```bash
# Bundle Analyzerで確認
ANALYZE=true npm run build
```

### 3. 外部化

```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
}
```

---

## チェックリスト

### LCP改善
- [ ] ヒーロー画像に `priority` 属性
- [ ] `next/image` で適切な `sizes` 指定
- [ ] フォントに `display: swap`
- [ ] 初期表示コンテンツはServer Component

### INP改善
- [ ] `'use client'` は最小範囲
- [ ] 重い処理は `useTransition` でラップ
- [ ] イベントハンドラは軽量に
- [ ] `useDeferredValue` で低優先度更新

### CLS改善
- [ ] 全画像に width/height
- [ ] スケルトンローダーは実際のサイズと同じ
- [ ] 動的コンテンツの領域を事前確保
- [ ] Webフォントのフォールバック設定

### バンドルサイズ
- [ ] 動的インポートで初期バンドル削減
- [ ] 未使用の依存関係を削除
- [ ] `optimizePackageImports` 設定
- [ ] Bundle Analyzerで定期確認

---

## 参考リソース

- [Vercel: Optimizing Core Web Vitals](https://vercel.com/docs/speed-insights)
- [Next.js: Optimizing](https://nextjs.org/docs/app/building-your-application/optimizing)
- [web.dev: Core Web Vitals](https://web.dev/articles/vitals)
- [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
- [Cloudflare Web Perf Skill](https://github.com/cloudflare/skills/tree/main/web-perf)

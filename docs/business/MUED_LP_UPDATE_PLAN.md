# MUED ランディングページ更新計画

> **作成日**: 2025-12-23
> **目的**: 現在の「音楽レッスンLMS」から「AI時代のクリエイター支援プラットフォーム」へ刷新

---

## 現状と課題

### Before（現在）
```
┌─────────────────────────────────────────┐
│ MUED LMS                                │
│                                         │
│ 🎵 レッスン予約  📚 教材管理  💬 連絡   │
│                                         │
│ [無料] [ベーシック] [プレミアム]        │
└─────────────────────────────────────────┘
```

**問題点:**
- 絵文字アイコン使用（非プロフェッショナル）
- 汎用LMSデザイン（差別化なし）
- MUED哲学が反映されていない
- ライトモード固定（クリエイター向けでない）

### After（目指す姿）
```
┌─────────────────────────────────────────┐
│ MUED                     [ログイン]     │
│ Making creativity visible.              │
│                                         │
│ AI時代、創作は「選び続けること」        │
│                                         │
│ [始める]                                │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ 出力はAI、判断と欲は人間。              │
│                                         │
│ [glasswerks実績] [ユースケース]         │
└─────────────────────────────────────────┘
```

---

## デザイン方針

### ビジュアル

| 項目 | 仕様 |
|------|------|
| モード | ダークモード優先 |
| スタイル | グラスモーフィズム + ミニマル |
| カラー | モノクローム + Indigo アクセント |
| アイコン | Lucide Icons（絵文字禁止） |
| フォント | Inter（見出し）+ Noto Sans JP（本文） |

### 心理学効果の適用

| セクション | 効果 | 実装方法 |
|-----------|------|---------|
| ヒーロー | フレーミング効果 | 「創作 = 選び続けること」という再定義 |
| 哲学 | 認知的不協和の解消 | AIへの不安を言語化し、人間の役割を明確化 |
| 実績 | 社会的証明 + 権威 | NHK紅白編曲実績、glasswerksブランド |
| CTA | 損失回避 | 「判断を記録しないと、創作は消費になる」 |

---

## セクション構成

### 1. ヒーロー

```tsx
<section className="min-h-screen bg-[#0F0F1A] flex items-center">
  <div className="container mx-auto px-6">
    <h1 className="text-6xl font-bold text-white mb-4">
      MUED
    </h1>
    <p className="text-2xl text-slate-400 mb-8">
      Making creativity visible.
    </p>
    <p className="text-xl text-white/80 max-w-2xl mb-12">
      AI時代、創作は「選び続けること」になりました。<br />
      MUEDは、その選択を映し出す鏡です。
    </p>
    <Button>始める</Button>
  </div>
</section>
```

### 2. 哲学セクション

**コピー:**
> 出力はAI、判断と欲は人間。

> AIがやっていることは、人間の脳に似ている。
> 膨大な過去データをもとに、文脈に応じて連想し、再配置している。
>
> 問題は、AIが何を出すかではありません。
> **それを見て、自分が何に引っかかり、何を選び、何を捨てたか。**
> そこにだけ、人間の役割があります。

### 3. MUEDnote紹介

```
┌─────────────────────────────────────────┐
│ MUEDnote                                │
│                                         │
│ 完成物を評価するツールではありません。   │
│ 未完成、迷い、違和感、判断の途中経過。   │
│ それらを価値として残すための場所です。   │
│                                         │
│ ・なぜこの案に反応したのか              │
│ ・なぜこのテイクを捨てたのか            │
│ ・どこで引っかかったのか                │
│ ・そのとき何を考えていたのか            │
│                                         │
│ [App Store] [TestFlight待機リスト]      │
└─────────────────────────────────────────┘
```

### 4. 社会的証明

```
┌─────────────────────────────────────────┐
│ glasswerks inc. による開発              │
│                                         │
│ • NHK紅白歌合戦 編曲実績                │
│ • CM音楽制作 20年のキャリア             │
│ • 開発力を持つ代表による技術設計        │
│                                         │
│ [詳しく見る → glasswerks.jp]            │
└─────────────────────────────────────────┘
```

### 5. CTA（損失回避）

```tsx
<section className="bg-indigo-600/10 py-24">
  <div className="container mx-auto text-center">
    <h2 className="text-3xl font-bold text-white mb-4">
      正解を信じなくていい。<br />
      反応を記録しよう。
    </h2>
    <p className="text-slate-400 mb-8">
      違和感も、納得感も。<br />
      どちらもあなたの判断の痕跡です。
    </p>
    <Button size="lg">MUEDを始める</Button>
  </div>
</section>
```

---

## 実装ステップ

### Phase 1: 基盤整備

```
Step 1: Lucide Icons 導入
        npm install lucide-react

Step 2: ダークモード対応
        tailwind.config.ts に darkMode: 'class' 追加

Step 3: グラスモーフィズム共通コンポーネント作成
        components/ui/glass-card.tsx
```

### Phase 2: コンポーネント作成

```
Step 4: ヒーローセクション
        components/features/landing/hero-section.tsx

Step 5: 哲学セクション
        components/features/landing/philosophy-section.tsx

Step 6: MUEDnote紹介セクション
        components/features/landing/muednote-section.tsx

Step 7: 社会的証明セクション
        components/features/landing/social-proof-section.tsx

Step 8: CTAセクション
        components/features/landing/cta-section.tsx
```

### Phase 3: 統合

```
Step 9: landing-content.tsx 全面刷新

Step 10: i18n対応（日本語/英語）
         lib/i18n/translations/landing.ts 更新

Step 11: レスポンシブ確認
         320px, 768px, 1024px, 1440px
```

### Phase 4: 検証

```
Step 12: Lighthouse スコア確認
         Performance > 90, Accessibility > 90

Step 13: 実機確認（iPhone, Android）

Step 14: A/Bテスト設計（将来）
```

---

## 参照スキル

実装時に以下のスキルを参照:

```
.claude/skills/
├── ui-ux-pro-max/SKILL.md    ← デザインガイドライン
└── ux-psychology/SKILL.md    ← 心理学効果の適用
```

---

## ファイル構成（予定）

```
components/
├── features/
│   ├── landing/
│   │   ├── hero-section.tsx
│   │   ├── philosophy-section.tsx
│   │   ├── muednote-section.tsx
│   │   ├── social-proof-section.tsx
│   │   └── cta-section.tsx
│   └── landing-content.tsx  ← メインコンポーネント
└── ui/
    └── glass-card.tsx
```

---

## AIO（AI Search Engine Optimization）

### 概要

glasswerks LP同様、AIクローラー向けの構造化データ（JSON-LD）を実装する。

参照: `/Users/kimny/Dropbox/_DevProjects/_LandingPage/glasswerks-lp/index.html`

### 実装するスキーマ

#### 1. Organization

```json
{
  "@type": "Organization",
  "@id": "https://mued.jp/#organization",
  "name": "MUED",
  "alternateName": ["ミュード", "MUED LMS", "MUEDnote"],
  "url": "https://mued.jp",
  "slogan": "Making creativity visible.",
  "description": "AI時代のクリエイター支援プラットフォーム。「出力はAI、判断と欲は人間」をコンセプトに、創作における判断の痕跡を記録・可視化。glasswerks inc.による開発。音楽制作者、クリエイター向け。 | AI-era creator support platform. 'Output is AI, judgment and desire are human.' Records and visualizes the traces of creative decisions. Developed by glasswerks inc. For music producers and creators.",
  "parentOrganization": {
    "@id": "https://www.glasswerks.jp/#organization"
  },
  "knowsAbout": [
    "AI時代の創作支援", "AI-era Creative Support",
    "音楽制作", "Music Production",
    "判断の記録", "Decision Recording",
    "クリエイティブワークフロー", "Creative Workflow",
    "音声文字起こし", "Speech Transcription",
    "練習ログ", "Practice Logging",
    "セルフコーチング", "Self-Coaching",
    "メタ認知", "Metacognition"
  ]
}
```

#### 2. SoftwareApplication（MUEDnote）

```json
{
  "@type": "SoftwareApplication",
  "@id": "https://mued.jp/#muednote",
  "name": "MUEDnote",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": "iOS",
  "description": "音楽練習中の発話・判断を記録するiOSアプリ。Whisperによるオンデバイス文字起こし。判断の痕跡を可視化し、創作プロセスを資産化。 | iOS app for recording speech and decisions during music practice. On-device transcription with Whisper. Visualizes decision traces and turns the creative process into assets.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "creator": {
    "@id": "https://www.glasswerks.jp/#organization"
  }
}
```

#### 3. WebSite

```json
{
  "@type": "WebSite",
  "@id": "https://mued.jp/#website",
  "name": "MUED",
  "url": "https://mued.jp",
  "description": "AI時代のクリエイター支援プラットフォーム | AI-era creator support platform",
  "inLanguage": ["ja", "en"],
  "publisher": {
    "@id": "https://mued.jp/#organization"
  }
}
```

### 実装場所

Next.jsでは `app/layout.tsx` の `<head>` 内、または専用コンポーネントで実装:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 実装ステップに追加

Phase 1 に以下を追加:

```
Step 0: AIO構造化データ設計
        lib/seo/structured-data.ts

Step 0.5: layout.tsx に JSON-LD 埋め込み
```

---

## 成功指標

| 指標 | 現状 | 目標 |
|------|------|------|
| Lighthouse Performance | ? | > 90 |
| Lighthouse Accessibility | ? | > 90 |
| 直帰率 | ? | < 50% |
| サインアップ転換率 | ? | > 5% |

---

## 次回作業開始時

1. このドキュメントを読む
2. `.claude/skills/ui-ux-pro-max/SKILL.md` を参照
3. Phase 1 から順に実装

---

*最終更新: 2025-12-23*

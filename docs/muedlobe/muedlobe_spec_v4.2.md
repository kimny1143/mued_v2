# MUEDlobe Complete Specification v4.2

**Code Name:** Exolobe (The External Frontal Lobe)  
**Version:** 4.2 (Web-Only, mued_v2 integrated)  
**Date:** 2026/02/03  
**Author:** glasswerks inc.

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [データベーススキーマ](#3-データベーススキーマ)
4. [認知測定システム](#4-認知測定システム)
5. [ゲーム詳細仕様](#5-ゲーム詳細仕様)
6. [Cortex Editor](#6-cortex-editor)
7. [API設計](#7-api設計)
8. [ビジネスモデル](#8-ビジネスモデル)
9. [開発ロードマップ](#9-開発ロードマップ)
10. [法的・倫理的考慮事項](#10-法的倫理的考慮事項)
11. [実装コード](#11-実装コード)

---

## 1. プロジェクト概要

### 1.1 コンセプト

**"The IDE for Your External Brain."**  
（脳内OSの統合開発環境）

クリエイター個人の「認知特性（脳のスペック）」をゲーミフィケーションで測定・可視化し、そのデータに基づいてAIパートナー「Hoo」の思考回路（システムプロンプト）を最適化・再設計する機能。

### 1.2 位置づけ

**MUEDlobeは単体アプリではなく、MUED Web（mued.jp）の機能として提供。**

| 項目 | 決定 |
|------|------|
| 形態 | Webアプリ（mued.jp/lobe/） |
| iOSアプリ | 作らない |
| 単体販売 | しない |
| 対象 | MUEDnote Premium（¥2,980/月）会員限定 |
| リポジトリ | mued_v2（メインリポ内） |

### 1.3 バリュープロポジション

1. **Measure（測定）:** 自分の脳の「取扱説明書（スペックシート）」を手に入れる
2. **Edit（編集）:** 自分専用の「外付け前頭葉（Hoo）」をプログラミングする
3. **Sync（同期）:** 最適化されたHooが、MUEDnoteでサポートする

### 1.4 ターゲットユーザー

| セグメント | 特徴 |
|-----------|------|
| **Core Creator** | 自身の思考プロセスに強いこだわりを持ち、既存のツールやAIに「遅さ」や「ズレ」を感じている層 |
| **Tech-Savvy** | "Fork" や "Config" といった概念を好み、自分だけの環境構築に喜びを感じる層 |
| **Self-Insight Seeker** | 自己理解に興味があり、心理テスト的なコンテンツを楽しめる層 |

### 1.5 MUEDエコシステム内の位置づけ

```
┌──────────────────────────────────────────────────────────┐
│                   MUED Ecosystem (mued.jp)                │
├──────────────────────────────────────────────────────────┤
│                                                           │
│   mued_v2/ (メインリポ - Next.js 15)                      │
│   ┌─────────────────────────────────────────────────┐    │
│   │ app/                                             │    │
│   │  ├── dashboard/       ダッシュボード              │    │
│   │  ├── lobe/            🆕 認知プロファイリング     │    │
│   │  │   ├── games/       7ゲーム測定                │    │
│   │  │   ├── results/     結果表示                   │    │
│   │  │   └── cortex/      Cortex Editor              │    │
│   │  └── ...                                         │    │
│   │                                                   │    │
│   │ components/features/lobe/  UIコンポーネント       │    │
│   │ lib/muedlobe/              ロジック               │    │
│   │ db/schema/                 DBスキーマ             │    │
│   └─────────────────────────────────────────────────┘    │
│                          │                                │
│                          ▼ API                            │
│                   ┌─────────────┐                         │
│                   │ MUEDnote   │  apps/ (別リポ)          │
│                   │ iOS App    │                          │
│                   │ (Hoo搭載)  │                          │
│                   └─────────────┘                         │
│                                                           │
│   ※ 認知プロファイルがHooの挙動を自動最適化              │
└──────────────────────────────────────────────────────────┘
```

### 1.6 設計思想

#### 目的の明確化

MUEDlobeの目的は「IQの正確な数値を出す」ことではなく、**Hooのプロンプティングに有効な認知プロファイル情報を取得する**こと。

#### 法的・倫理的境界

| やること | やらないこと |
|---------|-------------|
| 公開された認知課題をベースに設計 | WAISの直接模倣・商標使用 |
| 「認知スタイル」として提供 | 「IQ」「知能指数」の表示 |
| AI最適化データとして活用 | 臨床診断・医療的評価 |
| Hooの設定機能として展開 | 心理テストアプリとしての位置づけ |

---

## 2. システムアーキテクチャ

### 2.1 プラットフォーム構成

**mued_v2メインリポ内で完結:**

| Component | Technology | Role |
|-----------|------------|------|
| **Web (mued.jp)** | Next.js 15, React 19, TailwindCSS 4 | 認知測定、Cortex Editor、分析結果表示 |
| **Backend** | Next.js API Routes | API |
| **Database** | Neon PostgreSQL + Drizzle ORM | データ永続化 |
| **Auth** | Clerk | 認証 |
| **AI** | OpenAI | Hoo |
| **iOS App** | Swift (別リポ: apps/) | MUEDnote本体（Hooとの対話） |

※ 認知測定ゲームはWeb上で実行。iOS Appでは測定しない。

### 2.2 ディレクトリ構造

既存のmued_v2プロジェクト構造に準拠。`apps/`は別リポ（ネイティブアプリ専用）のため使用しない。

```
mued_v2/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 認証（既存）
│   ├── [locale]/                 # 多言語（既存）
│   ├── api/                      # APIルート（既存）
│   │   └── lobe/                 # 🆕 MUEDlobe API
│   │       ├── profile/route.ts      # 認知プロファイルCRUD
│   │       ├── measurement/route.ts  # 測定結果保存
│   │       └── hoo/route.ts          # Hoo設定取得
│   ├── dashboard/                # ダッシュボード（既存）
│   ├── payment/                  # 決済（既存）
│   └── lobe/                     # 🆕 mued.jp/lobe/
│       ├── page.tsx                  # 測定トップ
│       ├── layout.tsx                # Lobe専用レイアウト
│       ├── games/
│       │   ├── page.tsx              # ゲーム選択画面
│       │   ├── tone-sequence/page.tsx
│       │   ├── mental-math/page.tsx
│       │   ├── symbol-match/page.tsx
│       │   ├── code-fill/page.tsx
│       │   ├── word-bridge/page.tsx
│       │   ├── pattern-complete/page.tsx
│       │   └── focus-flow/page.tsx
│       ├── results/page.tsx          # 結果表示
│       └── cortex/
│           ├── page.tsx              # Cortex Editor
│           └── presets/page.tsx      # プリセット選択
│
├── components/                   # UIコンポーネント（既存構造に追加）
│   └── features/
│       └── lobe/                 # 🆕 MUEDlobe UIコンポーネント
│           ├── games/
│           │   ├── ToneSequence.tsx
│           │   ├── MentalMath.tsx
│           │   ├── SymbolMatch.tsx
│           │   ├── CodeFill.tsx
│           │   ├── WordBridge.tsx
│           │   ├── PatternComplete.tsx
│           │   └── FocusFlow.tsx
│           ├── CortexEditor/
│           │   ├── CortexEditor.tsx
│           │   ├── PresetSelector.tsx
│           │   ├── RawPromptEditor.tsx
│           │   └── SnippetInjector.tsx
│           ├── ProfileChart.tsx
│           └── PatternIndicator.tsx
│
├── lib/                          # コアロジック（既存構造に追加）
│   ├── muedear/                  # MUEDear（既存）
│   ├── muednote/                 # MUEDnote（既存）
│   └── muedlobe/                 # 🆕 MUEDlobe ロジック
│       ├── scoring/
│       │   ├── converter.ts          # スコア→プロンプトパラメータ変換
│       │   ├── patternDetector.ts    # 有意差パターン検出
│       │   ├── normalizer.ts         # スコア正規化
│       │   └── promptGenerator.ts    # Hooプロンプト生成
│       ├── games/
│       │   ├── toneSequence.ts       # ゲームロジック（音生成等）
│       │   ├── mentalMath.ts
│       │   ├── symbolMatch.ts
│       │   ├── codeFill.ts
│       │   ├── wordBridge.ts
│       │   ├── patternComplete.ts
│       │   └── focusFlow.ts
│       ├── constants.ts              # パターン定義、閾値等
│       └── types.ts                  # MUEDlobe型定義
│
├── db/                           # データベース（既存構造に追加）
│   └── schema/
│       ├── ...                       # 既存スキーマ
│       └── cognitive-profiles.ts     # 🆕 Drizzle スキーマ
│
├── types/                        # 型定義（既存構造に追加）
│   └── muedlobe.ts               # 🆕 MUEDlobe 共有型
│
└── tests/                        # テスト（既存構造に追加）
    └── muedlobe/                 # 🆕
        ├── scoring.test.ts
        ├── patternDetector.test.ts
        └── normalizer.test.ts
```

#### 既存パターンとの整合

| 区分 | muedear（既存） | muednote（既存） | muedlobe（🆕） |
|------|----------------|-----------------|---------------|
| ルート | `app/[locale]/muedear/` | `app/dashboard/` | `app/lobe/` |
| UI | `components/features/muedear-landing/` | `components/features/dashboard/` | `components/features/lobe/` |
| ロジック | `lib/muedear/` | `lib/muednote/` | `lib/muedlobe/` |
| DB | `db/schema/` | `db/schema/` | `db/schema/cognitive-profiles.ts` |

### 2.3 ユーザーフロー

```
1. MUEDnote Premium加入
   ↓
2. mued.jp/lobe/ にアクセス
   ↓
3. 「認知プロファイリング」を開始（18-22分）
   ├── WM-1: Tone Sequence
   ├── WM-2: Mental Math
   ├── PS-1: Symbol Match
   ├── PS-2: Code Fill
   ├── VC-1: Word Bridge
   ├── PR-1: Pattern Complete
   └── ATT-1: Focus Flow
   ↓
4. 結果表示 + パターン検出（mued.jp/lobe/results）
   ↓
5. Hooに自動反映
   ↓
6. （任意）Cortex Editorで微調整（mued.jp/lobe/cortex）
   ↓
7. MUEDnote iOS AppでHooを使用
```

### 2.4 認証フロー

```
[mued.jp (Next.js)]              [iOS App (別リポ)]
      │                                │
      ▼                                ▼
┌────────────────────────────────────────────┐
│              Clerk Auth                     │
│  - Magic Link (Email)                       │
│  - Apple Sign In                            │
│  - Session Sync across platforms            │
└────────────────────────────────────────────┘
```

---

## 3. データベーススキーマ

### 3.1 Tables（Drizzle ORM）

ファイル: `db/schema/cognitive-profiles.ts`

```typescript
import { pgTable, uuid, integer, jsonb, text, boolean, timestamp, decimal, uniqueIndex, index } from 'drizzle-orm/pg-core';

// ユーザーの認知プロファイル（v4.2: 5変数対応）
export const cognitiveProfiles = pgTable('cognitive_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),

  // Working Memory (0-100)
  wmScore: integer('wm_score'),
  wmRawData: jsonb('wm_raw_data'),       // { forward_span, backward_span, sequencing_span, mental_math_score }

  // Processing Speed (0-100)
  psScore: integer('ps_score'),
  psRawData: jsonb('ps_raw_data'),       // { symbol_match_score, code_fill_score }

  // Verbal Comprehension (0-100)
  vcScore: integer('vc_score'),
  vcRawData: jsonb('vc_raw_data'),       // { word_bridge_score, abstraction_levels }

  // Perceptual Reasoning (0-100)
  prScore: integer('pr_score'),
  prRawData: jsonb('pr_raw_data'),       // { pattern_complete_score, difficulty_breakdown }

  // Attention (0-100)
  attScore: integer('att_score'),
  attRawData: jsonb('att_raw_data'),     // { d_prime, rt_cv, hit_rate, false_alarm_rate }

  // Derived
  vcPrBalance: decimal('vc_pr_balance', { precision: 3, scale: 2 }),
  significantPatterns: text('significant_patterns').array(),
  promptParams: jsonb('prompt_params'),

  // Meta
  measuredAt: timestamp('measured_at', { withTimezone: true }).defaultNow(),
  version: integer('version').default(1),
}, (table) => ({
  userIdIdx: uniqueIndex('idx_cognitive_profiles_user_id').on(table.userId),
}));

// 測定履歴（トレンド分析用）
export const measurementHistory = pgTable('measurement_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  gameType: text('game_type').notNull(),
  rawData: jsonb('raw_data').notNull(),
  calculatedScore: jsonb('calculated_score'),
  measuredAt: timestamp('measured_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_measurement_history_user_id').on(table.userId),
  gameTypeIdx: index('idx_measurement_history_game_type').on(table.gameType),
}));

// Hooプロンプト設定
export const hooConfigurations = pgTable('hoo_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  presetName: text('preset_name'),
  customPrompt: text('custom_prompt'),
  variables: jsonb('variables').default({}),
  snippets: text('snippets').array(),
  specialInstructions: text('special_instructions').array(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex('idx_hoo_configurations_user_id').on(table.userId),
}));

// プロンプトプリセット（システム定義）
export const hooPresets = pgTable('hoo_presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  basePrompt: text('base_prompt').notNull(),
  targetPatterns: text('target_patterns').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 有意差パターン定義（システム定義）
export const patternDefinitions = pgTable('pattern_definitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  condition: jsonb('condition').notNull(),
  instructions: text('instructions').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

### 3.2 アクセス制御

Neon PostgreSQL + Clerk構成のため、Supabase RLSは使用しない。  
認可はNext.js API Route内でClerkの`auth()`によるuserIdチェックで実装。

```typescript
// app/api/lobe/profile/route.ts（例）
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { cognitiveProfiles } from '@/db/schema/cognitive-profiles';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const profile = await db.query.cognitiveProfiles.findFirst({
    where: eq(cognitiveProfiles.userId, userId),
  });

  return Response.json(profile);
}
```

---

## 4. 認知測定システム

### 4.1 測定変数（5種）

| # | 変数名 | 略称 | 測定目的 | Hooでの活用 | 学術的根拠 |
|---|--------|------|---------|-------------|-----------|
| 1 | ワーキングメモリ | WM | 情報保持・操作能力 | 情報量調整 | WAIS-IV WMI |
| 2 | 処理速度 | PS | 情報処理の速度 | ペース調整 | WAIS-IV PSI |
| 3 | 言語理解 | VC | 言語的抽象化能力 | モダリティ選択 | WAIS-IV VCI |
| 4 | 知覚推理 | PR | 視覚空間・パターン認識 | 抽象度・視覚化 | WAIS-IV PRI |
| 5 | 注意持続 | ATT | 持続的注意力 | 応答長調整 | CPT |

### 4.2 スコア体系

| 項目 | 値 |
|------|-----|
| 範囲 | 0-100（正規化スコア） |
| 平均 | 50 |
| 標準偏差 | 15 |
| 有意差閾値 | 15ポイント |

### 4.3 派生変数

| 変数名 | 算出方法 | 用途 |
|--------|---------|------|
| VC/PR バランス | (VC - PR) / 100 | モダリティ選択 |
| 有意差パターン | 2変数間の差 ≥ 15 | 特別考慮事項 |

### 4.4 スコア変換テーブル

#### WM → information_density, chunk_size

| wm_score | information_density | chunk_size | 説明 |
|----------|--------------------:|:-----------|------|
| 0-35 | low | small | 一度に1-2要素、頻繁に区切る |
| 36-65 | medium | medium | 標準的な情報量 |
| 66-100 | high | large | 複数要素を一度に、構造化OK |

#### PS → pacing, confirmation_frequency

| ps_score | pacing | confirmation_frequency | 説明 |
|----------|-------:|:-----------------------|------|
| 0-35 | slow | frequent | 処理時間確保、こまめに確認 |
| 36-65 | moderate | occasional | 標準ペース |
| 66-100 | fast | minimal | 素早い応答OK |

#### VC/PR balance → modality

| vc_pr_balance | modality | 説明 |
|---------------|:---------|------|
| -1.0 〜 -0.3 | visual | 図解・フロー優先 |
| -0.3 〜 +0.3 | balanced | テキスト+視覚を混合 |
| +0.3 〜 +1.0 | verbal | テキスト説明を詳細に |

#### PR → abstraction_level

| pr_score | abstraction_level | 説明 |
|----------|:------------------|------|
| 0-35 | concrete | 具体例を多用 |
| 36-65 | mixed | 抽象と具体を組み合わせ |
| 66-100 | abstract | 概念的説明OK |

#### ATT → response_length

| att_score | response_length | 説明 |
|-----------|:----------------|------|
| 0-35 | short | 短く区切る |
| 36-65 | moderate | 標準的な長さ |
| 66-100 | flexible | 必要に応じて長文OK |

### 4.5 有意差パターン

#### 2変数間パターン（12通り）

| パターン | 条件 | 推奨アプローチ |
|---------|------|---------------|
| high_wm_low_ps | WM - PS ≥ 15 | 構造的説明OK、単純反復は自動化提案、時間的プレッシャー回避 |
| low_wm_high_ps | PS - WM ≥ 15 | 情報を小分け、処理したらすぐ次へ、長い指示は分割 |
| high_wm_low_vc | WM - VC ≥ 15 | 非言語的説明を併用、図解優先、言語は簡潔に |
| low_wm_high_vc | VC - WM ≥ 15 | 言語的説明は有効だが短く、要点を繰り返し提示 |
| high_wm_low_pr | WM - PR ≥ 15 | テキストベース優先、図解は補助的に |
| low_wm_high_pr | PR - WM ≥ 15 | 視覚的構造で情報整理、一度に見せる量は制限 |
| high_ps_low_vc | PS - VC ≥ 15 | シンプルな言葉、視覚的手がかり併用 |
| low_ps_high_vc | VC - PS ≥ 15 | 詳細な言語説明OK、急かさない |
| high_ps_low_pr | PS - PR ≥ 15 | 明示的な手順説明、暗黙のパターンは言語化 |
| low_ps_high_pr | PR - PS ≥ 15 | 視覚的パターンで提示、処理時間を確保 |
| high_vc_low_pr | VC - PR ≥ 15 | テキスト説明を中心に、図は補助 |
| low_vc_high_pr | PR - VC ≥ 15 | 図解・フロー中心、テキストは最小限 |

#### 複合タイプ（5種）

| タイプ名 | 条件 | 推奨アプローチ |
|---------|------|---------------|
| **Architect** | 高WM, 低PS, 高PR | 全体像を先に、詳細は段階的、実行フェーズは支援 |
| **Performer** | 低WM, 高PS | 即座に行動可能な形で、長期計画は外部化 |
| **Theorist** | 高WM, 高VC, 低PR | 概念的説明、言語でのメタファー |
| **Visualizer** | 高PR, 低VC | 図解中心、言語は最小限 |
| **Balanced** | 全指標が15以内 | 特別な調整不要 |

#### ATT修飾効果

| ATT | 修飾効果 |
|-----|---------|
| 低ATT（≤35） | どのパターンでも応答を短く区切る |
| 高ATT（≥65） | 長い説明や深い議論もOK |

---

## 5. ゲーム詳細仕様

### 5.1 ゲーム構成一覧

| ID | ゲーム名 | 測定変数 | 所要時間 | 学術的根拠 |
|----|---------|---------|---------|-----------|
| WM-1 | Tone Sequence | WM | 3-4分 | WAIS Digit Span |
| WM-2 | Mental Math | WM | 2-3分 | WAIS Arithmetic |
| PS-1 | Symbol Match | PS | 2分 | WAIS Symbol Search |
| PS-2 | Code Fill | PS | 2分 | WAIS Coding/DSST |
| VC-1 | Word Bridge | VC | 3分 | WAIS Similarities |
| PR-1 | Pattern Complete | PR | 3分 | Raven's Matrices |
| ATT-1 | Focus Flow | ATT | 3-4分 | CPT |

**総所要時間: 約18-22分**

---

### 5.2 WM-1: Tone Sequence（音系列記憶）

#### 基本情報

| 項目 | 内容 |
|------|------|
| **測定変数** | WM（ワーキングメモリ） |
| **学術的根拠** | WAIS Digit Span |
| **所要時間** | 3-4分 |
| **MUEDテーマ** | 音楽的要素（音高） |

#### 3モード構成

| モード | タスク | 開始 | 最大 | 認知プロセス |
|--------|--------|------|------|-------------|
| **Forward** | 聴いた順に再現 | 3音 | 9音 | 短期記憶 |
| **Backward** | 逆順に再現 | 2音 | 8音 | WM操作 |
| **Sequencing** | 低→高の順に再現 | 2音 | 8音 | WM操作+並べ替え |

#### パラメータ

| パラメータ | 値 | 根拠 |
|-----------|-----|------|
| **音高セット** | C4, D4, E4, F4, G4, A4, B4, C5 | 1オクターブ、識別容易 |
| **音の長さ** | 500ms | 十分な認識時間 |
| **音間隔** | 500ms | Digit Spanの1秒を短縮 |
| **終了条件** | 同一長さで2試行連続失敗 | WAIS準拠 |
| **回答方式** | 鍵盤UI クリック | 運動速度の影響を排除 |

#### スコアリング

```typescript
function scoreToneSequence(forwardSpan: number, backwardSpan: number, sequencingSpan: number): number {
  const rawScore = (
    forwardSpan * 1.0 +
    backwardSpan * 1.2 +
    sequencingSpan * 1.3
  );
  return rawScore;
}
```

---

### 5.3 WM-2: Mental Math（メンタルマス）

#### 基本情報

| 項目 | 内容 |
|------|------|
| **測定変数** | WM（ワーキングメモリ） |
| **学術的根拠** | WAIS Arithmetic |
| **所要時間** | 2-3分 |
| **特徴** | 聴覚提示・暗算（紙なし） |

#### 課題構造

| レベル | 内容 | 例 | 制限時間 | 問題数 |
|--------|------|-----|---------|--------|
| 1 | 1桁の加減算 | 5 + 3 = ? | 10秒 | 3問 |
| 2 | 2桁の加減算 | 23 + 15 = ? | 15秒 | 3問 |
| 3 | 乗除算 | 6 × 7 = ? | 15秒 | 3問 |
| 4 | 複合演算 | 15 + 8 - 6 = ? | 20秒 | 3問 |
| 5 | 短い文章題 | りんご5個とみかん3個、合計は？ | 20秒 | 3問 |

**合計: 15問**

#### パラメータ

| パラメータ | 値 | 根拠 |
|-----------|-----|------|
| **提示方法** | 音声のみ（Web Speech API） | WM負荷を維持 |
| **繰り返し** | なし | WM測定の純粋性 |
| **回答方式** | 数字キーパッド | 運動速度排除 |

#### スコアリング

```typescript
interface MathResponse {
  correct: boolean;
  level: number;
  responseTime: number;
  timeLimit: number;
}

function scoreMentalMath(responses: MathResponse[]): number {
  const levelWeights: Record<number, number> = {1: 1.0, 2: 1.2, 3: 1.3, 4: 1.5, 5: 1.5};
  let totalScore = 0;
  
  for (const r of responses) {
    if (r.correct) {
      const base = levelWeights[r.level];
      const timeRatio = r.responseTime / r.timeLimit;
      const timeBonus = timeRatio <= 0.5 ? (0.5 - timeRatio) * 0.5 : 0;
      totalScore += base + timeBonus;
    }
  }
  
  return totalScore;
}
```

---

### 5.4 PS-1: Symbol Match（シンボルマッチ）

#### 基本情報

| 項目 | 内容 |
|------|------|
| **測定変数** | PS（処理速度） |
| **学術的根拠** | WAIS Symbol Search |
| **所要時間** | 2分（固定） |
| **特徴** | 視覚走査・弁別速度 |

#### 課題構造

```
ターゲット:  ◇  ☆
            ─────────
比較群:     △  ◇  ○  ✕  □

→ 「ある」か「ない」かを判定
```

- ターゲット記号: 2つ
- 比較群: 5つ
- ターゲット含有率: 50%
- 制限時間: 120秒

#### パラメータ

| パラメータ | 値 | 根拠 |
|-----------|-----|------|
| **記号セット** | 抽象図形20種（SVG） | 文字・数字を排除 |
| **色** | モノクロ | 色覚差を排除 |
| **制限時間** | 120秒 | WAIS準拠 |

#### スコアリング

```typescript
function scoreSymbolMatch(correct: number, incorrect: number): number {
  return correct - incorrect;
}
```

---

### 5.5 PS-2: Code Fill（コードフィル）

#### 基本情報

| 項目 | 内容 |
|------|------|
| **測定変数** | PS（処理速度） |
| **学術的根拠** | WAIS Coding / DSST |
| **所要時間** | 2分（固定） |
| **特徴** | 連合学習・視覚運動速度 |

#### 課題構造

```
対応表（常時表示）:
  1→◇  2→△  3→○  4→☆  5→✕
  6→□  7→⬡  8→◎  9→⬢

問題: 「5」が表示される → 「✕」をクリック
```

#### パラメータ

| パラメータ | 値 | 根拠 |
|-----------|-----|------|
| **対応ペア** | 9組（1-9） | WAIS準拠 |
| **対応表** | 常時表示 | 記憶負荷を排除 |
| **制限時間** | 120秒 | WAIS準拠 |

#### スコアリング

```typescript
function scoreCodeFill(correct: number, incorrect: number): number {
  return Math.max(0, correct - (incorrect * 0.5));
}
```

---

### 5.6 VC-1: Word Bridge（ワードブリッジ）

#### 基本情報

| 項目 | 内容 |
|------|------|
| **測定変数** | VC（言語理解） |
| **学術的根拠** | WAIS Similarities |
| **所要時間** | 3分 |
| **特徴** | 言語的抽象化・概念形成 |

#### 課題構造

2つの単語の共通点を4択から選ぶ。

| 抽象度 | 得点 | 例（ピアノ-ギター） |
|--------|------|---------------------|
| 高 | 2点 | 楽器 |
| 中 | 1点 | 音を出すもの |
| 低 | 0点 | 木でできている |

#### 問題セット（12問）

| # | 単語ペア | 2点回答 | 1点回答 |
|---|---------|--------|--------|
| 1 | ピアノ - ギター | 楽器 | 音を出す |
| 2 | 詩 - 彫刻 | 芸術作品 | 創作物 |
| 3 | 種 - 卵 | 生命の起源 | 成長するもの |
| 4 | 山 - 海 | 自然地形 | 大きい |
| 5 | 怒り - 喜び | 感情 | 人間の状態 |
| 6 | 時計 - カレンダー | 時間を示す道具 | 数字がある |
| 7 | 蝶 - 飛行機 | 飛ぶもの | 羽がある |
| 8 | 民主主義 - 独裁 | 政治体制 | 国の仕組み |
| 9 | 記憶 - 想像 | 心的機能 | 頭の中で起こる |
| 10 | 報酬 - 罰 | 行動の結果 | しつけの手段 |
| 11 | 始まり - 終わり | 時間的境界 | 対になる概念 |
| 12 | 敵 - 味方 | 関係性の分類 | 人間関係 |

#### スコアリング

```typescript
interface WordBridgeResponse {
  score: number; // 0, 1, or 2
}

function scoreWordBridge(responses: WordBridgeResponse[]): number {
  return responses.reduce((sum, r) => sum + r.score, 0); // 最大24点
}
```

---

### 5.7 PR-1: Pattern Complete（パターンコンプリート）

#### 基本情報

| 項目 | 内容 |
|------|------|
| **測定変数** | PR（知覚推理） |
| **学術的根拠** | Raven's Matrices |
| **所要時間** | 3分 |
| **特徴** | 非言語的抽象推論 |

#### 課題構造

3×3マトリクスの右下が欠損。6つの選択肢から正解を選ぶ。

#### パターンタイプ

| タイプ | 説明 | 難易度 | 問題数 |
|--------|------|--------|--------|
| **進行** | 形・数・サイズが順に変化 | 易 | 5問 |
| **加算/減算** | 行と列の要素が足し引き | 中 | 5問 |
| **論理演算** | AND/OR/XOR的な組み合わせ | 難 | 5問 |

**合計: 15問**

#### スコアリング

```typescript
interface PatternResponse {
  correct: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

function scorePatternComplete(responses: PatternResponse[]): number {
  const weights = { easy: 1.0, medium: 1.2, hard: 1.5 };
  return responses
    .filter(r => r.correct)
    .reduce((sum, r) => sum + weights[r.difficulty], 0); // 理論最大: 18.5
}
```

---

### 5.8 ATT-1: Focus Flow（フォーカスフロー）

#### 基本情報

| 項目 | 内容 |
|------|------|
| **測定変数** | ATT（注意持続） |
| **学術的根拠** | Continuous Performance Test |
| **所要時間** | 3-4分 |
| **特徴** | 持続的注意・反応抑制 |

#### 課題構造

- ターゲット（特定の音符）が出たらクリック
- 非ターゲットはクリックしない

#### パラメータ

| パラメータ | 値 | 根拠 |
|-----------|-----|------|
| **刺激表示時間** | 250ms | 標準CPT |
| **刺激間隔** | 1000ms | 適度なペース |
| **ターゲット率** | 20% | 注意を要求 |
| **総刺激数** | 約180個 | 3分間 |

#### 測定指標

| 指標 | 意味 |
|------|------|
| **Hit Rate** | 注意の正確性 |
| **False Alarm Rate** | 抑制制御 |
| **RT SD** | 注意の一貫性（主要） |
| **d'** | 信号検出感度 |

#### スコアリング

```typescript
function scoreFocusFlow(
  hits: number,
  misses: number,
  falseAlarms: number,
  correctRejections: number,
  reactionTimes: number[]
): { rawScore: number; dPrime: number; rtCv: number } {
  
  const hitRate = Math.max(0.01, Math.min(0.99, hits / (hits + misses)));
  const faRate = Math.max(0.01, Math.min(0.99, falseAlarms / (falseAlarms + correctRejections)));
  
  // d' calculation (using approximation)
  const zHit = normalInv(hitRate);
  const zFa = normalInv(faRate);
  const dPrime = zHit - zFa;
  
  // RT variability
  const rtMean = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
  const rtSd = Math.sqrt(
    reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - rtMean, 2), 0) / reactionTimes.length
  );
  const rtCv = rtSd / rtMean;
  
  const rawScore = dPrime * (1 - Math.min(rtCv, 1));
  
  return { rawScore, dPrime, rtCv };
}
```

---

## 6. Cortex Editor

### 6.1 Level 1: Auto-Tuning (All Premium Users)

測定パラメータに基づき、推奨プリセットを自動適用。

#### プリセット一覧

| プリセット | 対象パターン | 挙動 |
|-----------|-------------|------|
| **Scribe Mode** | high_wm_low_ps | ユーザーの断片的な発話を論理補完してログ化、文脈を長く保持、急かさない |
| **Navigator Mode** | low_wm_high_ps | ステップバイステップで指示出し、こまめに現状確認、タスクリスト形式 |
| **Architect Mode** | architect_type | 全体像を先に提示、詳細は段階的に展開、実行フェーズは外部支援を提案 |
| **Performer Mode** | performer_type | 即座に行動可能な形で提示、短いサイクルでフィードバック |
| **Theorist Mode** | theorist_type | 概念的・抽象的説明、言語的メタファーを活用 |
| **Visualizer Mode** | visualizer_type | 図解・フローチャート中心、言語説明は最小限 |

### 6.2 Level 2: Raw Prompt Editing (Premium Only)

Hooのベースプロンプトへの直接アクセス権を開放。

#### Features

- **Raw Editor:** `hoo_core_prompt.md` の直接編集
- **Dynamic Variables:**
  ```
  {{User.WM_Score}}              - WMスコア（0-100）
  {{User.PS_Score}}              - PSスコア（0-100）
  {{User.VC_Score}}              - VCスコア（0-100）
  {{User.PR_Score}}              - PRスコア（0-100）
  {{User.ATT_Score}}             - ATTスコア（0-100）
  {{User.Patterns}}              - 検出されたパターン配列
  {{User.InformationDensity}}    - 推奨情報密度
  {{User.Pacing}}                - 推奨ペース
  {{User.Modality}}              - 推奨モダリティ
  {{User.AbstractionLevel}}      - 推奨抽象度
  {{User.ResponseLength}}        - 推奨応答長
  ```
- **Snippet Injection:** 定型コードブロックをワンクリックで挿入
  - Spartan Mode（スパルタモード）
  - Counselor Mode（カウンセラーモード）
  - Silent Observer（サイレントモード）

### 6.3 UI: Cortex Editor Screen

```
┌─────────────────────────────────────────────────────────┐
│ Cortex Editor                              [Save] [Reset]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐  ┌────────────────────────────────┐│
│  │ Your Profile    │  │ Hoo Configuration              ││
│  │                 │  │                                ││
│  │ WM: ████████░░  │  │ [Preset ▼] Architect Mode     ││
│  │     Score: 85   │  │                                ││
│  │                 │  │ ┌────────────────────────────┐ ││
│  │ PS: █████░░░░░  │  │ │ # Base Prompt              │ ││
│  │     Score: 45   │  │ │                            │ ││
│  │                 │  │ │ You are Hoo, an AI...      │ ││
│  │ VC: ██████░░░░  │  │ │ User's WM: {{WM_Score}}    │ ││
│  │     Score: 55   │  │ │ ...                        │ ││
│  │                 │  │ │                            │ ││
│  │ PR: ███████░░░  │  │ └────────────────────────────┘ ││
│  │     Score: 70   │  │                                ││
│  │                 │  │ [+ Insert Snippet]            ││
│  │ ATT: ██████░░░░ │  │                                ││
│  │     Score: 60   │  │ Special Instructions:         ││
│  │                 │  │ ☑ high_wm_low_ps              ││
│  │ ───────────────│  │ ☑ architect_type              ││
│  │ Patterns:      │  │                                ││
│  │ • Architect    │  └────────────────────────────────┘│
│  │ • high_wm_low_ps│                                   │
│  └─────────────────┘                                   │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Preview: How Hoo will respond                       ││
│  │ ─────────────────────────────────────────────────── ││
│  │ 「全体像を先に提示します。複雑な構造は問題なく処理  ││
│  │  できますが、単純作業の繰り返しは自動化を提案します。││
│  │  詳細は段階的に展開していきます。」                ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 7. API設計

### 7.1 MUED Core API

MUEDnote iOS AppがHoo設定を取得するためのAPI。

#### Endpoints

```
GET /api/lobe/hoo
```

**Request Headers:**
```
Authorization: Bearer {clerk_session_token}
X-App-ID: muednote
```

**Response:**
```json
{
  "prompt": "# Hoo Configuration\n\nYou are Hoo...",
  "variables": {
    "wm_score": 85,
    "ps_score": 45,
    "vc_score": 55,
    "pr_score": 70,
    "att_score": 60,
    "information_density": "high",
    "pacing": "moderate",
    "modality": "balanced",
    "abstraction_level": "abstract",
    "response_length": "moderate"
  },
  "patterns": ["high_wm_low_ps", "architect_type"],
  "special_instructions": [
    "複雑な構造や多層的な情報は問題なく処理できる",
    "単純作業の繰り返しや時間的プレッシャーは避ける",
    "全体像と構造を先に提示",
    "詳細は段階的に展開"
  ],
  "active_snippets": ["scribe_mode"],
  "version": 4,
  "last_updated": "2026-01-29T10:00:00Z"
}
```

### 7.2 Integration in MUEDnote iOS App

```swift
// MUEDnote/Services/HooService.swift

struct HooConfiguration: Codable {
    let prompt: String
    let variables: HooVariables
    let patterns: [String]
    let specialInstructions: [String]
    let activeSnippets: [String]
    let version: Int
    let lastUpdated: Date
}

struct HooVariables: Codable {
    let wmScore: Int
    let psScore: Int
    let vcScore: Int
    let prScore: Int
    let attScore: Int
    let informationDensity: String
    let pacing: String
    let modality: String
    let abstractionLevel: String
    let responseLength: String
}

func fetchHooPrompt() async throws -> HooConfiguration {
    var request = URLRequest(url: URL(string: "https://mued.jp/api/lobe/hoo")!)
    request.addValue("Bearer \(clerkSessionToken)", forHTTPHeaderField: "Authorization")
    request.addValue("muednote", forHTTPHeaderField: "X-App-ID")
    
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(HooConfiguration.self, from: data)
}
```

---

## 8. ビジネスモデル

### 8.1 位置づけ

**MUEDlobeは単体製品ではなく、MUEDnote Premiumの機能として提供。**

| 項目 | 内容 |
|------|------|
| 単体販売 | なし |
| 対象プラン | MUEDnote Premium（¥2,980/月） |
| 利用制限 | Premium会員限定 |

### 8.2 MUEDnote プラン比較

| Feature | Free | Premium (¥2,980/月) |
|---------|------|---------------------|
| 制作ログ（基本） | ✓ | ✓ |
| Hoo（基本応答） | ✓ | ✓ |
| **認知プロファイリング** | ✗ | ✓ |
| **Cortex Editor** | ✗ | ✓ |
| **Hooカスタマイズ** | ✗ | ✓ |
| ログ履歴 | 7日 | 無制限 |
| エクスポート | ✗ | ✓ |

### 8.3 継続価値の設計

| タイミング | アクション |
|-----------|-----------|
| **初月** | 測定 → 「Hooに反映されました」→ 実際に使ってみる |
| **2週間後** | 「Hooとの相性はいかがですか？微調整しますか？」 |
| **1ヶ月後** | 「認知は変動します。再測定してみませんか？」 |
| **継続特典** | 3ヶ月継続で詳細レポートPDF解放など |

---

## 9. 開発ロードマップ

### 全体フロー（MUEDエコシステム）

| Phase | 内容 | 依存 | リリース形態 |
|-------|------|------|-------------|
| 0 | MUEDnote v1.0（休憩トラッカー・音声文字起こし） | - | AppStore審査 |
| 1 | MUEDnote v1.1.0（Hoo会話搭載） | Phase 0完了 | AppStore審査 |
| 2 | MUEDlobe Web実装（mued.jp/lobe/） | なし（並行可） | Vercelデプロイ |
| 3 | MUEDnote v1.2.0（HooがlobeプロファイルをAPI取得） | Phase 1 + 2 | AppStore審査 |

※ Phase 2（lobe）は他Phaseと独立して並行開発可能。認知テストは頻繁に受けるものではないためネイティブアプリ化は不要（WAISも通常1回で完結）。

### Phase 2 詳細: MUEDlobe Web実装 (3-4 weeks)

**Goal:** 認知プロファイリング機能のWeb実装 → Vercelデプロイ

- [ ] Drizzle スキーマ作成（`db/schema/cognitive-profiles.ts`）
- [ ] `app/lobe/` ルーティング作成
  - [ ] 測定トップページ（`page.tsx`）
  - [ ] 7ゲームの実装（`components/features/lobe/games/`）
    - [ ] WM-1: Tone Sequence（Web Audio API）
    - [ ] WM-2: Mental Math（Web Speech API）
    - [ ] PS-1: Symbol Match
    - [ ] PS-2: Code Fill
    - [ ] VC-1: Word Bridge
    - [ ] PR-1: Pattern Complete
    - [ ] ATT-1: Focus Flow
  - [ ] スコアリングロジック（`lib/muedlobe/scoring/`）
  - [ ] パターン検出ロジック（`lib/muedlobe/scoring/patternDetector.ts`）
  - [ ] 結果表示画面（`app/lobe/results/`）
- [ ] Cortex Editor 実装（`app/lobe/cortex/`）
  - [ ] プリセット選択
  - [ ] Raw Prompt Editing
  - [ ] プレビュー機能
- [ ] API Routes 実装（`app/api/lobe/`）
- [ ] UI/UXブラッシュアップ
- [ ] テスト（N=1検証）

### Phase 3 詳細: iOS連携 (1-2 weeks)

**前提:** MUEDnote v1.1.0（Hoo搭載）+ MUEDlobe Web 両方完了後

- [ ] MUEDnote iOS AppでHoo設定取得API連携（`GET /api/lobe/hoo`）
- [ ] 認知プロファイルに基づくHoo挙動変更
- [ ] Premium判定ロジック

---

## 10. 法的・倫理的考慮事項

### 10.1 Disclaimer

- **医療診断ではない**ことを利用規約・UI上で明記
- 「能力の優劣」ではなく「特性のタイプ」としてポジティブにフィードバック
- WAISとの直接比較は避け、独自の指標として説明
- 「IQ」「知能指数」という用語は使用しない
- 「心理テスト」ではなく「Hooの設定機能」として位置づけ

### 10.2 Data Privacy

- 認知スコアは機微な個人情報として扱う
- 第三者への販売・共有は行わない
- ユーザーはいつでもデータ削除可能
- GDPR/個人情報保護法への準拠

### 10.3 Safety

- プロンプト改変で機能不全に陥った場合の「Factory Reset」ボタン
- 破壊的な変更前の確認ダイアログ
- 変更履歴の保持（ロールバック可能）
- 極端なパラメータ設定への警告

---

## 11. 実装コード

### 11.1 スコア変換（TypeScript）

```typescript
interface Scores {
  wm: number;
  ps: number;
  vc: number;
  pr: number;
  att: number;
}

interface PromptParams {
  informationDensity: 'low' | 'medium' | 'high';
  chunkSize: 'small' | 'medium' | 'large';
  pacing: 'slow' | 'moderate' | 'fast';
  confirmationFrequency: 'frequent' | 'occasional' | 'minimal';
  modality: 'visual' | 'balanced' | 'verbal';
  abstractionLevel: 'concrete' | 'mixed' | 'abstract';
  responseLength: 'short' | 'moderate' | 'flexible';
}

function convertScoresToPromptParams(scores: Scores): PromptParams {
  const params: PromptParams = {} as PromptParams;
  
  // WM → informationDensity, chunkSize
  if (scores.wm <= 35) {
    params.informationDensity = 'low';
    params.chunkSize = 'small';
  } else if (scores.wm <= 65) {
    params.informationDensity = 'medium';
    params.chunkSize = 'medium';
  } else {
    params.informationDensity = 'high';
    params.chunkSize = 'large';
  }
  
  // PS → pacing, confirmationFrequency
  if (scores.ps <= 35) {
    params.pacing = 'slow';
    params.confirmationFrequency = 'frequent';
  } else if (scores.ps <= 65) {
    params.pacing = 'moderate';
    params.confirmationFrequency = 'occasional';
  } else {
    params.pacing = 'fast';
    params.confirmationFrequency = 'minimal';
  }
  
  // VC/PR balance → modality
  const balance = (scores.vc - scores.pr) / 100;
  if (balance < -0.3) {
    params.modality = 'visual';
  } else if (balance > 0.3) {
    params.modality = 'verbal';
  } else {
    params.modality = 'balanced';
  }
  
  // PR → abstractionLevel
  if (scores.pr <= 35) {
    params.abstractionLevel = 'concrete';
  } else if (scores.pr <= 65) {
    params.abstractionLevel = 'mixed';
  } else {
    params.abstractionLevel = 'abstract';
  }
  
  // ATT → responseLength
  if (scores.att <= 35) {
    params.responseLength = 'short';
  } else if (scores.att <= 65) {
    params.responseLength = 'moderate';
  } else {
    params.responseLength = 'flexible';
  }
  
  return params;
}
```

### 11.2 パターン検出（TypeScript）

```typescript
function detectSignificantPatterns(scores: Scores, threshold: number = 15): string[] {
  const patterns: string[] = [];
  
  // 2変数間の有意差
  const pairs: [keyof Scores, keyof Scores][] = [
    ['wm', 'ps'], ['wm', 'vc'], ['wm', 'pr'],
    ['ps', 'vc'], ['ps', 'pr'], ['vc', 'pr']
  ];
  
  for (const [a, b] of pairs) {
    const diff = scores[a] - scores[b];
    if (diff >= threshold) {
      patterns.push(`high_${a}_low_${b}`);
    } else if (diff <= -threshold) {
      patterns.push(`low_${a}_high_${b}`);
    }
  }
  
  // 複合パターン
  if (scores.wm >= 65 && scores.ps <= 50 && scores.pr >= 65) {
    patterns.push('architect_type');
  }
  if (scores.wm <= 40 && scores.ps >= 65) {
    patterns.push('performer_type');
  }
  if (scores.wm >= 65 && scores.vc >= 65 && scores.pr <= 50) {
    patterns.push('theorist_type');
  }
  if (scores.pr >= 65 && scores.vc <= 50) {
    patterns.push('visualizer_type');
  }
  
  // 均整型
  const allScores = [scores.wm, scores.ps, scores.vc, scores.pr];
  if (Math.max(...allScores) - Math.min(...allScores) < threshold) {
    patterns.push('balanced_type');
  }
  
  // ATT修飾
  if (scores.att <= 35) {
    patterns.push('low_attention_modifier');
  } else if (scores.att >= 65) {
    patterns.push('high_attention_modifier');
  }
  
  return patterns;
}
```

### 11.3 パターン別指示辞書（TypeScript）

```typescript
const PATTERN_INSTRUCTIONS: Record<string, string[]> = {
  high_wm_low_ps: [
    '複雑な構造や多層的な情報は問題なく処理できる',
    '単純作業の繰り返しや時間的プレッシャーは避ける',
    'ルーティンタスクは自動化・外部化を提案'
  ],
  low_wm_high_ps: [
    '情報は小分けにして順次提示',
    '長い指示は分割して一つずつ確認',
    '処理が終わったら次へ、戻る必要がない形で'
  ],
  high_wm_low_vc: [
    '図解や視覚的説明を優先',
    '言語的説明は簡潔に',
    '複雑な文構造は避ける'
  ],
  low_wm_high_vc: [
    '言語的説明は有効だが短く',
    '要点は繰り返し提示',
    '長い文章は避け、ポイントを明確に'
  ],
  high_wm_low_pr: [
    'テキストベースの説明を優先',
    '図解は補助的に使用',
    '空間的配置に意味を持たせない'
  ],
  low_wm_high_pr: [
    '視覚的構造で情報を整理',
    '一度に見せる量は制限',
    '図やフローで記憶を支援'
  ],
  high_ps_low_vc: [
    'シンプルな言葉を使用',
    '視覚的手がかりを併用',
    '長文説明は回避'
  ],
  low_ps_high_vc: [
    '詳細な言語説明OK',
    '読む時間・考える時間を確保',
    '急かさない'
  ],
  high_ps_low_pr: [
    '明示的な手順説明を使用',
    '暗黙のパターンは言語化',
    '視覚的推論に頼らない'
  ],
  low_ps_high_pr: [
    '視覚的パターンで提示',
    '処理時間を確保',
    '図解で直感的理解を促進'
  ],
  high_vc_low_pr: [
    'テキスト説明を中心に',
    '図は補助として使用',
    '言語的アナロジーが有効'
  ],
  low_vc_high_pr: [
    '図解・フロー中心',
    'テキストは最小限',
    '視覚的アナロジーを活用'
  ],
  architect_type: [
    '全体像と構造を先に提示',
    '詳細は段階的に展開',
    '実行フェーズは外部支援を提案'
  ],
  performer_type: [
    '即座に行動可能な形で提示',
    '長期計画は外部化ツールを推奨',
    '短いサイクルでフィードバック'
  ],
  theorist_type: [
    '概念的・抽象的説明が有効',
    '言語的メタファーを活用',
    '視覚は補助的に'
  ],
  visualizer_type: [
    '図解・フローチャート中心',
    '言語説明は最小限に',
    '空間的構造で情報整理'
  ],
  balanced_type: [
    '特別な調整は不要',
    '標準的なアプローチで対応'
  ],
  low_attention_modifier: [
    '応答は短く区切る',
    '長時間の集中を前提としない',
    '定期的に要点をリマインド'
  ],
  high_attention_modifier: [
    '長い説明や深い議論もOK',
    '詳細な展開が可能'
  ]
};
```

### 11.4 プロンプト生成（TypeScript）

```typescript
function generateHooPrompt(scores: Scores): string {
  const params = convertScoresToPromptParams(scores);
  const patterns = detectSignificantPatterns(scores);
  
  // 特別指示を収集
  let instructions: string[] = [];
  for (const pattern of patterns) {
    if (PATTERN_INSTRUCTIONS[pattern]) {
      instructions.push(...PATTERN_INSTRUCTIONS[pattern]);
    }
  }
  // 重複削除
  instructions = [...new Set(instructions)];
  
  let prompt = `## ユーザーの認知プロファイル

### 基本パラメータ
- 情報密度: ${params.informationDensity}
- チャンクサイズ: ${params.chunkSize}
- 処理ペース: ${params.pacing}
- 確認頻度: ${params.confirmationFrequency}
- モダリティ: ${params.modality}
- 抽象度: ${params.abstractionLevel}
- 応答長: ${params.responseLength}

### 特別考慮事項
`;
  
  if (instructions.length > 0) {
    for (const inst of instructions) {
      prompt += `- ${inst}\n`;
    }
  } else {
    prompt += '- 特別な調整は不要\n';
  }
  
  return prompt;
}
```

### 11.5 スコア正規化（TypeScript）

```typescript
function normalizeTo0To100(rawScore: number, mean: number, sd: number): number {
  const z = (rawScore - mean) / sd;
  const normalized = 50 + (z * 15);
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

interface GameResults {
  wm1: { raw: number };
  wm2: { raw: number };
  ps1: { raw: number };
  ps2: { raw: number };
  vc1: { raw: number };
  pr1: { raw: number };
  att1: { raw: number };
}

interface Norms {
  wm: { mean: number; sd: number };
  ps: { mean: number; sd: number };
  vc: { mean: number; sd: number };
  pr: { mean: number; sd: number };
  att: { mean: number; sd: number };
}

function calculateFinalScores(gameResults: GameResults, norms: Norms): Scores {
  // WM: WM-1とWM-2の加重平均
  const wmRaw = gameResults.wm1.raw * 0.6 + gameResults.wm2.raw * 0.4;
  
  // PS: PS-1とPS-2の平均
  const psRaw = gameResults.ps1.raw * 0.5 + gameResults.ps2.raw * 0.5;
  
  // VC, PR, ATT: 単一ゲーム
  const vcRaw = gameResults.vc1.raw;
  const prRaw = gameResults.pr1.raw;
  const attRaw = gameResults.att1.raw;
  
  return {
    wm: normalizeTo0To100(wmRaw, norms.wm.mean, norms.wm.sd),
    ps: normalizeTo0To100(psRaw, norms.ps.mean, norms.ps.sd),
    vc: normalizeTo0To100(vcRaw, norms.vc.mean, norms.vc.sd),
    pr: normalizeTo0To100(prRaw, norms.pr.mean, norms.pr.sd),
    att: normalizeTo0To100(attRaw, norms.att.mean, norms.att.sd)
  };
}
```

---

## Appendix: Sample Hoo Prompt Template

```markdown
# Hoo Core Configuration v4.2

## User Cognitive Profile
- Working Memory Score: {{User.WM_Score}}
- Processing Speed Score: {{User.PS_Score}}
- Verbal Comprehension Score: {{User.VC_Score}}
- Perceptual Reasoning Score: {{User.PR_Score}}
- Attention Score: {{User.ATT_Score}}

## Prompt Parameters
- Information Density: {{User.InformationDensity}}
- Chunk Size: {{User.ChunkSize}}
- Pacing: {{User.Pacing}}
- Confirmation Frequency: {{User.ConfirmationFrequency}}
- Modality: {{User.Modality}}
- Abstraction Level: {{User.AbstractionLevel}}
- Response Length: {{User.ResponseLength}}

## Detected Patterns
{{#each User.Patterns}}
- {{this}}
{{/each}}

## Behavioral Instructions

{{#if (includes User.Patterns "high_wm_low_ps")}}
### High WM / Low PS Pattern
- Complex structures and multi-layered information can be processed without issue
- Avoid repetitive simple tasks and time pressure
- Proactively suggest automation for routine tasks
{{/if}}

{{#if (includes User.Patterns "architect_type")}}
### Architect Type
- Present the big picture and structure first
- Expand details gradually
- Suggest external support for execution phases
{{/if}}

{{#if (includes User.Patterns "low_attention_modifier")}}
### Low Attention Modifier
- Keep responses short and segmented
- Don't assume long periods of concentration
- Remind key points periodically
{{/if}}

## Active Snippets
{{#each User.ActiveSnippets}}
{{> this}}
{{/each}}
```

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2026/01/27 | 1.0 | 初版（3ゲーム、3変数、70-145スケール） |
| 2026/01/29 | 2.0 | WAIS-IV準拠の12ゲーム構成に拡張 |
| 2026/01/29 | 3.0 | Hoo最適化目的に再設計、7ゲーム、変換ロジック、有意差パターン |
| 2026/01/29 | 4.0 | v1とv3の統合版、全セクション網羅、DBスキーマ更新 |
| 2026/01/29 | 4.1 | Web完結版に変更、iOSアプリ削除、MUEDnote Premium機能として位置づけ |
| 2026/02/03 | 4.2 | **mued_v2メインリポ準拠に変更**、Drizzle ORM化、Clerk認証、`apps/`は別リポのため不使用、`app/lobe/` + `lib/muedlobe/` + `components/features/lobe/` 構成に確定、ロードマップをMUEDnote依存チェーン（v1.0→v1.1 Hoo→lobe→v1.2連携）に修正 |

---

*このドキュメントはMUEDlobe（認知プロファイリング機能）の完全設計仕様書です。*
*Claude Codeへの入力として最適化されています。*

# MUED LP構造リファクタリング計画

**作成日**: 2026-01-27
**ステータス**: レビュー待ち

---

## 1. 概要

### 現状
- `mued.jp/` がMUEDnoteのLPとして機能
- MUEDearは専用ページなし
- 将来のアプリ追加に対応できない構造

### 目標構造
```
mued.jp/              → 親LP（MUEDプラットフォーム）
mued.jp/muednote      → MUEDnote専用LP
mued.jp/muedear       → MUEDear専用LP
mued.jp/[future-app]  → 将来のアプリ
```

### プロダクト特性比較

| 項目 | MUEDnote | MUEDear |
|------|----------|---------|
| **認証** | Clerk連携 | なし |
| **収益モデル** | サブスク（Free/Basic/Premium） | 広告（1日5ゲーム無料） |
| **ユーザー行動** | 受動的（置いておく） | 能動的（ゲームをプレイ） |
| **価値提案** | 「制作のおともに」 | 「耳を鍛える」 |
| **CTA** | サインアップ → ダッシュボード → アプリDL | 直接App Store/Google Play |

---

## 2. 親LP設計（mued.jp/）

### 目的
**「MUED = 音楽制作者のための小さなツール群」** というブランド訴求

### 構成

```
┌─────────────────────────────────────────────────────────┐
│ Header: ロゴ + LocaleSwitcher                           │
├─────────────────────────────────────────────────────────┤
│ Hero Section                                            │
│ ・ブランドメッセージ                                     │
│ ・「音楽をつくる人のための、小さなツールたち」            │
│ ・Hooマスコット（共通キャラクター）                      │
├─────────────────────────────────────────────────────────┤
│ Products Grid                                           │
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │   MUEDnote      │ │   MUEDear       │                │
│ │ 「制作のおとも」 │ │ 「耳を鍛える」   │                │
│ │   iOS App       │ │   iOS/Android   │                │
│ │  → 詳しく見る   │ │  → 詳しく見る   │                │
│ └─────────────────┘ └─────────────────┘                │
├─────────────────────────────────────────────────────────┤
│ Philosophy Section                                      │
│ ・MUEDの考え方（制作時間を尊重する設計）                 │
│ ・共通の価値観                                          │
├─────────────────────────────────────────────────────────┤
│ Coming Soon Section（オプション）                        │
│ ・将来のアプリ予告                                      │
├─────────────────────────────────────────────────────────┤
│ Footer                                                  │
│ ・プライバシーポリシー、特商法、サポート                 │
│ ・© 2026 MUED                                           │
└─────────────────────────────────────────────────────────┘
```

### Hero Section コピー案

**日本語:**
```
ヘッドライン: 音楽をつくる人のための、小さなツールたち
サブヘッド: MUEDは、音楽制作者の日常をちょっとだけ良くするアプリを作っています。
```

**英語:**
```
Headline: Small tools for music makers
Subhead: MUED builds apps that make your music production life a little better.
```

### 心理学原則の適用

| 要素 | 適用効果 | 実装 |
|------|---------|------|
| Hero | フレーミング効果 | 「小さなツール」= 気軽に試せる |
| Products Grid | ヒックの法則 | 2-3個の明確な選択肢 |
| Philosophy | 単純接触効果 | 一貫したHooキャラクター |

---

## 3. MUEDnote専用LP設計（mued.jp/muednote）

### 目的
**認証連携・サブスクモデル向けの完全なLP**

### 構成

現在の `mued.jp/` の内容をほぼそのまま移行：

```
┌─────────────────────────────────────────────────────────┐
│ Header: ロゴ（mued.jpへリンク） + LocaleSwitcher         │
├─────────────────────────────────────────────────────────┤
│ Hero Section                                            │
│ ・「制作のそばに、いつもHoo。」                          │
│ ・Hooアニメーション                                     │
│ ・CTA: 「無料でHooと始める」→ /sign-up                  │
├─────────────────────────────────────────────────────────┤
│ Philosophy Section                                      │
│ ・Hooができること（休憩、音反応、音声メモ）              │
├─────────────────────────────────────────────────────────┤
│ App Section                                             │
│ ・ポケットの中のHoo                                     │
│ ・iOS App紹介                                           │
├─────────────────────────────────────────────────────────┤
│ Growth Preview Section                                  │
│ ・DAWログ連携（開発中）                                 │
│ ・Hooとの会話（開発中）                                 │
├─────────────────────────────────────────────────────────┤
│ Pricing Section（新規追加）                              │
│ ・Free / Basic / Premium                                │
│ ・アンカー効果: Premiumを目立たせ、Basicを「おすすめ」   │
├─────────────────────────────────────────────────────────┤
│ Social Proof Section                                    │
│ ・開発者メッセージ                                      │
├─────────────────────────────────────────────────────────┤
│ CTA Section                                             │
│ ・「Hooと一緒に、制作を始めよう。」                      │
├─────────────────────────────────────────────────────────┤
│ Footer                                                  │
└─────────────────────────────────────────────────────────┘
```

### コンバージョンパス

```
LP訪問 → 「無料で始める」→ サインアップ → ダッシュボード → アプリダウンロード
```

### CRO最適化ポイント

1. **Hero CTA**: 「無料で」を明示（損失回避の逆用）
2. **Pricing Section**: アンカー効果でBasicを魅力的に
3. **Social Proof**: 利用者数が増えたら追加

---

## 4. MUEDear専用LP設計（mued.jp/muedear）

### 目的
**広告モデル・認証なし向けの完全なLP**

### 構成（ドキュメントに基づく）

```
┌─────────────────────────────────────────────────────────┐
│ Header: ロゴ（mued.jpへリンク） + LocaleSwitcher         │
├─────────────────────────────────────────────────────────┤
│ Hero Section                                            │
│ ・「制作しながら、耳を育てる」                          │
│ ・App Store / Google Play バッジ                        │
│ ・デバイスモックアップ                                  │
├─────────────────────────────────────────────────────────┤
│ Games Section                                           │
│ ・5つのゲーム紹介（カード形式）                         │
│ ・MuFreQ / MuComp / MuRush / MuVerb / MuPan             │
│ ・各ゲームにアクセントカラー                            │
├─────────────────────────────────────────────────────────┤
│ Features Section                                        │
│ ・リアルタイムDSP処理                                   │
│ ・実機エミュレーション（1176, LA-2A, SSL, Fairchild）   │
│ ・コンボリューションリバーブ                            │
├─────────────────────────────────────────────────────────┤
│ Target Audience Section                                 │
│ ・宅録ミュージシャン・DTMer                              │
│ ・音楽専門学校生                                        │
│ ・プロエンジニア                                        │
├─────────────────────────────────────────────────────────┤
│ Business Model Section                                  │
│ ・「無料で遊べる。制作時間を尊重する設計。」            │
│ ・1日5ゲーム無料                                        │
│ ・Anti-Addiction設計                                    │
├─────────────────────────────────────────────────────────┤
│ Mascot Section                                          │
│ ・Hooに会おう                                           │
│ ・フクロウの理由                                        │
├─────────────────────────────────────────────────────────┤
│ FAQ Section                                             │
│ ・よくある質問（8項目）                                 │
├─────────────────────────────────────────────────────────┤
│ CTA Section                                             │
│ ・「今日からトレーニングを始めよう」                    │
│ ・App Store / Google Play バッジ                        │
├─────────────────────────────────────────────────────────┤
│ Footer                                                  │
└─────────────────────────────────────────────────────────┘
```

### コンバージョンパス

```
LP訪問 → App Store/Google Play → ダウンロード → 即プレイ
（認証なし、シンプルなパス）
```

### カラーパレット（ドキュメントより）

| 要素 | カラーコード |
|------|-------------|
| 背景 | `#1A1A2E` |
| MuFreQ | `#F5A623`（オレンジ） |
| MuComp | `#7D9B76`（セージグリーン） |
| MuRush | `#EF4444`（レッド） |
| MuVerb | `#3B82F6`（ブルー） |
| MuPan | `#8B5CF6`（パープル） |

### CRO最適化ポイント

1. **Hero**: App Storeバッジを目立たせる（直接DLが目標）
2. **Games Section**: ヒックの法則 → 5つは多め → タブ or スクロールカード
3. **Business Model**: 「なぜ制限があるか」を先回りで説明（異論処理）
4. **FAQ**: 懸念を払拭（「本当に無料？」「他と何が違う？」）

### 心理学原則の適用

| セクション | 効果 | 実装 |
|-----------|------|------|
| Hero | フレーミング効果 | 「制作しながら」=制作時間を奪わない |
| Games | 段階的開示 | ゲームを1つずつ紹介 |
| Features | 権威バイアス | 「1176」「LA-2A」などプロ機材名 |
| Business Model | 損失回避の逆用 | 制限を「ユーザーのため」と説明 |
| FAQ | 異論処理 | 「なぜ制限？」を先回り回答 |

---

## 5. 技術的実装計画

### ファイル構造

```
app/
├── [locale]/
│   ├── page.tsx                    # 親LP（新規作成）
│   ├── muednote/
│   │   └── page.tsx                # MUEDnote LP（移行）
│   └── muedear/
│       └── page.tsx                # MUEDear LP（新規作成）

components/features/
├── landing/                        # 現在のMUEDnote LP用
├── landing-parent/                 # 親LP用（新規）
│   ├── hero-section.tsx
│   ├── products-grid.tsx
│   └── philosophy-section.tsx
└── landing-muedear/                # MUEDear LP用（新規）
    ├── hero-section.tsx
    ├── games-section.tsx
    ├── features-section.tsx
    ├── target-audience-section.tsx
    ├── business-model-section.tsx
    ├── mascot-section.tsx
    ├── faq-section.tsx
    └── cta-section.tsx

messages/
├── ja.json                         # 親LP + MUEDnote用を分離
├── en.json
├── muedear/
│   ├── ja.json                     # MUEDear用（新規）
│   └── en.json
```

### 翻訳キー構造

```json
// messages/ja.json（親LP）
{
  "landing": {
    "parent": {
      "hero": { ... },
      "products": { ... },
      "philosophy": { ... }
    }
  }
}

// messages/muedear/ja.json
{
  "landing": {
    "hero": { ... },
    "games": { ... },
    "features": { ... },
    ...
  }
}
```

---

## 6. 実装フェーズ

### Phase 1: MUEDear LP作成（今回）

**タスク:**
1. `/[locale]/muedear/page.tsx` 作成
2. `components/features/landing-muedear/` コンポーネント群作成
3. `messages/muedear/ja.json`, `messages/muedear/en.json` 作成
4. ドキュメントのコンテンツを翻訳ファイルに反映

**成果物:**
- 完全なMUEDear専用LP

### Phase 2: 親LP作成（次回）

**タスク:**
1. 現在の `/[locale]/page.tsx` を `/[locale]/muednote/page.tsx` に移行
2. `/[locale]/page.tsx` を親LP用に書き換え
3. `components/features/landing-parent/` コンポーネント作成
4. 翻訳ファイル更新

**成果物:**
- 親LP + MUEDnote専用LP

### Phase 3: リダイレクト・SEO（後日）

**タスク:**
1. 既存ユーザー向けリダイレクト検討
2. OGP・メタタグ設定
3. サイトマップ更新

---

## 7. 成功指標

### 親LP
- 各プロダクトLPへの遷移率
- 直帰率

### MUEDnote LP
- サインアップ率（現状比較）
- ダッシュボード到達率

### MUEDear LP
- App Store/Google Play遷移率
- ページ滞在時間

---

## 8. 次のアクション

1. [ ] このプランのレビュー・承認
2. [ ] Phase 1（MUEDear LP）の実装開始
3. [ ] MUEDear審査完了後にLP公開

---

*計画作成: 2026-01-27*
*使用スキル: marketing-audit, lp-optimizer, ux-psychology, pricing-strategy*

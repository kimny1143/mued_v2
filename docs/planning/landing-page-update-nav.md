# ランディングページ更新ナビゲート文書

> MUEDnote 1.0.0 & MUEDear 0.9.0 審査通過に伴う更新

---

## 承認済みアプリ

| アプリ | バージョン | App Store URL |
|-------|-----------|---------------|
| MUEDnote | 1.0.0 | https://apps.apple.com/app/muednote/id6758751227 |
| MUEDear | 0.9.0 | https://apps.apple.com/app/muedear/id6758307988 |

---

## 1. App Store URL の修正

### MUEDnote — URL が変わっている

**現在のコード:**
```
lib/muednote/constants.ts → MUEDNOTE_APP_STORE_URL
= "https://apps.apple.com/app/muednote/id6740195437"  ← 旧ID
```

**修正後:**
```
= "https://apps.apple.com/app/muednote/id6758751227"  ← 新ID
```

> MUEDear の URL (`id6758307988`) は変更なし。

### 影響ファイル
- `lib/muednote/constants.ts` — URL 定数
- この定数を参照している全コンポーネントに自動反映

---

## 2. MUEDear: MuHorse ゲーム追加

### 2a. 翻訳ファイル（en.json / ja.json）

**ファイル:** `messages/en.json`, `messages/ja.json`

**現在のゲームリスト（`muedear.games`）:**
1. MuFreQ (EQ) ★☆☆
2. MuComp (Dynamics) ★☆☆
3. MuRush (EQ) ★★☆
4. MuVerb (Space) ★★☆
5. MuPan (Space) ★★☆

**追加すべき:**
6. **MuHorse** (Dynamics) ★★☆ — 「Match the compression across 5 classic types: FET 1176, VCA 33609, Tube 670, Opto LA-2A, Simple」

### 2b. ゲームセレクターUI（Hero Section）

**ファイル:** `components/features/muedear-landing/muedear-hero-section.tsx`

- 現在 5 ゲームのサムネイル表示
- MuHorse 用のサムネイル画像を追加
- 画像パス: `public/images/muedear/muhorse.png`（要作成）

### 2c. ゲームカラー定義

**ファイル:** `lib/muedear/constants.ts`

現在のカラー定義:
- mufreq: orange
- mucomp: sage green
- murush: red
- muverb: blue
- mupan: purple

**追加:** muhorse 用カラー（例: `red` — FET 1176 のアイコン色に合わせて）

---

## 3. MUEDnote: 1.0.0 初リリース反映

### 3a. ヒーローセクション

**ファイル:** `components/features/landing/hero-section.tsx`

- 「Coming Soon」等の表現があれば「Available Now」に変更
- App Store ボタンが有効リンクになっているか確認

### 3b. 翻訳ファイル

**ファイル:** `messages/en.json`, `messages/ja.json`

- `landing.hero`, `landing.philosophy`, `landing.growth` セクション確認
- 「in development」「planned」等の表現を「available」に更新

### 3c. Social Proof セクション

**ファイル:** `components/features/landing/social-proof-section.tsx`

- App Store バッジが正しい URL を使用しているか確認

---

## 4. 統合ランディングページ全体

### ファイル構成

```
components/features/landing/
├── integrated-landing-content.tsx  ← メイン統合ページ
├── brand-hero-section.tsx          ← ブランドヒーロー
├── hero-section.tsx                ← MUEDnote ヒーロー
├── philosophy-section.tsx          ← MUEDnote 機能
├── growth-preview-section.tsx      ← 開発中機能
├── social-proof-section.tsx        ← App Store バッジ
├── meet-hoo-section.tsx            ← ブリッジ
├── developer-story-section.tsx     ← 開発者ストーリー
└── parallax-background.tsx

components/features/muedear-landing/
├── muedear-landing-content.tsx     ← MUEDear 専用ページ
├── muedear-hero-section.tsx        ← ゲームセレクター
├── muedear-features-section.tsx    ← DSP 機能
├── muedear-audience-section.tsx    ← ターゲット
├── muedear-pricing-section.tsx     ← 料金
├── muedear-mascot-section.tsx      ← Hoo マスコット
├── muedear-faq-section.tsx         ← FAQ
└── muedear-cta-section.tsx         ← 最終 CTA
```

### ページ構成順序（統合版）

1. Brand Hero → 2. MUEDear → 3. Meet Hoo → 4. MUEDlobe → 5. MUEDnote → 6. Social Proof → 7. Developer Story → 8. Final CTA

---

## 5. 画像アセット

### 要作成

| 画像 | 配置先 | サイズ目安 |
|------|--------|-----------|
| MuHorse ゲーム画面 | `public/images/muedear/muhorse.png` | 既存ゲーム画像に合わせる |

### 既存（確認のみ）

| 画像 | パス |
|------|------|
| MuFreQ | `public/images/muedear/mufreq.png` |
| MuComp 設定 | `public/images/muedear/mucomp-settings.png` |
| MuComp 選択 | `public/images/muedear/mucomp-select.png` |
| MuVerb | `public/images/muedear/muverb.png` |
| MuPan | `public/images/muedear/mupan.png` |

---

## 6. i18n 注意事項

| 項目 | 値 |
|------|-----|
| 対応言語 | `en`, `ja` |
| 翻訳ファイル | `messages/en.json`, `messages/ja.json` |
| ルーティング | `next-intl` サブパス (`/en`, `/ja`) |
| デフォルト | `en` |

**両言語で同時更新すること。**

---

## 7. 定数ファイル一覧

| ファイル | 内容 |
|---------|------|
| `lib/muednote/constants.ts` | MUEDnote App Store URL（**要修正**） |
| `lib/muedear/constants.ts` | MUEDear App Store URL + ゲームカラー |
| `lib/i18n/config.ts` | ロケール設定 |

---

## 8. チェックリスト

- [ ] MUEDnote App Store URL を新 ID（`id6758751227`）に修正
- [ ] MUEDnote ヒーロー: 「リリース済み」表現に更新
- [ ] MUEDear: MuHorse ゲームを翻訳ファイル（en/ja）に追加
- [ ] MUEDear: ゲームセレクター UI に MuHorse 追加
- [ ] MUEDear: MuHorse 用サムネイル画像作成・配置
- [ ] MUEDear: ゲームカラー定数に muhorse 追加
- [ ] 両 App Store リンクの動作確認
- [ ] `npm run build` でビルドエラーなし
- [ ] `/en` と `/ja` 両方で表示確認
- [ ] デプロイ

---

*作成日: 2026-02-24*

# LP簡素化計画: 2つの無料アプリに集中

**作成日**: 2026-02-24
**ステータス**: 承認済み・実装待ち

---

## 1. 背景

### なぜ簡素化するのか

MUEDnote 1.0.0 と MUEDear 0.9.0 が App Store 審査を通過した。
しかし、LP（ランディングページ）は3プロダクト + ダッシュボード + サブスクを一度に見せる構造であり、実態と乖離している。

**主な乖離:**

| 問題 | 現状LP | 実態 |
|------|--------|------|
| MUEDnote CTA | 「ログイン」がメイン | iOSアプリはログインなし無料 |
| Growth Preview | Hoo Chat「In Development」 | ダッシュボードでは実装済み |
| Growth Preview | DAWログ「In Development」 | モバイルAPI実装済み（UIは未公開） |
| MUEDlobe | LP上で「v0.8 Pilot」として公開 | 認証必須・ダッシュボード連携前提 |
| サブスクプラン | ダッシュボード内で公開 | iOSアプリと無関係 |

### 戦略的判断

- iOSアプリのログイン廃止はApp Review通過のための対症療法
- 本来のビジョン（Whisper文字起こし→DAWログ→LLM分析→Hoo会話）は維持
- ただし、AI進化（MCP経由でのサービス消費）によりWeb UIの価値が変容する可能性
- **サブスクモデル・ダッシュボードの方向性は戦略議論の後に決定する**
- 当面はリリース済みの2つの無料アプリの訴求に集中

---

## 2. 変更方針

### 原則

- **コードは削除しない** — コメントアウトまたは条件分岐で非表示
- **ルートは維持** — `/dashboard`, `/lobe` は既存ユーザー向けに稼働継続
- **コンポーネントは保持** — 戦略決定後に復活可能な状態にする

---

## 3. LP変更の詳細

### 3.1 非表示にするもの

| セクション | コンポーネント | 理由 |
|-----------|---------------|------|
| MUEDlobe Hero | `muedlobe-hero-section.tsx` | 認証必須・ダッシュボード連携前提 |
| MUEDlobe Overview | `muedlobe-overview-section.tsx` | 同上 |
| Meet Hoo ブリッジ | `meet-hoo-section.tsx` | MUEDlobe への橋渡し用で不要に |
| MUEDnote Growth Preview | `growth-preview-section.tsx` | ダッシュボード機能の予告は時期尚早 |
| Brand Hero MUEDlobe導線 | `brand-hero-section.tsx` 内 | MUEDlobeへのリンク |
| Floating Nav MUEDlobe | `integrated-landing-content.tsx` 内 | MUEDlobeアイコン |
| Final CTA MUEDlobe | `integrated-landing-content.tsx` 内 | MUEDlobeボタン |
| MUEDnote Hero ログインボタン | `hero-section.tsx` 内 | App Store のみに |

### 3.2 残すもの

| セクション | コンポーネント | 状態 |
|-----------|---------------|------|
| Brand Hero | `brand-hero-section.tsx` | MUEDear + MUEDnote の2導線に変更 |
| MUEDear 全セクション | `muedear-landing/` 全体 | 変更なし |
| MUEDnote Hero | `hero-section.tsx` | App Store CTA のみ（ログイン削除） |
| MUEDnote Philosophy | `philosophy-section.tsx` | アプリ機能紹介として残す |
| Social Proof | `social-proof-section.tsx` | 変更なし |
| Developer Story | `developer-story-section.tsx` | 変更なし |
| Final CTA | `integrated-landing-content.tsx` | MUEDear + MUEDnote の2ボタンに |
| Footer | `integrated-landing-content.tsx` | 変更なし |

### 3.3 セクション順序（変更後）

```
1. Brand Hero（MUED紹介 → MUEDear / MUEDnote への導線）
2. #muedear — MUEDear Hero + Features + Audience + Pricing + Mascot + FAQ + CTA
3. #muednote — MUEDnote Hero + Philosophy
4. Social Proof
5. Developer Story
6. Final CTA（App Store × 2）
7. Footer
```

### 3.4 セクションナビゲーション更新

| ナビ位置 | 変更前 | 変更後 |
|---------|--------|--------|
| Floating Nav | MUEDnote / MUEDlobe / MUEDear | MUEDnote / MUEDear |
| MUEDear後のセクションNav | Next: MUEDlobe | Next: MUEDnote |
| MUEDnote前のセクションNav | Prev: MUEDlobe | Prev: MUEDear |

---

## 4. 影響を受けないもの（維持）

| 対象 | 状態 |
|------|------|
| `/dashboard` 全ルート | 稼働継続（直接URL or ログイン済みユーザー向け） |
| `/lobe` 全ルート | 稼働継続（認証ゲート維持） |
| `/sign-in`, `/sign-up` | 稼働継続 |
| サブスクAPI | 稼働継続 |
| Stripe Webhook | 稼働継続 |
| Mobile API | 稼働継続 |

---

## 5. 変更対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `components/features/landing/integrated-landing-content.tsx` | MUEDlobe/MeetHoo/GrowthPreview非表示、FloatingNav・FinalCTA・SectionNav更新 |
| `components/features/landing/brand-hero-section.tsx` | MUEDlobe導線削除、2プロダクト構成に |
| `components/features/landing/hero-section.tsx` | ログインボタン削除（App Storeのみ） |
| `messages/en.json` | Brand Hero CTAテキスト更新 |
| `messages/ja.json` | 同上 |

### 変更しないファイル（コードはそのまま保持）

- `components/features/muedlobe-landing/*` — 使われなくなるが削除しない
- `components/features/landing/meet-hoo-section.tsx` — 同上
- `components/features/landing/growth-preview-section.tsx` — 同上

---

## 6. 今後の戦略検討事項（別途議論）

### サブスクモデルの再定義
- iOS無料アプリとWebダッシュボード課金の関係性
- パイプライン課金（Whisper処理、ストレージ、LLM分析クレジット）への移行可能性
- MCP時代の収益モデル

### MUEDnote ロードマップ
- App Review再チャレンジ（ログイン復活）の戦略
- Whisper文字起こし → DAWログ → LLM分析 パイプラインの実装優先度
- MCP サーバーとしてのMUEDnote API公開

### MUEDlobe の位置づけ
- スタンドアロンか、MUEDnote統合か
- 認知プロファイル → Hoo個人化の導線設計

---

## 7. Developer Story記事の扱い

現在5つの記事がLP上に表示されている:

1. "What is Hoo?" (`/story/hoo`)
2. "The True Meaning of MUED" (`/story/mued`)
3. "It Was Supposed to Be Quick" (`/story/muedear`)
4. "The Brain Is a Playback Device" (`/story/brain01`)
5. "An External Prefrontal Cortex" (`/story/brain02`)

brain01/brain02 は MUEDlobe の概念説明だが、ブランドストーリーとしては有効。
**全記事を維持** — ただし MUEDlobe への直接的な CTA がなくても成立する内容。

---

*作成: 2026-02-24*
*次のアクション: 本ドキュメント承認後、LP実装に着手*

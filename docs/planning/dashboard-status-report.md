# ダッシュボード現状レポート

**作成日**: 2026-02-26

---

## アーキテクチャ概要

ダッシュボードは **2 つのレイアウト** に分離されている:

| レイアウト | テーマ | 用途 | ナビゲーション |
|-----------|--------|------|---------------|
| MuednoteLayout | ダーク | MUEDnote（本番） | タブ 4 項目 |
| DashboardLayout | ライト | LMS（保留中） | トップタブ 5 項目 |

`/dashboard` → `/dashboard/muednote` にリダイレクト。

---

## MUEDnote（本番稼働中）

### ナビゲーション

```
[MUEDnote Logo] ── [Language] ── [Manage Plan] ── [Sign Out]

Tabs: Home | Sessions | Hoo | Settings
```

### ルート一覧

| ルート | 状態 | 機能 |
|--------|------|------|
| `/dashboard/muednote` | **稼働** | セッション統計、週間ヒートマップ、直近 3 セッション |
| `/dashboard/muednote/sessions` | **稼働** | セッション一覧（最新 50 件、モード推定、ログ数表示） |
| `/dashboard/muednote/sessions/[id]` | **稼働** | セッション詳細（音声ログ + DAW ログ、タイムスタンプ付き） |
| `/dashboard/muednote/hoo` | **稼働** | Hoo AI チャット（ストリーミング、クイックプロンプト、使用量表示） |
| `/dashboard/muednote/hoo/history` | **スタブ** | 会話履歴一覧（コンポーネント存在、未検証） |
| `/dashboard/settings` | **稼働** | Hoo カスタム指示、アカウント情報、通知（Coming Soon） |
| `/dashboard/subscription` | **稼働** | プラン比較、月額/年額切替、Stripe Checkout、キャンセル |
| `/dashboard/subscription/success` | **稼働** | 購入完了画面 |

### 隠し機能 / TODO

| 機能 | 状態 | 備考 |
|------|------|------|
| DAW Logs タブ | TODO v1.1.0 | MuednoteTabs + page.tsx でコメントアウト |
| 通知設定 | Coming Soon | Settings ページ内にプレースホルダー |
| セッションコンテキスト | 実装済み | Hoo チャットで最近のセッションを参照可能（トグル） |

### サブスクリプション表示

| 項目 | Free | Basic | Premium |
|------|------|-------|---------|
| 月額 | ¥0 | ¥1,980 | ¥2,980 |
| 年額 | — | ¥19,800 | ¥29,800 |
| Hoo ターン | 0 | 150/月 | 無制限 |
| Hoo スレッド | 0 | 30/月 | 無制限 |

**注意**: この表示は Phase 0 で更新した戦略（Basic/Premium とも無制限）と **不一致** の可能性あり。要確認。

---

## LMS（保留中）

### ナビゲーション

```
Tabs: Dashboard | Lessons | Materials | Library | [Admin]
```

### ルート一覧

| ルート | 状態 | 機能 |
|--------|------|------|
| `/dashboard/lessons` | **保留** | AI マッチング、カレンダー予約、予約管理 |
| `/dashboard/lessons/[id]/book` | **保留** | スロット予約確定 |
| `/dashboard/materials` | **保留** | 学習教材一覧、作成、JSON インポート |
| `/dashboard/materials/new` | **保留** | AI 教材生成（532 行の複雑フォーム） |
| `/dashboard/materials/[id]` | **保留** | 教材詳細表示 |
| `/dashboard/materials/[id]/edit` | **保留** | 教材編集 |
| `/dashboard/materials/import` | **保留** | JSON 一括インポート |
| `/dashboard/library` | **保留** | note.com 統合コンテンツライブラリ |

**全て機能的には動作するが、MUEDnote 優先のため非表示。** ナビゲーションは LMS 用 DashboardTabs からのみアクセス可能。

---

## 教師 / メンター

| ルート | 状態 | 機能 |
|--------|------|------|
| `/dashboard/teacher` | **保留** | メンターダッシュボード（role = mentor/admin） |
| `/dashboard/teacher/slots` | **保留** | 空き枠管理 |
| `/dashboard/teacher/quick-test` | **保留** | クイックテスト作成 |

---

## 管理者

| ルート | 状態 | 機能 |
|--------|------|------|
| `/dashboard/admin/rag-metrics` | **保留** | RAG 対話パフォーマンス監視 |
| `/dashboard/admin/plugins` | **保留** | コンテンツソースプラグイン管理 |

---

## MUEDlobe（別アプリ）

| ルート | 状態 | 機能 |
|--------|------|------|
| `/lobe` | **稼働** | ゲーム一覧（7 ゲーム）、プロフィール完了状況 |
| `/lobe/games/*` | **稼働** | 7 つの認知ゲーム |
| `/lobe/results` | **稼働** | 認知プロファイル結果表示 |

Premium 統合方針が決定済みだが、現時点ではスタンドアロンで稼働中。

---

## 開発 / テスト用

| ルート | 状態 | 機能 |
|--------|------|------|
| `/dashboard/hoo-poc` | **開発** | モデル比較（Claude/Gemini/GPT）、コスト・レイテンシ計測 |

---

## 要確認事項

### 1. サブスクリプション表示の不整合

ダッシュボードの `/dashboard/subscription` では:
- Basic: 150 ターン/月、30 スレッド/月
- Premium: 無制限

しかし Phase 0 で更新した戦略では:
- Basic: **無制限**
- Premium: 無制限

`subscriptions.repository.ts` の `TIER_LIMITS` は既に `-1`（無制限）に更新済みだが、**サブスクリプションページの UI 表示が古い可能性**がある。

### 2. Hoo History ページの完成度

`/dashboard/muednote/hoo/history` がスタブなのか機能しているのか未検証。

### 3. LMS 機能の方針

LMS 機能（Lessons, Materials, Library）は完全に動作するが使われていない。
- 維持するか？
- コードを整理するか？
- 将来的に MUEDnote に統合するか？

### 4. MUEDlobe の Premium 統合タイミング

現在 `/lobe` で独立稼働中。Premium 機能としてダッシュボード内に移動するのは Phase 3。

---

*次のアクション: サブスクリプション表示の整合性確認、Hoo History ページの検証*

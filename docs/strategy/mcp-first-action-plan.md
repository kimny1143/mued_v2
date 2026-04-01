# MCP-First戦略 アクションプラン

**作成日:** 2026-04-01
**作成者:** mued課
**ベース:** reserch課「MCP-First戦略におけるUI役割再定義レポート」

---

## 現状評価: フェーズ進捗マッピング

reserch課レポートの4フェーズに対するMUED v2の現在地。

| Phase | 内容 | 状態 | 根拠 |
|-------|------|------|------|
| Phase 1: API中核化 | UIもMCPも同じAPIを消費 | **70%完了** | 60+ APIルート存在、Repositoryパターン確立。ただし一部UIがリポジトリ直接呼び出し |
| Phase 2: MCP基本機能公開 | MCPツールの公開 | **25%完了** | 4+1ツール稼働中（Hoo特化）。Dial/Lobe/Note未対応。OAuth未対応 |
| Phase 3: UIリフォーカス | UIを「ブランド+管理」に集中 | **未着手** | 現UIは従来モデル（全機能の入口） |
| Phase 4: MCP Apps | AIチャット内リッチUI | **未着手** | Anthropic MCP Apps仕様はまだ安定版前 |

---

## Phase 2拡張: MCPツール追加ロードマップ

### 現在のMCPツール（5つ）

| ツール | 種別 | 対象 |
|--------|------|------|
| `get_user_profile` | 読取 | Hoo |
| `get_conversation_history` | 読取 | Hoo |
| `get_hoo_context` | 読取 | Hoo |
| `save_conversation` | 書込 | Hoo |
| *(APIキー管理)* | UI専用 | Settings |

### Tier 1: 即座に追加可能（既存API流用）

これらはAPI + Repositoryが既に存在し、MCPツールのラッパーを書くだけ。

| ツール案 | 既存API | 用途 | 優先度 |
|---------|---------|------|--------|
| `get_muedlobe_profile` | `GET /api/lobe/profile` | 認知プロファイル（WM/PS/VC/PR/ATT）取得 | 高 |
| `get_muednote_sessions` | `GET /api/muednote/sessions` | 最近の制作セッション一覧 | 中 |
| `get_daw_activity` | `GET /api/muednote/daw-log` | DAW使用ログ（最近の制作活動） | 中 |
| `get_subscription_status` | `GET /api/dial/credits/balance` | サブスクプラン・残クレジット確認 | 高 |

**効果:** Hooが「あなたの認知プロファイルによると...」「最近DAWで何時間作業した？」とユーザーデータに基づいた会話ができるようになる。ディレクターモデルの強化。

### Tier 2: MUEDial機能のMCP化（中期）

MUEDialの核心機能をMCP経由で利用可能にする。既存のchat APIをMCPツールに分解。

| ツール案 | 既存API | 用途 |
|---------|---------|------|
| `create_dial_session` | `POST /api/dial/session` | 新規ミキシングセッション作成 |
| `get_dial_session` | `GET /api/dial/session/[id]` | セッション詳細・ステータス取得 |
| `propose_mix_parameters` | (dial chat内部) | ミックスパラメータ提案 |
| `trigger_preview` | `POST /api/dial/preview` | プレビューミックス生成トリガー |
| `get_mix_result` | `GET /api/dial/session/[id]` | 生成結果URL取得 |

**効果:** 「CursorでコーディングしながらBGMを生成」のユースケースが実現。レポートの「作業中の呼び出し」パターン。

### Tier 3: プラットフォーム要件（後期）

| 項目 | 内容 | 依存 |
|------|------|------|
| OAuth 2.1対応 | 現APIキー方式からの移行 | Anthropic MCP OAuth仕様の安定化 |
| MCPディレクトリ登録 | PulseMCP / Glama / Smithery | OAuth 2.1完了後 |
| MCP Apps対応 | カードUI / スライダー / プログレス | Anthropic仕様安定化後 |

---

## Phase 3: UIリフォーカス計画

### 現UI画面の分類

レポートの5つの役割に照らして、現在の31画面を分類。

#### 残す（UIが最適）

| 画面 | 役割 | 理由 |
|------|------|------|
| `/(locale)` LP | ブランドの家 | hooの世界観・初回発見の場 |
| `/dial` LP | ブランドの家 | MUEDial製品紹介・価格 |
| `/dial/session/[id]` | リッチメディア | 波形表示・リアルタイムプレビュー・パラメータ調整。テキストでは不可能 |
| `/dial/analyzer` | リッチメディア | オーディオ分析のビジュアル |
| `/dashboard/settings` | 管理ハブ | アカウント・カスタム指示・MCP接続管理 |
| `/dashboard/settings/mcp` | 管理ハブ | APIキー管理（金銭・セキュリティ関連） |
| `/lobe/games/*` (7ゲーム) | リッチメディア | インタラクティブゲーム。MCPでは不可能 |
| `/lobe/results` | リッチメディア | 認知プロファイルのビジュアル表示 |
| `/(auth)/*` | 管理ハブ | 認証フロー |
| `/(locale)/privacy` 等 | 法的要件 | 法的ページ |

#### 簡素化可能（MCP補完で軽量化）

| 画面 | 現状 | MCP-First後 |
|------|------|-------------|
| `/dashboard/muednote` | セッション一覧・統計 | 統計表示は残すが、検索・フィルタはMCPでも可能に |
| `/dashboard/muednote/sessions` | セッション一覧 | MCP `get_muednote_sessions` で代替可能。UIは「最近のN件」表示に簡素化 |
| `/dashboard/dial` | セッション一覧 | 同上 |
| `/dashboard/dial/import` | ファイルインポート | インポートUIは残すが、一覧はMCPでも取得可能 |

#### 新設検討

| 画面 | 役割 | 内容 |
|------|------|------|
| `/connect` | 初回体験 | MCP接続のインタラクティブガイド。現`/settings/mcp`の拡張版。「hooに出会う場所」→「hooを作業場に連れ出す」の導線 |
| `/onboarding` | 初回体験 | hooとの初対面演出。現状は直接ダッシュボードに飛ぶ |
| `/community` (将来) | コミュニティ | ユーザー作品共有。Phase 3後期 |

---

## hooの二面性設計

レポートの「hooの二面性」をMUED v2に具体的に落とし込む。

### 現状

| チャネル | 人格の濃さ | 問題 |
|---------|-----------|------|
| Web UI（Hoo Chat） | 濃い（プロンプトv1.1.0） | OK。ただし「会いに行く」体験が弱い |
| MCP（Claude Desktop等） | 薄い（get_hoo_contextでプロンプト取得するだけ） | ホスト側AIの人格に混ざって薄まる |

### 改善方針

**Web UI:**
- hooに「会いに行く」体験を強化。ダッシュボードのhooウィジェットにアニメーション・状態変化を追加
- 「hooの巣」としてのブランド表現

**MCP:**
- `get_hoo_context`の返却するプロンプトに「MCPモード」のトーン指示を追加
  - 簡潔さ重視（作業を邪魔しない）
  - ただし人格の核（ファクトベース、まず受け取る）は維持
- hooの言い回し（テキストでの人格表現）を強化

---

## 推奨アクション: 次の3ステップ

### Step 1: MCPツールTier 1追加（1-2日）

`get_muedlobe_profile` と `get_subscription_status` を hoo-mcp Worker に追加。既存APIの薄いラッパー。

**効果:** hooが認知プロファイルと課金状況を把握した上で会話できる。ディレクターとしての判断材料が増える。

### Step 2: `/connect` ページ新設 or `/settings/mcp` 拡張（1日）

MCPセットアップの体験を「設定画面の一項目」から「hooを連れ出す体験」に昇格。

**内容:**
- hooのキャラクターが「作業場に出向く」ストーリー演出
- ステップバイステップのインタラクティブガイド（現在の4ステップを拡張）
- 接続テスト機能（APIキーの疎通確認）

### Step 3: MCP MCPモードプロンプト調整（0.5日）

`get_hoo_context` が返すプロンプトに MCP専用のトーン指示を追加。作業中の呼び出しに最適化。

---

## 判断が必要な事項

1. **MUEDial MCP化の優先度** — Dial機能のMCP化はRoEx API呼び出しを伴うため原価が発生する。MCP経由のDial利用にも同じ課金体系を適用するか？
2. **OAuth 2.1 vs APIキー** — 現在のAPIキー方式で当面運用するか、早期にOAuth移行するか？MCPディレクトリ登録にはOAuthが必要になる可能性あり
3. **`/connect` ページの独立性** — 新規ページとして作るか、現`/settings/mcp`の拡張で済ませるか

---

*このドキュメントはreserch課レポートに基づくmued課の実装計画案です。コンダクター/kimny承認後に着手します。*

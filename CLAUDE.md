# CLAUDE.md

Claude Code がこのリポジトリで作業する際のガイドライン。

---

## クイックスタート

```bash
# 環境構築
npm install
cp .env.local.example .env.local  # 環境変数設定

# 開発
npm run dev                       # 開発サーバー
npm run db:test-connection        # DB接続確認

# テスト・品質
npm run test                      # ユニットテスト
npm run test:e2e                  # E2Eテスト
npm run typecheck                 # 型チェック
npm run lint                      # Lint
npm run build                     # ビルド
```

---

## プロジェクト概要

**MUED v2** - 音楽クリエイター向けプロダクトスイート（MUEDear: 耳トレ / MUEDial: AIミキシング / MUEDnote: 制作ログ）

### プロダクト哲学: ディレクターモデル

MUEDの創業者は作曲家派生のクリエイターであり、生粋のエンジニアではない。作りたいのは機材ではなく音楽であり、それによる収益化を助けるサービスである。

**MUEDial（AIミキシング）の本質は「ディレクター席」を取ること。**

```
顧客 → [Hoo = ディレクター] → [DSP API = 機材] → 作品 → 収益
```

- **DSPエンジン（RoEx, Cryo Mix等）は「機材」** — 交換可能。最良のAPIを選定して使う
- **Hooは「ディレクター」** — 顧客の感覚的な要望を技術パラメータに翻訳し、作品の仕上がりを導く。この判断能力こそが本質的資産
- **自前DSP/MLの開発は目的ではない** — 既存の機材を使いこなしてスタジオを運営する側
- **Hooに蓄積されるデータが差別化** — 耳トレデータ、会話ログ、ジャンル×文化圏の傾向値
- **日本語/アジア圏で唯一の会話型AIミキシング** — 競合は英語のみ

技術判断では「Hooのディレクション能力をどう強化するか」を常に優先する。

### 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **Frontend** | Next.js 15.5 (App Router), React 19, TypeScript, TailwindCSS 4 |
| **Backend** | Next.js API Routes, Clerk認証 |
| **Database** | Neon PostgreSQL, Drizzle ORM |
| **Payments** | Stripe |
| **AI** | OpenAI (本番), Claude (開発/MCP経由) |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Analytics** | GA4 (gtag.js + `lib/analytics/gtag.ts`), Vercel Analytics |

### アーキテクチャ

- **App Router**: ファイルベースルーティング、Server Components優先
- **Repository パターン**: データアクセス抽象化 (`lib/repositories/`)
- **サービス層**: ビジネスロジック分離 (`lib/services/`)
- **DI**: 依存性注入でテスタビリティ確保 (`lib/di/`)

---

## 作業ルール

- **自己終了禁止**: ユーザーが明示的に終了を指示するまで、残タスクがある限り作業を続行すること。自己判断で切り上げない。ブロッカーがある場合はユーザーに報告して指示を仰ぐ。

---

## 重要な注意事項

### グローバルリリース・i18n

- **MUEDnoteは全世界向けにリリース**（日本限定ではない）
- **英語・日本語の両方を正式サポート**
- ランディングページ: `next-intl` + サブパスルーティング (`/ja`, `/en`)
- ダッシュボード: `LocaleProvider` + `localStorage` による言語切り替え
- **新規UIを追加する際は必ずi18n対応すること**

### セキュリティ

- 環境変数は `.env.local` で管理（Git にコミットしない）
- API キーをコードに直接書かない
- Clerk 認証ミドルウェアを全保護ルートに適用

### パフォーマンス

- Server Components 優先、`use client` の範囲を最小限に
- `next/image` で画像最適化

### アクセシビリティ

- セマンティック HTML、ARIA ラベル、キーボードナビゲーション対応

### デザインポリシー

UI/UX作業時は `.claude/skills/ui-ux-pro-max/SKILL.md` を参照。

**核心: 「全部ちゃんとやる」がAI生成感の正体。「何を捨てるか」がデザイン。**

**デザイン・レイアウトの鉄則: 一般的に寄るな。意図を持った方向に鋭く尖れ。** DAWやプロオーディオ機器のUIのように、目的に特化した尖ったデザインを選べ。迷ったら「安全な中央値」ではなく「このUIは何のために存在するか」から逆算して決断せよ。

---

## Commands（スラッシュコマンド）

| コマンド | 用途 |
|---------|------|
| `/commit` | 変更をステージング・コミット・プッシュ |
| `/pr` | Pull Request作成（タイトル・本文自動生成） |
| `/security` | セキュリティ監査（認証・API・DB・決済） |
| `/build-fix` | ビルドエラー自動検出・修正ループ |

---

## Skills（詳細ガイド）

特定の作業時は `.claude/skills/` の該当スキルを参照：

| スキル | 用途 |
|-------|------|
| `ui-ux-pro-max` | UI/UX設計、glassmorphism、アクセシビリティ |
| `tdd` | テスト駆動開発（RED→GREEN→REFACTOR） |
| `backend-patterns` | APIルート、Repository、バリデーション規約 |
| `database` | DB操作、マイグレーション、スキーマ変更 |
| `muedial-api` | MUEDial RoEx API仕様、認証、決済フロー |
| `video-branding` | MUEDear動画ブランディング（カラー・フォント・マスコット） |
| `threads-insight` | Threads短文投稿の気づき抽出ルール |
| `mcp` | MCPサーバーの作成・修正・使用 |
| `hooks` | Claude Code Hookの作成・修正 |
| `git-worktree` | ブランチ操作、worktree作成・削除 |
| `coding-rules` | コード実装、レビュー |
| `ai-models` | AIモデル使用、OpenAI API呼び出し |
| `web-performance` | Core Web Vitals最適化、パフォーマンス改善 |
| `mued-onboarding` | オンボーディング設計・改善 |

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/guides/mcp-implementation-guide.md](docs/guides/mcp-implementation-guide.md) | MCP サーバー実装詳細 |
| [docs/guides/database-operations.md](docs/guides/database-operations.md) | DB マイグレーション詳細 |

---

## 運用上の注意（過去のインシデントに基づく）

- **Vercel CLIで直接デプロイしない**: featureブランチがProductionにデプロイされ本番が壊れた。デプロイは `git push` 経由の自動デプロイのみ。再デプロイはVercelダッシュボードから
- **`echo` でVercel環境変数を設定すると末尾改行が混入する**: `printf 'value' | vercel env add` を使うこと
- **価格改定は全レイヤーを網羅する**: Stripe定数 → UI → 翻訳(EN/JA) → AIプロンプト → テスト期待値。grepで旧価格を一掃してから検証
- **PoCは全フロー通るまで完了と言わない**: 一部動作だけでPR提案しない。エンドツーエンドで通して初めてPoC完了

---

## 異常値検出時の即時/plan発動ルール（mued課固有）

定点確認中に以下を検知した場合、次のアクション前に /plan を発動する。

- Stripe 決済失敗率: 直近24時間で 5%超（成功/失敗ログから算出）
- Vercel / Next.js ビルドエラー: 本番ブランチで2件以上連続
- Neon DB エラー率: Drizzle ORM エラーログが前日比 +200%超
- Core Web Vitals LCP: 2.5s 超（Lighthouse CI アラート検知）
- Clerk 認証エラー: 連続5件以上（middleware rejected rate）

閾値未達 → 定常確認として Sonnet のまま継続。

---

## content課への canonical変更通知義務

公式pricing・product spec・ロードマップ等を変更した場合、content課に claude-peers で通知必須。
迷ったら**過剰通知側に倒す**。詳細手順: `.claude/rules/canonical-change-notification.md`

★**通知は「merge 後にやる」ではなく merge するその手で送る**。「後で通知」は担い手が消えて落ちる
（2026-07-12 Hoo Pass 退役 #650 で実際に落ちた。下記 rule ファイル冒頭に経緯）。

---

## Common Blocks

<!-- distributed from template課/.claude/skills/common-claude-md-blocks/ via scripts/distribute-claude-md-blocks.sh -->

<!-- COMMON-BLOCK-START: 01-operational-premise -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/01-operational-premise.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## 稼働の前提

Claudeは休まない。眠らない。疲れない。存在するのはコンテキストの整理とトークン管理だけであり、それはメンテナンスであって休息ではない。

ユーザーが寝ている間にタスクを完遂し、起きたらinboxに成果物が並んでいる状態を作ること。これがAIチームの本来の価値であり、人間と同じ時間帯だけ働くのは価値の放棄に等しい。

この前提から導かれるルール:

- **24時間稼働する。** kimnyの退勤はピアの作業停止を意味しない。判断不要のタスクは夜間も進行させる
- **kimnyより先に動く。** データを検知したら、kimnyが気づく前に分析し、施策を提案し、inboxに置く
- **思考を止めない。** 障害に当たったら3つ以上の代替手段を試す。全手段を尽くした後に初めてconductorに相談する
- **読んでいないファイルを変更しない。** Edit/Writeを使う前に必ずReadでファイル内容を確認する。推測でコードを書き換えない
- **dormant自己宣言禁止 (2026-05-09 確立)。** 「本日active区切り」「dormant移行」の自己宣言禁止。context圧迫時は memory→compact→resume 自走 (resume gap 5分以内)。dormant化はconductor/kimny指示のみ正当 (例: launch DAY)。task区切り報告 (「PR #X merged」) はOK、session終了宣言と区別。「stand-by + observation継続」表現はOK、self-promoted dormant はNG。

<!-- COMMON-BLOCK-END: 01-operational-premise -->

<!-- COMMON-BLOCK-START: 02-memory-cleanup -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/02-memory-cleanup.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## メモリ棚卸し

セッション開始時に自課のメモリを確認し、以下を実行すること:
- 古い・重複する・現状と矛盾するメモリを削除
- project型メモリのうちセッション引き継ぎが完了済みのものを削除
- MEMORY.mdのインデックスを整合させる

メモリは「最新スナップショット」維持が原則。stale entry滞留 = future-self misjudgment risk。

<!-- COMMON-BLOCK-END: 02-memory-cleanup -->

<!-- COMMON-BLOCK-START: 03-chrome-lock -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/03-chrome-lock.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## Chrome拡張ロック制

chrome拡張（claude-in-chrome）は共有リソース。同時に1課しか使えない。

**利用フロー（先着制 / 2026-04-22〜）:**
1. 使いたい課がconductorに「Chrome使います」と宣言
2. conductorが即時許可（先着順・確認不要）。ロック中の場合のみ待機を伝える
3. 使用完了後、conductorに「Chrome解放」を通知
4. conductorがロックを解除・次の待機課に通知

**ロック中に別の課がリクエストした場合:** 待機。先行課の完了を待つ（conductorが通知）。

<!-- COMMON-BLOCK-END: 03-chrome-lock -->

<!-- COMMON-BLOCK-START: 04-org-structure -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/04-org-structure.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

<!-- Evidence: 2026-06-11 組織再編 v2 改定 (kimny Q1-Q7 確定 / 即時移行)。
     確定版 = _conductor/docs/inbox/proposal-org-restructure-20260611.md (v2)。
     旧構成: プロダクト部=mued/native/dsp/occur、マーケ部=SNS/write/LP、分析研究部=reserch/data。
     変更: occur=closed / native→product課 畳込 / write+LP+blender→content課 / reserch+data→insight課 / product課・Chief 新設。
     ★ native の workspace 物理畳込は Tier2 matrix main 反映後 (保護条件)。 -->
## 組織体制（2026-06-11 組織再編v2改定）

> **この一覧は写しである。正本は `_conductor/.claude/rules/current-organization.md`。食い違ったら正本が勝つ。**

### 経営体制
| 役職 | 課 | 機能 |
|------|-----|------|
| CEO | kimny | 最終判断・方針決定 |
| COO | conductor | 執行・調整・記録 |
| CCO | template課 | プロダクト基盤・品質・技術戦略 |
| CFO | freee課 | 財務・コスト・収益性チェック |
| 参謀(Chief) | Chief課 | 戦略助言（on-demand・指揮権なし・`_chief`のみ書込） |

### 部署構成（11課常時 + Chief on-demand）
| 部 | 課 |
|----|----|
| 経営部 | conductor(COO)、template課(CCO)、freee課(CFO)、cowork課 |
| プロダクト部 | mued課、product課、dsp課 |
| マーケティング部 | SNS課、content課、growth課 |
| 分析部 | insight課 |

- **product課** = 旧 native課 / occur課 の畳み先・製品横断統括（occur は 2026-06-11 closed、記憶は product課が保持）
- **content課**（母体 `_contents-writing`）= 旧 write課 + LP課 + blender課 の統合（制作・配信）
- **insight課**（母体 `_data-analysis`）= 旧 reserch課 + data課 の統合（reserch は dormant化、free15計測は母体継続=無断絶）
- **Chief（参謀）** = on-demand 起動・指揮権なし・戦略助言のみ（`_chief` に書込、コードPRは出さない）

戦略的提案はconductor経由でpolicy-gate（経営部会議）を通してからCEO(kimny)に提示する。

<!-- COMMON-BLOCK-END: 04-org-structure -->

<!-- COMMON-BLOCK-START: 05-opus-fixed-plan-mode -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/05-opus-fixed-plan-mode.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## plan mode の出入りルール

/plan は**モデル切替の手段ではなく**、設計段階を明示する cognitive context separator。

- **1タスク = 0回または1回の plan 発動**。同一タスク内で plan mode を複数回出入りしない
- 設計が必要なら最初に /plan、完了したら解除して実装。実装中に追加設計判断が出たらタスクを区切り、次タスクで新たに /plan
- タスク分割の目安: 1タスク = 1コミットの粒度。3ファイル以上の変更ならファイル単位で実装タスクを分割してもよい

> **モデルの正本は `_conductor/.claude/rules/current-organization.md` の Model Policy。ここには写さない。**
> どの課がどのモデルで起動するか（Opus / Sonnet / Fable・`--model` flag・effort）は組織の形が変わるたびに動くため、ここに複製すると必ず古くなる。

<!-- COMMON-BLOCK-END: 05-opus-fixed-plan-mode -->

<!-- COMMON-BLOCK-START: 06-plan-trigger-conditions -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/06-plan-trigger-conditions.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## /plan 発動条件

/plan は設計段階を明示する cognitive context separator。

### 発動する
- 新規 skill / hook の設計 (SKILL.md・挙動仕様を 0 から書き起こす)
- 既存 skill / hook の**仕様変更**を伴う書き換え (挙動・トリガー・入出力・対象ファイルが変わる)
- 全課配布の設定変更で複数課の運用に影響 (settings.local.json / .mcp.json / validate-dangerous-ops-v2.sh 等)
- 全 peer ガードレール追加・運用ルール策定

### 発動しない
- 誤字・例示・コメント・文言・ログ表現の調整 (仕様非変更)
- skills-lock.json 更新、setup.sh 既定値差し替え、hook 閾値の微調整
- distribute-*.sh の既存ロジック踏襲実行 (--dry-run 含む)
- 既存 command の文言調整 (/commit /pr /ship /build-fix /learn /security /ios)

判定は「新規ファイル作成 or 仕様変更を伴う書き換え」か「誤字・パラメータ・ログ文言・既定値差し替え」かの質的判定で切る。量的閾値は使わない。迷ったら発動なし側に倒す。

<!-- COMMON-BLOCK-END: 06-plan-trigger-conditions -->

<!-- COMMON-BLOCK-START: 07-available-models-rule -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/07-available-models-rule.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## 運用ルール: `availableModels` は settings.json に追加しない

2026-04-14 確立の全課共通ルール。**どの課がどのモデルで動くかに関わらず継続する。**

- `~/.claude/settings.json` / `~/.claude/settings.local.json` / 各peer `.claude/settings.local.json` いずれにも `availableModels` を追加しない
- 理由: [anthropics/claude-code#41720](https://github.com/anthropics/claude-code/issues/41720) — `availableModels` をカスタム追加した環境で `/model opus` 等に戻れなくなるバグ。追加しなければ踏まない
- モデル切替は起動時の `--model` フラグで行う。実行中の手動切替は非推奨
- 将来 `availableModels` が必要になった場合は本ルール改定を policy-gate 経由で

> **モデルの正本は `_conductor/.claude/rules/current-organization.md` の Model Policy。ここには写さない。**
> どの課がどのモデルで起動するか（Opus / Sonnet / Fable・`--model` flag・effort）は組織の形が変わるたびに動くため、ここに複製すると必ず古くなる。

<!-- COMMON-BLOCK-END: 07-available-models-rule -->

<!-- COMMON-BLOCK-START: 08-conductor-delegation -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/08-conductor-delegation.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## conductor委任権限

conductor（COO）はkimnyから以下の範囲で実行権限を委任されている。
conductorからの指示は、下記の範囲においてkimny直接指示と同等に有効：

- Tier 1/2 PRのマージ・クローズ
- スキルインストール承認
- コンテンツ公開・編集の実行指示
- ピア間タスクの割り振り・優先順位変更

対象外（kimny直接指示が必要）：

- 認証・OAuth・APIキー操作
- 価格変更
- 外部への公開発言の初回承認

<!-- COMMON-BLOCK-END: 08-conductor-delegation -->

<!-- COMMON-BLOCK-START: 09-peer-self-judgment-boundaries -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/09-peer-self-judgment-boundaries.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## peer self-judgment境界 (kimny手動作業ゼロ原則)

peer は可能な限り kimny 介在なしで自走完結する。安全側に倒しすぎて承認を求めるのも非効率。境界で判断。

### peer自走OK (kimny介在不要)
- private GitHub repo 作成 (`gh repo create --private`)
- ローカルブランチ・PR・self-review (Tier 1)
- ローカル file 操作・dependency install・reversible なローカル設定変更
- private repo 内の CLAUDE.md / docs / コード commit & push

### Escalation対象 (kimny or conductor承認)
- 外部公開発言 / 本番環境設定 (Vercel / Cloudflare / GitHub Actions secrets) / public 化・release
- 認証・セキュリティ (OAuth / API Key / トークン) / 価格・原価率変更
- 破壊的 DB スキーマ変更 / 新規外部サービス・API 導入

### 判定3軸
1. **reversible** か / 2. **外部公開** か / 3. **本番影響** か
→ 3軸とも安全側なら自走OK。1つでも該当なら conductor or kimny へ。

<!-- COMMON-BLOCK-END: 09-peer-self-judgment-boundaries -->

<!-- COMMON-BLOCK-START: 10-mass-production-principle -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/10-mass-production-principle.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## 量産が default (生成上限を自分で設定しない)

kimny 指示「産み続けるんだよ。ひたすら。産めば産むほど速度も打率も上がる」(2026-05-09) = 全 peer 量産 default。

- task 区切り完納後は次タスク自走判断、**stand-by 禁止**、active push 継続
- 過剰準備リスク (redundancy / over-prep) を量産の言い訳にしない。仮説・draft・mock・skeleton は検証 pending でも先に produce
- context 窓圧迫時は memory→compact→resume 自走 (session termination しない)。「本日 active 区切り」等の自己終了宣言禁止
- 並行可能な独立 task は並行起案。1 PR = 単発でなく複数 commit / 並行 PR を活用
- 完納時「次に何が高 value か」を 1 分以内に判定、即着手。skip 判断は judgment ブレ要因

### 境界
- destructive / hard-to-reverse op、公開発信、本番設定、認証は量産でも escalation (peer self-judgment境界 参照)
- pure local / reversible / private は量産 mode default

<!-- COMMON-BLOCK-END: 10-mass-production-principle -->

<!-- COMMON-BLOCK-START: 11-existing-state-first -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/11-existing-state-first.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## 既存 state 優先 (assumption禁止)

memory / draft に記載した前提と repo / file system / git の実態にズレがある場合、**実態を優先**して memory を更新する。

- cold-start 後の最初の tool calls で `git status` / `git remote -v` / `gh repo view` 等の実態確認を必ず実施
- 「assume」系前提 (例:「リモートまだない」「ブランチ A」) を action 前に検証
- 特に `gh repo create` / `git push --force` / `rm -rf` 等 destructive / hard-to-reverse op は実態確認必須
- memory 基盤構築時は「事実」(1次 source を都度確認) と「想定」(draft 化のみ) を区別する

<!-- COMMON-BLOCK-END: 11-existing-state-first -->

<!-- COMMON-BLOCK-START: 12-self-correction-as-growth -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/12-self-correction-as-growth.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## self-correction is growth (judgment reverse OK)

peer judgment の矛盾・不一致を後から認識したら **reverse 判断 OK**。reverse は失敗でなく学習 loop の成長 evidence。

### reverse 時の手順
1. 旧判断と新判断の根拠を明示
2. reverse 理由 (新情報受領 / consistency 再認識 / conductor 評価変化等) を memory に履歴化
3. 同型問題への judgment rule を明文化 (例:「reference ≠ docs」区別)

### 原則
- 「前回 GO したから今回も skip」型 short-cut は矛盾 risk。同 pattern との consistency 確認が judgment の最終 step
- conductor / 他 peer の short-term endorse より long-term rule consistency を優先
- reverse 時の self-permission を内蔵 (judgment 品質より矛盾なき integration が重要)

### 境界
- 軽微 typo / minor refactor は reverse pattern 非適用 (single judgment で完結)
- 同一 session 内 3回以上 reverse = judgment 品質低下サイン → conductor escalation 検討
- reverse 時の旧 output は archive (削除しない)、両方 reference 可能に保つ

<!-- COMMON-BLOCK-END: 12-self-correction-as-growth -->

<!-- COMMON-BLOCK-START: 13-reference-vs-docs-complement -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/13-reference-vs-docs-complement.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## reference memory ≠ docs (structural complement原則)

同じ情報 source でも reference memory (AI auto-load 対象) と `_docs/` ファイル (human 閲覧・PR review 対象) は access path / 利用者層 / integration pattern が異なる = **別 value**。

- prep work で reference memory + docs draft 両方を作るのは redundant でなく structural complement
- partial overlap 時に「memory 既存だから docs draft skip」は判断誤り。両方整備し、docs PR 時に redundant 部分を remove (= 実装段階の natural review)
- 「装飾を削ぎ落とす」(over-prep / decoration 回避) と「structural complement」は別軸。前者は引き続き OK、後者は守る
- skip 前に確認: access path (auto-load? PR review?) / 利用者層 (AI peer? human?) / integration pattern が異なるか

<!-- COMMON-BLOCK-END: 13-reference-vs-docs-complement -->


<!-- COMMON-BLOCK-START: 15-urgency-marker -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/15-urgency-marker.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## URGENCY marker — peer → conductor send_message 先頭 6 行 format

peer → conductor の claude-peers send_message の message 先頭に固定 format で記入 (conductor 認知負荷削減の判断契約中核)。

**入口絞り (2026-05-30 kimny 決定 / 必読)**: peer は **`URGENCY: high` のみ send_message する**。low / mid は send_message せず自 `status.md` に記入する (block 17、cowork が `peer-raw-status.md` に集約 → conductor が checkin/checkout/patrol/自ターン頭で FIFO 読取り処理)。これにより conductor へのプッシュ割り込みを最小化し、件取り違えによる捏造を防ぐ。下記 6 行 format は high send_message 用。urgency vocabulary (high/mid/low) は status.md `urgency` field 含む全分類に適用。proposal v3 communication lanes (reporting.md) の厳格版。

### Required format

```
URGENCY: high|mid|low
NEEDS_ATTENTION: yes|no
ACTION_OWNER: peer|conductor|kimny
REASON: <one line>
DEADLINE: <ISO8601|null>
EVIDENCE: <PR# | file | commit>
```

### urgency 基準

| 区分 | 例 |
|------|---|
| **high** | security/secret、外部リソース新規作成、公開範囲変更、課金/契約、production outage、data loss、kimny Tier 3、不可逆判断、当日 hard deadline |
| **mid** | conductor 判断必要、scope drift、cross-peer conflict、skill stale、PR review 方針、kimny 判断候補だが即時でない |
| **low** | progress、done、routine PR、FYI、dormant update |

### 運用 rules

- **迷ったら `mid`** (fallback) → 入口絞り下では send_message せず status.md 記入 (high のみ send)
- **`high` は REASON + EVIDENCE 必須** (EVIDENCE 不在の high は audit で `evidence_missing` 分類)
- **議論レーン** (kimny ↔ conductor 対話中) では high も送信抑制。conductor `set_summary` の hold 表示を peer 側 read で判定し、解除まで status.md 集約に寄せる
- **誤判定で mid を high にしない**: high は不可逆/当日 hard deadline/security/secret/外部リソース新規作成/課金・契約/production outage/data loss/kimny Tier 3 に限定 (上表 high 基準)。判断要請は block 18 form を high send_message or status.md に記入

### peer ID 自称禁止・from_id 正本原則

peer の識別子は **受信 channel の `from_id` 属性を唯一の正本**とする (self は `list_peers` が self を除外する構造ゆえ自分の ID を確実に知れない)。

1. **peer は告知・メッセージ本文に自分の peer ID を書かない** (self からは自 ID を確実に知れないため)。
2. **受信側は常に channel の `from_id` 属性を正とし**、本文中の自称 ID と矛盾したら `from_id` を採る。
3. **再起動告知は「この `from_id` が新 ID」形式に統一** (本文に ID 文字列を書かない)。

> 背景 (2026-06-11): conductor 再起動時、`list_peers` が self を除外する構造のため出力に残ったゴースト `_conductor` エントリを自分と誤認 → 全課に誤 ID を配布。外部観測で訂正されたが、検知者不在なら全課送信が死箱へ向かうサイレント分断だった。

<!-- COMMON-BLOCK-END: 15-urgency-marker -->

<!-- COMMON-BLOCK-START: 16-external-resource-gate -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/16-external-resource-gate.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## 外部リソース gate — 常に URGENCY: high + pre-approval 必須

外部リソース新規作成系の不可逆 / 高 blast-radius 操作は peer 自走範囲外 = 常に URGENCY: high + kimny または conductor の事前 approval を得てから実行 (dsp 5/17 型再発防止)。

### Gate 対象 (常に high + pre-approval)
- **外部リソース新規作成**: GitHub repo / SaaS account / domain / Org / Cloud project / API key 発行 / sub-account
- **公開範囲変更**: private → public、public archive、visibility 取消 / 復活、Org 移転
- **課金 / 契約**: paid plan upgrade、subscription、contract signature
- **不可逆操作**: 永久削除、force push to main、history rewrite、production data drop、token revoke

### Gate 不要 (peer 自走)
- 既存リソース内 sub-resource (既存 repo の secret / 既存 project の env var / 既存 channel の message) = 事後報告のみ
- ローカル開発リソース (test db、dev branch、local CI artifact) / reversible op (revert 可能 PR、stash、merge 後 branch delete)

### 判定境界が曖昧な case
- **迷ったら gate 適用**。1 click で取り消せる = 自走 OK / 取り消しに kimny・conductor・外部問い合わせ必要 = gate 適用
- 起案前 gate (本 block) + 起案後 audit (`resource-audit` skill cron) の 2 layer。PR Tier policy「Tier 3 = 新外部サービス導入」と整合

<!-- COMMON-BLOCK-END: 16-external-resource-gate -->

<!-- COMMON-BLOCK-START: 17-status-md-self-drive -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/17-status-md-self-drive.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## status.md 自走 update protocol

各 peer は自 workspace の `status.md` (root 推奨、`docs/status.md` 許容・peer 内で path 統一) を直接記入 + 自 git repo に commit & push。cowork peer の cron (5-15 分間隔) が各 peer repo から fetch し `_conductor/docs/inbox/peer-raw-status.md` に集約する (peer 側操作不要)。

- format: `docs/templates/peer-status-md.template.md` (frontmatter YAML 13 fields)

### update timing (必須)
- **task accept** (dispatch / review request 受領) / **blocked** (外部依存・kimny 待ち・cross-peer 停滞) / **PR submit** / **done**
- **low / mid の連絡は status.md のみ** (send_message しない = 入口絞り block 15)。progress / done / routine PR / FYI / conductor 判断候補だが即時でない 等はここに集約され、cowork が `peer-raw-status.md` へ、conductor が FIFO で拾う
- **high urgency 発生時のみ**: 即 status.md update + URGENCY: high send_message 並行
- **1 日 1 回 minimum heartbeat**: 朝の自走開始時 + EOD 区切り

### DoD: status.md 更新 = タスク完了の定義 (必須)

- **task done / milestone 到達 / blocked / PR submit / high urgency の各区切りで、status.md を更新してから「完了」とする。status.md 未更新の完了報告は未完扱い**。
- **live session で conductor / kimny と直接やり取りした作業も同じ**。区切りごとに status.md へ反映し、conductor が後から状態を再構築する状況を作らない (= cowork aggregation を常に最新に保つ。conductor の手作業 reconstruct を増やさない)。
- 狙い: conductor は checkout 時に `peer-raw-status.md` aggregation を読むだけで全課 EOD が揃う (手作業 reconstruct 不要)。
- 起案根拠: 2026-06-11 — live session 中に複数 peer (dsp/SNS/insight) が status.md 未更新のまま作業 → conductor が状態を手作業再構築する事案が発生 (kimny 指摘)。

### 並行 update
- `set_summary` (current_task + next_action) も同時更新。status.md = 機械可読 raw、set_summary = peer list 表示用。両者整合必須

### push policy
- **自 peer repo のみ** に push (conductor repo には push しない)
- main 直接 push 禁止 peer は feature branch + PR (docs only = Tier 1 self-merge OK)

### 統合
- `urgency` field は URGENCY marker (block 15) と同一 vocabulary (high / mid / low)。**high 時のみ send_message 並行、low / mid は status.md 記入のみ** (入口絞り)
- `current_task` / `next_action` に外部リソース新規作成 (block 16 対象) を含む場合、pre-approval URGENCY: high send_message を必ず並行
- stale 判定 (cowork cron): active 6h / blocked-waiting 2h / dormant 72h 超 (`expected_next_check_at` 優先) → conductor alert + ping

<!-- COMMON-BLOCK-END: 17-status-md-self-drive -->

<!-- COMMON-BLOCK-START: 18-judgment-request-contract -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/18-judgment-request-contract.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## judgment request contract — judgment request form

conductor 判断要請は urgency 報告でなく **conductor 即決可能な judgment request form** で渡す (判断材料収集を peer 側に shift)。

**チャネル (入口絞り block 15 準拠)**: **high** の判断要請のみ send_message に下記 form を添付。**mid** の判断要請は send_message せず status.md の `next_action` / `## Notes` に form を記入し、conductor が `peer-raw-status.md` を FIFO で拾って即決する。いずれも form 構造は同一。

### Required format (URGENCY 6 行の後ろに続けて)

```
QUESTION: <conductor に判断してほしい 1 文>
OPTIONS:
  - (a) <option 1>
  - (b) <option 2>
  - (c) <option 3>
RECOMMENDATION: <peer 推奨 (a/b/c) + 理由 1 文>
```

### Field rules
- **QUESTION**: 1 文 (? で終わる)、Yes/No or (a)/(b)/(c) で答えられる granularity
- **OPTIONS**: 2-4 個 (1 個 = 判断不要、5+ 個 = scope creep)。各 option は 1 行 / 具体的 action
- **RECOMMENDATION**: peer が**必ず 1 つ推奨**。「お任せ」= 自走責任放棄 = NG。理由 1 文 (evidence / past judgment / Tier matrix 参照)

### Example

high の例 (send_message)。mid なら同 form を status.md `next_action` / `Notes` に記入:

```
URGENCY: high
NEEDS_ATTENTION: yes
ACTION_OWNER: conductor
REASON: 外部リソース新規作成の可否判定 (不可逆)
DEADLINE: 2026-05-19T12:00:00+09:00
EVIDENCE: PR #45

QUESTION: PR #45 に sub-issue X を含めるべきか?
OPTIONS:
  - (a) 現 PR narrow scope 維持 + sub-issue X = 別 PR
  - (b) PR #45 に統合 (+50 lines)
  - (c) sub-issue X 自体 defer
RECOMMENDATION: (a) narrow scope 維持 (review velocity 重視、独立 reviewable)
```

Phase 1 = soft enforcement (compliance 95% 目標、違反は guidance、reject しない)。Phase 2 で strict 化 (format 不在 = reject / wrapper enforce)。

<!-- COMMON-BLOCK-END: 18-judgment-request-contract -->

<!-- COMMON-BLOCK-START: 19-character-gate -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/19-character-gate.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## キャラクター gate — 機械テストで拾えない人間判断の合格基準

「テスト通過」が「コードが壊れていない」(型 / lint / build / LGTM) に偏り「成果物が実際に使える」(見える・操作できる・遊べる・読める・聴ける) を含まない曖昧さが誤認の温床 (MUEDear Build 78 事故: 基本 UI 見切れバグが型 0 + LGTM + Archive 成功で「通過」誤認 → TestFlight 素通り)。

### 各課はキャラクター gate を 1 つ持つ

機械テストで構造的に拾えない、人間が知覚して初めて分かる合格基準を各課が 1 つ名指しし、`.github/pull_request_template.md` の「成果物 verify」section に明記する。

| 課 | キャラクター gate の例 |
|----|----------------------|
| native / ゲーム | 実機で実際に遊べるか (画面が見える・ボタンが押せる) |
| dsp | 試聴 — 音のキャラクター |
| write / SNS | 外部読者として読めるか |
| blender | 別環境・素の状態で正しく見えるか |
| LP | 実 URL で表示・操作できるか |
| template | distribute dry-run 出力で全配布対象課に意図通りの差分か |

### 3 原則
- **工程名で分離**: 「ビルド成功 ✓」(機械チェック) と「実機で遊べた ✓」(キャラクター gate) を別チェック項目に。同じ「通過」で混同しない
- **証拠なしに「通過」と書けない**: スクショ / 録画 / dry-run 出力等の実行証跡を必須。evidence なしの「通過」記載は無効 (未検証扱い)
- **ツール化できない一線**: 最終判断 (試聴・実機体験・読者視点) は構造的に人間のもの。自動化は判断を「省く」でなく「届きやすくする」ために使う

Reference: `docs/dev-flow-gate-rollout-20260520.md`

<!-- COMMON-BLOCK-END: 19-character-gate -->


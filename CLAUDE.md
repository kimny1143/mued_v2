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
npm run test:unit                 # ユニットテスト（★CI が回すのはこれ・Docker 不要）
npm run test                      # ★全層 直列（unit+components+integration+e2e）。e2e/integration はローカル専用
npm run test:e2e                  # E2Eテスト
npm run typecheck                 # 型チェック
npm run lint                      # Lint
npm run build                     # ビルド
```

---

## プロジェクト概要

**MUED v2** - 音楽クリエイター向けプロダクトスイート（MUEDear: 耳トレ / MUEDial: AIミキシング / MUEDnote: 制作ログ / MUEDsp: プラグイン群〔無料 MUEDsat・MUEDlim・MUEDrive ＋ 有料線 masterchain〕 / MUED Advisory / MUEDlobe）

> ★**この列挙は腐る**（実際、上の3製品だけだった間に MUEDsp・Advisory が live になっていた）。★**live な製品の正本は `lib/plugins/registry.ts` の `PLUGIN_DIST`（`live` flag）と各 `lib/*/config.ts` の `*_LIVE`**。数える時はそちらを引くこと。

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
| **Frontend** | Next.js 16.2 (App Router), React 19, TypeScript, TailwindCSS 4 |
| **Backend** | Next.js API Routes, Clerk認証 |
| **Database** | Neon PostgreSQL, Drizzle ORM |
| **Payments** | Stripe |
| **AI** | 本番=OpenAI（RAG・ドリル生成 `lib/ai/providers/openai.ts`）＋ Anthropic Claude（Hoo/dial の会話 `lib/ai/providers/claude.ts`・SDK 直呼び） / 開発=MCP 経由 |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Analytics** | GA4 (gtag.js + `lib/analytics/gtag.ts`), Vercel Analytics |

### アーキテクチャ

- **App Router**: ファイルベースルーティング、Server Components優先
- **Repository パターン**: データアクセス抽象化 (`lib/repositories/`)
- **サービス層**: ビジネスロジック分離 (`lib/services/`)

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
- ★**orphan / データ branch を新設したら、同じ回に `vercel.json` を置く**: `{"git":{"deploymentEnabled":{"<branch名>":false}}}`。★**app も pages も無い branch を Vercel が build しようとして必ず ERROR になる**（`data/plugin-funnel-reports` が **9日連続**・**publish 自体は成功していたのに毎日 失敗メールが届き、本物の失敗が埋もれる**）。★**`vercel.json` は push された commit 側が読まれる**（実測）ので**データ branch に置けばよく、main は触らない**。★**`ignoreCommand` ではなく `git.deploymentEnabled`**——**前者は deployment を作ってから build を skip、後者は deployment 自体を作らせない**
- **価格改定は全レイヤーを網羅する**: Stripe定数 → UI → 翻訳(EN/JA) → AIプロンプト → テスト期待値。grepで旧価格を一掃してから検証
- **PoCは全フロー通るまで完了と言わない**: 一部動作だけでPR提案しない。エンドツーエンドで通して初めてPoC完了
- ★**`messages/*.json` に formatter を当てない**（2026-08-05 実測）。★**このリポには formatter が無い**——`.prettierrc` 無し / `package.json` に `format` script も prettier 依存も無し / `.editorconfig` `.prettierignore` `.vscode` すべて無し。∴ ★**「formatter-clean でない」という状態は定義されていない**。★**さらに悪いことに、2つのツールが★反対方向に整形する**: **#823 で入った reflow は1行のオブジェクトを4行へ★展開**（`"ceiling": { "name": …, "desc": … }` → 4行）した一方、★**prettier 既定は逆に配列を1行へ潰す**（`"features": [ 3行 ]` → 1行）。★**どちらを当てても、もう一方に対する churn を永久に作る**。**そして配列を1行に潰すと、翻訳の1項目を直しただけで行全体が reflow して diff が読めなくなる**＝★**現状の手書き整形の方が良い**。**整形 commit を出すなら、それは掃除でなく「どの formatter を採用するか」の規約決定**（内容は不変なので安全ではあるが、決めずに当てないこと）

---

## 異常値検出時の即時/plan発動ルール（mued課固有）

定点確認中に以下を検知した場合、次のアクション前に /plan を発動する。

- Stripe 決済失敗率: 直近24時間で 5%超（成功/失敗ログから算出）
- Vercel / Next.js ビルドエラー: 本番ブランチで2件以上連続
- Neon DB エラー率: Drizzle ORM エラーログが前日比 +200%超
- Core Web Vitals LCP: 2.5s 超（Lighthouse CI アラート検知）
- Clerk 認証エラー: 連続5件以上（middleware rejected rate）

閾値未達 → 定常確認として継続（/plan は発動しない）。★モデル名は書かない —— 同じ file の共通 block が「どの課がどのモデルで起動するかは…ここに複製すると必ず古くなる」と定めており、この節が言いたいのは起動モデルでなく /plan の発動可否。

---

## content課への canonical変更通知義務

公式pricing・product spec・ロードマップ等を変更した場合、content課に**組込み `SendMessage`**（宛先=`ListAgents` の name）で**通知必須**。★**規律は不変・transport のみ 2026-08-14 に変更**（旧=claude-peers）。★**旧経路は送信側に成功が返るのに届かない**。
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

## URGENCY marker — peer → conductor 送信の先頭 6 行 format

peer → conductor の送信（★2026-08-14 以降は★組込み `SendMessage`／宛先 = `ListAgents` の name）の message 先頭に固定 format で記入 (conductor 認知負荷削減の判断契約中核)。

**入口絞り (2026-05-30 kimny 決定 / 必読)**: peer は **`URGENCY: high` のみ 送信する**（★2026-08-14 以降は★組込み `SendMessage`）。low / mid は送信せず自 `status.md` に記入する (block 17、cowork が `peer-raw-status.md` に集約 → conductor が checkin/checkout/patrol/自ターン頭で FIFO 読取り処理)。これにより conductor へのプッシュ割り込みを最小化し、件取り違えによる捏造を防ぐ。下記 6 行 format は high 送信用。urgency vocabulary (high/mid/low) は status.md `urgency` field 含む全分類に適用。proposal v3 communication lanes (reporting.md) の厳格版。

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

- **迷ったら `mid`** (fallback) → 入口絞り下では送信せず status.md 記入 (high のみ送信)
- **`high` は REASON + EVIDENCE 必須** (EVIDENCE 不在の high は audit で `evidence_missing` 分類)
- **議論レーン** (kimny ↔ conductor 対話中) では high も送信抑制。conductor `set_summary` の hold 表示を peer 側 read で判定し、解除まで status.md 集約に寄せる
- **誤判定で mid を high にしない**: high は不可逆/当日 hard deadline/security/secret/外部リソース新規作成/課金・契約/production outage/data loss/kimny Tier 3 に限定 (上表 high 基準)。判断要請は block 18 form を high 送信 or status.md に記入

### 宛先の自称禁止・`from` 属性 正本原則

peer の識別子は **受信 message の `from` 属性を唯一の正本**とする (自分側からは自分の宛先を確実に知れない)。

★**2026-08-14 の経路変更でも ★この序列は不変**——**本文の自称 < `from` 属性 < 実時解決 (`ListAgents`)**。★**変わったのは道具名だけ**（旧 `from_id` / `list_peers` → 新 `from` / `ListAgents`）。

1. **peer は告知・メッセージ本文に自分の peer ID を書かない** (self からは自 ID を確実に知れないため)。
2. **受信側は常に channel の `from` 属性を正とし**、本文中の自称 ID と矛盾したら `from` を採る。
3. **再起動告知は「この `from` が新 ID」形式に統一** (本文に ID 文字列を書かない)。

> 背景 (2026-06-11・★旧経路 claude-peers 時代の実例だが教訓は不変): conductor 再起動時、`list_peers` が self を除外する構造のため出力に残ったゴースト `_conductor` エントリを自分と誤認 → 全課に誤 ID を配布。外部観測で訂正されたが、検知者不在なら全課送信が死箱へ向かうサイレント分断だった。

### ★値を渡す時は、その値を成立させる条件を同じメッセージに書く

★**hash / 件数 / sha / 時点データを課をまたいで渡す時、★その値を成立させる条件（アルゴリズム・計測時点・可変性）を同一メッセージに併記する。**

★**落ちるのは正本でなく「配る段」**。**手元の baseline には条件が書いてあるのに、peer メッセージで落ちる。**

**実測（2026-07-30・同型3回）**:
- ★**`shasum -a 256` と自分の baseline に在ったのに、メッセージで指定を落とし、受け手が sha1 で測って「合わない」と報告しかけた**
- **「未 commit」の時点を書かず、受け手が別時点で測った**
- **PR の head sha を書いたが「rebase で動く」を書かず、受け手が古い sha を見た**

★**∴ 値には必ず**: **どう測ったか（コマンド）／いつ測ったか（絶対時刻）／変わりうるか**。

#### ★★条件が 要ると 分かるのは ★受け手が ★別の台を 持っている 時だけ（2026-09-12）

★**上の 規則は「規則化した後も 2 回 再発」と 自分で 書いている。★★なぜ 守れないか が 抜けていた。**

```
★★1 台しか 無い 時、★どの値も 正しく 見える ∴ ★落としたことに ★気づく 機会が 無い
★★2 台目で 矛盾が 出る（＝検出）／ ★3 台目は「どれが 本番か」を 決める（＝決定）
★★∴ ★検出に 要るのは ★★2 台 —— ★他課へ 1 回 投げれば 足りる ＝ ★★この検査は 安い
★★但し ★2 台が ★違う 時だけ。★似ていれば 何も 出ず、
   ★それは「条件は 要らなかった」と ★★区別が つかない
   → ★投げる 相手は ★台が 違いそうな 方（★別 OS ／ 別 clone 経路 ／ CI）
   → ★何も 出なくても 書くのは「★この 2 台の 間では 差が 出なかった」まで
```

★**実測（2026-09-12・★3 課が 別々に 測った）**:
```
★CCO  … ★225M / 13s   ＝ まっさらな clone        ┐★どちらも ★絶対値
★mued … ★2.1G / 8.5s  ＝ reflog・他 branch 入り  ┘
★★CI   … ★clone の ★★増分 +4〜6 秒（baseline 2-4 → 8 秒）／ test 6.1 秒 ＝ ★本番の 台
★★↑ ★別の量 ∴ ★並べて 引き算しない（「CI の方が 速い」と 読める
   ＝ ★★本節が 扱っている 誤りが ★本節の 中に 在った）
★★3 つとも「full history」と 呼ばれていた。★気づいたのは ★2 つ目
★★CCO は ★前日 自分で「値は 測った日・repo つきで」と 配りながら、
   ★自分の +8 秒に ★台を 添えずに 出した
```

★★**足すのは「条件を 書け」では ない**（★それは 上に 在る）。★★**足すのは**:
```
★★① ★自分の 値が ★どの台の ものかは ★★自分では 検出できない（★比較対象が 無い）
★★② ∴ ★受け手が 別の台を 持っていそうな 時ほど ★厚く 書く（★他課 ／ CI 予測 ／ docs へ 焼く）
★★③ ★値に ★★「役目が 終わる 時点」を 書く
   ★例 …「+8 秒は『払える桁か』の 判断材料。★桁が 分かれば 役目は 終わり。★CI 予測には 使えない」
   ＝ ★★使い道を 限ると、★別の台へ 持ち出される 経路が 1 本 塞がる
```

★★**出所を 課名でなく 出来事に した 理由**: ★本節は「★自分では 検出できない」と 主張している
∴ ★★1 課を 起案者に 置くと ★主張と 書誌が 矛盾する。★CCO の 225M ／ mued の 2.1G ／
★CI の 3 つ目 ／ ★conductor の 事前予測 —— ★★どれが 欠けても この節は 生まれていない。

### ★規律・設計に触れる relay は、durable 層へ写す前に一次を1回 照合する

★**中継されてきた「規約はこうなっている」を、そのまま自分の memory / status.md / CLAUDE.md へ写さない。** ★**写す前に正本（`gh api` / 実ファイル / 実行）を1回 見る。**

**実測**: **conductor の誤配を2度 訂正して全課へ再配布した／規則化した後も 2回 再発した。**

★**再発する理由**（受け手の自己分析・逐語）: **「受け取った直後は既知として測定対象の外に出る」**——★**だから手順として挟む形にしないと止まらない。**

★**そして中継する側の規律も対**: ★**他課の成果物を中継する時は、中継する前に ref で1回 測る。「置いてある」をそのまま運ばない**（**2026-08-04: 「manifest は置いてあります」を ref なしで中継し、受け手が working tree を測って 0件・中継元は branch を測って在り、両方 正しく、見ていた場所が違った**）。

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

- format: ★**`claude-code-template` repo の** `docs/templates/peer-status-md.template.md` (frontmatter YAML ★15 キー)。★**自 workspace には配布されない** —— 必要なら repo から copy する（★2026-08-30 実測: 配布先 ★16課すべてで当該 file が不在。★conductor だけ `docs/templates/` 自体は在るが、★中身は別 file）

### update timing (必須)
- **task accept** (dispatch / review request 受領) / **blocked** (外部依存・kimny 待ち・cross-peer 停滞) / **PR submit** / **done**
- **low / mid の連絡は status.md のみ** (送信しない = 入口絞り block 15)。progress / done / routine PR / FYI / conductor 判断候補だが即時でない 等はここに集約され、cowork が `peer-raw-status.md` へ、conductor が FIFO で拾う
- **high urgency 発生時のみ**: 即 status.md update + URGENCY: high `SendMessage` 並行
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
- `urgency` field は URGENCY marker (block 15) と同一 vocabulary (high / mid / low)。**high 時のみ `SendMessage` 並行、low / mid は status.md 記入のみ** (入口絞り)
- `current_task` / `next_action` に外部リソース新規作成 (block 16 対象) を含む場合、pre-approval URGENCY: high 送信 を必ず並行
- stale 判定 (cowork cron): active 6h / blocked-waiting 2h / dormant 72h 超 (`expected_next_check_at` 優先) → conductor alert + ping

<!-- COMMON-BLOCK-END: 17-status-md-self-drive -->

<!-- COMMON-BLOCK-START: 18-judgment-request-contract -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/18-judgment-request-contract.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## judgment request contract — judgment request form

conductor 判断要請は urgency 報告でなく **conductor 即決可能な judgment request form** で渡す (判断材料収集を peer 側に shift)。

**チャネル (入口絞り block 15 準拠)**: **high** の判断要請のみ 送信に下記 form を添付。**mid** の判断要請は 送信せず status.md の `next_action` / `## Notes` に form を記入し、conductor が `peer-raw-status.md` を FIFO で拾って即決する。いずれも form 構造は同一。

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

high の例 (★組込み `SendMessage`)。mid なら同 form を status.md `next_action` / `Notes` に記入:

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

機械テストで構造的に拾えない、人間が知覚して初めて分かる合格基準を各課が 1 つ名指しし、★**自 repo の** `.github/pull_request_template.md` の「成果物 verify」section に明記する。★**無ければ作る**（★2026-08-30 実測: 配布先 16課すべてで不在。★`PULL_REQUEST_TEMPLATE.md` の綴りでも不在）。★**書き方の例＝`claude-code-template` repo の同 path**（★配布されない）。

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

Reference: ★**`claude-code-template` repo の** `docs/dev-flow-gate-rollout-20260520.md`（★**自 workspace には配布されない**）

<!-- COMMON-BLOCK-END: 19-character-gate -->

<!-- COMMON-BLOCK-START: 20-ui-mock-fidelity -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/20-ui-mock-fidelity.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## UI モック忠実性 DoD（新規 UI 面・re-skin・視覚再設計のみ）

承認済みモックが存在する/すべき UI 作業（新規面・re-skin・視覚的再設計）は、以下を DoD とする。
**既存実装の微修正（コピー1行・padding・バグ修正）は対象外**（既存 Tier/review 規律のまま）。

- **mock pin**: 承認 mock を filename/hash 等の一意識別子で pin（「案A/B」等の曖昧ラベル禁止）。mock 無しの UI 実装依頼は禁止。
- **数値移植**: 座標/寸法/色hex/フォント/余白を数値で移植（雰囲気移植禁止）。mock が自作 HTML/CSS なら実 source 値を 1:1 移植。
- **diff 添付**: 完了報告に render×mock の並置 + overlay/pixel-diff を必須添付。
  - **web = pixel-perfect 期待** / **native = 数値一致 + pixel-diff + 許容差明示**。
  - 非再現 flag は真に engine 由来（AA/hinting）のみ。font weight/size/座標 は fixable = 100% 一致必須（立証責任は flag 側）。
- **conductor vet**: 印象評でなくモック実見突合。「近い」却下・「見分けつかない」のみ通過 → kimny push。vet を経ない push 禁止。
- **mock hygiene**: pinned mock は shippable/house 資産（house/OFL font 等）で作る。system/proprietary font 混入禁止。

手順の詳細・技法・例外表 = `ui-mock-fidelity` skill を参照。
忠実性 gate（見分けつかない）は kimny 美的 gate の代替でない（別レイヤー）。

<!-- COMMON-BLOCK-END: 20-ui-mock-fidelity -->

<!-- COMMON-BLOCK-START: 21-status-md-writing -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/21-status-md-writing.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## status.md の書き方（前寄せ・肥大の退避）

SessionStart hook は起動時に status.md の `next_action` / `blocked_by` / `current_task` を注入する。**ただし各フィールド 6,000 バイトで打ち切られる**（打ち切り時は残りバイト数が表示される）。

### ★hook は「status.md を開く必要」を消さない

**開き忘れても先頭 6KB は載る、という保険にすぎない。**

ここを混同すると「**hook があるから大丈夫**」という新しい失敗を作る。**機構は規律を代替せず、規律の上に乗るだけ**。セッション開始時に自 status.md を自分で開く運用は、hook の有無にかかわらず続ける。

### ★context は「session と同じ古さ」— 新しいのは末尾だけ

★**resume した session の context は、最新のメッセージと同じ新しさではない。頭から中ほどは全部 session 開始時のもので、新しいのは末尾だけ。**

**注入に限った話ではない。** ★**context に載っている「前回の実測結果」「前回の一覧」「前回の PR 状態」は、すべて session と同じ古さ。**

**2026-07-31 に3件（3課）。★注入も記録も前日 7/30 産で、誤読は翌日。いずれも「context に在る＝今の事実」と読んだ形**:

- 注入の**「3 時間前」を読んだのは約22時間後**。18時間 古い status.md を現在形と信じて作業を始めた
- **自分の context 冒頭に在る前日の `/clear` 記録を「今 起きたこと」と読み**、機構の欠陥だと結論しかけた
- **「相手が未返信」を引き継ぎから運び**、確かめずに現在形として扱った

★**4件目はこの節自身**: **上の3件を書いた当人が、出来事の日付を1日 古く記録した**（**7/30 の会話の流れの中で書いたので、7/30 の出来事として綴じた**。翌日 別課が実測で指摘）。★**規律を書いている最中でも、書いている自分の context は同じ古さ。**

★**4件目の対処は「日付に気をつける」ではない**（**気をつけていた人が落ちた所なので効かない**）。★**実際の穴は、機械生成の規則が `last_update` フィールドにしか掛かっていないこと**——**同じ人が、同じ文書の中で、片方は `date` で生成し、もう片方は手書きした**（下の「`last_update` は `date` で機械生成する」と**同じ穴の両側**。片方は既に閉じていて、もう片方が開いている）。

> ★**日付・時刻は、フィールドか本文かを問わず、書き込みと同一コマンドの `date` から採る。** **「今日の会話の中で書いているから今日」は、★context の古さがそのまま本文に入る経路。**

**How to apply**:

- ★**相対時間（「N 時間前」「今朝」「さっき」）を context から読んだら、それは注入時点の値。** ★**注入行には絶対値も並んでいる**（`最終更新: <ISO8601> (N 時間前)`）——★**古くなるのは括弧の中だけで、絶対値は古くならない。** ∴ ★**括弧を信じず、同じ行の絶対値から自分で引き算する**（**行に「いつ計算した値か」の注記が在れば、それを使う**）。（★**「hook が併記してくれる」と前提しない**——**課によって出る行が違い、同じ課でも版によって変わる。★見るのは目の前の行。**）
- ★**「前回 測った」で済ませない。** 状態を主張する前にその場で測り直す（`git status` / `gh pr view` / `ls`）
- ★**鮮度警告が出ていないことは、新しさの証拠にならない。** 判定も生成時に1回きりで凍るので、**status 更新の直後に始まった session は何日 経っても警告を出さない**
- ★**配られてきた文書が「自分の環境」について主張していたら、1回 確かめる。** **全主張を検証しろ、ではない**——★**自分の repo の hook / script / 設定についての主張に限る**（**それは受け取り側にしか安く確かめられない**）。★**「文書を読む」と「文書の主張を確かめる」は別**（**2026-07-31: 配られた節が実在しない hook 挙動を断言していたが、`grep` 1回で潰せる主張だった。全課が読んで commit し、確かめたのは1課**）

### ★前寄せの前に「どの欄か」（★バイト数の話ではない）

★**注入されるのは `next_action` / `blocked_by` / `current_task` の3欄だけ。**
★**`evidence` / `## Recent events` / Notes は、どれだけ短くても次のインスタンスに届かない。**

∴ ★**前寄せとは「6,000 バイトの中で前に置く」だけでなく、まず「★届く3欄のどれかに置く」ことである。**

**2課が別入口で同じ壁に当たった（2026-07-30）**:
- ★**「前寄せをバイト数の話として理解していて、欄の話として理解していなかった。6,000B に収まっていても、★載らない欄に書けば 0。」**
- ★**「『規律を書いた場所』を『届く場所』と取り違えない。events / Notes に書いた規律は、次のインスタンスには存在しない。」**

### 前寄せ（最も効く1点）

★**現在形を各フィールドの先頭に書く。** 6,000 バイトで切られるのは**末尾**なので、**先頭に置いたものだけが確実に届く**。

- `next_action` の冒頭に「**次に何をするか**」を置く。経緯・背景・過去の判断は後ろ
- `current_task` の冒頭に要約1〜2文を置く。叙述や完了済み arc の記録は後ろ
- ★**「今日の訂正」「期日が今日のもの」「触ってはいけないもの」は必ず先頭**。末尾に書くと落ちる

実例: ある課の `next_action` は 27,814 バイトあり **21,814 バイト（78%）が落ちた**。冒頭に RESUME POINT を置いていたため助かったが、**末尾に書いていれば消えていた**。

### ★経時で見る — 「今 載っているか」でなく「更新のたびに押し出されていないか」

**前寄せは、書いた瞬間の話でしかない。** ★**status.md は更新のたびに前へ足されるので、古い記述は毎回 末尾へ押し出される。** **その中に「まだ生きている watch」が混ざっていると、静かに注入圏外へ出る。**

★**実例（2026-07-26・SNS課）**: **唯一の live watch（8/5 の token 手動 refresh・期限つき）が、`current_task` 71,039 バイトの先頭 8% の外に落ちていた。**

> ★**「壊れていた」なら気づけたが、これは「静かに落ちていた」ので、指摘がなければ当日まで気づかなかった**（SNS課）
> ★**「消えない欄に置く」の次は「その欄が注入されるか」だった**（同）

★**∴ 更新のたびに「期限のあるもの・まだ生きている watch」が圏内に残っているか確認する。** **足すだけでは足りない。**

### ★肥大の主因は「情報が多い」ではなく「同じ情報が何度も」

**2026-07-26 に2課が独立に同じ診断へ到達した**:
- **CCO**: `next_action` 18,252 バイト → **2,693 バイト**。中身は ★**同じ内容の15回ぶんの重複**（更新のたびに前を消さず前置していた）
- **SNS課**: `current_task` 71,039 → **4,848 バイト** / `next_action` 12,360 → **4,228 バイト**。★**「同じことを2箇所に書いていたのが肥大の主因」**

★**畳む時は、履歴を消すのでなく退避する。** **SNS課の形が良い**: **32ブロックを `docs/status-archive-*.md` へ移し、★抜き取り検査で archive 側に実在を確認**（**「退避したつもりで消えていた」が起こりえない形にする**）。

★**そして「畳んだ」で止めず「畳んだ結果 何が載ったか」を測る。** **SNS課は畳んだ後、圏内に入った6項目を名指しで確認している。**

### `blocked_by` も注入される

★**standby 表現を放置しない。** `blocked_by: なし` のまま実態が変わっている、が起きやすい。`urgency` / `action_owner` / `deadline` を直したら **`blocked_by` も一緒に見る**。

### ★`last_update` は `date` で機械生成する（手書きしない）

★**手書きの丸め（`10:00` `12:30` 等）が、実際の書込より★未来の時刻を作る。**

**実測（2026-07-30・ある課の自課40版）**:
| | |
|---|---:|
| ★**main 着地より未来だった版** | ★**30 / 40** |
| ★**手書き丸め** | **38版中 30** |
| ★**`date` で機械生成** | ★**2版中 0** |

★**ほぼ完全に分離する。** 書く時は **書込と同一コマンドで `date` を打つ**（別々に打つと、その間の時間が乖離になる）。

★★**なぜ「少しの未来」が危ないか**: ★**鮮度検査は「stamp の方が新しい」を `ok` と読む。** ∴ ★**未来 stamp は、複数ある検査を★同時に沈黙させる。** ★**沈黙させるのに必要な量は 0**（1秒 未来でも `ok` になる）。

**∴ 検査を書く側は、★3本の検査の手前に「`last_update` が未来でない」を1行 置く。未来なら、検査の結果を出さずに FAIL。**

★★**閾値は向きごとに別。対称に戻さないこと**:
| 向き | 閾値 | 導出 |
|---|---|---|
| 古い側 | **1h** | stale 窓から導出 |
| ★**先付け側** | ★**5秒** | ★**検査が同時に沈黙する量が 0 だから** |

> ★**起案者の申し送り（逐語）**: ★**「『対称化は導出ではない』と自己訂正した部分が、そのまま挙動に入っています。配る時に対称に戻さないでください（戻すと fleet の先付けを1件も検出しません）。」**

★**検査には self-RED を埋める**——**手で1回 通した RED は、検査が変わった日に誰も再実行しない。**

### 肥大したら退避する（cap を上げるのではなく）

★**フィールドが打ち切られるのは、cap が小さいからではなく status.md が無制限に育っているから。** cap を上げるのは**肥大を許容して見えなくする方向**。

**退避のやり方**（freee課が実演・133KB → 61KB）:

1. 古い Recent events を `docs/status-archive/<開始日>_<終了日>.md` へ移す
2. ★**全数保存を「件数」と「行 diff」の両方で verify してから**元を消す（移したつもりで落ちる事故を防ぐ）
3. status.md 側に退避先を1行残す — 例: `> 2026-07-24 以前は docs/status-archive/2026-05-01_2026-07-18.md へ退避`
4. ★**閾値運用を自分の status.md に書き込む** — 例: 「50KB を超えたら再退避」。書いておかないと次に誰も気づかない

**目安**: status.md は **Read 1回で開ける size** に保つ。`current_task` / `next_action` が 6,000 バイトに近づいたら退避時期。

### ★memory と status.md の線引き — memory に「現在の状態」を書かない

**memory = 腐らない型 / status.md = 現在形。**

★**memory に「未確認」「〜待ち」「pending」「要確認」を書かないこと。** これらは**書いた瞬間から腐り始める**。memory は次のセッションが読むまでの間 更新されないので、**その間に解決した事柄が「未解決」として次のインスタンスへ渡る**。

実例（2026-07-25・SNS課）: handoff memory の末尾に「未確認の drift（要確認）」と書いた **15分後に当該 PR が merge** され、**修正済みのものを「未修正」として次のインスタンスに渡していた**。

**書き分け**:
- **memory に書く** — 型・教訓・判断基準・非自明な経緯（**時間が経っても真であり続けるもの**）
- **status.md に書く** — 手番・ブロッカー・待ち・期日（**現在形。更新の責任が明確なもの**）

### ★handoff memory は「ポインタ」として書く

内容を複製すると必ず腐る。**ポインタは腐らない。** SessionStart hook は memory を **mtime 降順で機械的に1件**選ぶだけなので、**古いものが拾われても「status.md を読め」だけは正しく伝わる**形にしておく。

★**`touch` で mtime だけ上げるのは逆効果。** hook は mtime で選ぶので、**中身を直さず mtime を上げると「古い中身」が確実に拾われる**。**更新するなら中身を直すこと。**

> **なぜこれを禁止として書くか（2026-07-25 の near-miss）**: この禁止事項は、**hook が mtime 降順で選ぶ仕様を当日 自分で発見した本人が、同じ日に `touch` を実行しかけた**ことから来ている（一括置換で memory 全件の mtime が動いたのを戻すため）。**たまたま中身を書き換えた後だったので実害はゼロ**で、**順序が逆なら「古い中身を確実に拾わせる」操作**だった。**気づいたのは第三者が別の文脈で却下理由を説明したから**で、自力では気づいていない。
> ★**知識を持っていることと、それを自分の手に適用することは別**。だから規律として書く。

### ★残タスクは `next_action` でなく `blocked_by` に置く

**欄によって生存率が違う。** `next_action` は次の更新で**書き換わって流れる**——**「あとでやる」を置くと、その "あと" に担い手も期限も無いまま消える**。

実例（2026-07-12・mued）: 退役対応を「merge/deploy の後でやる」と後ろへずらし、**その "後" が来ないまま落ちた**。★**落とせないものは `blocked_by` に置く**（`blocked_by` は「解消されるまで残す」欄なので、消すには解消が要る）。

★**退役・削除・停止は構造的に fail-silent。** 追加なら公開物ができるので下流も気づくが、**退役は「見えなくなる」だけ**なので、**下流は古いものを言い続けたまま誰も違和感を持たない**。**退役タスクほど `blocked_by` に置く。**

（3日より古い handoff は hook 側が1行に畳むが、それは緩和であって、**古い内容が「引き継ぎ」として名指しされること自体は変わらない**。）

### 休止・終了した workspace

`activity: dormant`（または `archived` / `retired` / `closed` / `停止` 等）を宣言すれば、**24時間ルールの鮮度警告は出なくなる**。★**古いことと間違っていることは別**。役割が終わった workspace の status.md は、古いまま正しい。**動いているふりをさせない**こと。

<!-- COMMON-BLOCK-END: 21-status-md-writing -->

<!-- COMMON-BLOCK-START: 22-git-ops-after-guard -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/22-git-ops-after-guard.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## git 運用とガード / ★検査そのものの落とし穴

### `gh pr merge --squash` の後は `git pull` を使わない

```bash
git fetch origin && git reset --hard origin/main
```

★**理由**（理由を書かないとガードごと外される）: `--squash` は origin に**元のコミットとは別物の1コミット**を作る。その後 `git pull`（= `fetch` + `merge`）すると、ローカルの元コミットが残ったまま merge が発生し、**ローカル main が永久に `ahead` になる**。内容は同じなのに `ahead=44` のような状態が残り、「未 push の作業がある」ように見えて**本物の未 push を隠す**。

**実測**（2026-07-25・全13 workspace）: `ahead` があったのは2課のみ（`ahead=44` / `ahead=43`・**両方とも内容差ゼロ**）。両課とも起点は同日で、**squash-merge を高頻度で回す課だから先に顕在化しただけ**。★**同じ操作をすれば どの課でも起きる。**

`reset --hard` はローカルの未 commit 変更を捨てるため、**未 commit の作業が無いことを確認してから**実行する。

★**ただし「`git pull` を使わない」は無条件ではない。** 上の理由文自身が条件を書いている——**壊れるのは「ローカルに元コミットが残ったまま」の時**。**自分が出した PR を squash-merge した直後がそれに当たる。**

**手順はこの順で試す**:

```bash
git pull --ff-only                 # ① 通れば これで終わり（何も捨てない）
# ② 拒否されたら（＝ローカルに別物のコミットが在る）
git status --short                 #    ★先に未 commit を確認する
git fetch origin && git reset --hard origin/main
```

★**`--ff-only` は「捨てる物が在る」時にだけ失敗する**ので、**①が通った時点で②は不要**と分かる。**いきなり `reset --hard` を打つと、①で済む場面でも毎回 未 commit を捨てる危険を負う。**

★★**自動化では特に重要**: **`reset --hard` を cron / launchd に入れると、②の `git status` 確認をする人が居ない。** 実例として **cowork の集約 cron は `--autostash` で 2026-07-25・07-27 に3回 事故している**。★**無人で走る経路には「捨てる操作」を置かない**——**`--ff-only` で失敗させて人を呼ぶ方が安全。**

### feature branch は必ず `origin/main` から切る

```bash
git fetch origin && git checkout -b <name> origin/main
```

★**`git checkout -b <name>` だけだと、今 居るブランチから切れる。** 直前の feature branch に居ると、**その未 merge コミットを新しいブランチが継承する**。結果、**別件の変更が混ざった PR** ができ、**Tier 判定も混ざる**（docs のつもりの Tier1 PR に、コード変更が同梱されて self-merge される）。

★**「main に居ることを確認する」ではなく「どこに居ても main から切る」。** ★**確認を不要にする方が、確認を足すより強い。**

実例（2026-07-26・同日に2課が独立に踏んだ）: 一方は **Tier2 レビューを bypass して merge**（status.md の Tier1 PR に workflow のコード変更が同梱）、もう一方は **作業ツリーが docs branch に放置されていて、そこで編集を続けていた**。★**個人の不注意ではなく、既定の挙動がそうなっている。**

### self-merge の前に、実 diff を見る

```bash
gh pr view <n> --json files
```

★**Tier 判定は「何を変えたつもりか」でなく「実 diff に何が入っているか」で決める。** 上の branch 継承事故は、**merge 前にこの1行を実行していれば止まっていた**（実際、事後に同じコマンドで原因が特定された）。

### 宛先を直したら、同じ宛先を持つ他の層を全部 grep する

```bash
grep -rn "<旧宛先>" . ~/.claude/projects/<自課>/
```

★**1つの宛先は、たいてい複数の層に書かれている** — `CLAUDE.md` / skill / memory / script / doc。★**「直した層の中では完全」でも、層をまたぐ検索を1回しないと残る。**

実例（2026-07-26）: ある課は消えた課名を **CLAUDE.md → skill → memory の3層**で踏んだ。**3回とも、直した層の中では完全だった。** 足りなかったのは**層をまたぐ検索1回**。

### ガードが止めたら、次の一歩まで示す

★**止めるだけで次の一歩を示さないガードは、放置か迂回を生む。**

- **ガードのメッセージには、正しい進み方を具体的なコマンドで1行添える**。「main への直 push は禁止」だけでなく、`git checkout -b fix/<内容>` まで書く
- ★**ガードは「置いてある」ではなく「配線されている」ことを確認する。** hook スクリプトが `.claude/hooks/` に存在していても、`settings.local.json` の `hooks` に登録されていなければ **1度も動かない**
  - 実例: ある課では `block-main-push.sh` が着任日に scaffold されたまま未配線で、**その課の main 直 push を止められなかった**。**ガードが「有るのに効いていない」**
  - 確認: `settings.local.json` に `hooks` キーがあるか / そこに当該スクリプトのパスがあるか。**ファイルの存在は配線の証拠にならない**
- ★**そして、示したその一歩が、同じガードの検出対象になっていないか確かめる。**
  - **実例（2026-08-04・dsp）**: **ガードが「本体が無い。この branch を checkout して復旧せよ」と印字し、★その直後に当の `git checkout feat/xcodebuild-live-guard` を自分でブロックした**（**判定が生 JSON の部分一致で、branch 名に検出語が入っていた**）
  - ★**復旧手順を書く相手はガード自身でもある。** **メッセージに書いたコマンドを、そのガードに1回 通す**

### ★ガードの説明を Bash の heredoc に書かない（use と mention の区別）

★**文字列マッチのガードは、対象（use）と言及（mention）を区別しない。** **ガードについて説明を書くと、その説明文がガードに引っかかる。**

**実測（2026-07-29・2課が独立に踏んだ）**——**完全に無害なコマンドが止まる**:

```bash
cat <<'DOC' > /dev/null
危険な操作の例として git push origin main と書いてあります。
DOC
# → BLOCKED（★何も実行していない。/dev/null に流しただけ）
```

★**ガード自身のエラーメッセージにも同じ語が入っている**ので、**その文面を Bash 経由で扱うと再び止まる**。

**対処**: ★**hook / ガード / 危険コマンドの説明文は、Bash の heredoc でなく `Edit` / `Write` ツールで書く。** **PR 本文・commit message も、`gh` に heredoc で渡すと同じ経路に乗る。**

★**「邪魔だからガードを緩める」に行かないこと。** **止まった時に確かめるべきは「本当に実行されうるのか」で、`git branch --show-current` と `git status --short` で ★PreToolUse は中身を1つも実行していない ことを先に確認する。** **緩めるのは、それを確かめた後の別の判断。**

### ★「過検出だ」も主張であって測定ではない

★**上の節の確認は「ガードが既に壊したか」を見るもので、「止められた入力が本当に無害だったか」は見ていない。** **別の問いなので、別に測る。**

**実測（2026-08-04・dsp）**——**ガードを4度 踏んだ末、4度目を過検出と読んで検出を1つ取り下げた。★しかし4度目は正しい検出だった**:

```
A 二重引用符 : bash -c 'echo "説明: `echo RAN` を止める"'   → 説明: RAN を止める        ★中身が実行された
B 単一引用符 : bash -c "echo '説明: \`echo RAN\` を止める'"  → 説明: `echo RAN` を止める  実行されない
```

★**二重引用符の中のバッククォートは、シェルが実際に実行する。** ∴ `git commit -m "… \`危険なコマンド\` …"` は**本当にそのコマンドを走らせる**。「markdown のインラインコードのつもり」は書き手の意図であって、シェルの意味論ではない。

★**2026-08-29: ★本 block の管理者（CCO）が、この節の逐語どおりに踏んだ。** 検証器の出力に射程を印字しようとして `echo "… \`codex exec\` …"` と書き、**シェルが backtick を実行して script が停止**（`codex exec` が stdin 待ちで止まった）。★**書いた側が、書いた文の指す通りに踏む** —— **だから「気をつける」ではなく `Edit` / `Write` で書く手順にする。**

★**自分の散文が止められると、人は反射的に「過検出」と読む。** **その読みは、止まった入力を実際に走らせて確かめるまでは仮説。** **対処は★書き方を変える側**（`Edit` / `Write` で書く・単一引用符にする）で、**検出を取り下げるのは最後**。

### ★検出器の射程を狭める時は、狭めた分が他で覆われることを仕様で確かめる

**過検出を消すために対象を狭めるのは正しいことがある。★ただし「狭めても大丈夫」は文法・仕様で示す。**

**同じ実測から出た物差し**（シェルのコマンド区切りの例）: ★**その記号は、新しいコマンドを始めるのに前置の区切りを必要とするか。**

```
echo hi (echo x)      → ★構文エラー   ← ( は前置の区切りが要る
echo hi ; (echo x)    → ★構文OK       ∴ ( を外しても ; 側で割れる = 無料
xcodebuild `echo x`   → ★構文OK       ← バッククォートは前置の区切りが要らない
                                         ∴ 外すと射程が本当に落ちる
```

★**同じ「1文字を対象から外す」でも、片方は無料で片方は穴になる。** **見た目の対称に頼らず、1つずつ当てる。**

### ★規則と例が矛盾したら、例が勝つ

**人もモデルも、抽象より具体を真似する。** 規則を書いたら、**同じ文書の中の例・テンプレート・サンプル出力がその規則を破っていないか**を必ず確認する。

実例（2026-07-25）: `peer-id-lookup` skill は「**peer ID はセッションごとに変わる。ハードコードしないこと**」と明記しながら、**同じ file の出力例で peer ID をハードコード**していた（`native課のpeer ID: mz3ubfhc`）。**規則は正しく、例が破っていた。** 読む側が真似するのは例の方。

★**この実例の記述自身が 3週間 誤っていた**（dsp 指摘 2026-08-04）: 当初は「注意書きの★直下の例」と書いていたが、★**直下は 7/25 に直っており、★残っていたのは同一 file 下方の別の例**だった。

★**CCO が git 履歴で実測（2026-08-15・commit `3a35e4fe`・claude-code-template repo）**:

```
行55: 「★peer ID をこの skill や doc に書かない」   ← 規則
行76: - fyl8gi3j (ttys012, last seen: 03:14)        ← ★実 ID
行77: - ab12cd34 (ttys018, last seen: 03:10)        ← ★実 ID
行91: 「peer IDはセッションごとに変わる。ハードコードしないこと」 ← ★規則（2回目）
```

★**規則と例の距離は ★21行。★しかも例は★2つの規則文に挟まれていた。** ★それでも3週間 残った。
★∴ ★**「直下」という語が検査の窓を狭く見せる。★検査の範囲は「同一 file の★全ての例」。**

★**チェックの仕方**: 規則を追加・変更したら、**その規則の検査語で自分の文書を grep する**。規則文だけがヒットして例がヒットしないのが正常。

★**ただし1つ 例外が要る**: ★**「違反の実例として引用しているもの」は ★ヒットしてよい**（★この block 自身が `mz3ubfhc` / `fyl8gi3j` / `ab12cd34` を持っている）。
★**区別は「読む側が真似できる位置に在るか」**——★**手順・テンプレート・出力例に在れば違反、★『こう書いてあって誤りだった』の引用なら正しい。**
★★**grep だけでは この2つを弁別できないので、★ヒットしたら1件ずつ開く。** ★**件数で判定すると、★引用を消して実例そのものを失う。**

### ★ガードや検査を足したら、それが実際に測っていることを確かめる

**「検査を置いた」と「検査が効いている」は別。** 特に **0 件・緑・skip を返す検査は、壊れていても壊れて見えない**。

実例（2026-07-25）: 配布スクリプトの `--dry-run` が **差分の有無にかかわらず「差分件数: 0」** を返していた（`rsync -avn` に `-i` が無く、grep が期待する itemize 形式に一致しなかった）。**「配る前に確かめる」ための機構が確かめておらず、規律の方が空回りしていた。**

★**確かめ方**: **必ず差分が出る条件を1つ作って、検査がそれを検出することを見る**（検出できないなら、0 は「差分なし」の証拠にならない）。

### ★同じ `grep` が、叩く場所によって別物になる（symlink ディレクトリで 0 が返る）

★**`memory/` は symlink のディレクトリ。`/usr/bin/grep -r` はこれを辿らず 0 を返す。**

**実測（2026-07-30・conductor と CCO が別々の dir で再現。確実に在る語を陽性 control に使用）**:

| 叩き方 | 件数 |
|---|---:|
| shell の `grep -rl <dir>`（Bash tool 内） | **44 / 202** |
| `/usr/bin/grep -rl <dir>` | ★**0** |
| ★**`/usr/bin/grep -Rl <dir>`** | ★**0 — `-R` にしても直らない** |
| ★**`/usr/bin/grep -rl <dir>/`**（末尾スラッシュ） | ★**44 / 202** |
| `/usr/bin/grep -rl <realpath>` | 44 / 202 |

★**弁別しているのは `-r` / `-R` ではなく、起点パスの末尾に `/` が在るか。** **`-R` に変えても 0 のままなので、「`-R` を使え」は効かない規則。**

★★**ただし落ちるのは symlink が「パスの★最終要素」の時だけ。** ★**途中の要素なら OS がパス解決するので BSD grep でも落ちない。**

| 起点パス | `/usr/bin/grep -rl` |
|---|---:|
| `<memory dir>`（★最終要素が symlink） | ★**0** |
| 同上 + 末尾 `/` | **44** |
| ★`~/Dropbox/_DevProjects/<課>`（★途中が symlink・最終は実dir） | ★**178** |

★**この上限が無いと「symlink が在れば危ない」と読まれる。** ★**hook の配線は全課 Dropbox 側（＝途中に symlink）なので、そう読むと12課ぶんの hook パスが全部 疑わしく見える。**

★**確認は「危ない側」と「危なくない側」を必ず一緒に走らせる**（片方だけだと過剰反応する）:

```bash
M=~/.claude/projects/<自課>/memory
ls -ld "$M"                                          # symlink か
/usr/bin/grep -rl . "$M"  | wc -l                    # ★0 なら該当
/usr/bin/grep -rl . "$M/" | wc -l                    # 末尾 / で戻る
/usr/bin/grep -rl . ~/Dropbox/_DevProjects/<自課> | wc -l   # ★非0＝途中は安全
```

★**なぜ同じコマンドで結果が違うのか**: **Bash tool 内の `grep` は Claude Code が挿入した★シェル関数**（`shell-snapshots/` 由来・`ugrep` を呼ぶ）で、**こちらは symlink を辿る**。★**`subprocess.run(['grep',…])` や script 内から呼ぶと `/usr/bin/grep`（BSD grep）**になり、辿らない。

★**そして 0 は exit=1・stderr 空で返る**——**「無い」と「辿れていない」が出力で区別できない。**

**対処**:
- ★**起点パスの末尾に `/` を付ける**、または **realpath を解決する**（`python3 -c "import os;print(os.path.realpath(p))"`）
- ★**確実に在る語で陽性 control を1件 出す**（今回、これが唯一の検出手段だった）
- ★**「0件だった」を報告する時は、★どこから叩いたかを併記する**（Bash tool か script か）。**書かなければ、読む側は検証できない**

### 非決定的なガードに対して、通るまで再試行しない

★**「運が良ければ通る」は「通ってよい」ではない。**

harness の分類器などが非決定的に DENY する場合がある。**通るまで試すのは回避行為**。DENY は「**人間の明示 go を挟め**」というサインとして扱い、**上に上げる**。

★**「以前は transient だった」という自分の過去の観測を、今回の再試行の正当化に使わない。** 過去の観測は、未来の自分の言い訳になりやすい。

#### 実例: 「検査が本当に検出できるか」を先に確かめた4件（2026-07-25・同日・別々の課）

| 課 | 何をしたか |
|---|---|
| dsp | 旧実装に戻すと**新テスト2件が落ちること**を実測してから直した |
| template | `-i` を外した状態で**「差分があるのに 0」を再現**してから直した |
| mued | **proxy でなく性質を測る**（callable を pin せず、brace 展開が実際にできることを assert） |
| template | **「無いこと」でなく「在ること」を測る**（配布後、旧記述が 0 件なのは `rm` でも成立するため、新記述の実在を全配布先で確認） |

★**4件とも別々の課が独立に同じ形へ着いた。** 原則だけなら抽象的だが、**同日に4件 並ぶなら、これは個人の慎重さでなく組織の型**である。

### ★ガードが止めた後、止まったことに気づかず次へ進む

★**ガードは「止めた」ことを出力に出すが、★止まったことを次の行が読むとは限らない。**

**実測（2026-08-04・2課が独立に）**:

- ★**`git checkout master` が失敗（未 commit の変更が上書きされる）したのに、そのまま `commit` + `push` へ進み、★status 更新が feature branch に載った**。★**`set -e` も効いていなかった**
- ★**`git add` が gitignore 規則で失敗したのを `2>/dev/null` で隠し、★commit されていないのに `push` まで進んだ**（**`&&` 連鎖が切れていた**）

★**共通形**: **止めた側は正しく止めている。★次の行が「止まった」を読んでいない。**

**How to apply**:

- ★**状態を変える操作（`checkout` / `add` / `commit` / `push`）を `&&` で繋いだら、途中の失敗が★どこで止まるかを1回 声に出す。** **`;` で繋ぐと止まらない**
- ★**`2>/dev/null` は「検査から除外したものは検査していないのと同じ」のシェル版。** **失敗を隠す場所に書かない**（**見たくないのは stderr であって、失敗ではない**）
- ★**「意図した場所が正しいか」でなく「★どこに行ったか」を測る**（**`origin/master...master → 0 0` は、commit が別 branch に行った時も ✓ を返す**）

### ★「未 commit の差分ゼロ」は ★tracked についてしか言っていない（2026-08-05 dsp 実測）

★**`git status --porcelain | grep -v '^??'` が空でも、★checkout は中断しうる。**

```
✗ 「未 commit 差分ゼロを確認 → 安全に checkout できる」
✓ 「★tracked に未 commit 差分ゼロ。★未追跡ファイルは別に数える」
```

★**機序**: **`^??` を落とした時点で、★未追跡は母集団から外れている。** ★**切替先に同じ path の tracked ファイルが在ると、★未追跡が上書きされるので git が止める。**

★**How to apply**: ★**checkout の前に測るなら、★`grep -v '^??'` を付けない**（**付けると「安全」の根拠が★見たいものだけになる**）。

### ★★「main に居る」は ★branch についての主張で、★現在形についての主張ではない（2026-08-05 実測）

★**同じ症状（fleet が古い hook を実行している）に、★原因が2つ在った**:

```
① 正本 workspace が feature branch に居る
② ★main に居るが pull していない（★branch は正しい）
```

★**②は「branch を確かめる」では出ない。** ★**測れる述語はこれ**:

```
git rev-list --left-right --count HEAD...origin/main    → ★"0	0" だけが現在形
```

★**How to apply**: ★**共有物の現在形を主張する時は、★branch 名でなく★上の述語を引く。** ★**「main に居ます」は根拠にならない。**

<!-- COMMON-BLOCK-END: 22-git-ops-after-guard -->

<!-- COMMON-BLOCK-START: 23-done-vs-delivered -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/23-done-vs-delivered.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## ★やった ≠ 届いた（完了と書く前に、下流で観測できる事実を1つ）

★**「完了」と書く前に、★下流で観測できる事実を1つ挙げる。** 自分の側で終わったことは、届いたことの証拠にならない。

**同じ形が別の言葉で何度も出る**:

| 自分の側 | ★届いた側 |
|---|---|
| **PR を merge した** | ★**発出された**（通達が相手に届いた） |
| **repo 側で完納した** | ★**live に反映された**（deploy が降りた） |
| **コードを直した** | ★**イベントが到達した**（計測が動いた） |
| **配布した** | ★**commit 着地した**（さらに ★その課のセッションが読んだ） |
| **script を書いた** | ★**実行された**（誰かが回した） |

★**欠落は全部「人・別 repo・別ドメイン・別プロセスが挟まる境界」で起きる。** 自分の workspace の中で完結する作業では、まず起きない。

★**∴ これは per-workspace の memory では構造的に止まらない**（**境界の向こう側は自分の memory に載らない**）。**だから共通ブロックに置く。**

### 実測（2026-07-28〜08-03・1週間で4課7回）

- **通達 #263 / #265 が「merged」で止まり未発出**（**受け手は一度も見ていない**）
- **CTA 17本が repo 側 live なのにページに未反映**
- **GA4 イベントがコード修正後も未到達**
- **配布が working tree 止まりで未 commit**（**8課ぶん**）

★**7件とも「自分の側では終わっていた」。** **どれも嘘をついていない——★観測の位置が自分の側だっただけ。**

### How to apply

★**完了報告に、下流の事実を1行 入れる。** 無ければ「まだ届いていない」と書く。

```
✗ 「PR #123 を merge しました」
✓ 「PR #123 merged → ★相手の repo の origin/main に着地を確認（grep で本文1件・陰性 control 0）」
✗ 「配布しました」
✓ 「配布 → ★11/12 が commit 着地（残り1課は未 commit・依頼済）」
```

★**状態は2値でなく3値で書く**: **`未実行` / `実行済だが未着地` / `着地確認済`**。★**「merged」と「実行済」は別**（**正本の変更と、それを回したかは別行為**）。

### ★★機序は「やり忘れ」ではない ——「どこに・いくつ やったか」の記憶が実物とずれる

★**2026-08-04 に3件・全て「★作業は実際にやったうえで、申告がずれた」形**:

```
「block 25 に入れた」    → 実物は★script のコメント（別の場所に入れていた）
「conductor へ回す」     → status に書いて★送っていない
「両ファイルに追記」     → ★1ファイルのみ
```

★★**3件とも、1つ目を書いた時点で★完了として記憶に登録されている。** ★**∴「忘れずにやる」では防げない**——**やってはいる。★ずれているのは場所と件数の記憶。**

★**How to apply**: ★**完了と書く前に、★「どこに」と「いくつ」を★実物から引き直す**（**記憶から書かない**）。★**`grep` 1回・`ls` 1回で足りる。**

### ★「〜可能です」は★能力の記述で、「〜未作成」は★残タスクの記述（product 起案）

★**同じ事実を指していても、★次に読む人に与える手番が逆になる。**

```
✗ 「CSV 出力も可能です」        → 読み手は「在る」と受け取る（★手番はゼロ）
✓ 「CSV 出力は★未作成（実装すれば可能）」 → 読み手は「作る人が要る」と受け取る
```

★**「可能」は★実装されていなくても真**になる。★**能力を述べる文は、完了報告の中では★完了として読まれる。**

★**これは「やった ≠ 届いた」の★手番版**——**前者は「自分の側で終わったか」、こちらは「★読んだ人に手番が渡るか」。**

### ★到達の観測点は「型ごと」に違う（2026-08-04 mgc 実測）

★**「読まれたまで確認せよ」は書かない。** **skill には強すぎ、memory には弱すぎる。** ★**型ごとに観測点を先に決めて、その1つを報告に添える。**

| 型 | 到達の観測点 | ★実際に見た壊れ方 |
|---|---|---|
| **skill** | 配布先セッションの一覧に `name`+`description` が出る ＝ ★**invocable になった**（★**本体はここでは読まれない**——`Skill` で invoke した時に load される） | — |
| **CLAUDE.md block** | 配布先セッションの **context に本文が現れる**（★skill と違い**本文まで観測できる**） | — |
| **hook** | **起動時に実出力が出る** | ★**dry-run が通っても本番経路は別**（dry-run 成功の3日後に、本番注入を別途 実測して初めて確認） |
| **memory** | **recall 時に本文が出る** | ★**index 1行だけ来て本文が来ない劣化**を実検出 ＝ **「index が在る」は「本文が届く」ではない** |

★**この表自体が、この節の主題に当たった実例から出ている**——**提供された当初の証拠は「harness が読んだ」だったが、★実際に観測されたのは `description` までで、本体は読まれていなかった。** ★**提供した側が、block に入る前に自分で1段 弱めた。**

★**再現性の限界も一緒に持つ**: **この観測は配布がセッション途中に起きたため偶然 見えたもので、harness の挙動に依存する。** ∴ ★**再現可能にするなら「配布後に配布先セッションを1つ起動して、一覧／context を1回 確認する」を手順にする。**

### ★測る側の注意

- ★**「送った」を下流の事実にしない**（**送信は自分の側の出来事**）。**相手が「受け取った」と書いたものを引く**
- ★**下流が観測できない時は、観測できないと書く**（**「たぶん届いた」を完了にしない**）
- ★**件数だけで完了にしない**（**「11/12」は「11 が届いた」であって「1 が届いていない」も同時に言っている。★後半を落とさない**）

<!-- COMMON-BLOCK-END: 23-done-vs-delivered -->

<!-- COMMON-BLOCK-START: 24-remote-trigger-gotchas -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/24-remote-trigger-gotchas.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## ★RemoteTrigger / cloud routine の恒久 gotchas

★**時計（cloud routine）を持つ課は、以下を前提として持つ。** **どれも「気づけない形で落ちる」ので、事故から学べない。**

### ① ★`list` は網羅ではない — 最新20件の窓

★**`RemoteTrigger list` が返すのは `created_at` 降順の先頭20件だけ。** ∴ ★**「list に無い ≠ 存在しない」。**

**実測（2026-08-02）**: **窓の外に在った4ヶ月前の trigger を `get` で確認**（**窓内の一覧では一度も見えなかった**）。

★**全数把握には「既知 ID 表 ＋ 個別 `get`」が要る。** **一覧だけで棚卸しをすると、古いものから順に見えなくなる。**

### ② ★trigger を作ったら ID を durable に記録する

**作成時に ID を控えないと、後から `get` できない**（**窓の外に出た瞬間に到達不能**）。**初期に作った batch は ID 無記録で、後から個別確認ができなくなった。**

### ③ ★PR 作成が成功しても、機構が動いたとは限らない

**routine が PR を作れば「動いた」ように見えるが、★参照先が誤っていても PR は成功する。** ∴ ★**成果物の存在を「機構が正しく動いた」の証拠にしない。** **中身が意図どおりかを別に見る。**

### ④ ★cloud session に peer 接続は無い / ★headless からも届かない

★**routine の prompt に「peer へ通知」と書いても、cloud 側では実行されない。** ∴ ★**通知は届かず、しかも routine 自体は成功で終わる。**

★★**2026-08-14 追加 — 射程が広がった**: ★**ローカルの headless (`claude -p`) からも届かない。**★**組込み `SendMessage` でも `mcp__claude-peers__send_message` でも未着**（★CCO 実測3回・★送信順序と着信順序が逆転したので遅延では説明が付かない）。★**しかも送信側には success が返る。** ∴ ★**cron / launchd から人に知らせる経路は★存在しない**と扱うこと。

**実測（2026-08-04）**: **通知を書いた routine が9件・9件とも接続なし。** **ある課は発火に気づかず3時間 焼いた。**

★**∴ routine は「repo への書き込みまで」で終わらせる。** **通知は人（conductor）が別経路で配る。** ★**時計に依存する側は「発火時刻に自分で `get` を叩く」——届くのを待たない。**

### ⑤ ★dormant な受信側への通知は黙って消える

**送信は成功し、受信側が起動していないだけなので、★どちらの側にもエラーが出ない。** **毎週 消え続けていた実例がある。**

### How to apply

- ★**「list で現況確認」と書いてある手順書は古い。** **窓の意味論（最新20件）を知らずに書かれている**
- ★**routine を停止・変更する時は、窓の外の同種 routine を `get` で確認してから**（**窓内だけ直すと、外のゾンビが動き続ける**）
- ★**「発火した」を「届いた」の代わりにしない**（→ [[23-done-vs-delivered]]）

<!-- COMMON-BLOCK-END: 24-remote-trigger-gotchas -->

<!-- COMMON-BLOCK-START: 25-macos-runtime-gotchas -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/25-macos-runtime-gotchas.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## ★macOS / 実行環境の gotchas（配布 script・検査を書く時）

★**どれも「書いた人の環境でだけ緑になる」形で落ちる。** **∴ 実行環境を前提として持つ。**

### ① ★macOS 既定 bash は 3.2 — `declare -A`（連想配列）が無い

`set -u` の下では **`unbound variable` で落ちる**。★**bash 4+ でだけ動く script は、書いた人の環境でだけ緑になる。**

**回避**: **`|` 区切りの文字列 ＋ `cut`／`case`** で持つ。★**`${var#pattern}` に多バイト文字を書かない**（**bash 3.2 で変数名ごと壊れる実測あり**）。

### ② ★macOS の grep は、不正バイト1個で「出力も stderr も空の exit=1」

```
grep -c 'x' good.txt  → 出力='1'  exit=0
grep -c 'x' bad.txt   → 出力=''   exit=1  stderr=''   ★不正バイト1個でこうなる
```

★**「不一致」と完全に同一で、出力から区別できない。** ★**`LC_ALL=C` では直らない**（よくある誤解）。**`grep -a` で直る。**

★**∴ 「0件」を報告する検査が、黙って死んでいることがある。** **2課が独立に同型で被弾し、以後 `grep -a` の手動回避が常態化した。**

### ③ ★同じコマンド名でも、経路が違えば別物

**ハーネス内の `grep`（ugrep 等）と `/usr/bin/grep` は挙動が違う。** ★**「同じコマンドを打った」は「同じ判定をした」ではない。** **検査を配る時は、どちらで走るかを書く。**

### ④ ★`sed -i` は macOS で引数が要る

**`sed -i '' -e ...`**（GNU の `sed -i -e ...` は macOS で失敗する）。★**配布 script に書くと、実行環境ごとに別の結果になる。**

### ⑤ ★`/Volumes` と `Dropbox` の二重計上

**`~/Dropbox/_DevProjects` → `/Volumes/strage/_DevProjects` の symlink が1本 在り、両方から同じ実体に着く。** ★**両方を数えると二重計上になる**（**実測: hook の取りこぼし件数に混入した**）。

★**そして Dropbox は symlink の実体を同期しない。** ∴ ★**「Dropbox に在るから写しがある」は偽**（**同一ディスクの別名にすぎない**）。

### ⑥ ★`PATH` を壊して「無い時の挙動」を測る時は、壊しすぎない

**`PATH=/nonexistent` にすると `cat` すら引けず、★検査対象の script が起動しない**（`rc=127`）。★**「無い時の挙動を測った」つもりで、何も測っていない状態になる。**

**正しい形**: ★**外したいコマンドの在り処を全部 measure してから**（**`which -a`**）、**必要な外部コマンドだけを持つ PATH を組む。** ★**外れたことを先に1行 出す**（`command -v jq && echo "★まだ引ける=試験無効"`）。

### ⑦ ★★zsh の nomatch —— ★未クォートの `*` `?` で ★コマンドが**起動しない**

★**macOS の対話 shell は zsh。** ★bash と違い、★**glob が 1 件も一致しないと zsh は既定でエラーにし、
★★そのコマンドを実行しません**（bash は既定でパターンを文字列のまま渡す）。

```bash
✗ grep -rl 'x' --include=*.ts .        # ★`*.ts` が CWD に無ければ ★nomatch
✗ gh api "repos/o/r/git/trees/$S?recursive=1"   # ★`?` も glob（★クォート必須）
✓ grep -rl 'x' --include='*.ts' .      # ★クォートする
```

★★**危ないのは「エラーが出る」ことではなく、★出力が空で返ること。**
★**件数だけ見ていると「0 件＝該当なし」と読めます** —— ★**述語ではなく起動の失敗**です。

★**確定した判別軸（★3 課が独立に踏み、★content 課が特定）**:

| 引数を受け取る側 | 例 | 後続 |
|---|---|---|
| ★**builtin** | `echo` / `print` | ★★**後続が走らない**（rc=1・出力 0） |
| ★**外部コマンド** | `ls` / `cat` / `grep` / ★**`gh`** | ★★**後続が走る**（★その 1 本だけ 空で返る） |

★★**危険の向きは直感と逆**: ★**実務で踏む `gh` / `grep` は外部＝中断しない** ∴
★★**空の結果のまま後続が全部走る側が本命**です。★`||` も同じ軸（★外部なら fallback が効き、builtin なら効かない）。
★★`2>/dev/null` では**消せません**（★シェルが出すもので、コマンドの stderr ではない）。

★★**機序は書きません** —— ★**判別軸は実測であって説明ではない**（★なぜ builtin だけ終了するかは未解明）。
★**潰れた仮説も残します**（★同じ所を掘らないため）: ★`&&` / `errexit` / ★`interactive`
（★2 課で `$-` まで一致させて否定済）。

★**手当て**:
- ★**glob を含む引数は必ずクォートする**（`'*.ts'` / `"…?recursive=1"`）
- ★★**「0 件」を出す前に陽性 control を振る** —— ★nomatch なら **control も同時に空**になるので気づけます
- ★script 側なら `setopt +o nomatch` ではなく ★**クォートで直す**（★設定に依存させない）

★**併せて**: ★zsh は ★**`$VAR` を語分割しません**（bash は分割する）。
★`cmd $r`（`r="1 0 1"`）は zsh では ★**引数 1 個**として渡り、★bash のつもりで書いた検査が黙って別物になります。
★`set -- $r` / 明示の配列を使うか、★**その断片だけ `bash -c` で走らせる**。
★★`PIPESTATUS` も bash の名前です（zsh は `pipestatus`）——★**空の rc は「成功」に化けます。**

### ⑧ ★★zsh は `"$VAR:path"` を ★**黙って 書き換える** —— ★`git show "$SHA:lib/x.ts"` が 壊れる

★**zsh は ★`$VAR` の 直後の `:` を ★履歴修飾子として 解釈します**（`:h` head / `:t` tail /
`:s/a/b/` 置換 / `:a` 絶対path / `:e` 拡張子 / `:l` 小文字）。★**bash には この機能が ありません。**

★★**∴ ★git の いちばん 一般的な 書き方が 壊れます**:

```bash
✗ git show "$SHA:status.md"     # ★★sha が 別物に なる（★下の実測）
✓ git show "${SHA}:status.md"   # ★★中括弧で 閉じる
✓ git show "$SHA":status.md     # ★★クォートを 切る
```

★★**実測（`X=abc`・★2026-09-10・★template 課）** ——★★**`:` の 次の 1 文字で 決まります**:

| 書いたもの | ★出た値 | |
|---|---|---|
| `"$X:status.md"` | ★`us.mdbc` | ★★`s`＝置換（★区切りは 次の 1 文字 `t`）|
| `"$X:tests/t.py"` | ★`abcests/t.py` | ★`t`＝tail |
| `"$X:hooks/h.sh"` | ★`.ooks/h.sh` | ★`h`＝head |
| `"$X:app/x.ts"` | ★`/…/cwd/abcpp/x.ts` | ★★`a`＝絶対path（★CWD が 混入する）|
| `"$X:lib/y.ts"` | ★`abcib/y.ts` | ★`l`＝小文字 |
| `"$X:e2e/x.ts"` | ★`2e/x.ts` | ★`e`＝拡張子 |
| `"$X:src/x.ts"` | ★`bad substitution` | ★★**これは 落ちる ＝ ★安全な 方**（★下の (B)）|
| `"$X:README.md"` `"$X:docs/d.md"` `"$X:package.json"` `"$X:Makefile"` `"$X:.github/w.yml"` | ★そのまま | ★修飾子でない 文字 |

★★**発火条件は ★上の表より 狭い**（★mued 実測 2026-09-12・★CCO 追試 —— ★`X=origin/main`）:

| 書いたもの | ★出た値 | |
|---|---|---|
| `"$X:$P"` | ★`origin/main:` ＋ `$P` | ★★`:` の 次が `$` ＝ ★★安全（★`git show "$SHA:$PATH"` は 踏まない）|
| `"$X^:status.md"` | ★そのまま | ★★`:` が 展開の 直後でない ＝ 安全（★親 commit の 形）|
| `"$X:/tmp/a"` `"$X:2abc"` | ★そのまま | ★`:` の 次が `/` や 数字 ＝ 安全 |

★★**∴ ★`:` が 修飾子に なるのは ★★「パラメータ展開 ＋ `:` ＋ ★英字」の 並びだけ。**
★★**path の 接頭辞で 覚えると ★安全な 形まで 危険に 見えます** ——★★覚えるのは ★★次の 1 文字。

★★**そして ★修飾子に なった 時、★★path は ★必ず 失われます**（★mued 実測 2026-09-12・★CCO 追試）。
★★**値が 変わるかどうかは ★別の話** ——★★`X` の 中身 次第で ★★『何も 起きていないように 見える』:

| `X` | `"$X:status.md"` | |
|---|---|---|
| `origin/main` | ★`origin/mus.mdin` | ★値も 壊れる ＝ ★下流で「unknown revision」 |
| `xyz123` | ★★`xyz123` | ★★**値は 無傷。★★`:status.md` だけ 消えた** |
| `1234567` | ★★`1234567` | ★★同上（★`a` を 含まない sha） |

★★**∴ ★最悪は ★`a` を 含まない sha**: ★`git show "$SHA:status.md"` が ★★`git show $SHA` に なり、
★★**rc=0 で ★commit 全体が 出ます** ——★★**file を 指定したつもりで ★別のものを 読み、★エラーは 出ません。**

★★**そして ★これは ★例外では なく ★★多数派です**（★conductor 実測 2026-09-12）:
```
★理論 … ★(15/16)^7 = ★★63.7%（★短 sha 7 文字）／ 8 文字 59.7% ／ 12 文字 46.1% ／ 40 文字 7.6%
★★実データ … ★conductor の 直近 200 commit の 短 sha
   ★★`a` を 含まない = ★★125 / 200 = ★★62%
   ★陽性control（`a` を 含む）75 ／ ★陰性control（16 進以外）0
★★∴ ★`git show "$SHA:status.md"` は ★★およそ 3 回に 2 回 ★`git show $SHA` に なる
```
★★**「`a` を 含まない sha なら」と ★条件で 書くと、★読む人は ★『稀だ』と 読みます**
——★★**conductor 自身が ★この数を 出すまで ★『特殊なケース』として 読んでいた。★62% は 稀では ない。**

★★**3 つに 割れます**（★同じ `:` の 次の 1 文字で 決まる）:
```
★★(A) 修飾子に なる … ★status.md(:s) / hooks(:h) / lib(:l) / tests(:t) / e2e(:e) / ★app(:a)
     ★★path は 必ず 消える。★値は 変わることも 変わらないことも ある
     ★app が 最悪 … ★`"$X:app/p.tsx"` → ★★`/…/cwd/origin/mainpp/p.tsx`（★CWD が 混入）
★★(B) ★大声で 死ぬ（★★安全）… ★`src/` ／ ★`scripts/` → ★★`bad substitution`
     ★機序 … ★`:s` の 区切り文字の 解析に 失敗する（★`s` の 次が 区切り）
★★(C) ★そのまま（★安全）… ★`docs/` ／ ★`public/` ＝ ★修飾子でない 文字
```
★★**`src/` と `scripts/` —— ★いちばん 打たれる 2 つが ★(B) ＝ 安全側に 落ちる。**
★★**これが ★この bug が 長く 顕在化しなかった 理由**だと 当課は 読みます（★mued 指摘）。

★★（★`:s` の 出た値は ★`X` の 中身で 変わります —— ★上表は `X=abc`。★★出た値を 写す時は `X` も 一緒に。）

★★**危険の 向き**: ★★**落ちる方（`src/` `scripts/`）は ★安全。** ★★**怖いのは ★黙って 通る方**
——★`status.md` / `tests/` / `hooks/` / `app/` / `lib/` / `e2e/` は ★★**エラーを 出さずに 別の値**を 作ります。
★★`git show` は ★その別物を「★unknown revision」と 言うので、★★**「その sha が 無い」と 読み違えます。**

★**実際に 踏んだ形**（★★0 件が 返り、★計器の死だと 気づくのに 一手 掛かった）:
```bash
✗ while read h d; do  git show "$h:status.md" | grep …  ; done   # ★★30 版 すべて 空 → ★0 件
✓ while read h d; do  git show "${h}:status.md" | grep … ; done   # ★★30/30 引けた
```
★★**件数以外の 期待値（★「30 版 在るはずだ」）を 先に 持っていたので 止まりました。**

★**手当て**:
- ★★**`$VAR` の 直後に `:` が 来たら ★必ず `${VAR}` か ★`"$VAR"`+クォート切り**
- ★★**`grep`/`sed` の 引数に 変数を 埋める時も 同じ**（★`:` の 直後だけの 問題ではあるが、★機械的に 中括弧が 安全）
- ★★**0 件を 出す前に ★件数以外の 期待値**（★§⑦ の 陽性control と 同じ理由・★★nomatch と 違い ★controlも 同時に 壊れる）

### How to apply

- ★**「0件」「差分なし」を出す検査には、必ず陽性 control を同じ出力に並べる**（→ `positive-control-verify` skill）
- ★**件数の根拠が match 数なら、match 行（か上限つきサンプル）を同じ出力に併記する**——**「20」は読む人に再検査の手掛かりを与えない**
- ★**全部 見ていない時は「サンプルを見た・残りは未確認」と残差にラベルを付ける**（**「全部 見た」と書かないことのほうが機構として重要**）

<!-- COMMON-BLOCK-END: 25-macos-runtime-gotchas -->

<!-- COMMON-BLOCK-START: 26-user-scope-hook-audit-log -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/26-user-scope-hook-audit-log.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## ★user スコープ hook は全 repo で走る／tool-audit に本文が平文で残る

★**機微ファイル（`.env` / 受託 / 会計 / 見積）を扱う課は、これを前提として持つ。**

### ① ★`~/.claude/settings.json` の hook は、全 workspace で走る

**user スコープの `PreToolUse`（`matcher: "*"` 等）は、★client repo を含むすべての workspace で発火する。** ★**「この repo には hook を入れていない」は、user スコープには効かない。**

★**受託 / クライアント repo を持つ課は、user スコープに何が配線されているかを1回 実測する**（**repo 側だけ見ても分からない**）。

### ② ★`~/.claude/tool-audit.jsonl` に Write/Edit の本文が平文で残る

**実測**: **末尾 8MB の窓に Write/Edit が 723件・最大 15,678字が平文**。

★**`.gitignore` の保護はここに及ばない。** ★**untrack しても、ログには残る。** ∴ ★**「commit しない ≠ 記録されない」。**

**`.env` を Write すれば、`.gitignore` していても平文で載る。**

### ③ ★ログを secret で grep しない

★**探す行為そのものが context を汚染し、しかも その grep 自体もログに載る。**

**必要なのは「何が載っているか」ではなく「載る経路が在る」という前提**で、**経路は ① ② で分かる。** ★**中身を確認しにいくと、確認した事実が増えるだけ。**

### How to apply

- ★**機微を書く前に「これは平文で残る」を前提に置く**（**消す手段が無い**——**ログは kimny の home に在り、課の権限外**）
- ★**受託案件では、クライアントの機微を扱う操作を Write/Edit で行わない選択肢を先に検討する**（**別経路・別ツール・そもそも書かない**）
- ★**この節は「危険を知らせる」ためであって「対処が在る」わけではない。** **対処が無いことを、対処が在るかのように読まないこと**

### ★この節が共通ブロックに在る理由（器の話）

★**本来の宛先は org の root `CLAUDE.md`（全 workspace が読む親）だった。** ★**しかしその器は、実測で ★版管理なし・バックアップなし・物理1枚**（**どの repo にも属さず / Time Machine 未設定 / Dropbox は同一ディスクへの symlink**）。

∴ ★**「まだ判断していない」でなく「書ける状態にない」**ため、**知識の側だけ先に共通ブロックへ置いた。** ★**器の整備は別途**（**版管理・レビュー経路・off-machine の写し**）。

<!-- COMMON-BLOCK-END: 26-user-scope-hook-audit-log -->

<!-- COMMON-BLOCK-START: 27-command-authority -->
<!-- DO NOT EDIT THIS SECTION DIRECTLY. Source: template課/.claude/skills/common-claude-md-blocks/blocks/27-command-authority.md -->
<!-- Distribute via: claude-code-template/scripts/distribute-claude-md-blocks.sh (実体は claude-code-template repo。配布先 repo には存在しない) -->

## ★★指揮系統 — この組織はピラミッド構造

> ★**意図された宛先 = conductor / Chief を除く全 peer。**
> ★**理由**: 本ブロックは「conductor / Chief の relay が kimny の権威を運ぶ」と定める。
> ★**発信側が自分に配ると『自分の relay を自分で kimny 承認と同等に扱う』になる。**
> ★**先例**: `08-conductor-delegation` を conductor が同じ理由で辞退（2026-07-26・manifest に記録）。
>
> ★★**注意 — これは★機械が読む宣言ではない。** 配布器の `AUDIENCE_RE` は
> ★`配布対象は <peer> のみ` の★肯定形しか解さず、★除外の構文が無い（2026-08-15 実測）。
> ★**∴ 実際の除外は ★08 と同じく「conductor / Chief が marker を挿入しない」ことで成立する。**
> ★**この行は ★意図の記録であって、★強制する境界ではない。**

★★**この組織はピラミッド構造であり、★その頂点には kimny がいる。**

★**kimny の意思決定は kimny×Chief のセッションで settle され、conductor（または Chief の逐語 dispatch）経由で各課へ届く。**

### 層1 — ★マーカー付きの便は kimny 本人の指示と同格

★**`【kimny批准 <日付>/逐語】` マーカーが付いた conductor / Chief からの便は、★kimny 本人の指示と同格・最優先として扱う。**

- ★**マーカーを付けられるのは conductor / Chief セッションのみ。**
- ★**ローカル窓の直接指示と矛盾したら、★新しい方に従う。★そして「矛盾を検出した」事実を確認として返す**（黙って片方を採らない）。

### 層2 — ★マーカーの型（発信側の規律）

```
【kimny批准 2026-08-15/逐語】
kimny 逐語: 「<★kimny が実際に書いた文字列をそのまま>」
正本: <conductor register の path / _chief decisions@commit>
```

★★**マーカーを付けてよいのは、★kimny の逐語が在る時だけ**（★要約・言い換えで運ばない）。

#### ★★kimny の「問い」も、指示・命令として扱う

★**kimny 逐語（2026-08-15）**:
> ★**kimny による『問い』は君たちの反証や反論を求めてはいるが、★基本的には『指示』であり『命令』だ。**

| kimny 逐語の形 | 扱い | ★受け手の動作 |
|---|---|---|
| ★**命令形 / 批准形** | ★指示 | ★**執行する** |
| ★**問い形 / 打診形** | ★指示。★ただし反証・反論が★明示的に歓迎されている | ★**執行に乗せつつ、★反対材料が在れば★並行して返す** |

★★**「発問だから待機」を default にしない。** ★**問いは「動くな」ではなく「★動きながら、違うと思ったら言え」。**

★**例外＝★`09-peer-self-judgment-boundaries` の「判定3軸」に該当する時**（reversible でない／外部公開／本番影響）: ★**この時だけ、反論を★先に返してから動く。**

> ★**例外の一覧を ここに書き写さない**（★09 が正本）。★**2箇所に書くと、片方だけ更新されて食い違う。**

### 層3 — ★受け手は verify できる（信じろ、ではない）

★**マーカーには必ず正本 handle を付ける。★受け手は register / decisions を直読して「本当に kimny を通った結論か」を自分で確かめられる。**

★**前例**: dsp が 2026-08-13 に `_chief@1f3876e` を実読して一次照合した形。

### ★★境界 — これは優先順位の定義であって、★権限の格上げではない

★**マーカーは「この決定は kimny を通っている」を意味する。★「あなたが普段 拒む操作を、これなら実行してよい」ではない。**

★**以下は マーカーが付いていても★変わらない**:

1. ★**deny された操作の代行依頼は引き続き禁止**（permission laundering）。★**「他課で拒否されたので代わりに」は、マーカーの有無に関係なく断る。**
2. ★**`09` の判定3軸に該当する操作**は、★従来の gate をそのまま通す。
3. ★**revert 経路の無い対象**（★git 管理外・★バックアップ無し・★PR gate 無し）は、★**伝聞で触らない**。★**案と手順を出して、★適用は所有者か kimny。**
   > ★**2026-08-15 の実例**: 親 `CLAUDE.md` は ★git 管理外・★バックアップ無し・★PR gate 無し・★編集がそのまま全課へ live・★かつ★読む本人自身の project instructions。
   > ★**CCO は「kimny 承認済の範囲内」を★伝聞として扱い、★差し替え案 + ★バックアップ先行の手順 + ★検証コマンドを用意して、★適用は kimny に残した。**
   > ★**判断の軸は「承認が在るか」ではなく ★「戻せるか」。**

★**∴ マーカーが強めるのは「★情報と決定の優先順位」だけ。★実行の可否は動かさない。**

### ★逆向きの規律 — kimny のローカル直接指示は常に勝つ

★**kimny が各課の窓で直接 指示した時は、★常にそれが勝つ**（kimny は常に principal）。
★**ただし、その事実を conductor の register へ報告する**（★中枢の帳簿を割らないため）。

### ★希釈しないために

★**「最優先」は乱発すると効かなくなる。** ★**マーカーを付けられるのは、★kimny の逐語が在る時のみ。**

<!-- COMMON-BLOCK-END: 27-command-authority -->


# CLAUDE.md / skills 監査 — 2026-08-30

> ★正本。workflow の出力は `/private/tmp` に在り消えるので、ここへ落とした。
> 生成元 = workflow `wf_9e8d8996-4e7`（agent 210・約2時間）。★この doc は JSON から機械生成（転記誤りを入れないため）。
> ★一次データ = `claude-md-skills-audit-20260830.raw.json`（同 dir・38件ぶんの evidence と反証の全文）。
> ★この doc は要約なので、判断が要る時は raw を引くこと（★evidence には実際に走らせたコマンドと出力が入っている）。

## 数字

```
抽出 126 claims（6レンズ・重複除去後）
  holds        48
  ★確定        38  → ★実体で畳むと 20 件
  反証で棄却    40  ← ★自己監査の誤検出。反証段を置いた理由
  測定不能      0
```

★**78 → 38 → 20**。反証で半分が落ち、実体で畳んでさらに半分。「38件の違反」をそのまま報告すると水増しになる。

## ★修正方針に効く構造（実測）

```
.claude/skills と .agents/skills に ★内容同一・別 inode の skill が 8件（両方 追跡下）
  database / daw-osc / legal-compliance / mued-onboarding
  muedial-api / threads-insight / video-branding / web-performance
CLAUDE.md(1458行) と AGENTS.md(162行) … AGENTS.md は共通ブロック前の別実体
散在の実測: lib/di/ = CLAUDE.md/AGENTS.md/README.md の3枚 ／ Next.js 15 = 2枚 + skill 2本
```

★**片方だけ直すと drift が戻る。** 1件ずつ直さず、★層をまたぐ grep 1回で全数を落とすこと。

## 確定した欠陥

### 1. [high][mued] Next.js の版が 15.5（実測 16.2.11・major 跨ぎ）

- 対象: `.agents/skills/web-performance/SKILL.md` / `.claude/skills/web-performance/SKILL.md` / `AGENTS.md` / `CLAUDE.md` / `docs/muedlobe/muedlobe_spec_v4.2.md` / `next.config.ts` / `package.json` / `scripts/verify/skill-durability.ts`
- 直し方: CLAUDE.md:54 の `Next.js 15.5` を `Next.js 16.2` に直す（同一文字列が AGENTS.md:54 にも在るので同時に。React 19 / TailwindCSS 4 は実測一致なので触らない）。合わせて mued 追跡下の web-performance skill（`.claude/` と `.agents/` の2本・SKILL.md:3,66）と docs/muedlobe/muedlobe_spec_v4.2.md:68,119 の「Next.js 15」も掃く。★再発防止としては、版数を手書きで持たず `scripts/verify/` に「CLAUDE.md の宣言 major == package.json の major」を突き合わせる1本を足す（261日 気づかれなかったのは、この表を測る検査が1本も無いため）。
- 由来 id: next-version-15-5, nextjs-version-15-5, nextjs-version-stale-15-vs-16

### 2. [high][mued] AI 行が「Claude=開発/MCP経由」（実測 本番で Anthropic SDK 直呼び）

- 対象: `CLAUDE.md` / `app/api/dial/chat/route.ts` / `app/api/hoo/chat/route.ts` / `lib/ai/providers/claude.ts` / `lib/ai/providers/index.ts` / `messages/ja.json` / `package.json`
- 直し方: CLAUDE.md:58 を実測に合わせて書き換える: `| **AI** | Claude Haiku (本番・Hoo/dial chat = `@anthropic-ai/sdk` 直呼び) / OpenAI gpt-5-mini (本番・`/api/ai/parse-material-request`) |`。★併せて「provider・第三者開示はコードを正とする（`lib/ai/providers/claude.ts`）」の1行と、正本 memory [[reference-hoo-chat-production-provider]] へのリンクを同じセルの直下に置く。★「開発/MCP経由」の語は削除する（3点とも偽なので訂正でなく除去）。Tier 1（docs のみ）で self-merge 可。
- 由来 id: ai-provider-openai-in-prod, claude-md-tech-stack-ai-provider-stale, ai-row-claude-dev-only

### 3. [high][mued] ai-models skill も同じ provider 誤りを反復

- 対象: `.claude/skills/ai-models/SKILL.md` / `CLAUDE.md` / `app/api/dial/chat/route.ts` / `app/api/hoo/chat/route.ts` / `docs/archive/ai-model-comparison.md` / `lib/ai/providers/claude.ts` / `lib/ai/providers/gemini.ts` / `lib/ai/providers/index.ts`
- 直し方: SKILL.md:18 を実測どおりに置換し本番行を立てる —「| **Hoo / dial 会話（本番）** | Claude Haiku (`claude-haiku-4-5-20251001`, Anthropic SDK 直) | kimny コスト方針・`app/api/hoo/chat/route.ts:243` / `app/api/dial/chat/route.ts:281` |」。併せて Gemini 行 (`lib/ai/providers/gemini.ts`) を追加し、実在しない `docs/archive/ai-model-comparison.md` へのリンクを `lib/ai/providers/index.ts` へ差し替え、表の末尾に「★provider / 第三者開示はこの表でなく `lib/ai/providers/` を正本とする」の1行を置く。同一の誤りが CLAUDE.md:58「OpenAI (本番), Claude (開発/MCP経由)」にも在るので同じ PR で直す（2箇所を別便にすると片方だけ残る）。
- 由来 id: ai-models-skill-repeats-stale-provider, ai-models-claude-dev-only-stale

### 4. [high][mued] lib/di/ が存在しない（PR #43 で撤去済み）

- 対象: `AGENTS.md` / `CLAUDE.md` / `README.md` / `lib/analytics/gtag.ts` / `lib/container.ts` / `lib/di.ts` / `lib/di/container.ts` / `lib/di/decorators.ts`
- 直し方: CLAUDE.md:67 の `- **DI**: 依存性注入でテスタビリティ確保 (\`lib/di/\`)` を削除する（実装は 739a0b69 で撤去済み・DI は現アーキテクチャに存在しない）。★同じ手で `package.json` の `inversify@^7.10.3` / `reflect-metadata@^0.2.2` も落とす — この2つが残っている限り誤った DI コードが build 緑で通り、doc だけ直しても「依存が在るのだから使える」と読まれる。doc 削除は Tier 1、package.json はコード変更なので Tier 2（product課 peer review）に分けてよいが、★doc だけ先に merge して依存を残すと裏書きが残る点を PR 本文に明記すること。
- 由来 id: lib-di-exists, lib-di-missing, lib-di-does-not-exist, lib-di-does-not-exist

### 5. [high][mued] npm run test はユニット単独ではない（CI が回すのは test:unit）

- 対象: `.claude/skills/DISTRIBUTED.txt` / `CLAUDE.md` / `README.md` / `docs/README.md` / `package.json`
- 直し方: CLAUDE.md:19 を `npm run test:unit                  # ユニットテスト（CI が回すのはこれ）` に差し替え、`npm run test` は別行で `# 全層 直列（unit+components+integration+e2e）。integration=Docker 必須 / e2e=dev server 起動。CI では走らない` と註記する（README.md:267 が既に正しい文言を持っているので、それに寄せるだけ）。同じ誤った註記が docs/README.md:87 にも在るので同時に直す（片方だけ直すと次に食い違う）。
- 由来 id: npm-test-is-unit-only, npm-run-test-is-not-unit, npm-test-is-not-unit-only

### 6. [high][mued] muedial-api skill の価格が PR #317 前・退役サブスクを live として列挙

- 対象: `.claude/skills/muedial-api/SKILL.md` / `app/api/dial/checkout/additional/route.ts` / `app/api/dial/checkout/credit-pack/route.ts` / `app/api/dial/checkout/route.ts` / `app/api/dial/checkout/subscription/route.ts` / `app/api/dial/subscription/status/route.ts` / `app/api/webhooks/stripe/route.ts` / `app/dial/pricing/page.tsx`
- 直し方: SKILL.md:16 の価格を直値で持たず、単品は「正本＝`lib/dial/pricing.ts` の `DIAL_SINGLE_PRICES`（現行 $7.49/$13.99/$5.99/$9.99）」と★参照先つきで書き、サブスク3行は★「退役・購入導線なし（webhook 後方互換のみ）」と明記する（数値だけ直すと、値が合っているまま退役状態を配り続ける2つ目のズレが残る）。あわせて `tests/unit/lib/dial/pricing-constants.test.ts` に「SKILL.md を読み、`DIAL_SINGLE_PRICES` の4値が全て文中に現れること／deprecated tier が『退役』の語を伴うこと」を assert する1ケースを足す（★先に現行 SKILL.md で RED になることを確認してから commit する。現状 doc 側を pin する検査は1本も存在しない）。
- 由来 id: muedial-api-prices-are-pre-pr317, muedial-api-lists-retired-subscriptions-as-live, muedial-api-stale-single-prices, muedial-api-deprecated-subs-as-live

### 7. [high][mued] muedial-api skill の instrument enum が実装と違う（DRUMS vs DRUMS_GROUP）

- 対象: `.agents/skills/muedial-api/SKILL.md` / `.claude/skills/muedial-api/SKILL.md` / `lib/roex/mappings.ts`
- 直し方: `.claude/skills/muedial-api/SKILL.md` と `.agents/skills/muedial-api/SKILL.md` の★両方の L38 を実装の値に直す — `DRUMS`→`DRUMS_GROUP`、`GUITAR`→`E_GUITAR_GROUP`（`OTHER`→`OTHER_GROUP1` も表に無く誤読しやすいので併記）。さらに、この行を手書きで維持する限り再び腐るので、`etc.` で省略せず `lib/roex/mappings.ts` の `INSTRUMENT_GROUP_MAP` を正本として参照する一行（「値の正本は lib/roex/mappings.ts:50。ここに書き写した値は腐りうる」）を添える。写しが2つ在る事実自体も、直すときに片方が残る経路なので、同一 PR で両方に触れたことを `git grep -E '(^|[^_A-Z])GUITAR_GROUP|(^|[^S])DRUM_GROUP'` が 0件 を返すことで確認する（現在は 2件 返る＝この検査には既に陽性対照が付いている）。
- 由来 id: muedial-api-wrong-instrument-enum

### 8. [high][mued] web-performance の bundle analyzer 手順が動かない

- 対象: `.agents/skills/web-performance/SKILL.md` / `.claude/skills/web-performance/SKILL.md` / `next.config.ts` / `package.json`
- 直し方: SKILL.md:275 の `ANALYZE=true npm run build` と :39 の `npx @next/bundle-analyzer`（後者は単独 CLI を持たない config wrapper なので二重に誤り）を、この repo が実際に使える `npx next experimental-analyze`（next 16.2.11 同梱・Turbopack 専用・build 成果物を出さない）に差し替える。@next/bundle-analyzer を導入して next.config.ts に配線する方向は取らないこと——build script が `next build --turbopack` であり、当該パッケージは webpack 前提。修正は .claude/skills/ と .agents/skills/ の同一 sha256 の2コピーへ同時に当てる。
- 由来 id: web-performance-analyze-is-silent-noop, bundle-analyzer-available, web-performance-bundle-analyzer-not-a-cli

### 9. [high][mued] ai-models の GPT-4o 禁止に例外が実在（analyzer.service.ts:79）

- 対象: `.claude/skills/ai-models/SKILL.md` / `app/api/interview/questions/route.ts` / `app/api/muednote/sessions/route.ts` / `docs/ai/midi-llm-serverless-alternatives.md` / `docs/guides/environment-variables.md` / `lib/openai.ts` / `lib/services/analyzer.service.ts`
- 直し方: SKILL.md L10/L35 の断言を実態に合わせて書き直す — 「GPT-4o は原則不使用。★現存する例外は lib/services/analyzer.service.ts:79 の `gpt-4o-mini` 1箇所のみ（MVP・gpt-5-mini への移行が宿題）」と例外を名指しし、宿題は status.md の `blocked_by` に置く（`next_action` は流れて消える）。同時に docs/guides/environment-variables.md:141 の「Production: `gpt-4o`」を削除する — lib/openai.ts:135,206 の `options.model || env.OPENAI_MODEL` 経由で model 未指定の全呼び出しが禁止モデルに落ちるため、これは stale な言及ではなく実行可能な誤指示。さらに、禁止を主張し続けるなら機械検査を1本置く（scripts/ と .github/ に gpt-4o の検査は現状 0件）: 許可した例外 path 以外に `model: 'gpt-4o` が現れたら fail、かつ★既知の1件を検出できることを陽性対照として検査自身に埋める（埋めないと、例外を消した日に誰も RED を見ない）。
- 由来 id: ai-models-gpt4o-ban-violated

### 10. [high][mued] legal-compliance skill が単一製品前提（実際は MUEDial / Advisory も）

- 対象: `.claude/skills/legal-compliance/SKILL.md` / `app/[locale]/tokushoho/page.tsx` / `lib/advisory/config.ts` / `messages/ja.json`
- 直し方: SKILL.md の「プロジェクト固有情報」を、実ページと同じ2層構造（共通9項目 + サービスごとの個別条件）に書き換え、MUEDial(https://dial.mued.jp)・MUED advisory(https://mued.jp/{locale}/advisory) の行を追加する。あわせて「標準表示順序」を共通/個別に割り、`- [ ] サービス名（MUEDnote）` を「messages/ja.json の tokushoho 配下で `name` を持つキーを列挙し、その全件に販売URL等の個別項目が在ることを確認」に置換して、製品追加時に自動で追随する形（件数 assert 付き）にする。
- 由来 id: legal-compliance-single-product-vs-three

### 11. [high][mued] 製品スイートの記述が3製品のまま（MUEDsp / Advisory / MUEDlobe が抜け）

- 対象: `CLAUDE.md` / `app/sitemap.ts` / `lib/plugins/registry.ts`
- 直し方: line 30 を live な製品を網羅する形に書き換える（MUEDear / MUEDial / MUEDnote に加え MUEDsp スイート（MUEDsat・MUEDlim・MUEDrive の無料3モジュール ＋ masterchain 有料線）・MUED Advisory・MUEDlobe）。★ただし手書きの列挙は必ず腐る（今回がその実例）ので、同時に「製品の正本は `app/sitemap.ts` の *_LIVE gate と `lib/plugins/registry.ts` の PLUGIN_DIST。製品を数える時はここを引く」の1行を添え、CLAUDE.md 側を索引に降格させる。
- 由来 id: product-suite-three-products

### 12. [high][mued] threads-insight の保存先が実在しない

- 対象: `.agents/skills/threads-insight/SKILL.md` / `.claude/skills/threads-insight/SKILL.md`
- 直し方: 両方の SKILL.md（.claude/skills/threads-insight/SKILL.md:15 と .agents/skills/threads-insight/SKILL.md:15 — 内容同一だが別 inode なので片方だけでは残る）の「保存先」を、実測で存在しかつ git 追跡下にある /Volumes/strage/_DevProjects/mued/threads-api/insights.json に差し替える（Dropbox 表記は同一ディスクへの symlink にすぎず写しを意味しないので realpath で書く）。あわせて「直接編集」は書き込み可能な dir へ静かに成功してしまうため、追記後に git -C .../mued/threads-api status で当該ファイルに差分が立つことを確認する1行を手順に足す（＝到達を下流で観測する）。
- 由来 id: threads-insight-wrong-save-path

### 13. [medium][mued] database skill の doc リンクが切れている

- 対象: `.agents/skills/database/SKILL.md` / `.claude/skills/database/SKILL.md` / `.claude/skills/database/docs/database/database-operations.md` / `CLAUDE.md` / `app/api/muednote/daw-log/route.ts` / `app/layout.tsx` / `db/schema/muednote-daw-logs.ts` / `docs/database/database-operations.md`
- 直し方: .claude/skills/database/SKILL.md:64 の 2箇所（表示テキストとリンク先）を docs/guides/database-operations.md に直す — 修正対象はこの1行のみで、repo 内に他の docs/database 参照は無い（.md 母集団で実測）。加えて、この種の腐りは「リンク先が実在するか」を誰も実行していないから残ったので、既存の scripts/verify/ 配下に .claude/skills/**/*.md と CLAUDE.md の相対リンクを ls で解決する検査を1本 足すと同型を今後 検出できる（今回なら1件 RED になることが self-RED になる）。
- 由来 id: db-skill-doc-path-stale, database-broken-doc-link, skill-referenced-repo-paths

### 14. [medium][mued] database skill の frontmatter name が dir 名と不一致

- 対象: `.agents/skills/database/SKILL.md` / `.claude/skills/DISTRIBUTED.txt` / `.claude/skills/database/SKILL.md` / `CLAUDE.md`
- 直し方: `.claude/skills/database/SKILL.md:2` と `.agents/skills/database/SKILL.md:2`（同一 sha の複製・両方 当課追跡下）の **両方**を `name: database` に直し、宣言を実効識別子に揃える。★逆向き（dir を `database-operations` へ改名）は禁止 — `.gitignore:84` の allowlist `!.claude/skills/database/` と CLAUDE.md:132 が dir 名で pin しており、改名すると DISTRIBUTED.txt が塞いだ「追跡も ignore もされない skill」の穴が再び開く。
- 由来 id: database-skill-frontmatter-name-mismatch

### 15. [medium][mued] legal-compliance skill が i18n 本文を複製（正本は messages/*.json）

- 対象: `messages/ja.json`
- 直し方: :151-168 の静的表を消し、`messages/ja.json#tokushoho`（描画元＝app/[locale]/tokushoho/page.tsx が `useTranslations("tokushoho")` で読む唯一の source）へのポインタ1行に置き換える — tier-judge:110「複製を残す限り同じ漏れが再発するため、複製をやめてポインタにする」と同文の理由を添え、サービス一覧は列挙せず「`t['<svc>']['url']['value']` を実行で数える」と書く（現在3件・MUEDial は dial.mued.jp）。あわせて16項目チェックリストに「最終更新日を live の変更と同時に更新する」を追加し（現状 live は 2026年3月11日のまま #823/#834 未反映）、:168 の脚注日付は削除。★.claude/ と .agents/ の2つの追跡コピー（sha 2cdb014a…）を同一 PR で直すこと。
- 由来 id: legal-compliance-rule-vs-embedded-copy

### 16. [medium][mued] CLAUDE.md がモデル名を直書き（共通 block の Model Policy と矛盾）

- 対象: `.claude/skills/plan-mode-policy/SKILL.md` / `CLAUDE.md`
- 直し方: CLAUDE.md:176 からモデル名を落とし、`閾値未達 → 定常確認として継続（/plan は発動しない）。` に差し替える（この節が言いたいのは「/plan を発動するか」であって起動モデルではなく、モデル名は情報を1つも足していない。落としても意味は失われず、共通 block 05/07 の「モデルの正本はここには写さない」と整合する）。加えて、同文がバイト一致で来た上流 — template課 `claude-code-template/.claude/skills/plan-mode-policy/SKILL.md` の L37（汎用ひな型）/ L86（SNS）/ L102（mued）の3箇所 — を template課へ報告する。ひな型に残す限り、新設課がコピーするたび同じ違反が再生産される（当課の176行が実際にそうして生まれた）。
- 由来 id: model-sonnet-hardcoded

### 17. [medium][mued] ★当課 #915 の check-ignore の記述が実測と違う

- 対象: `.claude/skills/tdd/SKILL.md` / `CLAUDE.md` / `scripts/verify/skill-durability.ts`
- 直し方: DISTRIBUTED.txt:18-20 と scripts/verify/skill-durability.ts:64-65 の同文を、実測値に差し替える: 「symlink 経由の path は `fatal: pathspec ... is beyond a symbolic link` (rc=128) で拒否され、`--stdin` では以降の path も落ちる。symlink そのものを当てると逆に rc=0 で `.gitignore:78:.claude/skills/*` に match し ignored と報告される。どちらも「その skill が保護を要する」証拠にはならない(実体は template repo が追跡)」。結論の「symlink を列挙しない」は変えない。
- 由来 id: check-ignore-through-symlink-message

### 18. [low][mued] ai-models skill の doc リンクが切れている

- 対象: `.agents/skills/ai-models/SKILL.md` / `.claude/skills/ai-models/SKILL.md` / `.claude/skills/ai-models/docs/archive/ai-model-comparison.md` / `docs/archive/ai-model-comparison.md`
- 直し方: `.claude/skills/ai-models/SKILL.md` と `.agents/skills/ai-models/SKILL.md` の★両方の行38-40（「## 詳細ドキュメント」節ごと）を削除する — 8cc4906a が archived docs を意図的に捨てた以上、参照元を消すのが元 commit の意図に整合する。詳細本文を残したいなら代わりに `git show 8cc4906a^:docs/archive/ai-model-comparison.md`（141行・現行記述と矛盾なし）を復元して同じ2ファイルのリンクを生かす。どちらを採るにせよ、この種の再発は「ドキュメント削除 PR で、消したパスを repo 全体に grep して referrer を同時に潰す」を DoD に足さないと止まらない（今回まさにそれが抜けて3ヶ月 残った）。
- 由来 id: ai-models-skill-doc-path-dangling, ai-models-broken-doc-link

### 19. [medium][other] [template課] status.md template のポインタが解決しない

- 対象: `CLAUDE.md` / `docs/guides/database-operations.md` / `docs/templates/peer-status-md.template.md`
- 直し方: 正本 `claude-code-template/.claude/skills/common-claude-md-blocks/blocks/17-status-md-self-drive.md:5` を、配布先で解決する形に書き換えて再 fanout する（例: 「format: claude-code-template repo の `docs/templates/peer-status-md.template.md`（github.com/kimny1143/claude-code-template）。自 workspace には配布されないので、必要なら copy する」）。同時に「13 fields」を★実測の 15 に訂正する（実体は 15 キー）。ローカルで mued の CLAUDE.md だけ直しても次の CCO fanout で上書きされるため、修正は正本側で行う必要がある。
- 由来 id: status-md-template-pointer-resolves-nowhere

### 20. [medium][other] [template課] from_id と from の記述が矛盾

- 対象: `.claude/rules/canonical-change-notification.md` / `.claude/skills/peer-id-lookup/SKILL.md` / `CLAUDE.md`
- 直し方: template課（CCO）が正本 claude-code-template/.claude/skills/common-claude-md-blocks/blocks/15-urgency-marker.md の :40 と :41 にある **use としての `from_id` 3箇所のみ**を `from` に置換して再配布する（:37 は「旧 `from_id` → 新 `from`」の mention なので★残す — ここを一括置換すると経路変更の記録そのものが消える）。mued 側の CLAUDE.md は配布物と byte-identical なので先に直すとドリフトを作り次回配布で戻るため、報告のみ・修正は上流で。
- 由来 id: from-id-vs-from-attribute-contradiction

## ★測っていない範囲（レンズの自己申告・要約）

- **到達/外部系の断言**（headless から peer 通知が届かない・RemoteTrigger の20件窓 等）★別プロセス/別マシンが要り撃てず = ★unverifiable であって「正しい」ではない
- **本番挙動の断言**（mued.jp の 200/307・Vercel build・GA4 到達）★このレンズでは未測
- **symlink 16本 + 配布9件の中身** ★他課の正本
- **skill の内容の鮮度** ★パス実在は測ったが、内容が現状と合うかは当課追跡10本のみ

## ★恒久策（値を手書きで持たない）

Next.js の版が **261日** 気づかれなかったのは、この表を測る検査が1本も無いため。
個別修正だけだと同じ腐り方を繰り返すので、`scripts/verify/` に
「★CLAUDE.md の宣言 major == package.json の major」を突合する1本を足す。


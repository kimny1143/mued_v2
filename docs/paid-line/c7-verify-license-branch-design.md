# C7 — verify 手順のライセンス分岐設計（設計ドラフト）

*mued lead 起草 / 2026-07-14 / **設計のみ・非gate・inert・本番非露出**（実装 + go-live は別 kimny gate と束ねる）。正本設計 = `_chief/decisions/mued/brief-paid-line-design-20260714.md`（C-7・item39）・執行計画 = `_conductor/docs/inbox/paid-line-execution-plan-20260714.md`（C7）。**dsp（8ldcps6r）consult**: keyfile/serial の plugin 側実体（Q2a）に触れる箇所は §7 で pull。*

前提（kimny gate 確定済）: **Q2=(a)** — Valhalla/u-he 型シリアル・keyfile・**DRM なし**・**未認証 = フルデモ**（期間 or 出力制限は Phase2 UI gate で現物選定）。masterchain = **単一製品・買い切り**（Q4）。サブスク = 将来の追設層（配管は将来アカウント層を建てられる形で確保）。

---

## 1. 目的・スコープ

MUEDsp の既存 verify（無料 MUEDsat/MUEDlim で確立）は「ライセンス状態」という軸を持たない — 誰でも DL リンクを踏めば full binary が手に入り、プラグインは常に全機能で動く。masterchain $69 は **serial/keyfile ライセンスを持つ最初のプラグイン**であり、verify harness に **license 状態の軸**が1本増える（Chief brief item39: 「md5/auval/render 照合にライセンス状態の軸が増える」）。

**C7 のスコープ = この分岐を設計する（実装しない）**。具体的には:

1. 既存 verify 2脚（plugin binary / web）に license 軸をどう足すか
2. その軸を **無料プラグインの verify に干渉させない**（無料は「ライセンス無」ブランチ = 従来通り）保証
3. **未認証 = フルデモ**の verify 手順（Q2a の実体差 = time-limited / output-limited の両分岐に耐える設計）
4. keyfile 発行・検証経路の verify（発売時 = FastSpring 還流 webhook C+ #673 と整合）
5. **将来アカウント層（サブスク基盤 C+）追設の余地**を verify 構造が塞がないこと

**スコープ外**: ライセンス方式そのものの実装（dsp plugin 側 + C+ webhook）／demo 形態の現物選定（Phase2 UI gate = kimny）／go-live。

---

## 2. 現状の verify（2脚・接地）

無料プラグイン（MUEDsat sha `c1f11fa1` / MUEDlim sha `a832976a`）が通ってきた既存 verify:

### Leg A — plugin binary（dsp domain・別リポ）
build → **md5/sha pin** → **auval**（AU validation）→ **render 照合**（bit-identical audio harness = LOCK md5 継承）→ **notarize**（.p8 / sign-orchestrator）→ **3-format**（VST3・AU・AAX）。
キャラクター gate（機械テスト外）= **試聴（音のキャラクター）**。

### Leg B — web（mued domain・mued_v2）
email gate subscribe（`lib/plugins/subscribe-handler.ts`）→ welcome email が **DL リンク（= deliverable）を同期配送**（fail 時 non-200・偽 "sent" を出さない）→ **prod E2E**（`scripts/verify-muedlim-prod-e2e.ts`: LIVE endpoint に synthetic email POST → dedicated Resend audience に着弾確認 → 外科的 cleanup）。
キャラクター gate = **実 URL で DL 導線が通る**。

**現状の license 軸**: 無し。binary に認証機構ゼロ。DL リンク保持 = full unlock。

---

## 3. C7 が足すもの — license-state 軸（拡張可能 enum）

verify harness を「1つの license 状態」でなく **状態の enum で parameterize** する。これが分岐設計の中核 — Phase2 の demo 形態選定にも、将来のアカウント層追設にも、harness を作り直さずに耐える。

```
LicenseState =
  | 'unlicensed'        // serial/keyfile 無 → フルデモ挙動（Q2a）
  | 'serial-licensed'   // 有効な serial/keyfile → 全機能 unlock
  | 'invalid-license'   // 破損/改竄/他製品キー → デモに graceful fallback（crash 不可・full-unlock 不可）
  // ── 将来（今は build しない・enum が席だけ確保）──
  | 'account-licensed'      // 将来アカウント層
  | 'subscription-active'   // 将来サブスク（revocation 可能層）
```

harness は各 binary の **capability flag `hasLicense`** で分岐を keying する:
- `hasLicense = false`（MUEDsat / MUEDlim）→ 状態は `unlicensed` 単一・**従来 verify と完全に同一**（license 検査を一切足さない = 非干渉の実装的保証。§5）。
- `hasLicense = true`（masterchain）→ 下記 state × format マトリクスを回す。

各 (state × format) に対し harness が assert する4項目:
1. **load**: host で crash なくロード
2. **host-scan**: auval / pluginval PASS
3. **render**: その state の **期待リファレンス**と一致（§4 の1本 vs 2本問題）
4. **license-UI**: 現在の license 状態を正しく表示（認証 UI = mock-fidelity gate 対象）

---

## 4. Leg A のライセンス分岐（plugin binary・dsp consult）

### 4.1 masterchain の state × format マトリクス

| state | VST3 | AU | AAX | render 期待値 |
|---|---|---|---|---|
| `unlicensed`（demo） | load+scan+render+UI | 同 | 同 | §4.2（demo 形態依存） |
| `serial-licensed` | load+scan+render+UI | 同 | 同 | **LOCK md5 リファレンス（bit-identical 継承）** |
| `invalid-license` | load+scan → **demo へ fallback** | 同 | 同 | = unlicensed と同一（full-unlock でない事を証明） |

**auval は両 state で PASS 必須**。理由: host のプラグイン scan は**ユーザーがシリアルを入れる前**に走る（インストール直後の初回スキャン）。未認証で auval FAIL するプラグインは「買う前に壊れて見える」= 転換面が死ぬ。→ **auval は `unlicensed` state で回すのが基準**（licensed でも当然 PASS だが、gate になるのは unlicensed 側）。

### 4.2 ★ demo 形態が render リファレンスの本数を決める（Phase2 gate 依存）

Q2a「未認証 = フルデモ」の実体（**期間制限 or 出力制限**）は Phase2 UI gate で kimny が現物選定。この選択が render harness の構造を分岐させる:

| demo 形態 | unlicensed の音 | render リファレンス | LOCK bit-identical harness |
|---|---|---|---|
| **(A) 期間制限・full-quality** | licensed と**同一**（時間切れまで） | **1本**（= LOCK md5・unlicensed も licensed も同じ） | そのまま適用（音は state 不変） |
| **(B) 出力制限**（周期ミュート/ノイズ等） | licensed と**異なる** | **2本**（demo-ref + licensed-ref） | **licensed path のみ**に適用・demo path は専用 deterministic ref |

- **(A) の追加 assert**: 時間切れ挙動が発火するか（pre-expiry = 全品質 / post-expiry = デモ制限）。**時刻の注入**（elapsed time simulation）が要る = dsp plugin 側の verify hook（§7 pull）。
- **(B) の要件**: 出力制限は **deterministic**（同入力 → 同制限出力）でなければ reference 化できない。ランダムノイズ注入型は reference render 不能 → verify 不能。**demo 制限は再現可能な形にする**のが verify 側の要求（Phase2 gate へのフィードバック事項）。

**C7 の設計判断**: harness を「state → 期待 render」の **写像で parameterize** し、Phase2 が demo 形態を LOCK した時点でこの写像を1本/2本どちらかに埋める。**両分岐を今設計しておく**ことで、kimny の現物選定を待たずに verify 構造は完成する（選定後は写像を埋めるだけ）。

### 4.3 headless license 注入（自動化の必須要件・dsp pull）

verify を CI/harness で自動回すには、**`serial-licensed` state を headless に再現**できる必要がある（人手でシリアル UI に打ち込むのは自動化不能）。dsp に確認する実現手段の候補:
- test keyfile を既知 path に配置（`~/Library/...` 等）
- 検証を通す test serial（本番発行キーと別・verify 専用）
- env var / preference file で state を強制

これが**無い**と Leg A の licensed path は手動 verify に落ちる（キャラクター gate = 手動なのは正当だが、load/scan/render の機械 assert は自動化したい）。→ **§7 の最優先 pull item**。

### 4.4 キャラクター gate（両 state）
dsp の char gate = 試聴。paid では **demo音 と licensed音 の両方**を試聴（音のキャラクターが両 state で意図通りか）。(A) 期間制限なら音は同一なので試聴は1回で足る、(B) 出力制限なら **制限音そのもの**も「安っぽくない・不快でない・でも買う動機になる」かの人間判断が要る（= demo 形態の商品性 gate）。

---

## 5. Leg B のライセンス分岐（web/commerce・mued owner）

無料プラグインの web verify（email gate → welcome DL）に対し、paid は **購入 → ライセンス配送 → 起動 の commerce E2E** が新規に足される。C+ #673 の還流 webhook 設計と一体。

### 5.1 commerce E2E verify（FastSpring test storefront）
FastSpring `.test.` storefront で test 注文を打ち、以下の連鎖を assert:

```
[1] test purchase (FastSpring .test. popup, /muedsp)
      ↓ gaClientId + utm を custom tags に載せる（C+ §GA4継承）
[2] order.completed webhook → POST /api/webhooks/fastspring
      ↓ HMAC-SHA256 検証 PASS（不一致=401）
[3] 冪等: webhookEvents に source='fastspring' で記録（再送 dedup）
[4] buyer DB: masterchain_purchases に insert（critical・tx内）
      ├ email / licenseKey / orderId / amount / firstTouch が埋まる
      └ fastspringSubscriptionId = null（買い切り・将来サブスク用予約）
[5] GA4 purchase 発火（fail-open・#664 ga4-server 再利用）
[6] Resend buyer audience（RESEND_MASTERCHAIN_BUYERS_AUDIENCE_ID）へ add
[7] key + DL リンクの email が買い手に届く
[8] 届いた key で plugin が unlicensed → serial-licensed に遷移（Leg A と接続）
```

- [2]-[6] は **prod E2E script**（`verify-muedlim-prod-e2e.ts` の構造を踏襲 — LIVE endpoint 叩き → 台帳着弾確認 → synthetic データ外科的 cleanup）で自動化。**test storefront + synthetic buyer email** を使い、実 $69 を動かさない。
- [7]-[8] は **手動 + キャラクター gate**（買い手として実際にメールを受け取り → 起動 → licensed 化 を体験）。**mued 側 char gate = 実購入で「キーを受領 → 起動 → licensed」導線が通るか**（人間知覚・機械テスト外）。

### 5.2 非干渉の assert（無料 DL フローを壊さない — dispatch 明示要件）
paid commerce verify は無料 email-gate 経路に**触れない**ことを積極的に証明する:
- **別 route**: `/api/webhooks/fastspring`（paid）↔ `/api/muedsat|muedlim/subscribe`（free）— 交差なし。
- **別 audience**: `RESEND_MASTERCHAIN_BUYERS_AUDIENCE_ID` ↔ 無料 `RESEND_MUEDSAT/MUEDLIM_AUDIENCE_ID` — 買い手が無料リストに**自動で落ちない**事を assert（C2 の「リストを混ぜない」原則の verify 版）。
- **別 DB**: `masterchain_purchases`（buyer）/ `masterchain_interest`（C2）↔ 無料は audience のみ（DB 台帳無し）。
- **回帰0**: `subscribe-handler.ts` は無改修（registry の `hasLicense` は plugin binary 側概念・web subscribe には持ち込まない）。既存 `tests/unit/plugin-subscribe.test.ts` green 維持を verify に含める。

---

## 6. 将来アカウント層への非閉塞（verify が塞がない）

Q2a serial は revocation 不能 → 将来サブスク（融合型）は **上にアカウント層を追設**する（基盤作り直しでなく追設 = brief item64）。verify 構造がこれを塞がないための2点:

1. **license-state enum は open**（§3）— `account-licensed` / `subscription-active` の席を今から確保。将来これらを build した時、harness に state を1行足すだけで既存の (state × format × 4-assert) 骨格に乗る（harness 再構築不要）。
2. **buyer DB substrate の verify**（§5.1 [4]）— `masterchain_purchases` に email + key + `fastspringSubscriptionId`(予約 null) が埋まる事を C7 verify が確認 = **将来アカウント層の土台が実在する**証明。C7 はアカウント層を build しない・**土台が verify 可能な状態にある**ことだけ保証する。

---

## 7. dsp pull items（plugin 側実体 = Q2a・consult）

設計が plugin 側仕様に触れる箇所。**設計段階ゆえ dual-dispatch せず mued 起草 → 下記を dsp に確認**（優先度順）:

1. **【最優先】headless license 注入手段**（§4.3）— test keyfile 配置 path / test serial / env・pref による state 強制のどれが可能か。これが licensed path 自動 verify の可否を決める。
2. **keyfile/serial の形式・所在**（Valhalla/u-he 型の実体）— ファイル型 keyfile（path?）か in-plugin serial 入力か、両方か。plugin がどこを読んで検証するか。
3. **demo 形態の機構**（期間制限 / 出力制限）— どちらが実装容易か・**deterministic に作れるか**（§4.2 (B) の reference 化可否）。※現物選定は Phase2 kimny gate だが、機構の実現性は dsp 領分。
4. **未認証 auval 挙動**（§4.1）— unlicensed state で auval/pluginval が PASS する構造か。
5. **render が state で変わるか**（§4.2 の1本 vs 2本）— (A) 期間制限（音同一）なら1本・(B) 出力制限なら2本。dsp の demo 機構選択と直結。
6. **時刻注入 hook**（§4.2 (A)）— 期間制限を選ぶ場合、expiry 発火を verify するための elapsed-time simulation 手段。

---

## 8. 開いた論点（conductor / kimny / dsp）

1. **demo 形態（期間 vs 出力制限）= Phase2 UI gate**。C7 は両分岐を設計済み・選定後に render 写像を埋める（本設計は選定を**待たずに完成**する）。
2. **FastSpring test storefront の availability** — `.test.` storefront で webhook + license 発行まで通せるか（C1 = Kevin 審査後に確定）。commerce E2E [1]-[6] はそこで実行可能になる。
3. **verify 専用 test serial/keyfile の発行元** — FastSpring 内蔵ジェネレータの test キー使用か・dsp が verify 専用キーを別発行か（本番発行キーと分離）。
4. **CI 統合の粒度** — Leg A licensed path の機械 assert を CI に載せるか（headless 注入次第・§4.3）・load/scan/render は自動化狙い、試聴は手動 gate 維持。
5. **invalid-license fallback の網羅度**（§4.1）— 破損キー / 他製品キー / 期限切れ（将来サブスク時）の各ケースをどこまで verify するか。買い切り現段階は「破損 → demo fallback」1ケースで足りる。

---

## 9. 再利用（新パターンなし）

- web commerce E2E: `scripts/verify-muedlim-prod-e2e.ts`（LIVE endpoint 叩き → 台帳着弾 → 外科的 cleanup）の構造を FastSpring レールへ。
- webhook 検証/冪等: C+ #673 設計（`webhookEvents` + HMAC `timingSafeEqual` + `masterchain_purchases`）。
- 非干渉回帰: `tests/unit/plugin-subscribe.test.ts`（無料 subscribe 回帰0 の既存担保）。
- plugin binary harness: dsp 既存 md5/auval/render/notarize（MUEDsat/MUEDlim で確立）に §3 の state 軸を足す。
- キャラクター gate: `.github/pull_request_template.md` 成果物 verify（dsp=試聴 両state / mued=実購入導線）。

---

## 10. サマリ（conductor review 用）

- **中核**: verify harness を license-state の **open enum で parameterize**（§3）。無料 = `unlicensed` 単一 = 従来通り（非干渉）、paid = state × format × 4-assert マトリクス。
- **2脚に足す**: Leg A（dsp・plugin binary の md5/auval/render に state 軸）+ Leg B（mued・購入→webhook→キー配送 commerce E2E）。
- **Phase2 gate 依存を吸収**: demo 形態（期間/出力制限）で render リファレンスが1本/2本に分岐 → 両方設計済・選定後に写像を埋めるだけ（§4.2）。
- **将来を塞がない**: enum に将来 state の席・buyer DB 土台の verify（§6）。
- **dsp pull = 6項**（最優先 = headless license 注入・§7）。実装 owner: Leg A = dsp / Leg B = mued / FastSpring test キー = C1 と連動。
- **次**: conductor review → 実装は kimny gate（C1 FastSpring 設定 + Phase2 demo 形態 LOCK）と束ねる。C1（Kevin 待ち）**非依存**で本設計は完成。
</content>
</invoke>

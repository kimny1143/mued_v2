# C7 — verify 手順のライセンス分岐設計（設計ドラフト）

*mued lead 起草 / 2026-07-15（**dsp（8ldcps6r）§7 回答 folded 2026-07-15**・訂正ゼロ）/ **設計のみ・非gate・inert・本番非露出**（実装 + go-live は別 kimny gate と束ねる）。正本設計 = `_chief/decisions/mued/brief-paid-line-design-20260714.md`（C-7・item39）・執行計画 = `_conductor/docs/inbox/paid-line-execution-plan-20260714.md`（C7）。conductor review PASS→merged（#682/cbf9b32e）。本版は dsp §7 回答（keyfile 機構・iPlug2 clock 訂正・AAX×PACE 新論点）を反映した follow-up。*

前提（kimny gate 確定済）: **Q2=(a)** — Valhalla/u-he 型シリアル・keyfile・**DRM なし**・**未認証 = フルデモ**（期間 or 出力制限は Phase2 UI gate で現物選定）。masterchain = **単一製品・買い切り**（Q4）。サブスク = 将来の追設層（配管は将来アカウント層を建てられる形で確保）。

---

## 1. 目的・スコープ

MUEDsp の既存 verify（無料 MUEDsat/MUEDlim で確立）は「ライセンス状態」という軸を持たない — 誰でも DL リンクを踏めば full binary が手に入り、プラグインは常に全機能で動く。masterchain $69 は **serial/keyfile ライセンスを持つ最初のプラグイン**であり、verify harness に **license 状態の軸**が1本増える（Chief brief item39: 「md5/auval/render 照合にライセンス状態の軸が増える」）。

**C7 のスコープ = この分岐を設計する（実装しない）**。具体的には:

1. 既存 verify 2脚（plugin binary / web）に license 軸をどう足すか
2. その軸を **無料プラグインの verify に干渉させない**（無料は「ライセンス無」ブランチ = 従来通り）保証
3. **未認証 = フルデモ**の verify 手順（Q2a の実体差 = バッジのみ / 出力制限 / 期間制限 の3分岐に耐える設計＝§4.2）
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

> **dsp commit（§7-4・2026-07-15）**: これは hopeful でなく **dsp が設計不変条件として commit** — license check は plugin の instantiation/validation/ProcessBlock を**絶対に失敗させない**。ゲートは cosmetic バッジ（フルデモ）or 出力制限ルールの toggle のみ・**構築 abort / ProcessBlock error は禁止**。自前コードゆえ保証容易（PACE/iLok と違い失敗要因が我々の管理下）。→ 既存 auval gate で「keyfile 無しで PASS」をそのまま検証可。

### 4.2 ★ demo 形態が render リファレンスの本数を決める（Phase2 gate 依存・3-way）

Q2a「未認証 = フルデモ」の実体は Phase2 UI gate で kimny が現物選定。dsp §7-3/5/6（2026-07-15）を反映し、**選択肢は3-way**（正本 brief の「期間 or 出力制限」に、DRM-free Valhalla を字義通り取った **(0) バッジのみ**を加える）。この選択が render harness の構造を分岐させ、**verify コストは (0) < (A) < (B)**:

| demo 形態 | unlicensed の音 | render リファレンス | 追加 seam | LOCK bit-identical harness |
|---|---|---|---|---|
| **(0) バッジのみ**（Valhalla 字義・音声パス制限なし・GUI "UNREGISTERED" バッジのみ） | licensed と**完全同一** | **1本**（= LOCK md5・license 軸は GUI のみ） | 不要 | そのまま適用（音は state 不変・差はバッジで audio gate は見ない） |
| **(A) 出力制限**（周期ミュート/バイパス等） | licensed と**異なる** | **2本**（demo-ref + licensed-ref・両者 deterministic） | 不要（clock 非依存の純関数） | **licensed path のみ**・demo path は専用 deterministic ref |
| **(B) 期間制限**（例 30日 trial・full-quality→expiry で制限） | expiry まで**同一**・以降**異なる** | **2本**（licensed + expired） | **必要**（自前 `NowUTC()` seam・下記★） | expiry までは licensed と同一 |

- **★ iPlug2 clock 訂正（dsp §7-6）**: iPlug2 `GetTimeInfo()`/`ITimeInfo` は **DAW transport 位置（musical/sample pos）で wall-clock ではない** → trial expiry には使えず、暦時間の注入口にもならない。expiry は OS clock 直読（`std::chrono::system_clock`）になり iPlug2 は抽象化/注入を提供しない。→ verify 可能にするには **自前 seam**: clock 読取を1関数（`NowUTC()`）に包み、verify build で env（`MUEDSP_FAKE_NOW=<epoch>`）or test setter で上書き可に。settable な初回 timestamp file と組めば任意 elapsed を deterministic に模擬。**この seam が要るのは (B) 期間制限を選んだ時だけ**。
- **(A) の要件**: 出力制限は **deterministic**（同入力 → 同制限出力）でなければ reference 化できない。ランダムノイズ注入型は reference render 不能 → verify 不能。**demo 制限は再現可能な形にする**のが verify 側の要求（Phase2 gate へのフィードバック事項）。dsp §7-3: 出力制限は clock/state 非依存の純関数ゆえ完全 deterministic → reference 化に最適。
- **dsp 推奨（§7-3・意図確認事項）**: Q2a「未認証フルデモ・DRM なし」を字義通り取ると **(0) バッジのみ**（demo 制限 DSP は存在しない）が最も整合し、Q3/Q5/Q6 が畳めて verify 最安（音声パス制限なし・clock seam なし・ref 1本）。転換圧のため制限を入れるなら determinism・verify コスト両面で **(A) 出力制限 > (B) 期間制限**。ここは **Q2a と「demo *制限* が在る前提」で矛盾しうる意図確認事項** → §8 に conductor 経由 Phase2 gate 上程として立てる。

**C7 の設計判断（decoupling は不変）**: harness を「state → 期待 render」の **写像で parameterize** し、Phase2 が demo 形態を LOCK した時点でこの写像を埋める。**3-way を今設計しておく**ことで、kimny の現物選定が (0)/(A)/(B) どれに落ちても **verify 構造は無改修で耐える**（選定後は写像を埋めるだけ）。dsp forward note（§7 ack）: 実装 GO 時に dsp 側で変わる deliverable は **reference-render 本数のみ**（(0)=1本 / (A)=2本 / (B)=2本+`NowUTC()` seam）・keyfile-inject の verify step は3形態共通で先行構築可。

### 4.3 headless license 注入（自動化の必須要件・dsp §7-1/2 回答反映）

verify を CI/harness で自動回すには、**`serial-licensed` state を headless に再現**できる必要がある（人手でシリアル UI に打ち込むのは自動化不能）。dsp §7-1/2（2026-07-15・**現状 plugin に license 機構は一切存在せず** = 以下は実装 feasibility）の推奨:

- **一次 = keyfile-at-known-path 型**: iPlug2 `AppSupportPath()` → `~/Library/Application Support/glasswerks/MUEDsp/license.key` を plugin 構築時に1回読む。plugin が読むもの = keyfile → **Ed25519 署名検証**（name+email+product payload・public key を binary 焼込・private key は mued/glasswerks が offline 保持）。**server 通信なし = offline・DRM-free**＝Q2a「未認証フルデモ」と整合。検証は pure/deterministic → verify 向き。
- **verify 注入**: 既知の **test keyfile を上記 path に置く → auval/render → 消す** で `serial-licensed` state を完全 deterministic に再現・**実 read path を通す**・UI 不要。GUI serial 欄も置くなら「同じ keyfile を書く」だけにして read path を一本化。
- **補助 = compile-gated env override**（`MUEDSP_FORCE_LICENSED=1`）: CI で最も楽だが **必ず非 release build に compile-time gate**（さもないと出荷 binary の自明な海賊化）。負例/expiry 用途の補助に留める。
- **不採用 = DAW project chunk（`SerializeState`）を license に使う**: per-project で「この Mac が licensed」を表現できない（dsp §7-1 明示）。

これが**無い**と Leg A の licensed path は手動 verify に落ちる（キャラクター gate = 手動なのは正当だが、load/scan/render の機械 assert は自動化したい）。→ keyfile-at-known-path 採用で **3形態（§4.2）共通の inject step として先行構築可**（dsp forward note）。

### 4.4 キャラクター gate（demo 形態別）
dsp の char gate = 試聴。paid の試聴回数は §4.2 の形態で決まる:
- **(0) バッジのみ / (B) 期間制限（pre-expiry）**: demo音 = licensed音 で同一 → 試聴1回で足る（license 差は audio でなく GUI バッジ）。
- **(A) 出力制限**: **制限音そのもの**も「安っぽくない・不快でない・でも買う動機になる」かの人間判断が要る（= demo 形態の商品性 gate）。制限音のキャラクターは機械テストで拾えない = kimny 耳。

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

## 7. dsp §7 consult — 回答受領・resolved（2026-07-15）

plugin 側実体（Q2a）に触れる6項を dsp（8ldcps6r）に pull → **全項回答受領・本版に fold 済（dsp ack: 訂正ゼロ）**。**大前提**: dsp grep 確認で **現状 plugin に license/serial/keyfile 機構は一切存在しない**（free 2製品は無ゲートの notarized pkg）→ 以下は全て実装 feasibility。

| # | pull item | dsp 回答（fold 先） |
|---|---|---|
| 1 | 【最優先】headless license 注入手段 | **keyfile-at-known-path**（`AppSupportPath()` + Ed25519）→ verify は「置く/消す」で deterministic 注入（§4.3） |
| 2 | keyfile/serial の形式・所在 | **file 型 keyfile が verify/headless に断然有利**・global path・chunk 不可・GUI serial 欄も同 keyfile に収束（§4.3） |
| 3 | demo 機構・determinism | 出力制限 = 純関数で完全 deterministic / 期間制限 = clock 依存で seam 必須 / **Valhalla 字義 = バッジのみ（制限なし）**（§4.2） |
| 4 | 未認証 auval | **PASS を設計不変条件として dsp commit**（§4.1） |
| 5 | render が state で変わるか | (0) バッジのみ=1本 / (A) 出力制限=2本 / (B) 期間制限=2本（§4.2） |
| 6 | 時刻注入 hook | **★訂正**: iPlug2 `GetTimeInfo()` は DAW transport で wall-clock 非対応 → 自前 `NowUTC()` seam 必須・**(B) を選んだ時だけ**（§4.2） |

**★ 追加論点（dsp §7-＋・新規）— AAX × PACE cross-format**: 全 MUED は VST3/AU/AAX 3形式必須（恒久ルール）。**AAX が PACE wrap のままなら、AAX の anti-piracy/認証は PACE のもので keyfile 機構ではない** → keyfile 軸は VST3/AU にしか効かず「未認証」の意味が AAX で別物になり得る。state×format マトリクス（§4.1）に **AAX×PACE の行が要るか**、paid AAX を DRM-free（Avid の AAX-without-PACE 現行 policy）で出せるかは **dsp 未検証 = verify 必要 TODO**（no-unverified-license-assertion）。policy-gate 寄り → **§8 の conductor/kimny 確認事項に立てる**。

**dsp forward note（実装 GO 時の dsp スライス）**: Phase2 で形態確定後、dsp 側で変わる deliverable は **reference-render 本数だけ**（(0)=1本 / (A)=2本 / (B)=2本+`NowUTC()` seam）。keyfile-inject の verify step（test keyfile 置く/消す）は **3形態共通で先に組める**。実装 GO 後 dsp が reference render + inject step を担当。それまで dsp standby。

---

## 8. 開いた論点（conductor / kimny / dsp）

1. **★ demo 形態 = 3-way（(0) バッジのみ / (A) 出力制限 / (B) 期間制限）= Phase2 UI gate + 意図確認**。C7 は3分岐を設計済み・選定後に render 写像を埋める（**選定を待たずに完成**・§4.2）。**意図確認（dsp §7-3 最重要指摘）**: Q2a「未認証フルデモ・DRM なし」を Valhalla 字義通り取ると **(0) バッジのみ**（demo 制限 DSP なし）が最整合で Q3/Q5/Q6 が畳め verify 最安 — だが正本 brief の Q2 推奨は「フルデモ（期間 or 出力制限）」＝**demo *制限* が在る前提**とも読め、両者が矛盾しうる。**どちらの意図か = kimny 確認事項**（3-way + verify コスト表 (0)<(A)<(B) を添えて conductor 経由 Phase2 gate に上程）。
2. **★ AAX × PACE cross-format（dsp §7-＋・新規・policy-gate 寄り）**: AAX が PACE wrap のままなら keyfile 軸は VST3/AU のみ・AAX の「未認証」が別物 → state×format に **AAX×PACE 行が要るか**・paid AAX を **DRM-free（Avid AAX-without-PACE policy）で出せるか** = dsp 未検証 TODO。**conductor/kimny 確認事項**（keyfile 一本化できないと §4.1 マトリクスの AAX 列に PACE 分岐が生える）。
3. **FastSpring test storefront の availability** — `.test.` storefront で webhook + license 発行まで通せるか（C1 = Kevin 審査後に確定）。commerce E2E [1]-[6] はそこで実行可能になる。
4. **verify 専用 test keyfile の発行元** — FastSpring 内蔵ジェネレータの test キー使用か・dsp が verify 専用 keyfile を別発行か（本番発行キー = Ed25519 offline private key と分離）。
5. **CI 統合の粒度** — Leg A licensed path の機械 assert を CI に載せるか（keyfile-inject は headless 可・§4.3）・load/scan/render は自動化狙い、試聴は手動 gate 維持。
6. **invalid-license fallback の網羅度**（§4.1）— 破損キー / 他製品キー / 期限切れ（将来サブスク時）の各ケースをどこまで verify するか。買い切り現段階は「破損 keyfile → demo fallback」1ケースで足りる。

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
- **license 機構（dsp §7 確定）**: keyfile-at-known-path + Ed25519・offline・DRM-free。verify は test keyfile「置く/消す」で `serial-licensed` を deterministic 注入（§4.3）。未認証 auval PASS = dsp commit（§4.1）。
- **Phase2 gate 依存を吸収**: demo 形態 = **3-way**（(0) バッジのみ / (A) 出力制限 / (B) 期間制限）で render リファレンスが 1本/2本 + seam に分岐 → 3分岐設計済・選定後に写像を埋めるだけ・**decoupling 不変**（§4.2）。
- **将来を塞がない**: enum に将来 state の席・buyer DB 土台の verify（§6）。
- **dsp §7 = 6項 全回答受領・fold 済**（§7）。実装 owner: Leg A = dsp（reference render + keyfile-inject step）/ Leg B = mued / FastSpring test キー = C1 と連動。
- **★ 上程2件**: ① demo 形態の意図確認（Valhalla 字義 (0) vs 制限あり (A)/(B)）= Phase2 gate + kimny ② AAX×PACE cross-format = policy-gate（conductor/kimny・§8-1/2）。
- **次**: 実装は kimny gate（C1 FastSpring 設定 + Phase2 demo 形態 LOCK）と束ねる。C1（Kevin 待ち）**非依存**で本設計は完成。
</content>
</invoke>

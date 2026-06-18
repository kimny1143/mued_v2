# MUEDial 守り #1 — full-loop reliability 42→60点 assess + /plan

状態: **assess + /plan（conductor GO・実装は kimny 承認後）**。Chief ロードマップ #1（守り最優先）= 複数ユーザーが全周回（upload→preview→mix→final→master→download）を**安定完走**する（60点）。

## 方法 + 確信度の扱い
- 並列 read-only Explore 監査 6 本（ingest / preview / chat / final-billing / mastering / delivery+cross-cutting）。各 stage を**複数ユーザー視点**で監査。
- Explore は抜粋ベースゆえ誤検出があり得る。**P0 主張は mued が実コードで検証済**。各項に確信度: **[VERIFIED]**=実コード確認 / **[HIGH]**=複数 agent 収束＋既知 incident と整合 / **[CAND]**=単一 agent・実装時 spot-check 要。

## ★ヘッドライン
**課金二重化（双方向）は #438/#490 で実質ハード済**——mastering 4 経路は全て uncharged-reservation skip で double-charge ゼロ（[VERIFIED] 監査）・final の cycle 予約は atomic conditional UPDATE で TOCTOU 無し（[VERIFIED] final/route.ts:226-239）。**よって 60点 の gap は「課金の正しさ」ではなく「成果物の耐久性・回復性」と「失敗の握り潰し」**。すなわち **R2 durability copy が fire-and-forget + 失敗握り潰しで task を completed 化** → 「完了表示だが DL が壊れる」が全 stage に再発。これが守りの中核。

---

## A. 検証で否定/降格した項目（**直さない or 降格**）
- **XCUT-1（cross-user leak・当初 P0）= 否定（false positive）**。[VERIFIED] `withDialAuth`(with-dial-auth.ts:57-73) は guest token が**存在し非失効 session に一致**した時のみ `isGuest=true`＝`auth.guestToken` は null になり得ない → link 変換後 `session.guestToken=NULL` に guest が一致する経路は無い。漏洩なし。
- **FINAL-2（cycle leak on charge failure・当初 P0）= 意図的設計に降格（→ D で UX/remedy のみ）**。[VERIFIED] final/route.ts:267-271 のコメント通り「charge 失敗で slot を保持（refund で re-submit 二重課金を防ぐ・#434 false-abort 原則）・remedy は admin comp」。bug でなく trade-off。
- **mastering double-charge = clean**。[VERIFIED] #438/#470/#471/#481 fix 全て present・4 poll/webhook 経路で uncharged-reservation skip。
- **guest token 失効（XCUT-2/CHAT-6）= 降格（P2 defense-in-depth）**。[VERIFIED] `withDialAuth:62` が auth 入口で `gt(guestTokenExpiresAt, now)` を強制ゆえ `verifyDialSessionOwnership` の再チェック欠如は実害小。
- **XCUT-10（webhook 200-on-error → orphan）= 降格（P2）**。[HIGH] #434/#471 で finalization は GET poll + cron reconcile に移管済ゆえ webhook 失敗でも poll/cron が拾う。

---

## B. 確認した 60点-blocking gap（クラスタ別・優先）

### クラスタ 1 ★最優先: R2 durability copy の握り潰し → completed-but-broken
**症状**: R2 コピー（GCS 1h → R2 30日 の耐久化）が fire-and-forget で、失敗が catch で握り潰され **task を `status='completed'` 化**。`finalUrl`=GCS（~1h で失効）のみ残り、**「完了」なのに DL が数十分で壊れる**。複数 stage に再発。
- **FINAL-4** [VERIFIED] final/route.ts:313-319 — R2 copy 失敗を catch→completed（r2FinalUrl 無し）。
- **MASTER-1/5** [HIGH] mastering/final:195 + webhooks/roex:180 — 同型（master 220cr 課金後）。
- **INGEST-1/7** [HIGH] upload/confirm:113-136 — upload R2 copy 失敗→success(r2Url:null)・GCS 1h 失効で stem drop。
- **DELIVERY-3/4** [HIGH] final/route.ts:299-320 — fire-and-forget・失敗 alert/retry 無し。
- **fix 方向**: R2 copy 失敗時に **completed にしない**（`status` 据置 or `r2_copy_failed` flag）→ cron/再試行で R2 再コピー。最低限「finalUrl(GCS) も DB 保持」+「completed は r2FinalUrl 成立後」。observability（R2 失敗率 alert）。

### クラスタ 2 ★最優先: R2 30日失効・再コピー/refresh 経路なし →「returning user が読めない」
- **DELIVERY-1/2** [HIGH・memory 整合（reference-dial-effects-recovery: preview R2 非cache=数日失効）] download/route.ts は `r2ExpiresAt < now` を事前チェックせず・失効後の再コピー経路なし・sessions/dashboard は daysRemaining 表示のみで「再生成/refresh」action 無し。
- **fix 方向**: DL 前に `r2ExpiresAt` チェック→失効なら async 再コピー（既存 finalUrl/GCS or RoEx retrieve から）。`/dial/sessions` + dashboard に「DL を更新」action（新 POST endpoint）。or アクセス毎に `r2ExpiresAt` を now+30d に延長。

### クラスタ 3: 失敗の握り潰し → ユーザーに feedback/retry が無い
- **PREVIEW-1** [CAND・要 spot-check] session GET poll が previewUrl は書くが **stemsUrls を書かない** → client decode stall（"Decoding…" 無限）。preview/route.ts は書く・session/route.ts:123-143 が欠落の主張。
- **PREVIEW-10** [CAND] preview poll の transient error が `{status:'processing'}` を返し続け → backstop(60min)まで失敗 feedback 無し。
- **INGEST-3** [VERIFIED 風・要再確認] page.tsx の `runAnalysis` が `catch {}` で握り潰し→分析失敗が無 feedback。
- **PREVIEW-8** [CAND] decode stall 検出（telemetry）するが retry UI 無し。
- **CHAT-3** [CAND] 空テキスト時 fallback「適用しました」を tool 発火検証なしで注入。
- **fix 方向**: fail-loud + 失敗時の retry affordance（UI）+ transient poll error は N 回で fail-fast。

### クラスタ 4: 並行/原子性（real だが bounded）
- **XCUT-9 / PREVIEW-6/9** [CAND・final と比較で plausible] preview/route.ts:149-155 が previewCount を非原子 read-then-write（final は atomic `sql +1`）→ 並行 preview で omakase 5-limit bypass（課金影響なし=無料 preview の超過のみ）。
- **CHAT-4/7** [HIGH] 共有 guest session で並行 chat → 両者 adjust_preview 発火（preview 無料ゆえ二重課金でなく無駄 mint + state 不整合）。idempotency-key 無しで retry 二重 message。
- **XCUT-4** [HIGH] preview/final POST は session 行 advisory lock 無し（mastering は有）→ state 進行自体は forward-only で安全だが周辺 cycle/status write は非原子。
- **FINAL-10 / MASTER-3** [CAND] state machine advance が mix_check 完了で進まない（`taskCompleted=!!finalUrl`）/ master state advance が try-catch 無しで未進。
- **fix 方向**: 課金/quota に関わる counter は atomic UPDATE + WHERE guard（final 方式に統一）。chat に idempotency-key。preview/final POST に session advisory lock（mastering 方式）。state advance を完了判定と分離 + reconcile。

### クラスタ 5: 課金失敗の remedy（FINAL-2 起点・意図設計の補完）
- charge 失敗で cycle 消費保持（意図）だが remedy が手動 admin comp のみ（**FINAL-8** [VERIFIED]）。free session(baseCycleLimit=3) は transient RoEx 失敗で 1/3 を失い詰まる。
- **fix 方向**: 「確実に未課金（submit が送信前に throw）」と「課金したかも」を区別し前者は安全に slot 戻す or auto-reconcile cron で charge 失敗 cycle を remedy。ユーザーへ「失敗・再試行/サポート」明示。

---

## C. 60点への gap 要約（優先度）
| # | gap | クラスタ | severity | 確信度 |
|---|-----|---------|----------|--------|
| 1 | R2 copy 失敗握り潰し→completed-but-broken（final/master/webhook/ingest） | 1 | **P0/P1** | VERIFIED/HIGH |
| 2 | R2 30日失効・再コピー/refresh 無し（returning user 読めない） | 2 | **P1** | HIGH |
| 3 | 失敗の無 feedback（analyze/preview-poll/decode-stall） | 3 | P1 | VERIFIED/CAND |
| 4 | previewCount 非原子 + chat 並行 + idempotency | 4 | P1/P2 | HIGH/CAND |
| 5 | charge 失敗 remedy が手動のみ | 5 | P1（運用） | VERIFIED |
| 6 | state advance gap（mix_check/master 未進） | 4 | P2 | CAND |

---

## D. 後決済 Phase scope 概観（Chief「複利の前提」/ Plan #488）
**既に着地済（今 session）**: state machine（Phase 1a/1b: #492/#496/#501/#504）/ `payment_status` gate（Phase 0 §③: #490）/ 自動 Final 廃止（R-1/R-1b）。
**後決済 残 scope**（pay-after = 消費は即・集計決済は終了時 / DL ゲートで回収保証・案A）:
1. **② mastering URL validate**（小）— bare-string 無検証 completed の hardening（audit 同梱）。
2. **要件2 WYSIWYG**（小・(a) 確定）— 「この版を Final に」明示選択 UI + 昇格=`task_type` UPDATE（再 render 無し・250cr 増えない・Yuu 実証）。
3. **Phase 2 後決済タブ**（大・greenfield R-4）— session 課金台帳（`dial_session_charges` or `pending_charge_cents`）+ in-flow 承認（「+$X OK?」）+ **DL 前に集計 Stripe Checkout**（既存 paymentStatus gate 流用）+ MixCheck soft-cap 化。**#438 の reserve/advisory/unique を全経路に**（新 TOCTOU 面）。
4. **要件3 mastering→mix reopen**（中）— `mix_reopened_at` flag で `isMasteringPhase=false` 強制・mix ツール復帰。
- 「複利の前提」= Final 承認制 + 後決済で**ユーザーが Final を実質拒否でき**、納得した分だけ払う → 点火後の好レビューの燃料。

---

## E. 推奨 path（優先順 + 工数）
**守り（60点 到達）を先・後決済はその上**（Chief 守り→攻め→点火）。各独立 PR・Tier2 中心（課金台帳/Stripe は Tier3）。

1. **PR-R1 R2 durability hardening（クラスタ1）**【最優先・中】: R2 copy 失敗で completed にしない + cron 再コピー + GCS finalUrl 保持 + 失敗 observability。→ 「完了なのに壊れる」を全 stage で解消。**60点 の最大単一 leverage**。
2. **PR-R2 R2 失効 recovery（クラスタ2）**【最優先・中】: DL 前 expiry チェック→async 再コピー + `/dial/sessions`/dashboard に refresh action。→ 「returning user 読めない」解消。
3. **PR-R3 失敗 surfacing（クラスタ3）**【高・小〜中】: stemsUrls poll 書込（PREVIEW-1 spot-check 後）+ analyze/preview transient の fail-loud + retry UI。
4. **PR-R4 並行/原子性（クラスタ4）**【中】: previewCount atomic 化 + preview/final advisory lock + chat idempotency-key + state-advance 分離。
5. **PR-R5 charge 失敗 remedy（クラスタ5）**【中・運用】: 未課金確実 case の安全 revert or auto-reconcile cron + UX。
6. **後決済（D）**= 守り後に Phase 化（② validate → 要件2 WYSIWYG → Phase2 後決済タブ → 要件3 reopen）。

**工数感**: PR-R1/R2/R3 = 各 中（既存パターン流用）/ PR-R4/R5 = 中 / 後決済 Phase2 = 大（greenfield 台帳）。守り（R1-R5）で 60点、後決済で「攻め/点火の前提」。

## F. caveats
- 本 assess は read-only Explore（[CAND] は実装時 spot-check 要・特に PREVIEW-1 stemsUrls / XCUT-9 previewCount / FINAL-10 state-advance）。
- 各 hardening PR は **複数ユーザー並行の実証**（concurrent POST / webhook+poll race）を character gate に。R2 失敗系は**実際に R2 を落とす/失効させる**再現で verify（DevTools/単体では非忠実な箇所あり）。
- prod DB 触る項（cron/台帳 migration）は migration-first + kimny 専管。

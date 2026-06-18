# PWA Phase 0.5 — セッション再入経路 assess（/plan 候補）

状態: **assess（読み取り専用・実装なし）**。kimny iPhone E2E が炙り出した次層 gap の調査。/plan 化は kimny 承認後。
親: PWA Phase 0（#517・installable+全画面・**E-1=sign-in standalone 成立で PASS/クローズ**）は prod LIVE。本書はその上の「実際に使える」化。

---

## 0. ★SHARPENED（kimny post-E2E 本丸 + 重要発見）

kimny の本丸言語化: 「**multi-session ユーザーがセッション履歴（ダッシュボード）を見たい・今 dial からその導線が無い**」。これを受けた再精査で**重要発見**:

### 発見: 統合ダッシュボードが既に存在し、dial セッションを一覧している
`app/dashboard/page.tsx` = **MUEDnote + MUEDial + MUEDear 統合ダッシュボード**（server component）。
- **dial セッションを userId(Clerk) で一覧**: `:139-153` `db.query.dialSessions.findMany({ where: eq(dialSessions.userId, user.id), orderBy: desc(createdAt), with: tracks/tasks })`。
- リッチな表示: mode/status/title/trackCount/hasFinal/**hasDownload + daysRemaining(R2 失効カウントダウン)**/resume `href:/dial/session/${id}`（`:272-331`）。
- `SessionLedger` コンポーネント（`components/dashboard/session-ledger.tsx`）で描画。**`showDialOnly` prop（:98）+ dial-only grouping（:49）が既にある**＝dial 単独ビューに転用可能。

→ **「セッション履歴/ダッシュボード」はデータ層・UI 部品ともに既に構築済**。前 §2 の「dial 一覧 API/UI は無い」は **dial 'サーフェス' に限れば正**だが、**統合 /dashboard は dial を一覧している**（self-correction）。

### 真の gap: dial サーフェスから履歴への導線 + PWA same-origin 整合
- `/dashboard` は **mued.jp 配信**。**`dial.mued.jp/dashboard` は middleware（`middleware.ts:55`）が mued.jp/sign-in に cross-origin redirect** → dial.mued.jp の PWA same-origin モデルに**合わない**（PWA から踏むと standalone を出て mued.jp へ）。
- dial トップ nav（`page.tsx:461-474`）に履歴への link は**無い**（Pricing + UserButton/SignIn のみ）。

### 推奨（sharpened）: **dial-scoped セッション履歴ページ（same-origin）**
- 新 same-origin route（例 `/dial/sessions`）= **既存の dial-by-userId クエリを再利用**（dashboard:139-153 を共有 helper or dial list API に抽出）+ **`SessionLedger showDialOnly`** で描画 → resume も dial.mued.jp に留まる＝**PWA 内で完結**（cross-origin leave なし）。
- dial nav（signed-in 時）に「履歴 / My Sessions」link 追加。
- **E-1 で Clerk standalone 成立済**ゆえ前提クリア（satellite 不要）。
- データ層・`SessionLedger`（showDialOnly）が既存ゆえ、**主に same-origin route + nav link + クエリ抽出**＝中規模。
- guest token 再入は**副次**（multi-session は主にログイン済）。guest fallback (B token 手入力) は後続オプション。

### 代替
- **(代替B) dial→/dashboard(mued.jp) を link するだけ**: 最小だが cross-origin（PWA を出て mued.jp へ・resume も mued.jp）＝PWA-native でない。multi-session signed-in には技術的に動くが「アプリ内に留まる」目的を外す。
- **(代替C) middleware で dial.mued.jp/dashboard を redirect せず描画**: 統合 dashboard を dial に載せる = note/ear タブまで来る + routing/layout 大改修。非推奨。

### Tier / scope（/plan 時確定）
- dial-scoped 履歴ページ: 新 same-origin route + nav link + 既存クエリ抽出（+必要なら read-only list API）。schema 追加なし・auth は既存 `withAuth`/`withDialAuth` 踏襲・**userId 厳格 scope（列挙脆弱性回避）** → **Tier2** 見込。
- character gate: kimny 実機で「PWA 内で履歴→resume が standalone のまま完結」。

### kimny 確認事項（sharpened・/plan 前）
1. **dial-scoped 履歴ページ（same-origin・PWA 内完結）** で良いか？ それとも既存 /dashboard への link（cross-origin・最小）で十分か？
2. 履歴の置き場: dial nav の「履歴」link → 新 `/dial/sessions` ページ、で良いか（or dial トップ内セクション）？
3. guest token 手入力 (B) は今回スコープ外（後続）で良いか？（multi-session=主にログイン済の前提）

> 以下 §1〜§6 は post-E2E 前の初回 assess（guest token 再入を主軸に置いた版）。iOS 制約（§1）とデータモデル（§2）は引き続き有効。本丸は上記 §0（ログイン済 multi-session 履歴）に shift。

---

## 1. kimny の発見と iOS の構造的制約

standalone PWA（ホーム画面起動）で、ゲストが自分のセッションに辿り着けない。主経路（リンクで開くゲスト体験）が PWA 内で完結しない。根本は iOS の 3 制約:

- **(C1) storage 分離**: standalone PWA は Safari と別の storage パーティション。Safari で書いた `localStorage` は PWA から見えない。
- **(C2) アドレスバー無し**: standalone 内で `?token=` URL を貼って開けない。
- **(C3) deep-link 不可**: iOS は in-scope の外部 https リンクをインストール済 PWA に流さない（Android の link-capturing 相当が無い）。メール/Threads の `?token=` リンクは Safari で開く。

→ **リンクベースの再入は standalone PWA on iOS で構造的に壊れる**。

---

## 2. Q1: dial トップ（start_url=/ = dial.mued.jp/dial）は今 何を出すか

`app/dial/page.tsx` = **マーケ/チェックアウト LP**。セッション一覧・ダッシュボード・resume リストは**無い**。

- 構成: hero / チェックアウト（mix 選択 + マスタリング addon + email or signed-in）/ free campaign CTA / before-after デモ / 動画 / FAQ / footer。
- **唯一の再入導線** = footer「セッションに戻る」ボタン（`page.tsx:699-709`）: `localStorage.getItem('dial_session_id')` を読んで `/dial/session/[id]` へ遷移。**最新 1 件のみ・同一 storage context のみ**。
- **signed-in でも同じ**（一覧無し）。signed-in 判定は nav の UserButton だけ。

### セッション継続は完全に localStorage 依存
- checkout 成功（`page.tsx:438-440`）→ `dial_guest_token` + `dial_session_id` を localStorage に保存。
- free campaign start（`page.tsx:341-342`）→ 同上。
- session ページ（`session/[id]/page.tsx:231-241`）→ `?token=` を localStorage に復元 / 以降 `X-Dial-Guest-Token` ヘッダ付与。
- これらは**ほぼ Safari（LP）で発生** → PWA の localStorage は空 → footer 再入ボタンは PWA 内で何も見つけられない。

### データモデル（再入設計の前提）
- `dialSessions.userId`（Clerk・nullable）+ `dialSessions.guestToken`（nullable・expiry 付き）。
- guest セッション = guestToken で識別。signed-in = userId で識別。
- **guest→user 変換は存在**: `/api/dial/link-account`（`withAuth`・guestToken→該当 dialSession の userId set + guestToken クリア + dialPurchases も userId 移管）。session ページ `:428-446` が sign-in 後に自動実行。
- **セッション一覧 API は無い**: `GET /api/dial/session?id=<id>` は単一取得のみ（`session/route.ts:82+`）。`dialSessions WHERE userId=...` の list は app/lib/components のどこにも無い（grep 0 件）。`sessions.repository.ts` は MUEDnote 用（dial 非対象）。

---

## 3. Q2: PWA 内で自セッションに辿る設計余地

iOS 制約（C1/C2/C3）下で、PWA 内の再入は以下のいずれかしかない:

### (A) Clerk 認証セッション一覧「My Sessions」 ★Connect 前提と一致
- 新規: list-by-userId API（`dialSessions WHERE userId=$user ORDER BY updatedAt`）+ dial トップに signed-in 時の「My Sessions / 続きから」UI。
- **依存**: ①Clerk sign-in が standalone で成立すること（= PWA Phase 0 の E-1/E-2 判定。**E-2 なら satellite domain 化（別 Tier3）が前提**）②セッションが user-owned であること（guest は link-account で変換要）。
- 価値: signed-in の returning user が PWA から resume = **Connect 構想（スマホアプリから作業に辿る）の土台そのもの**。最有力の long-term。

### (B) token/コード手入力（dial トップに「リンクをお持ちですか？」入力）
- `?token=` 値（or 短いコード）を貼る入力 → PWA の localStorage に保存 → セッションへ遷移。
- C1/C2/C3 を**全て回避**（リンク/storage 引き継ぎ/アドレスバーに非依存）。ゲストが sign-in 無しで使える。
- UX はやや無骨だが iOS で堅牢。**即効の fallback**。Safari で開いた link から token をコピー → PWA に貼る、で救える。

### (C) guest→account 変換を first-run で促す
- sign-in/up を促してセッションを user-owned 化（→ (A) に合流）。
- funnel を変える + Clerk standalone（E-2）依存。単独では弱い。(A) の入口として位置づけ。

### ★位置づけの論点（kimny 判断）
guest-via-link の**集客主経路は Safari に残す**のが iOS の素直な姿（リンクは Safari で開く）。PWA は「**signed-in / returning user の作業アプリ**（resume・Connect）」として位置づけ、guest-link funnel を PWA に通そうとしない、という整理がありうる。= PWA の主対象を再定義する product 判断。

---

## 4. 推奨（/plan 化する場合の骨子）

1. **(A) My Sessions（authed 一覧）を主軸**: list-by-userId API + dial トップ signed-in UI。Connect 土台。**Clerk standalone（E-1/E-2）の結果に gate** — E-2 なら satellite Tier3 を先に。
2. **(B) token/コード手入力を guest fallback**: 低コスト・iOS 堅牢。(A) と独立に入れられる（sign-in 不要層を救う）。
3. **位置づけ整理**: PWA = signed-in/returning の作業アプリ。guest-link 集客は Safari 主、を kimny に確認。

実装順の素案: 「(B) 即効 fallback」→「Clerk standalone 判定」→「(A) authed 一覧（+必要なら satellite）」。各独立 PR。

## 5. Tier / scope の見立て（/plan 時に確定）
- (B) token 入力: UI + localStorage のみ・auth/schema 不変 → **Tier2** 見込み。
- (A) My Sessions: **新 list API**（read-only・userId scope）+ UI。schema 追加なし（既存列）。auth 経路は既存 `withAuth`/`withDialAuth` 踏襲なら **Tier2**。ただし「自分のセッションのみ列挙」= 列挙脆弱性に注意（userId 厳格 scope・guest 一覧は guestToken 単位で出さない）。
- satellite domain 化（E-2 時）: Clerk 本番設定変更 → **Tier3 + kimny escalation**。

## 6. kimny への確認事項（/plan 前）
1. PWA の主対象を「signed-in/returning の作業アプリ」と位置づけ、guest-link 集客は Safari 主、で良いか？
2. guest fallback (B) token 手入力を入れるか（sign-in 無し層の救済）/ それとも sign-in 誘導 (A)(C) に寄せるか？
3. 着手は PWA Phase 0 の E-1/E-2 判定後で良いか（(A) は Clerk standalone 成否に依存）。

---

## 付記: なぜ「リンクで戻す」が PWA で効かないか（再掲・要点）
メール/Threads の `?token=` リンクをタップ → iOS は Safari で開く（C3）→ token は Safari の localStorage（C1）→ PWA には届かない。PWA 内にはアドレスバーが無く貼れない（C2）。ゆえに PWA 内再入は「認証一覧 (A)」「手入力 (B)」「PWA 内で作ったセッション（localStorage 同一 context）」のいずれかに限られる。

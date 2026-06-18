# PWA Phase 0.5 — セッション再入経路 assess（/plan 候補）

状態: **assess（読み取り専用・実装なし）**。kimny iPhone E2E が炙り出した次層 gap の調査。/plan 化は kimny 承認後。
親: PWA Phase 0（#517・installable+全画面）は prod LIVE で達成・有効。本書はその上の「実際に使える」化。

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

# /plan — PWA Phase 0.5: dial-scoped セッション履歴 `/dial/sessions`

状態: **/plan（conductor GO 済・実装は kimny 承認後）**。Tier2。
目的: signed-in ユーザーが **dial.mued.jp 内（same-origin）で自分の dial セッション履歴を見て resume** できる。PWA から Safari に出ずに「自分の作業に辿れる」(kimny 本丸)。Connect 構想の土台。

---

## 設計判断（実コード接地）

### 既存資産（再利用）
- **dial クエリ + マッピングは既存**: `app/dashboard/page.tsx:139-153`（`db.query.dialSessions.findMany({ where: eq(dialSessions.userId, clerkId), orderBy: desc(createdAt), with: tracks/tasks })`）+ `:272-331`（→ `UnifiedSession[]`: title/mode/status/trackCount/hasFinal/**hasDownload+daysRemaining(R2失効)**/resume `href:/dial/session/${id}`）。
- **`SessionLedger`（`components/dashboard/session-ledger.tsx`・'use client'）**: `showDialOnly` prop + dial grouping 既存 → dial 単独ビューに転用。
- `dialSessions.userId` = **Clerk ID**（checkout `route.ts:95` `userId: clerkUserId ?? undefined`・dashboard query も `user.id`=Clerk）= 整合。

### Clerk identity は dial.mued.jp で解決する（検証済の根拠）
`resolveClerkUserId`（`lib/middleware/with-auth.ts`）= Bearer JWT → `auth()` → `__session` cookie の順。dial は既に dial.mued.jp で Clerk identity を使用:
- LP（`app/dial/page.tsx`）の `useAuth().isSignedIn` で UserButton 切替 + signed-in checkout で clerkEmail 使用。
- session ページ `:428-446` の auto-link が `isSignedIn` + `getToken()` Bearer を dial.mued.jp で使用（「Signed-in users always use Bearer JWT」`:542`）。
- signed-in checkout が `userId=clerkUserId` でセッション作成 → dashboard に出る。
→ **Clerk は dial.mued.jp で機能**（`.mued.jp` 共有 cookie + Bearer）。**E-1（sign-in standalone 成立）で実機確認済**。本ページは signed-in 限定ゆえ前提クリア。リスク低（万一 未解決なら sign-in prompt に graceful degrade・後述）。

### 方式: クライアントページ + read-only list API（dial の Bearer 認証パターンに整合）
dial の signed-in 認証主経路は **client `getToken()` → Bearer**（session ページ実績）。これに合わせる:

1. **共有 helper**（NEW `lib/dial/list-user-dial-sessions.ts`）: `listUserDialSessions(clerkUserId): Promise<UnifiedSession[]>`。dashboard の dial クエリ + マッピングを抽出（単一の source of truth）。**userId 厳格 scope**（常に `eq(dialSessions.userId, $clerkUserId)`・引数 userId は検証済トークン由来のみ＝列挙不可）。
2. **GET `/api/dial/sessions`**（NEW `app/api/dial/sessions/route.ts`）: `withAuth`（**signed-in 限定**・guest は 401）。`resolveClerkUserId` で userId 確定 → helper → `{ sessions: UnifiedSession[] }`。read-only・mutation なし・**client から userId を受け取らない**（列挙脆弱性回避）。
3. **クライアントページ `/dial/sessions`**（NEW `app/dial/sessions/page.tsx`・'use client'）:
   - `useAuth()`: 未 sign-in → 「履歴を見るにはサインイン」prompt（`SignInButton`）+「ゲストはセッションリンクから」注記（graceful・guest は Safari 主の位置づけ）。
   - signed-in → `getToken()` Bearer → GET `/api/dial/sessions` → `<SessionLedger sessions showDialOnly />`。
   - loading / 空(0件) / error 状態。`useLocale` で i18n。`h-[100dvh]`・モバイル可・dial へ戻るリンク。
4. **dial nav 履歴 link**（EDIT `app/dial/page.tsx:461-474`）: `isSignedIn` 時に `<Link href="/dial/sessions">`（`lp.navHistory`）を Pricing 隣に追加。
5. **dashboard DRY 化**（EDIT `app/dashboard/page.tsx`）: 抽出した helper を dashboard でも使用（drift 防止・単一 source）。**dashboard 回帰を verify**（出力を現状と byte 等価に保つ）。
6. **i18n**（EDIT `messages/en.json` + `messages/ja.json`）: `dial.lp.navHistory` + `dial.sessions.*`（title/empty/guestNote/signIn/resume 等）。EN+JA parity。

### 代替（不採用）
- server component（dashboard 同型・`auth()` cookie 依存）: dial は client Bearer を主経路にしている（cookie 依存を避けている節）ゆえ、Bearer + API の方が dial 整合・堅牢。
- dial→/dashboard link のみ: cross-origin で PWA を出る（conductor 既に不採用）。

---

## ファイル（〜7）
| 種別 | ファイル |
|---|---|
| NEW | `app/dial/sessions/page.tsx`（client 履歴ページ） |
| NEW | `app/api/dial/sessions/route.ts`（GET list・withAuth・userId 厳格） |
| NEW | `lib/dial/list-user-dial-sessions.ts`（共有 query+mapper helper） |
| EDIT | `app/dashboard/page.tsx`（helper 使用に DRY 化・回帰 verify） |
| EDIT | `app/dial/page.tsx`（nav 履歴 link・signed-in 時） |
| EDIT | `messages/en.json` + `messages/ja.json`（i18n・parity） |
| (任意) | session ページ header に「履歴へ」戻り link（in-app nav・v1 defer 可） |

## セキュリティ / Tier
- **read-only・userId 厳格 scope**（userId は検証済トークン由来のみ・client param 不可）→ 列挙脆弱性なし。
- signed-in 限定（`withAuth`）。guest は graceful prompt（一覧なし＝位置づけ①整合）。
- **schema 変更なし・auth 設定変更なし・payment/pricing 不変** → **Tier2**（review 重点 = userId scope の厳格さ + dashboard 回帰）。

## テスト計画
- unit（vitest）: helper（フィールド mapping・userId scope）/ API route（自分の一覧返却・guest 401・任意 userId 受付拒否）。
- typecheck / lint / build green。
- **character gate（kimny iPhone・PWA）**: PWA インストール → sign-in → 「履歴」→ 一覧表示 → タップ → resume が **PWA 内（same-origin・Safari 離脱なし）** で開く → 履歴に戻れる。
- **dashboard 回帰**（mued.jp）: helper 抽出後も dashboard の dial 一覧が不変。

## ETA
- 実装 **~半日**（query+`SessionLedger` 既存ゆえ、新 route/page/API 配線 + i18n + unit + dashboard DRY 回帰 が主）。
- 順: helper 抽出（+dashboard DRY 回帰 verify）→ API → client ページ → nav link → i18n → unit → typecheck/lint/build → PR(Tier2) → conductor review → kimny PWA E2E。

## リスク
1. **Clerk-on-dial**（最重要だが低）: 根拠多数で解決見込み・E-1 実機 PASS。万一 client で `isSignedIn` 偽なら **sign-in prompt に graceful degrade**（壊れない）→ その場合のみ satellite（別 Tier3）検討。**E2E で「signed-in が dial.mued.jp で自分の一覧を見られる」を明確判定**。
2. **dashboard 回帰**（helper 抽出）: helper 出力を現状 mapping と等価に保ち dashboard 描画を verify。最小化したいなら dashboard は据置きで helper を新規コードのみに使う案も可（duplication 残るが blast-radius 最小）— **推奨は DRY 化（drift 防止）+ 回帰 verify**。
3. `getToken()` Bearer（client）: session ページ実績の proven path。

## kimny / conductor 確認（任意・実装中に確定可）
1. 履歴 link は v1 では dial LP nav のみで良いか（session ページ header にも置くかは後続可）?
2. dashboard DRY 化を本 PR に含めるか（推奨）/ blast-radius 最小で dashboard 据置きにするか?

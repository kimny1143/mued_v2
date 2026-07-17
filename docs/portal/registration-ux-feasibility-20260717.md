# Feasibility — ポータル登録 UX（既存 email-gate 250+人のログイン方法）

*2026-07-17 / mued課（conductor 依頼・Chief judgment 突合用）/ 実装せず feasibility のみ / 裏取り = Clerk docs + 実コード。*

## 問い
既存 Resend email-gate 登録者（250+人）が `/dashboard/plugins` ポータルにログインする方法。制約=①kimny は「新規サインアップ」friction を避けたい（passwordless 希望）②ポータル authz は `verification.status==='verified'` 必須 ③案内便は opt-out 尊重（subscribed-only）。

---

## 結論（先出し）

**推奨 = 案C（lazy・先行アカウント作成しない）。具体的には C-1（Resend 案内便 → passwordless sign-up）。**
- 250人を先に Clerk アカウント化しない。案内便のリンク → **email OTP（コード）だけで sign-up**（パスワード不要）→ その OTP が email verify を兼ねる → `/dashboard/plugins` 着地 → verified email 一致で自分の entitlement 表示。
- kimny の「passwordless・friction 最小」を満たし、案内便を content課/Resend 管理下（compliance: subscribed-only）に保てる。
- **前提の Clerk 設定変更（Dashboard で password 要求 OFF・email code/link ON）= kimny gate**。それ以外の実装は既存 Clerk 統合の範囲。

案A（createUser で 250 先行作成）も技術的には可能（email 自動 verified・passwordless 化可）だが、**先行作成しても結局ログイン用リンクメールは送る必要がある** → 案内便が招待メールを兼ねる案C に対し、A は「250 の休眠アカウント + bulk createUser + 冪等処理」を足すだけで UX 利点ゼロ。**A は非推奨**。

---

## 6点の feasibility（Clerk docs + 実コード裏取り）

### ① createUser で passwordless ユーザーを programmatic 作成できるか → **YES**
- Backend API `createUser` に **`skipPasswordRequirement: true`** → password 省略可・passwordless ユーザー作成可（[createUser docs](https://clerk.com/docs/reference/backend/user/create-user)）。
- caveat: 「password が唯一の sign-in 手段の instance では使えない」→ **email OTP か passkey を instance で有効化必須**。
- 実コード: 既に `clerkClient.users.deleteUser`（`app/api/muednote/mobile/account/route.ts`）で Backend Users API 使用実績あり。`createUser` も同 client で叩ける。

### ② 自動作成アカウントの email は verified か → **createUser は自動 verified**（想定と逆・重要）
- 「**Any email address … created using this method will be automatically verified.**」（[createUser docs](https://clerk.com/docs/reference/backend/user/create-user)）→ createUser 由来の email は **verified 済** → ポータル authz(`verification.status==='verified'`) を**即通過**。
- 別 verify flow は**不要**（当初の「unverified 残ゆえ magic link で verify 必要」という第一感は誤り）。ただし createUser 後もユーザーには **sign-in 手段が要る**（passwordless なら email OTP/link）→ ログイン用メールは結局送る。
- 招待・OTP sign-up 経路も verified になる（③④）。→ **どの案でも verified email が得られ authz は崩れない**（⑥）。

### ③ 既存250人の backfill（Clerk アカウント一括作成する場合） → 可・ただし冪等注意
- **実コード: Clerk `user.created` webhook（`app/api/webhooks/clerk/route.ts`）が既に DB user + free subscription を自動作成**。→ アカウントがどの経路で作られても DB 同期は自動。
  - gotcha: webhook の insert は `onConflict` 無し → 同 clerkId 再作成なら unique 制約で失敗（新規 clerkId なら問題なし）。`getUserIdFromClerkId` も lazy 作成の二重化あり。
- bulk: **`createInvitationBulk()`（25 req/h）** or `createUser` ループ（rate limit 内）。250人 = invitation single 100/h なら ~3h、bulk なら数バッチ。
- 冪等: 招待は「既存 invitation があれば作成するか」の制御 param あり（[invitations docs](https://clerk.com/docs/users/invitations)）。createUser は既存 email で失敗 → 既アカウントの skip 処理が要る。
- **entitlement 行だけなら P-3 backfill script（完成済）で十分**（ポータルは email 突合ゆえ Clerk アカウント先行作成は不要）。Clerk アカウントは「本人がログインした時」に生まれれば良い（案C）。

### ④ hybrid/lazy（案C）は Clerk で自然に組めるか → **YES・2 実装**
- **C-1（推奨）= Resend 案内便 + 通常 passwordless sign-up**: 案内便（content課・Resend・subscribed-only）→ `/sign-in`(or sign-up)→ **email code(OTP) で sign-up・パスワード無し**（[email OTP docs](https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp)）→ OTP が email verify → `redirect_url=/dashboard/plugins` 着地。先行作成ゼロ。案内便コピー/配信は content課 管理・compliance filter が効く。
- **C-2 = Clerk Invitations**: `createInvitationBulk` → Clerk が招待メール送信 → **accept で email 自動 verified + account 作成（lazy）+ sign-in** → redirect（[invitations docs](https://clerk.com/docs/users/invitations)）。Clerk 管理で verify/tracking が楽だが、**招待メールは Clerk テンプレ**（content課 のコピー統制が弱い）+ 招待 = subscribed-only 遵守が必要。
- **A（先行作成）vs C（lazy）差**: A は createUser で 250 即アカウント化（休眠含む）+ 送るメールは結局要る。C は engaged のみアカウント化・メール=案内便が兼務。**実装量・リスクとも C < A**。

### ⑤ MAU 影響 → **非問題（桁違いの余裕）。しかも MRU 課金で更に有利**
- **Clerk 無料枠は 2026-02-05 から 50,000 MRU**（旧 10k MAU から拡大・[new pricing](https://clerk.com/blog/new-pricing-plans)）。※middleware コメントの「Hobby/10k」は旧情報。
- **MRU = Monthly Retained User**: 「sign-up 後 24h 以降に再訪 + もう一度 sign-in」した人のみ課金対象。**一度きりの signup は課金されない**（[pricing](https://clerk.com/pricing)）。
- A（250先行作成・休眠）: 休眠は retained でない → **$0**。C（engaged のみ）: 再訪者のみ MRU。**いずれも 250人 ≪ 50k で $0・tier 跨ぎ無し**。→ CFO ping 不要水準。

### ⑥ セキュリティ整合（verified email のみ entitlement 可視を崩さないか） → **崩れない**
- authz は「認証ユーザーの verified email 集合 ∩ entitlement.email」。**アカウント作成経路（createUser / invitation / OTP sign-up）に依存しない** — どの経路も verified email を生む → 一致した行だけ可視。
- createUser 自動 verify も「その email を所有する本人のアカウント」を作るだけ（他人の email を勝手に verify して横取り、は起きない — email 所有の主張は Clerk 側の作成主体＝運営が信頼源）。**P-2 の cross-user 非漏洩（型 + inArray test）はそのまま有効**。
- 唯一の注意: **案内便/招待の宛先 = subscribed-only**（opt-out 尊重）。entitlement 可視 = ownership ゆえ unsubscribed 本人がログインすれば見える（別軸・compliance 契約通り）。

---

## Gotchas（実装時）
1. **Clerk Dashboard passwordless 設定 = kimny gate**: password 要求 OFF + email code/link ON（prod instance）。「password 無効化は new users のみ影響」＝既存 password ユーザー無害。
2. **dev/prod 2 instance**: preview は `pk_test_`（dev・popular-crayfish-98）/ prod は `clerk.mued.jp`。設定・招待は **prod instance** に。config parity 注意。
3. **compliance**: 案内便/招待 recipient = subscribed-only（entitlements − unsubscribed）。entitlement 可視は ownership（全員）。混同しない（P-3 契約）。
4. **backfill 冪等**: 招待は duplicate 制御 param、createUser は既存 email 失敗。既アカウント skip を実装。webhook→DB は自動だが insert に onConflict 無し。
5. **entitlement link 不要**: ポータルは email 突合ゆえ user_id 先行 link 不要 → 先行作成の唯一の利点も消える（案C 有利を補強）。

## 推奨まとめ（Chief 突合用）
- **第1推奨 C-1**（Resend 案内便 + passwordless email-OTP sign-up）: kimny UX + content課統制 + compliance + 実装最小。
- **代替 C-2**（Clerk Invitations bulk）: Clerk 管理で verify/tracking 楽・招待メールが Clerk テンプレになる trade-off。
- **A（先行作成）非推奨**: UX 利点ゼロで休眠アカウント + bulk + 冪等コストのみ増。
- **前提 gate**: Clerk Dashboard passwordless 設定（kimny）。MAU/コストは MRU 50k 枠で完全に非問題。

## Sources
- [createUser() — Clerk Backend API](https://clerk.com/docs/reference/backend/user/create-user)
- [Invitations — Clerk Docs](https://clerk.com/docs/users/invitations)
- [Email/Phone OTP custom flow](https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp)
- [Clerk Pricing](https://clerk.com/pricing) / [New pricing (50k MRU free)](https://clerk.com/blog/new-pricing-plans)
- 実コード: `app/api/webhooks/clerk/route.ts`（user.created→DB sync）・`app/api/muednote/mobile/account/route.ts`（clerkClient.users）・`lib/utils/auth-helpers.ts`（getUserIdFromClerkId lazy 作成）

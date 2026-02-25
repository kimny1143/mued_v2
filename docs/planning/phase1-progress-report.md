# Phase 1 進捗報告: MUEDnote Mobile — Hoo AI チャット

**報告日**: 2026-02-25
**ブランチ**: `feat/muednote-phase1-hoo`（`apps/` リポジトリ）
**元計画**: [phase1-ios-handoff.md](./phase1-ios-handoff.md)

---

## ステータス: 実装完了 / 実機テスト待ち

Phase 1 の全 7 タスクの実装が完了。TypeScript エラーゼロで通過。
TestFlight ビルド → 実機テスト → main マージ → App Store 審査提出の流れ。

---

## タスク完了状況

| # | タスク | 状態 | 主要ファイル |
|---|--------|------|-------------|
| 1 | Sign in with Apple | 完了 | `SignInScreen.tsx`, `AuthProvider.tsx` |
| 2 | プラン状態 API 問い合わせ | 完了 | `authStore.ts` |
| 3 | Hoo 汎用会話 UI | 完了 | `HooChatScreen.tsx`, `chatStore.ts` |
| 4 | トライアル自動開始 | 完了 | API 側処理 + バナー表示 |
| 5 | クラウド同期 | 完了 | `syncService.ts` |
| 6 | Basic サブスク導線 | 完了 | `SubscriptionScreen.tsx` |
| 7 | Hoo 振り返りモード | 完了 | `BreakScreen.tsx`, `ReviewScreen.tsx` |

---

## 実装詳細

### インフラ基盤（Step 0）

- **`src/types/api.ts`** — API レスポンス型定義（HooChatResponse, PlanStatusResponse, MobileSession, Checkout, Error）
- **`src/services/apiClient.ts`** — JWT 認証付き HTTP クライアント。`setTokenProvider()` シングルトンパターンで React hooks 非依存
- **`src/stores/authStore.ts`** — 認証・プラン・トライアル状態管理（tier, isTrialActive, trialTurnsRemaining, canUseHoo）
- **`app.json`** — `usesAppleSignIn`, `expo-secure-store`, `expo-web-browser` プラグイン追加

### Task 1: Sign in with Apple

- **`src/providers/AuthProvider.tsx`** — ClerkProvider + SecureStore トークンキャッシュ。`AuthStateSync` 内部コンポーネントで getToken を apiClient に注入
- **`src/screens/SignInScreen.tsx`** — Clerk SSO（`useSSO` + `oauth_apple` strategy）
- **`src/hooks/useRequireAuth.ts`** — 認証ゲートフック（`requireAuth(callback)` パターン）

### Task 3: Hoo 汎用会話 UI

- **`src/stores/chatStore.ts`** — チャット状態管理。全エラーコード対応（TRIAL_LIMIT_EXCEEDED, RATE_LIMIT 等）
- **`src/components/ChatBubble.tsx`** — ユーザー/アシスタントメッセージバブル
- **`src/components/ChatInput.tsx`** — テキスト入力 + 送信ボタン
- **`src/screens/HooChatScreen.tsx`** — トライアルバナー、タイピングインジケーター、エラー表示、アップグレード CTA

### Task 5: クラウド同期

- **`src/services/syncService.ts`** — 完了済みセッションを `POST /api/muednote/mobile/sessions` に同期
- レビュー完了時にバックグラウンドで自動実行

### Task 6: サブスク導線

- **`src/services/subscriptionService.ts`** — Stripe Checkout をブラウザで開く
- **`src/screens/SubscriptionScreen.tsx`** — プランカード、機能一覧、価格、Subscribe ボタン

### Task 7: Hoo 振り返りモード

- **BreakScreen** — 「Chat with Hoo」CTA ボタン追加（認証ゲート付き）
- **ReviewScreen** — 「Review with Hoo」CTA ボタン追加（認証ゲート付き）

---

## ファイル一覧

### 新規作成（13 ファイル）

| ファイル | 説明 |
|---------|------|
| `src/types/api.ts` | API 型定義 |
| `src/services/apiClient.ts` | JWT 認証付き HTTP クライアント |
| `src/services/syncService.ts` | クラウドセッション同期 |
| `src/services/subscriptionService.ts` | Stripe 決済導線 |
| `src/stores/authStore.ts` | 認証・プラン状態管理 |
| `src/stores/chatStore.ts` | チャット状態管理 |
| `src/providers/AuthProvider.tsx` | Clerk 認証プロバイダー |
| `src/screens/SignInScreen.tsx` | Sign in with Apple 画面 |
| `src/screens/HooChatScreen.tsx` | Hoo AI チャット画面 |
| `src/screens/SubscriptionScreen.tsx` | サブスク導線画面 |
| `src/components/ChatBubble.tsx` | チャットバブル |
| `src/components/ChatInput.tsx` | チャット入力 |
| `src/hooks/useRequireAuth.ts` | 認証ゲートフック |

### 変更（7 ファイル）

| ファイル | 変更内容 |
|---------|---------|
| `App.tsx` | AuthProvider ラッパー、画面遷移追加（signIn, chat, subscription）、クラウド同期 |
| `app.json` | usesAppleSignIn, plugins 追加 |
| `src/components/Hoo.tsx` | onPress prop 追加 |
| `src/screens/HomeScreen.tsx` | Hoo タップ → チャット遷移、auth gate |
| `src/screens/BreakScreen.tsx` | Chat with Hoo CTA 追加 |
| `src/screens/ReviewScreen.tsx` | Review with Hoo CTA 追加 |
| `src/cache/storage.ts` | updateSessionStatus() 追加 |

---

## 追加パッケージ

| パッケージ | 用途 |
|-----------|------|
| `@clerk/clerk-expo` | Clerk iOS SDK |
| `expo-secure-store` | トークン保存 |
| `expo-web-browser` | OAuth リダイレクト + Stripe 決済 |
| `expo-linking` | ディープリンク |

---

## 設計方針

- **Free 機能はログインなしで動作**（App Review 対策）
- **起動時のログイン強制はしない** — Hoo チャットタップ時のみサインインを促す
- **課金は Web Stripe** — App Store 課金は使わない
- **トライアル**: 50 ターン / 3 日間（API 側で自動開始・管理）

---

## 次のステップ

1. TestFlight ビルド & 実機テスト
2. 実機テスト通過後、`feat/muednote-phase1-hoo` → `main` マージ
3. App Store 審査提出

---

*関連: [Phase 1 引き継ぎ](./phase1-ios-handoff.md) / [サブスク戦略](./subscription-strategy-2026-02.md)*

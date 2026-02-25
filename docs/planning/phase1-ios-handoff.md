# Phase 1 引き継ぎ: apps/muednote-mobile

**作成日**: 2026-02-25
**対象**: 別スレッド（`apps/muednote-mobile` iOS アプリ実装）
**前提**: Phase 0 完了済み（Web 側 tier 定義・UI 更新）

---

## Phase 0 完了サマリー（Web 側で実施済み）

| 変更 | ファイル | 内容 |
|------|---------|------|
| Tier 制限更新 | `lib/repositories/subscriptions.repository.ts` | Basic: hooThreads/hooTurns を `-1`（無制限）に変更 |
| 機能説明更新 | `lib/middleware/usage-limiter.ts` | getTierInfo() を新戦略に合わせ、BYOK 削除 |
| サブスクページ更新 | `app/dashboard/subscription/page.tsx` | プラン一覧を新戦略に（日英） |
| 翻訳更新 | `lib/i18n/translations.ts` | Basic/Premium 説明を日英更新 |
| API テンプレート更新 | `app/api/hoo/chat/route.ts` | Free ユーザー向け案内を新内容に |
| トライアルメッセージ更新 | `lib/services/trial.service.ts` | iOS トライアル導線のコメント追記 |

**Stripe 連携・DB スキーマ・トライアルロジック (50ターン/3日間) は変更なし。**

---

## Phase 1 スコープ: Hoo が喋る（Basic MVP）

### ゴール

iOS アプリに Clerk ログインと Hoo 汎用会話を追加し、Basic 課金を開始する。

### タスク一覧

| # | タスク | 詳細 | 依存 |
|---|--------|------|------|
| 1 | **Sign in with Apple** | Clerk iOS SDK 経由。起動時強制ではなく、Basic 機能タップ時にサインイン促す | なし |
| 2 | **プラン状態 API 問い合わせ** | ログイン後に `/api/hoo/chat` (GET) でサブスク状態・trial 状態を取得し、UI 出し分け | #1 |
| 3 | **Hoo 汎用会話 UI** | Haiku 無制限。既存 `/api/hoo/chat` (POST) を iOS から叩く | #1 |
| 4 | **トライアル自動開始** | Free ユーザーが初めて Hoo を使うと自動でトライアル開始（API 側で処理済み） | #3 |
| 5 | **クラウド同期** | ローカルデータを DB へ同期（セッション、ログ） | #1 |
| 6 | **Basic サブスク導線** | Web Stripe 決済への導線。アプリ内からブラウザを開く | #2 |
| 7 | **Hoo 振り返りモード** | 休憩タイマー発動 / セッション終了後に会話開始。作業中は跳ねるだけ | #3 |

---

## 既存 API エンドポイント（iOS から利用可能）

### 認証

すべての API は Clerk JWT で認証。iOS からは `Authorization: Bearer <clerk_token>` ヘッダーを付与。

- `withAuth`: Clerk ID をそのまま使う
- `withAuthResolved`: Clerk ID → DB 内部 UUID に変換

### Hoo AI

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| `POST` | `/api/hoo/chat` | withAuthResolved | Hoo 会話。Free→トライアル自動開始、Basic/Premium→AI応答 |
| `GET` | `/api/hoo/chat` | withAuthResolved | 使用量・tier・trial 状態を取得 |
| `GET` | `/api/hoo/conversations` | withAuthResolved | 会話一覧取得 |
| `GET` | `/api/hoo/conversations/[id]` | withAuthResolved | 会話詳細（メッセージ履歴） |
| `GET/POST` | `/api/hoo/memory` | withAuthResolved | Hoo カスタム指示（メモリ） |
| `POST` | `/api/hoo/memory/toggle` | withAuthResolved | メモリ ON/OFF 切り替え |
| `GET` | `/api/hoo/sessions/context` | withAuthResolved | セッションコンテキスト取得 |

### セッション・ログ（モバイル専用）

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| `POST` | `/api/muednote/mobile/sessions` | Clerk JWT | セッション作成 |
| `GET` | `/api/muednote/mobile/sessions` | Clerk JWT | セッション一覧 |
| `POST` | `/api/muednote/mobile/logs` | Clerk JWT | ログ送信 |
| `GET` | `/api/muednote/mobile/sessions/[id]/logs` | Clerk JWT | セッション別ログ取得 |
| `DELETE` | `/api/muednote/mobile/account` | Clerk JWT | アカウント削除 |

### 決済

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| `POST` | `/api/checkout` | Clerk JWT | Stripe Checkout セッション作成 |
| `POST` | `/api/webhooks/stripe` | Stripe署名検証 | Stripe Webhook（課金状態反映） |

---

## Hoo Chat API 詳細（`POST /api/hoo/chat`）

### リクエスト

```json
{
  "conversationId": "uuid (optional, omit for new)",
  "message": "ピアノで練習した",
  "includeSessionContext": true
}
```

### レスポンス

```json
{
  "conversationId": "uuid",
  "content": "AI の応答テキスト",
  "model": "claude-haiku-4-5-20251001",
  "provider": "claude",
  "isAiResponse": true,
  "usage": {
    "inputTokens": 150,
    "outputTokens": 200,
    "totalTokens": 350,
    "threadsUsed": 3,
    "threadsLimit": -1,
    "turnsUsed": 12,
    "turnsLimit": -1
  },
  "trial": {
    "isInTrial": true,
    "turnsUsed": 5,
    "turnsRemaining": 45,
    "daysRemaining": 2,
    "trialEndsAt": "2026-02-28T00:00:00.000Z"
  },
  "latencyMs": 1200
}
```

### Tier 別の挙動

| Tier | 動作 |
|------|------|
| Free（トライアル未開始） | 初回 POST でトライアル自動開始 → AI 応答 |
| Free（トライアル中） | AI 応答（50 ターン / 3 日間） |
| Free（トライアル終了） | テンプレート応答（アップグレード案内） |
| Basic | AI 応答（無制限） |
| Premium | AI 応答（無制限、将来個人化） |

---

## トライアル仕様

| 項目 | 値 |
|------|-----|
| 期間 | 3 日間 |
| ターン上限 | 50 ターン |
| モデル | Claude Haiku（Basic 相当） |
| 開始条件 | Free ユーザーが初めて Hoo に話しかけた時（API 側で自動開始） |
| 終了条件 | 3 日経過 OR 50 ターン消費 |

### iOS 側の導線

```
1. Free ユーザーが収録終了
2. アプリが「Hoo と振り返り（3日間無料トライアル）」CTA を表示
3. ユーザーが CTA タップ → Sign in with Apple
4. サインイン完了 → Hoo チャット画面へ
5. 初回メッセージ送信 → API がトライアル自動開始
6. トライアル終了後 → Basic アップグレード案内
```

---

## App Review 戦略

### 前回の教訓

v1.0 で以下が連鎖的に指摘され、最終的にログイン機能ごと外して通過:
- ログイン強制
- iPad 対応不足
- Sign in with Apple 未対応

### 今回の方針

**最小変更で審査 → 通過後に順次機能追加**

1. Free の全機能はログインなしで動く状態を維持（現状のまま）
2. Hoo 会話機能のみ追加して審査に出す（一気に入れない）
3. Basic 機能（Hoo 会話）タップ時にサインインを促す形にする
4. 起動時のログイン強制は **絶対にしない**

### App Review Notes テンプレート

> Core features (recording, playback, timer) are available without login.
> Hoo AI chat is an additional feature requiring sign-in, with a 3-day free trial.
> Subscription is managed via web (Stripe), not through App Store.

---

## 課金方式

- **Web Stripe で完結。App Store 課金は使わない**
- iOS アプリ内から Web（Stripe Checkout）へ遷移して決済
- Anti-steering 規制（アプリ内から外部決済への誘導制限）は地域別に要調査
- Stripe Webhook (`/api/webhooks/stripe`) で課金状態が DB に自動反映

### 価格

| プラン | 月額 |
|--------|------|
| Basic | ¥1,980 |
| Premium | ¥2,980 |

---

## 技術的な注意事項

### Clerk iOS SDK

- Sign in with Apple は Clerk が対応済み（Clerk ダッシュボードで有効化）
- iOS SDK: `@clerk/clerk-expo` または Clerk の Native SDK
- JWT トークンを全 API リクエストに付与

### DB スキーマ

`subscriptions` テーブルの関連カラム:
- `tier`: `'free' | 'basic' | 'premium'`
- `trialStartedAt`: トライアル開始日時
- `trialUsed`: トライアル完了フラグ
- `trialTurnsUsed`: トライアル中の使用ターン数
- `hooConversationsUsed`: スレッド数（ソフトリミット用）
- `hooTurnsUsed`: ターン数

### エラーコード（iOS で処理すべき）

| HTTP | コード | 意味 |
|------|--------|------|
| 429 | `TURN_LIMIT_EXCEEDED` | ターン上限到達（Basic では発生しない） |
| 429 | `TRIAL_LIMIT_EXCEEDED` | トライアルターン上限到達 |
| 429 | `RATE_LIMIT` | レート制限（10 req/min） |
| 503 | `SERVICE_ERROR` | AI サービス一時停止 |
| 504 | `TIMEOUT` | AI リクエストタイムアウト |

---

## Phase 2 以降（参考）

Phase 1 完了後に順次追加:

| Phase | 内容 |
|-------|------|
| Phase 2 | Whisper バッチ文字起こし、DAW ログ API、タイムスタンプ同期、見える化 UI |
| Phase 3 | MUEDlobe 統合、Hoo 個人化プロンプト、Premium プラン |

---

*作成: 2026-02-25*
*関連: [サブスク戦略](./subscription-strategy-2026-02.md) / [ロードマップ](./muednote-roadmap-2026-02.md)*

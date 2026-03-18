# LINE Webhook エンドポイント実装依頼

**日付:** 2026-03-15
**優先度:** 中（Threads半自動リプライ機能の基盤）
**依頼元:** threads-api ワークスペースでの設計・LINE Bot セットアップ完了済み

---

## 背景

Threads の半自動リプライ機能を構築中。LINE Bot 経由でkimnyに通知し、LINEの返信をトリガーにThreadsへリプライを投稿する仕組み。

LINE Bot（MUED Threads Bot）のセットアップは完了:
- Provider: mued
- Channel ID: 2009467471
- Bot basic ID: @163wcgek
- Messaging API: 有効化済み
- Channel access token: 発行済み

**このドキュメントでは、Vercel上に LINE Webhook を受けるAPIルートを1本作ることを依頼する。**

---

## 実装内容

### `app/api/line-webhook/route.ts`

LINE Messaging API の Webhook を受信し、kimnyのLINE返信に応じて GitHub Actions を起動するエンドポイント。

#### 処理フロー

```
LINE（kimnyの返信）
  ↓
POST /api/line-webhook
  ↓
1. LINE署名検証（X-Line-Signature ヘッダー）
2. イベント解析（message event のみ処理）
3. テキスト内容に応じて分岐:
   - Threads URL → media ID 抽出試行 → リプライ候補として保持
   - 数字（1, 2, 3）→ GitHub repository_dispatch 発火（リプライ実行）
   - 「0」→ スキップ、LINE に「スキップしました」返信
   - それ以外 → 無視
4. LINE に処理結果を返信
```

#### 署名検証

```typescript
import crypto from 'crypto';

function validateSignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
  return hash === signature;
}
```

#### GitHub repository_dispatch の発火

```typescript
// POST https://api.github.com/repos/kimny1143/threds-api/dispatches
const response = await fetch(
  'https://api.github.com/repos/kimny1143/threds-api/dispatches',
  {
    method: 'POST',
    headers: {
      'Authorization': `token ${process.env.GITHUB_PAT}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'threads-reply',
      client_payload: {
        thread_id: threadId,
        reply_text: replyText,
        line_user_id: userId,
      },
    }),
  }
);
```

#### LINE メッセージ返信

```typescript
// POST https://api.line.me/v2/bot/message/reply
const response = await fetch('https://api.line.me/v2/bot/message/reply', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: replyMessage }],
  }),
});
```

---

## 環境変数（Vercel に設定）

| 変数名 | 値の取得元 | 説明 |
|--------|----------|------|
| `LINE_CHANNEL_SECRET` | LINE Developers Console → MUED Threads Bot → Basic settings | Webhook署名検証用 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers Console → MUED Threads Bot → Messaging API | LINEメッセージ送信用 |
| `GITHUB_PAT` | GitHub Settings → Developer settings → Personal access tokens | repository_dispatch 発火用。repo スコープ必要 |

**LINE_CHANNEL_SECRET の値:** `2a0506fea69b495583b326ae276241d1`

**LINE_CHANNEL_ACCESS_TOKEN:** LINE Developers Console の Messaging API タブから取得済み（長い文字列）。

**GITHUB_PAT:** 未作成。GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens で作成。スコープ: `kimny1143/threds-api` リポジトリへの Contents + Actions 権限。

---

## Webhook URL の設定

エンドポイント実装後、以下の2箇所に Webhook URL を設定:

1. **LINE Developers Console**
   https://developers.line.biz/console/channel/2009467471/messaging-api
   → Webhook settings → Webhook URL に `https://www.mued.jp/api/line-webhook` を入力

2. **LINE Official Account Manager**
   https://manager.line.biz/account/@163wcgek/setting/messaging-api
   → Webhook URL に同じURLを入力

---

## Middleware 除外

LINE Webhook は外部からのPOSTリクエストなので、Clerk認証middleware から除外する必要がある。

`middleware.ts` に `/api/line-webhook` を追加:

```typescript
// 既に /api/dial/upload が除外されているはず。同じパターンで追加
export const config = {
  matcher: [
    // 除外パスに /api/line-webhook を追加
  ],
};
```

---

## テスト手順

1. デプロイ後、LINE Developers Console で Webhook URL を設定
2. 「Verify」ボタンで疎通確認（200が返ればOK）
3. LINE アプリで MUED Threads Bot を友だち追加（QRコードはLINE Developers Consoleに表示済み）
4. LINE で「テスト」と送信 → Vercel のログで受信を確認
5. LINE で「1」と送信 → GitHub Actions が起動することを確認

---

## 注意事項

- Auto-reply messages が Enabled になっている（LINE Official Account Manager）。Webhook で処理する場合は Disabled に変更が必要。設定場所: https://manager.line.biz/account/@163wcgek/setting/response
- Greeting messages も同様に Disabled にする
- このエンドポイントは kimny 個人用。ユーザー認証は LINE の署名検証のみで十分

# LINE Webhook v2 — 草案保存（pending-replies.json）

**日付:** 2026-03-16
**前提:** `/api/line-webhook` は稼働済み。品質チェックは cowork 側で行うため、Webhook は草案の保存のみ担当する。

---

## 変更内容

LINE で受信したリプライ草案を、GitHub repository_dispatch 経由で `pending-replies.json` に保存する。

### 現在のフロー

```
LINE返信 → Webhook → 数字なら dispatch / それ以外は無視
```

### 変更後のフロー

```
LINE返信 → Webhook → テキスト内容を判定:
  ├── Threads URL → thread_id として保持（in-memory）
  ├── 通常テキスト（URL直後の返信）→ リプライ草案として dispatch
  ├── 数字 → 既存の dispatch ロジック（v1互換）
  └── 「0」→ スキップ
```

### dispatch の payload

```json
{
  "event_type": "save-pending-reply",
  "client_payload": {
    "thread_id": "取得済みのthread ID",
    "thread_url": "元投稿のURL",
    "thread_text": "元投稿の本文（冒頭100文字）",
    "thread_author": "@username",
    "reply_draft": "kimnyが書いた草案テキスト",
    "line_user_id": "U8564b4ab3477fea683d52030329a710a",
    "timestamp": "2026-03-16T09:15:00+09:00"
  }
}
```

---

## threads-api 側の受け口

### `.github/workflows/save-pending-reply.yml`（新規）

```yaml
name: Save Pending Reply

on:
  repository_dispatch:
    types: [save-pending-reply]

permissions:
  contents: write

jobs:
  save:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Save to pending-replies.json
        run: |
          node -e "
          const fs = require('fs');
          const payload = JSON.parse(process.env.PAYLOAD);
          const file = 'pending-replies.json';
          const pending = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
          pending.push({
            thread_id: payload.thread_id,
            thread_url: payload.thread_url,
            thread_text: payload.thread_text,
            thread_author: payload.thread_author,
            reply_draft: payload.reply_draft,
            line_user_id: payload.line_user_id,
            timestamp: payload.timestamp,
            status: 'pending'
          });
          fs.writeFileSync(file, JSON.stringify(pending, null, 2) + '\n');
          console.log('Saved pending reply:', payload.reply_draft.substring(0, 50));
          "
        env:
          PAYLOAD: ${{ toJson(github.event.client_payload) }}

      - name: Commit
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add pending-replies.json
          git diff --staged --quiet || git commit -m "📝 Save pending reply [skip ci]"
          git pull --rebase origin main
          git push
```

---

## Webhook 側の変更（mued_v2）

`/api/line-webhook/route.ts` の修正ポイント:

### 1. 状態管理の拡張

```typescript
// 既存の pendingReply に加えて、Threads投稿情報も保持
interface PendingContext {
  threadId?: string;
  threadUrl?: string;
  threadText?: string;
  threadAuthor?: string;
}

// in-memory state（既存のものを拡張）
let pendingContext: PendingContext = {};
```

### 2. テキスト受信時の分岐追加

```typescript
// Threads URL を受信した場合（既存ロジックはそのまま）
if (isThreadsUrl(text)) {
  // thread_id と URL を保持
  pendingContext = {
    threadUrl: text,
    threadId: extractThreadId(text),  // URLからIDを抽出
    // threadText と threadAuthor は候補送信時にセットされている想定
  };
  await replyToLine(replyToken, '📝 投稿URLを受け取りました。リプライ草案を送ってください。');
  return;
}

// 通常テキスト + pendingContext がある場合 → 草案として保存
if (pendingContext.threadUrl && !isNumber(text) && text !== '0') {
  await triggerGitHubDispatch('save-pending-reply', {
    thread_id: pendingContext.threadId || '',
    thread_url: pendingContext.threadUrl,
    thread_text: pendingContext.threadText || '',
    thread_author: pendingContext.threadAuthor || '',
    reply_draft: text,
    line_user_id: userId,
    timestamp: new Date().toISOString(),
  });
  await replyToLine(replyToken, '📝 草案を受け取りました。09:00の品質チェックで確認します。');
  pendingContext = {};  // リセット
  return;
}
```

### 3. 候補送信時のコンテキスト受け渡し

cowork タスク①（08:30）が LINE に候補を送信する際、投稿情報を Webhook に渡す方法が必要。

**案A（シンプル）:** 候補送信時に投稿URLを含める。kimnyがそのURLを含むメッセージに返信すれば、Webhookで URL → draft の紐付けができる。

**案B:** cowork タスク①が候補情報を `current-candidates.json` に保存・commit。Webhook がそのファイルを参照して紐付け。

→ **案Aを推奨。** LINE のメッセージにURLが含まれているので、kimnyの返信前のメッセージからURLを取得できる。ただし LINE Messaging API では「どのメッセージへの返信か」を取得する方法が限定的。

→ **実用的な妥協案:** cowork タスク①が候補を送信するたびに `current-candidates.json` も更新・commit する。Webhook は直前のURLメッセージとテキストメッセージの組み合わせで判定する（現在の in-memory 方式と同じ）。

---

## pending-replies.json のフォーマット

```json
[
  {
    "thread_id": "18185883085323372",
    "thread_url": "https://www.threads.net/@dtm_producer/post/...",
    "thread_text": "AIマスタリング使ってみたけど...",
    "thread_author": "@dtm_producer",
    "reply_draft": "わかる。質問の解像度を上げると変わるかも",
    "line_user_id": "U8564b4ab3477fea683d52030329a710a",
    "timestamp": "2026-03-16T08:45:00+09:00",
    "status": "pending"
  }
]
```

status は `pending` → `posted` or `rejected`。cowork タスク②が更新する。

---

## まとめ

| 担当 | やること |
|------|---------|
| mued_v2 | Webhook にテキスト草案 → dispatch ロジック追加 |
| threads-api | `save-pending-reply.yml` ワークフロー新規作成 |
| threads-api | `pending-replies.json` の初期ファイル作成（空配列） |

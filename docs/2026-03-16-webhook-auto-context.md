# LINE Webhook — コンテキスト自動取得

**日付:** 2026-03-16
**目的:** ユーザーがURLを送り直さなくても、草案だけ送れば自動でコンテキストが紐付く

---

## 現在の問題

Bot が候補URLをLINEに送信した後、ユーザーが草案だけ送ると、Webhook にコンテキスト（threadId, threadUrl, threadAuthor）がないため草案が無視される。ユーザーにURLを再送させるのはUXが悪い。

## 解決方法

Webhook の `pending` が null（コンテキストなし）の時にテキストを受信したら、GitHub API で `reply-candidates.json` を取得して最新の候補をコンテキストとして使う。

### 変更箇所: `/api/line-webhook/route.ts`

`// ── Otherwise → Ignore silently` の直前に以下のロジックを追加:

```typescript
// ── Free text without context → Try to get context from latest candidate ──
if (!pending && text.length > 0 && !isNaN(parseInt(text, 10)) === false) {
  // Fetch latest candidate from GitHub
  try {
    const ghRes = await fetch(
      'https://api.github.com/repos/kimny1143/threds-api/contents/reply-candidates.json',
      {
        headers: {
          'Authorization': `token ${GITHUB_PAT}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      const content = Buffer.from(ghData.content, 'base64').toString('utf8');
      const candidates = JSON.parse(content);

      if (candidates.length > 0) {
        const latest = candidates[0];
        const parsed = parseThreadsUrl(latest.url);

        // Set context from candidate
        pending = {
          threadId: parsed?.threadId || '',
          threadUrl: latest.url,
          threadAuthor: latest.author || parsed?.author || '',
          candidates: [],
          timestamp: Date.now(),
        };

        // Now process as draft (fall through to the pending+text handler above won't work
        // since we already passed that check, so handle it here directly)
        pending.candidates.push(text);

        const ok = await dispatchGitHub("save-pending-reply", {
          thread_id: pending.threadId,
          thread_url: pending.threadUrl,
          thread_text: (latest.thread_context ? latest.thread_context + '\n\n---\n' : '') + (latest.text || ''),
          thread_author: pending.threadAuthor,
          reply_draft: text,
          line_user_id: userId,
          timestamp: new Date().toISOString(),
        });

        if (ok) {
          await replyToLine(
            replyToken,
            `草案を保存しました\n${pending.threadAuthor} への返信\n「${text.slice(0, 50)}${text.length > 50 ? '...' : ''}」`
          );
        } else {
          await replyToLine(replyToken, '草案の保存に失敗しました');
        }
        continue;
      }
    }
  } catch (e) {
    console.error('[Webhook] Failed to fetch candidates:', e);
  }
}
```

### ポイント

- `GITHUB_PAT` は既に環境変数にある
- `reply-candidates.json` は候補送信後に Actions が `[]` にクリアするが、送信直後〜ユーザー返信までの間は候補データが残っている。**ただし `[skip ci]` コミットでクリアされるタイミングとの競合あり。**
- 競合回避: `send-candidates-to-line.js` でファイルクリアのタイミングを遅らせる（送信成功直後ではなく、一定時間後にクリア）。もしくはクリアしない。

### より簡単な代替案

`send-candidates-to-line.js` がファイルをクリアしないようにする。次回のタスク①実行時に上書きされるので問題ない。

```javascript
// 変更前:
fs.writeFileSync(file, '[]\n');

// 変更後: クリアしない（次回タスク①で上書きされる）
// fs.writeFileSync(file, '[]\n');
```

この場合、Webhook は常に `reply-candidates.json` の先頭候補をコンテキストとして使える。

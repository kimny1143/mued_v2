# LINE Webhook — OK/NG 投稿承認ハンドリング

**日付:** 2026-03-17
**依頼元:** threads-api `docs/2026-03-17-pre-post-approval-flow.md`

---

## 変更内容

`/api/line-webhook/route.ts` に投稿承認の OK/NG ハンドリングを追加する。

### 条件

OK/NG は **approval-status.json が pending の時のみ** 有効。pending でない場合は通常のテキスト処理にフォールスルーする。これにより、草案として「OK」と送った場合の誤動作を防ぐ。

### 判定方法

approval-status.json の状態は GitHub API で確認する（既に GITHUB_PAT がある）。

### 実装

数字（1-9）の処理の前、Threads URL チェックの前に追加:

```typescript
// ── "OK" / "NG" → Post approval (only when approval is pending) ────
if (text.toUpperCase() === 'OK' || text.toUpperCase() === 'NG') {
  // Check if there's a pending approval
  try {
    const ghRes = await fetch(
      'https://api.github.com/repos/kimny1143/threds-api/contents/approval-status.json',
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
      const approval = JSON.parse(content);

      if (approval.status === 'pending') {
        const action = text.toUpperCase() === 'OK' ? 'approve' : 'reject';
        const ok = await dispatchGitHub('approve-post', {
          action,
          line_user_id: userId,
          timestamp: new Date().toISOString(),
        });

        if (ok) {
          const msg = action === 'approve'
            ? '✅ 投稿を承認しました。まもなく投稿されます。'
            : '🔄 別案を生成中...';
          await replyToLine(replyToken, msg);
        } else {
          await replyToLine(replyToken, '承認処理に失敗しました');
        }
        continue;
      }
    }
  } catch (e) {
    console.error('[Webhook] Approval check failed:', e);
  }
  // Fall through to normal text processing if no pending approval
}
```

### 注意

- `OK` は大文字小文字を問わない（`ok`, `Ok` も受け付ける）
- approval が pending でない場合は何もせず、通常のテキスト処理にフォールスルー
- `0` は既存のスキップ処理と衝突しないか確認が必要（`0` は approval ではなく reply context のリセット）

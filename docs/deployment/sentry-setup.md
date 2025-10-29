# Sentry エラー監視セットアップガイド

## 概要

MUED LMS v2では、エラー監視とパフォーマンストラッキングにSentryを使用しています。
このガイドでは、Sentryのセットアップ手順とトラブルシューティングを説明します。

**実装日:** 2025-10-29

---

## 1. Sentryアカウント作成

### ステップ:

1. [Sentry.io](https://sentry.io/) にアクセス
2. **Sign Up** をクリック（GitHubアカウントで連携推奨）
3. 無料プラン（Developer）を選択
   - 5,000 errors/month
   - 10,000 performance units/month
   - 1 GB attachments
   - **完全無料**

---

## 2. Sentryプロジェクト作成

### ステップ:

1. Sentryダッシュボードで **Create Project** をクリック
2. プラットフォームを選択: **Next.js**
3. プロジェクト設定:
   - **Project Name**: `mued-lms-v2`
   - **Team**: Default
   - **Alert Frequency**: I'll create my own alerts
4. **Create Project** をクリック

### DSN取得:

プロジェクト作成後、**DSN (Data Source Name)** が表示されます。

例:
```
https://abc123def456@o123456.ingest.sentry.io/7891011
```

この値を安全に保存してください。

---

## 3. 環境変数の設定

### ローカル開発 (`.env.local`):

```env
# Sentry Configuration
SENTRY_DSN="your-sentry-dsn-here"
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn-here"

# Optional: Disable Sentry in development
# SENTRY_IGNORE_API_RESOLUTION_ERROR=1
```

### Vercel Production:

1. Vercelプロジェクト → **Settings** → **Environment Variables**
2. 以下を追加:

| Variable | Value | Environments |
|----------|-------|--------------|
| `SENTRY_DSN` | `your-dsn` | Production, Preview |
| `NEXT_PUBLIC_SENTRY_DSN` | `your-dsn` | Production, Preview |

**セキュリティ注意:**
- `NEXT_PUBLIC_*` はクライアントサイドに公開されます
- DSNは公開情報なので問題ありませんが、Auth Tokenは絶対に公開しないでください

---

## 4. 設定ファイルの説明

### 構成:

```
mued_v2/
├── sentry.client.config.ts    # クライアントサイド設定
├── sentry.server.config.ts    # サーバーサイド設定
├── sentry.edge.config.ts      # Edge runtime設定
└── instrumentation.ts         # 初期化ハンドラー
```

### sentry.client.config.ts

**対象:**
- React components
- Client-side API calls
- Browser errors

**主な機能:**
- Session Replay（エラー時のセッション録画）
- パフォーマンス監視
- 機密情報のフィルタリング

**サンプルレート:**
- Production: 10% (パフォーマンス最適化)
- Development: 100% (テスト用)

---

### sentry.server.config.ts

**対象:**
- API routes
- Server components
- Server actions
- Database operations

**セキュリティ:**
- Authorization headerを自動削除
- Cookie情報を自動削除
- DATABASE_URLを自動マスク

---

### sentry.edge.config.ts

**対象:**
- Middleware
- Edge functions

**特徴:**
- 軽量設定
- 最小限のオーバーヘッド

---

## 5. 動作確認

### テストエラーの発生:

#### クライアントサイド:

```typescript
// テスト用コンポーネント
'use client';

import * as Sentry from '@sentry/nextjs';

export default function TestErrorPage() {
  const throwError = () => {
    Sentry.captureException(new Error('Test error from client'));
  };

  return <button onClick={throwError}>Throw Test Error</button>;
}
```

#### サーバーサイド:

```typescript
// app/api/test-sentry/route.ts
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    throw new Error('Test error from server');
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Test error triggered' }, { status: 500 });
  }
}
```

### 確認:

1. 上記エラーをトリガー
2. Sentryダッシュボードを開く
3. **Issues** に新しいエラーが表示される（2-3分後）

---

## 6. アラート設定

### Slack連携（推奨）:

1. Sentryプロジェクト → **Settings** → **Integrations**
2. **Slack** を検索してインストール
3. Workspaceを選択して認証
4. **Alerts** → **Create Alert Rule**
5. 条件を設定:
   - **When**: An event is seen
   - **If**: `level` equals `error`
   - **Then**: Send a Slack notification to `#alerts`

### メール通知:

デフォルトで有効。

Settingsで調整可能:
- Sentryプロジェクト → **Settings** → **Notifications**
- 頻度: Immediately / Daily Digest / Weekly Digest

---

## 7. パフォーマンスモニタリング

### トランザクションの追跡:

```typescript
import * as Sentry from '@sentry/nextjs';

export async function calculateMetrics() {
  const transaction = Sentry.startTransaction({
    name: 'RAG Metrics Calculation',
    op: 'batch.job',
  });

  try {
    // Your logic here
    const result = await performCalculation();

    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
```

### スパンの追加:

```typescript
const span = transaction.startChild({
  op: 'db.query',
  description: 'Fetch dialogue logs',
});

const logs = await db.select().from(aiDialogueLog);

span.finish();
```

---

## 8. ベストプラクティス

### ✅ DO

1. **機密情報をフィルタリング**
   ```typescript
   beforeSend(event) {
     if (event.request?.headers) {
       delete event.request.headers['authorization'];
     }
     return event;
   }
   ```

2. **開発環境で無効化**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     return null; // Don't send to Sentry
   }
   ```

3. **コンテキスト情報を追加**
   ```typescript
   Sentry.setUser({ id: user.id, email: user.email });
   Sentry.setTag('feature', 'rag-metrics');
   ```

4. **エラーグルーピング**
   ```typescript
   Sentry.captureException(error, {
     fingerprint: ['database', 'connection-error'],
   });
   ```

---

### ❌ DON'T

1. **Sentryに機密情報を送信しない**
   - パスワード
   - APIキー
   - トークン
   - 個人情報（PII）

2. **過度なエラー送信**
   - ネットワークエラーを全て送信
   - バリデーションエラーを全て送信
   - 予期されるエラーを送信

3. **Production環境でdebug有効化**
   ```typescript
   debug: false, // Always false in production
   ```

---

## 9. トラブルシューティング

### エラーがSentryに表示されない

**原因1: DSNが設定されていない**

確認:
```bash
echo $SENTRY_DSN
echo $NEXT_PUBLIC_SENTRY_DSN
```

**原因2: 開発環境で無効化されている**

`sentry.*.config.ts` の `beforeSend` をチェック。

**原因3: サンプリングレートが低い**

`tracesSampleRate: 1.0` に変更してテスト。

---

### パフォーマンスへの影響

**現状:**
- クライアントサイド: ~5KB gzip
- サーバーサイド: 最小限のオーバーヘッド
- サンプリングレート10%で影響は無視可能

**最適化:**
- 不要なintegrationを無効化
- `tracesSampleRate` を調整
- `replaysSessionSampleRate` を下げる

---

### コスト管理

**無料枠:**
- 5,000 errors/month
- 10,000 performance units/month

**超過した場合:**
1. サンプリングレートを下げる
2. `ignoreErrors` でノイズを除外
3. 有料プラン検討（$26/month〜）

---

## 10. 関連リンク

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://sentry.io/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

---

## 11. チェックリスト

### 初期セットアップ

- [ ] Sentryアカウント作成
- [ ] プロジェクト作成（mued-lms-v2）
- [ ] DSN取得
- [ ] `.env.local` に環境変数追加
- [ ] Vercel環境変数設定
- [ ] テストエラーで動作確認

### アラート設定

- [ ] Slack連携
- [ ] メール通知設定
- [ ] アラートルール作成

### 本番運用

- [ ] サンプリングレート調整
- [ ] 機密情報フィルタリング確認
- [ ] パフォーマンスへの影響確認
- [ ] 月間エラー数モニタリング

---

*Last Updated: 2025-10-29*
*Status: ✅ Ready for Production*

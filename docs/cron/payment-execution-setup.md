# 決済自動実行Cronジョブの設定

## 概要

レッスン開始2時間前に自動決済を実行するCronジョブの設定と動作確認方法。

## 現在の構成

Vercel無料プランではCron機能が使えないため、GitHub Actionsを使用して5分間隔で実行。

### GitHub Actions設定

`.github/workflows/payment-scheduler.yml`で設定
- 実行間隔：5分ごと
- 認証：`Bearer ${CRON_SECRET}`

### 必要なGitHub Secrets

1. **VERCEL_URL**: 本番環境のURL（例：`https://your-app.vercel.app`）
2. **CRON_SECRET**: Cron実行用の認証トークン

## 修正内容

### 1. 時間計算ロジックの修正

`app/api/cron/execute-payments/route.ts`の検索条件を修正：

```typescript
// 修正前（間違い）：2時間後の予約を検索
booked_start_time: {
  gte: twoHoursFromNow,  // 未来の予約
  lte: twoHoursAndFiveMinutesFromNow,
}

// 修正後（正しい）：2時間以内の予約を検索
booked_start_time: {
  gte: fiveMinutesAgo,    // 過去5分（見逃し分も含む）
  lte: twoHoursFromNow,   // 今から2時間後まで
}
```

### 2. 手動テスト用エンドポイント

`/api/cron/execute-payments/test`を追加
- 管理者権限で手動実行可能
- Cronジョブを待たずに動作確認可能

## セットアップ手順

### 1. GitHub Secretsの設定

```bash
# GitHubリポジトリ → Settings → Secrets and variables → Actions

VERCEL_URL=https://your-production-url.vercel.app
CRON_SECRET=your-secret-key-from-env
```

### 2. プレビュー環境でのテスト

プレビュー環境では以下の方法でテスト：

1. **手動実行API**
   ```bash
   # 管理者アカウントでログイン後
   GET /api/cron/execute-payments/test
   ```

2. **直接実行（開発環境）**
   ```bash
   curl -X GET "https://your-preview.vercel.app/api/cron/execute-payments" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

## 動作確認方法

### 1. ログの確認ポイント

正常動作時のログ：
```
=== 決済実行Cronジョブ開始 ===
検索条件: {
  currentTime: '2025-01-01T10:00:00.000Z',
  currentTimeJST: '2025/1/1 19:00:00',
  searchRangeStart: '2025-01-01T09:55:00.000Z',
  searchRangeEnd: '2025-01-01T12:00:00.000Z',
  description: '5分前から2時間後までの予約を検索'
}
```

### 2. 決済実行の確認

- Stripeダッシュボードで決済が作成されているか確認
- paymentsテーブルで`charge_executed_at`が更新されているか確認
- reservationsテーブルのステータスが`CONFIRMED`になっているか確認

## トラブルシューティング

### GitHub Actionsが動作しない場合

1. **Actions実行履歴を確認**
   - GitHubリポジトリ → Actions → Payment Execution Scheduler

2. **認証エラーの場合**
   - `CRON_SECRET`が正しく設定されているか確認
   - 環境変数とGitHub Secretsの値が一致しているか確認

3. **URLエラーの場合**
   - `VERCEL_URL`にhttpsプロトコルが含まれているか確認
   - 末尾にスラッシュがないか確認

### 決済が実行されない場合

1. **時間計算の確認**
   ```sql
   -- 2時間以内に開始される承認済み予約を確認
   SELECT 
     id, 
     status, 
     booked_start_time,
     EXTRACT(EPOCH FROM (booked_start_time - NOW())) / 3600 as hours_until_start
   FROM reservations
   WHERE status = 'APPROVED'
     AND payment_id IS NOT NULL
     AND booked_start_time > NOW() - INTERVAL '5 minutes'
     AND booked_start_time <= NOW() + INTERVAL '2 hours'
   ORDER BY booked_start_time;
   ```

2. **決済情報の確認**
   ```sql
   -- Setup完了済みで未実行の決済を確認
   SELECT 
     r.id as reservation_id,
     r.booked_start_time,
     p.status as payment_status,
     p.charge_executed_at
   FROM reservations r
   JOIN payments p ON r.payment_id = p.id
   WHERE r.status = 'APPROVED'
     AND p.status = 'SETUP_COMPLETED'
     AND p.charge_executed_at IS NULL;
   ```

## 今後の改善案

1. **Vercel有料プランへの移行**
   - Vercel Cron機能を使用（より安定）
   - 設定が簡単（vercel.jsonのみ）

2. **通知機能の追加**
   - 決済実行前の事前通知
   - 決済完了/失敗の通知

3. **リトライ機能**
   - 決済失敗時の自動リトライ
   - エラーログの詳細記録
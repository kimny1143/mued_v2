# GitHub Actions セットアップガイド

## 概要

MUED LMS v2では、RAGメトリクスの日次集計にGitHub Actionsを使用しています。
このガイドでは、GitHub Actionsの設定方法とトラブルシューティングを説明します。

**ワークフロー:** `.github/workflows/daily-rag-metrics.yml`

---

## セットアップ手順

### 1. GitHub Secrets の設定

GitHub Actionsから安全にデータベースにアクセスするため、`DATABASE_URL`をSecretsに追加します。

#### 手順:

1. GitHubリポジトリを開く
2. **Settings** → **Secrets and variables** → **Actions** に移動
3. **New repository secret** をクリック
4. 以下を入力:
   - **Name**: `DATABASE_URL`
   - **Secret**: データベース接続URL（Neon PostgreSQL）
   ```
   postgresql://username:password@host/database?sslmode=require
   ```
5. **Add secret** をクリック

#### 確認:

- Secrets画面に `DATABASE_URL` が表示されていればOK
- Secretの値は表示されません（セキュリティのため）

---

### 2. ワークフローの有効化

#### 自動:

ワークフローファイル（`.github/workflows/daily-rag-metrics.yml`）がmainブランチにマージされると自動的に有効化されます。

#### 確認:

1. GitHubリポジトリで **Actions** タブを開く
2. 左サイドバーに **"Daily RAG Metrics Calculation"** が表示される

---

## 使い方

### 自動実行（Cron）

**スケジュール:**
- 毎日 **02:00 JST**（17:00 UTC）に自動実行
- 前日のデータを集計して `rag_metrics_history` テーブルに保存

**実行確認:**
1. **Actions** タブを開く
2. 最新の実行を確認（緑色のチェックマークが成功）
3. クリックして詳細ログを表示

---

### 手動実行

特定の日付や過去のデータを集計したい場合、手動でワークフローを実行できます。

#### 手順:

1. GitHubリポジトリで **Actions** タブを開く
2. 左サイドバーで **"Daily RAG Metrics Calculation"** を選択
3. 右側の **Run workflow** ボタンをクリック
4. オプション入力:
   - **Target date**: 集計する日付（例: `2025-10-28`）
   - 空欄の場合は昨日のデータを集計
5. **Run workflow** をクリック

#### 実行例:

**ケース1: 昨日のデータを集計（デフォルト）**
```
Target date: （空欄）
```

**ケース2: 2025年10月28日のデータを集計**
```
Target date: 2025-10-28
```

---

## ワークフローの詳細

### スケジュール

```yaml
on:
  schedule:
    - cron: '0 17 * * *'  # 毎日17:00 UTC = 02:00 JST
```

**タイムゾーン:**
- GitHub ActionsはUTC時刻で動作
- JSTは UTC+9 なので、02:00 JST = 17:00 UTC（前日）

### 実行内容

1. **Checkout repository** - コードを取得
2. **Setup Node.js 20** - Node.js環境を構築
3. **Install dependencies** - `npm ci`で依存関係をインストール
4. **Run RAG metrics calculation** - `npm run job:rag-metrics`を実行
5. **Report** - 成功/失敗をログに出力

### タイムアウト

- **10分**でタイムアウト
- 通常は1-2分で完了

---

## トラブルシューティング

### ワークフローが失敗する

#### 1. DATABASE_URLが未設定

**エラー:**
```
Error: DATABASE_URL is not set
```

**解決:**
1. GitHub Secrets に `DATABASE_URL` を追加（上記手順参照）
2. ワークフローを再実行

---

#### 2. データベース接続エラー

**エラー:**
```
Error: Connection refused
Error: SSL required
```

**解決:**
1. DATABASE_URLが正しいか確認
2. Neon PostgreSQLの接続情報を確認
3. `?sslmode=require` が含まれているか確認

---

#### 3. データが存在しない

**警告:**
```
No data found for 2025-10-28
```

**説明:**
- 指定した日付にAI対話ログが存在しない
- エラーではなく、正常な動作

**確認:**
```sql
SELECT COUNT(*) FROM ai_dialogue_log
WHERE created_at::date = '2025-10-28';
```

---

#### 4. タイムアウト

**エラー:**
```
The job running on runner... has exceeded the maximum execution time of 10 minutes.
```

**原因:**
- データ量が多すぎる
- データベースのパフォーマンス問題

**解決:**
1. ワークフローの `timeout-minutes` を20に増やす
2. データベースのインデックスを確認
3. クエリの最適化を検討

---

### 手動実行が表示されない

**原因:**
- ワークフローファイルがmainブランチにない

**解決:**
1. `.github/workflows/daily-rag-metrics.yml` をmainブランチにマージ
2. 数分待ってからActions タブを更新

---

### ログの確認方法

#### 詳細ログ:

1. **Actions** タブ → 該当のワークフロー実行をクリック
2. **calculate-rag-metrics** ジョブをクリック
3. 各ステップをクリックして展開

#### エラーログのダウンロード:

失敗時にログファイルがArtifactsとして保存されます（7日間保持）:

1. ワークフロー実行の詳細ページ下部の **Artifacts** セクション
2. `rag-metrics-logs-{run_number}` をダウンロード

---

## ローカルでのテスト

GitHub Actions にデプロイする前に、ローカルで動作確認できます。

### 実行コマンド:

```bash
# 昨日のデータを集計
npm run job:rag-metrics

# 特定の日付を集計
npm run job:rag-metrics 2025-10-28

# 期間指定でバックフィル
npm run job:rag-metrics backfill 2025-10-01 2025-10-28
```

### 環境変数:

`.env.local` に以下が設定されている必要があります:
```env
DATABASE_URL="postgresql://..."
```

---

## モニタリング

### 成功/失敗の通知

GitHub Actions はデフォルトで以下の通知を送信します:

- **メール通知**: 失敗時（リポジトリのWatch設定で変更可能）
- **GitHub通知**: Actions タブに実行履歴が表示

### Slack連携（オプション）

将来的にSlack通知を追加する場合の設定例:

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "❌ RAG metrics calculation failed"
      }
```

---

## 実行コスト

GitHub Actions の無料枠:

- **Public リポジトリ**: 無制限
- **Private リポジトリ**: 月2,000分

**このワークフロー:**
- 実行時間: 約2分/日
- 月間: 約60分
- **完全に無料枠内で収まります** ✅

---

## 将来的な拡張

### Vercel Cron への移行（Pro プラン）

将来的にVercel Proプランにアップグレードした場合:

1. `vercel.json` にCron設定を追加
2. GitHub Actions ワークフローを無効化またはバックアップとして保持
3. `/api/cron/rag-metrics` エンドポイントを使用

**vercel.json 例:**
```json
{
  "crons": [{
    "path": "/api/cron/rag-metrics",
    "schedule": "0 17 * * *"
  }]
}
```

### 複数ジョブの追加

他のバッチ処理も追加可能:

```yaml
jobs:
  calculate-rag-metrics:
    # ...

  cleanup-old-data:
    # ...

  generate-reports:
    # ...
```

---

## 関連ドキュメント

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cron Schedule Expression](https://crontab.guru/)
- [RAG Metrics Calculation Job](/scripts/jobs/calculate-rag-metrics.ts)
- [Phase 2 Sprint Plan](/docs/implementation/phase2-sprint-plan.md)

---

## FAQ

### Q: なぜGitHub Actionsを使うのか？

**A:** Vercel Cron は有料プランが必要ですが、GitHub Actions は無料で信頼性が高く、同じリポジトリで管理できます。

---

### Q: 実行時間を変更できますか？

**A:** はい。`.github/workflows/daily-rag-metrics.yml` の `cron` 行を編集してください。

例: 毎日10:00 JSTに実行
```yaml
cron: '0 1 * * *'  # 01:00 UTC = 10:00 JST
```

---

### Q: 複数回実行しても大丈夫？

**A:** 現在は同じ日付のデータを複数回挿入してしまいます。将来的に重複チェック機能を追加予定です。

---

### Q: 手動で過去のデータを全てバックフィルするには？

**A:** ローカルで以下のコマンドを実行:
```bash
npm run job:rag-metrics backfill 2025-10-01 2025-10-29
```

---

*Last Updated: 2025-10-29*
*Status: ✅ Production Ready*

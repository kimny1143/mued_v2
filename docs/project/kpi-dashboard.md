# MUED LMS - KPI ダッシュボード設定

> Version 1.0 - 初版
> 作成：鈴木（DevOps/Test）

## このドキュメントについて

本ドキュメントはMUED LMSプロジェクトのKPI（主要業績評価指標）ダッシュボードの設定方法とダッシュボードに含まれる主要指標の定義を記述します。

## 目次

1. [セットアップ手順](#セットアップ手順)
2. [Supabase接続設定](#supabase接続設定)
3. [主要KPI指標](#主要kpi指標)
4. [クエリ集](#クエリ集)
5. [ダッシュボード構成](#ダッシュボード構成)

## セットアップ手順

### 前提条件

- Docker環境がセットアップ済みであること
- Supabaseプロジェクトが作成済みであること

### 手順

1. プロジェクトのルートディレクトリで以下のコマンドを実行してMetabaseを起動：

```bash
docker-compose up -d metabase metabase-db
```

2. ブラウザで http://localhost:3000 にアクセス
3. 初期設定ウィザードに従って管理者アカウントを作成
4. データソースとしてSupabaseのPostgreSQLを追加

## Supabase接続設定

### PostgreSQL直接接続

Metabaseからは、SupabaseのPostgreSQLデータベースに直接接続します。

| 設定項目 | 値 |
|--------|-----|
| 表示名 | MUED Supabase |
| ホスト名 | db.PROJECT_ID.supabase.co |
| ポート | 5432 |
| データベース名 | postgres |
| ユーザー名 | postgres |
| パスワード | [Supabaseの管理画面で確認] |
| スキーマ | public |
| SSLモード | require |

## 主要KPI指標

### ユーザー関連KPI

1. **DAU/MAU比率**：日次アクティブユーザー数 ÷ 月次アクティブユーザー数
2. **新規ユーザー獲得率**：新規ユーザー数 ÷ 総ユーザー数
3. **ユーザーリテンション率**：（n日後も継続して利用しているユーザー数） ÷ （n日前の新規ユーザー数）

### レッスン関連KPI

1. **レッスン完了率**：完了したレッスン数 ÷ 開始されたレッスン数
2. **平均学習時間**：総学習時間 ÷ アクティブユーザー数
3. **レッスン予約率**：予約されたレッスン数 ÷ 利用可能なレッスンスロット数

### 収益関連KPI

1. **ARPU（顧客単価）**：総収益 ÷ アクティブユーザー数
2. **コンバージョン率**：有料プラン登録者数 ÷ 無料ユーザー数
3. **MRR（月次定期収益）**：すべての有料サブスクリプションからの月次収益

## クエリ集

### 日次アクティブユーザー（DAU）

```sql
-- 過去24時間にログインしたユニークユーザー数
SELECT 
  COUNT(DISTINCT auth.users.id) as dau,
  CURRENT_DATE as date
FROM auth.users
JOIN auth.sessions ON auth.users.id = auth.sessions.user_id
WHERE auth.sessions.created_at >= CURRENT_DATE - INTERVAL '1 day'
```

### 月次アクティブユーザー（MAU）

```sql
-- 過去30日間にログインしたユニークユーザー数
SELECT 
  COUNT(DISTINCT auth.users.id) as mau,
  CURRENT_DATE as date
FROM auth.users
JOIN auth.sessions ON auth.users.id = auth.sessions.user_id
WHERE auth.sessions.created_at >= CURRENT_DATE - INTERVAL '30 days'
```

### ユーザーリテンション

```sql
-- 7日後のリテンション率
-- 7日後のリテンション率 (修正版)
WITH new_users AS (
  SELECT
    id,
    DATE(created_at) as signup_date
  FROM auth.users
  WHERE created_at <= CURRENT_DATE - INTERVAL '7 days'
),
active_users AS (
  SELECT
    DISTINCT user_id,
    DATE(created_at) as active_date
  FROM auth.sessions
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT
  new_users.signup_date,
  COUNT(DISTINCT new_users.id) as new_users_count,
  COUNT(DISTINCT CASE WHEN active_users.active_date >= new_users.signup_date + INTERVAL '7 days' THEN new_users.id END) as retained_users_count,
  -- ここを修正: ::float の代わりに ::numeric を使う
  ROUND((COUNT(DISTINCT CASE WHEN active_users.active_date >= new_users.signup_date + INTERVAL '7 days' THEN new_users.id END) * 100.0 /
    NULLIF(COUNT(DISTINCT new_users.id), 0))::numeric, 2) as retention_rate
FROM new_users
LEFT JOIN active_users ON new_users.id = active_users.user_id
GROUP BY new_users.signup_date
ORDER BY new_users.signup_date DESC;
```

### レッスン完了率

```sql
-- レッスンの完了率
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as total_lessons,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_lessons,
  ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100, 2) as completion_rate
FROM public.lessons
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC
```

### 平均学習時間

```sql
-- ユーザーあたりの平均学習時間（分）
SELECT 
  DATE_TRUNC('day', date) as day,
  COUNT(DISTINCT user_id) as active_users,
  SUM(duration_minutes) as total_minutes,
  ROUND(SUM(duration_minutes)::float / COUNT(DISTINCT user_id), 2) as avg_minutes_per_user
FROM public.exercise_logs
GROUP BY DATE_TRUNC('day', date)
ORDER BY day DESC
```

## ダッシュボード構成

### メインダッシュボード

メインダッシュボードは以下のセクションで構成されます：

1. **ユーザー概要**
   - DAU/MAU トレンド
   - 新規ユーザー獲得グラフ
   - ユーザーリテンション表

2. **エンゲージメント指標**
   - レッスン完了率
   - 平均学習時間
   - 予約率

3. **収益指標**
   - MRR推移
   - 有料プラン別ユーザー数
   - コンバージョン率トレンド 
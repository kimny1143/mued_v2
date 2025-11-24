# MUEDnote PoC - データ収集設計

## 概要

このドキュメントは、MUEDnote PoC期間中に収集するデータの種類、取得方法、プライバシー配慮事項を定義します。

---

## 収集するデータ一覧

### 1. 定量データ（自動収集）

| データ種別 | テーブル | 主な項目 | 用途 |
|-----------|---------|---------|------|
| **Session情報** | `sessions` | id, user_id, type, title, user_short_note, ai_annotations, created_at | 行動仮説の検証（Session作成数、継続率） |
| **質問データ** | `interview_questions` | session_id, text, focus, depth, generated_by | 質問生成の品質評価 |
| **回答データ** | `interview_answers` | question_id, text, ai_insights, created_at | 回答完了率、データ資産の評価 |
| **分析データ** | `session_analyses` | session_id, analysis_data, confidence | AI分析の精度評価 |

---

### 2. 定性データ（手動収集）

| データ種別 | 収集方法 | 対象者 | 用途 |
|-----------|---------|--------|------|
| **質問品質評価** | 評価シート | 評価者（講師・PO） | 価値仮説の検証 |
| **ユーザーアンケート** | Googleフォーム | テスター全員 | 行動・価値仮説の検証 |
| **盲検診断結果** | ドキュメント | 講師 | データ資産仮説の検証 |
| **インタビュー記録** | Slack/メール | テスター（任意） | 定性的フィードバック |

---

## データ取得SQLクエリ集

### A. Session作成状況の確認

#### A-1. ユーザーごとのSession作成数

```sql
-- PoC期間中のSession作成数（ユーザーごと）
SELECT
  user_id,
  COUNT(*) AS session_count,
  MIN(created_at) AS first_session_at,
  MAX(created_at) AS last_session_at,
  EXTRACT(DAY FROM (MAX(created_at) - MIN(created_at))) AS active_period_days
FROM sessions
WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY user_id
ORDER BY session_count DESC;
```

**出力例**:
```
user_id                              | session_count | first_session_at    | last_session_at     | active_period_days
-------------------------------------|---------------|---------------------|---------------------|-------------------
a1b2c3d4-e5f6-7890-abcd-ef1234567890 | 12            | 2025-11-20 10:00:00 | 2025-12-03 15:30:00 | 13
b2c3d4e5-f6a7-8901-bcde-f12345678901 | 8             | 2025-11-21 09:15:00 | 2025-12-02 18:45:00 | 11
```

---

#### A-2. Session typeの分布

```sql
-- Session typeごとの件数
SELECT
  type,
  COUNT(*) AS session_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM sessions
WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY type
ORDER BY session_count DESC;
```

**出力例**:
```
type            | session_count | percentage
----------------|---------------|------------
new_composition | 45            | 50.00
mixing          | 25            | 27.78
arrangement     | 20            | 22.22
```

---

#### A-3. 日別Session作成数（アクティビティグラフ用）

```sql
-- 日別のSession作成数
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS session_count,
  COUNT(DISTINCT user_id) AS active_users
FROM sessions
WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY DATE(created_at)
ORDER BY date;
```

---

### B. 質問と回答の状況

#### B-1. 回答完了率（全体）

```sql
-- 全体の回答完了率
WITH question_stats AS (
  SELECT
    iq.id AS question_id,
    iq.session_id,
    CASE WHEN ia.id IS NOT NULL THEN 1 ELSE 0 END AS is_answered
  FROM interview_questions iq
  LEFT JOIN interview_answers ia ON iq.id = ia.question_id
  JOIN sessions s ON iq.session_id = s.id
  WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
)
SELECT
  COUNT(*) AS total_questions,
  SUM(is_answered) AS answered_questions,
  ROUND(100.0 * SUM(is_answered) / COUNT(*), 2) AS answer_rate_pct
FROM question_stats;
```

**出力例**:
```
total_questions | answered_questions | answer_rate_pct
----------------|--------------------|-----------------
135             | 98                 | 72.59
```

---

#### B-2. Sessionごとの回答率

```sql
-- Sessionごとの回答完了率
SELECT
  s.id AS session_id,
  s.user_id,
  s.type,
  s.title,
  COUNT(iq.id) AS total_questions,
  COUNT(ia.id) AS answered_questions,
  ROUND(100.0 * COUNT(ia.id) / NULLIF(COUNT(iq.id), 0), 2) AS answer_rate_pct
FROM sessions s
LEFT JOIN interview_questions iq ON s.id = iq.session_id
LEFT JOIN interview_answers ia ON iq.id = ia.question_id
WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY s.id, s.user_id, s.type, s.title
ORDER BY s.created_at;
```

---

#### B-3. 回答の長さ統計

```sql
-- 回答テキストの長さ分布
SELECT
  AVG(LENGTH(text)) AS avg_answer_length,
  MIN(LENGTH(text)) AS min_answer_length,
  MAX(LENGTH(text)) AS max_answer_length,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LENGTH(text)) AS median_answer_length
FROM interview_answers ia
JOIN interview_questions iq ON ia.question_id = iq.id
JOIN sessions s ON iq.session_id = s.id
WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]';
```

---

### C. ユーザー行動分析

#### C-1. 継続率（2回以上使用したユーザー）

```sql
-- 2回以上Sessionを作成したユーザーの割合
WITH user_session_counts AS (
  SELECT
    user_id,
    COUNT(*) AS session_count,
    COUNT(DISTINCT DATE(created_at)) AS active_days
  FROM sessions
  WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
  GROUP BY user_id
)
SELECT
  COUNT(*) AS total_users,
  SUM(CASE WHEN session_count >= 2 THEN 1 ELSE 0 END) AS users_with_2plus_sessions,
  ROUND(100.0 * SUM(CASE WHEN session_count >= 2 THEN 1 ELSE 0 END) / COUNT(*), 2) AS continuation_rate_pct
FROM user_session_counts;
```

---

#### C-2. アクティブユーザーの推移

```sql
-- 週ごとのアクティブユーザー数
SELECT
  DATE_TRUNC('week', created_at) AS week_start,
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(*) AS sessions_created
FROM sessions
WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start;
```

---

### D. AI分析の品質チェック

#### D-1. AI annotationsの存在率

```sql
-- AI annotationsが正しく生成されているSessionの割合
SELECT
  COUNT(*) AS total_sessions,
  SUM(CASE WHEN ai_annotations IS NOT NULL AND ai_annotations != '{}'::jsonb THEN 1 ELSE 0 END) AS sessions_with_annotations,
  ROUND(100.0 * SUM(CASE WHEN ai_annotations IS NOT NULL AND ai_annotations != '{}'::jsonb THEN 1 ELSE 0 END) / COUNT(*), 2) AS annotation_rate_pct
FROM sessions
WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]';
```

---

#### D-2. focusAreaの分布

```sql
-- AI annotationsのfocusArea分布
SELECT
  ai_annotations->>'focusArea' AS focus_area,
  COUNT(*) AS session_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM sessions
WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
  AND ai_annotations->>'focusArea' IS NOT NULL
GROUP BY ai_annotations->>'focusArea'
ORDER BY session_count DESC;
```

---

### E. データエクスポート用クエリ

#### E-1. 全Session情報（評価用）

```sql
-- 質問品質評価用のSession情報エクスポート
SELECT
  s.id AS session_id,
  s.user_id,
  s.type,
  s.title,
  s.user_short_note,
  s.ai_annotations,
  s.created_at,
  ARRAY_AGG(
    JSON_BUILD_OBJECT(
      'question_id', iq.id,
      'question_text', iq.text,
      'focus', iq.focus,
      'depth', iq.depth,
      'answer_text', ia.text,
      'answer_created_at', ia.created_at
    ) ORDER BY iq."order"
  ) AS qa_pairs
FROM sessions s
LEFT JOIN interview_questions iq ON s.id = iq.session_id
LEFT JOIN interview_answers ia ON iq.id = ia.question_id
WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY s.id, s.user_id, s.type, s.title, s.user_short_note, s.ai_annotations, s.created_at
ORDER BY s.user_id, s.created_at;
```

---

#### E-2. 匿名化されたログ（講師診断用）

```sql
-- 盲検評価用：ユーザーIDを匿名化
WITH user_mapping AS (
  SELECT
    user_id,
    'user_' || LPAD(ROW_NUMBER() OVER (ORDER BY user_id)::TEXT, 3, '0') AS anonymized_user_id
  FROM (SELECT DISTINCT user_id FROM sessions WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]') AS users
)
SELECT
  s.id AS session_id,
  um.anonymized_user_id,
  s.type,
  s.title,
  s.user_short_note,
  s.ai_annotations->>'focusArea' AS focus_area,
  s.ai_annotations->>'intentHypothesis' AS intent_hypothesis,
  s.created_at,
  ARRAY_AGG(
    JSON_BUILD_OBJECT(
      'question', iq.text,
      'focus', iq.focus,
      'answer', ia.text
    ) ORDER BY iq."order"
  ) FILTER (WHERE iq.id IS NOT NULL) AS qa_pairs
FROM sessions s
JOIN user_mapping um ON s.user_id = um.user_id
LEFT JOIN interview_questions iq ON s.id = iq.session_id
LEFT JOIN interview_answers ia ON iq.id = ia.question_id
WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY s.id, um.anonymized_user_id, s.type, s.title, s.user_short_note, s.ai_annotations, s.created_at
ORDER BY um.anonymized_user_id, s.created_at;
```

---

## CSVエクスポート方法

### 基本的なエクスポート手順

```bash
# データベース接続（環境変数から取得）
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Session一覧をエクスポート
psql $DATABASE_URL -c "COPY (
  [上記のSQLクエリをここに記述]
) TO STDOUT WITH CSV HEADER" > output_file.csv
```

---

### エクスポートスクリプト例

```bash
#!/bin/bash
# export_poc_data.sh - PoC期間中のデータを一括エクスポート

# 設定
POC_START="2025-11-20"
POC_END="2025-12-10"
OUTPUT_DIR="./poc_data_export"

# ディレクトリ作成
mkdir -p $OUTPUT_DIR

echo "Exporting PoC data from $POC_START to $POC_END..."

# 1. Session作成数（ユーザーごと）
psql $DATABASE_URL -c "COPY (
  SELECT
    user_id,
    COUNT(*) AS session_count,
    MIN(created_at) AS first_session_at,
    MAX(created_at) AS last_session_at
  FROM sessions
  WHERE created_at BETWEEN '$POC_START' AND '$POC_END'
  GROUP BY user_id
) TO STDOUT WITH CSV HEADER" > $OUTPUT_DIR/user_session_counts.csv

# 2. 回答完了率（Sessionごと）
psql $DATABASE_URL -c "COPY (
  SELECT
    s.id AS session_id,
    s.user_id,
    s.type,
    s.title,
    COUNT(iq.id) AS total_questions,
    COUNT(ia.id) AS answered_questions,
    ROUND(100.0 * COUNT(ia.id) / NULLIF(COUNT(iq.id), 0), 2) AS answer_rate_pct
  FROM sessions s
  LEFT JOIN interview_questions iq ON s.id = iq.session_id
  LEFT JOIN interview_answers ia ON iq.id = ia.question_id
  WHERE s.created_at BETWEEN '$POC_START' AND '$POC_END'
  GROUP BY s.id, s.user_id, s.type, s.title
) TO STDOUT WITH CSV HEADER" > $OUTPUT_DIR/session_answer_rates.csv

# 3. 質問品質評価用データ
psql $DATABASE_URL -c "COPY (
  SELECT
    s.id AS session_id,
    s.user_id,
    s.type,
    s.title,
    s.user_short_note,
    iq.id AS question_id,
    iq.text AS question_text,
    iq.focus,
    iq.depth,
    ia.text AS answer_text
  FROM sessions s
  JOIN interview_questions iq ON s.id = iq.session_id
  LEFT JOIN interview_answers ia ON iq.id = ia.question_id
  WHERE s.created_at BETWEEN '$POC_START' AND '$POC_END'
  ORDER BY s.user_id, s.created_at, iq.\"order\"
) TO STDOUT WITH CSV HEADER" > $OUTPUT_DIR/qa_quality_evaluation.csv

# 4. 匿名化されたログ（講師診断用）
psql $DATABASE_URL -c "COPY (
  WITH user_mapping AS (
    SELECT
      user_id,
      'user_' || LPAD(ROW_NUMBER() OVER (ORDER BY user_id)::TEXT, 3, '0') AS anonymized_user_id
    FROM (SELECT DISTINCT user_id FROM sessions WHERE created_at BETWEEN '$POC_START' AND '$POC_END') AS users
  )
  SELECT
    s.id AS session_id,
    um.anonymized_user_id,
    s.type,
    s.title,
    s.user_short_note,
    s.ai_annotations->>'focusArea' AS focus_area,
    s.created_at
  FROM sessions s
  JOIN user_mapping um ON s.user_id = um.user_id
  WHERE s.created_at BETWEEN '$POC_START' AND '$POC_END'
  ORDER BY um.anonymized_user_id, s.created_at
) TO STDOUT WITH CSV HEADER" > $OUTPUT_DIR/anonymized_sessions.csv

echo "Export complete! Files saved to $OUTPUT_DIR/"
ls -lh $OUTPUT_DIR/
```

**実行方法**:
```bash
chmod +x export_poc_data.sh
./export_poc_data.sh
```

---

## JSON形式でのエクスポート

### JSON形式（講師診断用）

```bash
# JSONフォーマットでエクスポート
psql $DATABASE_URL -c "SELECT json_agg(row_to_json(t)) FROM (
  [SQLクエリ]
) t" -t -A > output.json
```

---

### エクスポート例：Session + Q&A（JSON）

```bash
psql $DATABASE_URL -c "
SELECT json_agg(row_to_json(sessions_with_qa)) FROM (
  SELECT
    s.id AS session_id,
    s.user_id,
    s.type,
    s.title,
    s.user_short_note,
    s.ai_annotations,
    s.created_at,
    (
      SELECT json_agg(json_build_object(
        'question_id', iq.id,
        'question_text', iq.text,
        'focus', iq.focus,
        'depth', iq.depth,
        'answer_text', ia.text
      ))
      FROM interview_questions iq
      LEFT JOIN interview_answers ia ON iq.id = ia.question_id
      WHERE iq.session_id = s.id
      ORDER BY iq.\"order\"
    ) AS qa_pairs
  FROM sessions s
  WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
  ORDER BY s.user_id, s.created_at
) AS sessions_with_qa
" -t -A > poc_sessions_qa.json
```

---

## プライバシー配慮事項

### 1. 個人情報の匿名化

**匿名化が必要なフィールド**:
- `user_id` → `anonymized_user_id`（例: `user_001`）
- `title`、`project_name`に個人名が含まれる場合 → マスキング

**匿名化スクリプト例**:
```sql
-- ユーザーIDを匿名化
WITH user_mapping AS (
  SELECT
    user_id,
    'user_' || LPAD(ROW_NUMBER() OVER (ORDER BY user_id)::TEXT, 3, '0') AS anonymized_user_id
  FROM (SELECT DISTINCT user_id FROM sessions) AS users
)
SELECT
  s.id,
  um.anonymized_user_id,
  s.type,
  -- 個人名のマスキング（title内の名前を削除）
  REGEXP_REPLACE(s.title, '(太郎|花子|さん)', '[NAME]', 'g') AS title,
  s.user_short_note
FROM sessions s
JOIN user_mapping um ON s.user_id = um.user_id;
```

---

### 2. データアクセス権限

| 役割 | アクセス範囲 | 目的 |
|------|-------------|------|
| **テスター（ユーザー）** | 自分のSessionのみ | 通常の使用 |
| **評価者（講師・PO）** | 匿名化されたログ | 質問品質評価、講師診断 |
| **開発チーム** | 全データ（DB直接アクセス） | バグ修正、データ分析 |
| **第三者** | アクセス不可 | - |

---

### 3. データ保持期間

| データ種別 | 保持期間 | 削除タイミング |
|-----------|---------|---------------|
| **Session/Q&A生データ** | PoC終了後6ヶ月 | 2025年6月末 |
| **匿名化データ** | 無期限 | - |
| **評価シート** | PoC終了後1年 | 2026年1月末 |
| **アンケート回答** | PoC終了後1年 | 2026年1月末 |

---

### 4. データ削除手順

**PoC終了後の削除スクリプト**:
```sql
-- PoC期間中のSessionを全削除（CASCADE削除で関連データも削除）
DELETE FROM sessions
WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]';

-- 確認
SELECT COUNT(*) FROM sessions WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]';
-- 結果: 0
```

---

## データ品質チェックリスト

### エクスポート前の確認項目

- [ ] PoC期間の開始日・終了日が正しく設定されている
- [ ] 全てのSessionにAI annotationsが生成されている
- [ ] 質問が2-3問生成されているSessionが80%以上
- [ ] 回答完了率が50%以上
- [ ] `user_id`の重複がない
- [ ] 匿名化処理が正しく動作している

### エクスポート後の確認項目

- [ ] CSVファイルが正しく開ける（文字化けなし）
- [ ] レコード数が期待値と一致している
- [ ] 個人情報が含まれていない（目視確認）
- [ ] JSONフォーマットが有効（`jq`でパース可能）

**JSONフォーマット確認**:
```bash
jq '.' output.json > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
```

---

## トラブルシューティング

### Q: CSVエクスポート時に文字化けが発生する

**A**: エンコーディングを明示的に指定してください。

```bash
# UTF-8で明示的にエクスポート
psql $DATABASE_URL -c "COPY (...) TO STDOUT WITH CSV HEADER ENCODING 'UTF8'" > output.csv
```

---

### Q: PostgreSQLのバージョンで`FILTER`句が使えない

**A**: `CASE`文で代替してください。

```sql
-- FILTER句（PostgreSQL 9.4以降）
ARRAY_AGG(...) FILTER (WHERE iq.id IS NOT NULL)

-- CASE文（互換性あり）
ARRAY_AGG(CASE WHEN iq.id IS NOT NULL THEN ... ELSE NULL END)
```

---

### Q: エクスポートに時間がかかりすぎる

**A**: インデックスを確認してください。

```sql
-- 必要なインデックスが存在するか確認
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('sessions', 'interview_questions', 'interview_answers');

-- created_atにインデックスが必要
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
```

---

## 関連ドキュメント

- **PoC概要**: `/docs/poc/MUEDnote_PoC.md`
- **KPI指標**: `/docs/poc/kpi_metrics.md`
- **質問品質評価シート**: `/docs/poc/question_quality_evaluation.md`
- **テスター向けガイド**: `/docs/poc/tester_guide.md`

---

**最終更新**: 2025-11-20
**作成**: MUED LMS開発チーム

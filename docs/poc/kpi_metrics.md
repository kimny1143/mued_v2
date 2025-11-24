# MUEDnote PoC - KPI定義と計測方法

## 概要

このドキュメントは、MUEDnote PoCの成功を評価するための定量的・定性的指標（KPI）を定義します。LITRON PoCフレームワークに基づき、3つの仮説を検証します。

---

## PoC検証の3つの仮説

```
1. 行動仮説
   → ユーザーは「Session作成 + AI質問回答」を続けてくれるか？

2. 価値仮説
   → Q&Aログは、本人と講師にとって価値があるか？

3. データ資産仮説
   → ログは、将来の弱点分析・教材生成に使えるか？
```

---

## 1. 行動仮説の検証

### 仮説

ユーザーは、制作のたびに「Session + 一言メモ + AIの質問に回答する」運用を**ダルくない負荷**で続けてくれるか。

---

### KPI 1-1: Session作成数（ユーザーあたり平均）

**目標**: 10 Session中、平均 7 Session以上作成（70%達成率）

**計測方法**:
```sql
-- ユーザーごとのSession作成数
SELECT
  user_id,
  COUNT(*) AS session_count,
  MIN(created_at) AS first_session,
  MAX(created_at) AS last_session,
  MAX(created_at) - MIN(created_at) AS duration_days
FROM sessions
WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY user_id
ORDER BY session_count DESC;

-- 平均Session数
SELECT AVG(session_count) AS avg_sessions_per_user
FROM (
  SELECT user_id, COUNT(*) AS session_count
  FROM sessions
  WHERE created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
  GROUP BY user_id
) AS user_sessions;
```

**合格ライン**:
- 平均 7 Session以上 → **合格**
- 平均 5-6 Session → **要改善**
- 平均 4 Session以下 → **不合格**

**CSV エクスポート**:
```bash
psql $DATABASE_URL -c "COPY (SELECT ...) TO STDOUT WITH CSV HEADER" > poc_session_counts.csv
```

---

### KPI 1-2: 回答完了率（質問あたり）

**目標**: 各Sessionで生成された質問のうち、70%以上に回答

**計測方法**:
```sql
-- 全体の回答完了率
WITH question_stats AS (
  SELECT
    iq.session_id,
    iq.id AS question_id,
    CASE
      WHEN ia.id IS NOT NULL THEN 1
      ELSE 0
    END AS is_answered
  FROM interview_questions iq
  LEFT JOIN interview_answers ia ON iq.id = ia.question_id
  WHERE iq.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
)
SELECT
  COUNT(*) AS total_questions,
  SUM(is_answered) AS answered_questions,
  ROUND(100.0 * SUM(is_answered) / COUNT(*), 2) AS answer_rate_pct
FROM question_stats;

-- Sessionごとの回答率
SELECT
  s.id AS session_id,
  s.title,
  s.user_id,
  COUNT(iq.id) AS total_questions,
  COUNT(ia.id) AS answered_questions,
  ROUND(100.0 * COUNT(ia.id) / COUNT(iq.id), 2) AS answer_rate_pct
FROM sessions s
JOIN interview_questions iq ON s.id = iq.session_id
LEFT JOIN interview_answers ia ON iq.id = ia.question_id
WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY s.id, s.title, s.user_id
ORDER BY answer_rate_pct DESC;
```

**合格ライン**:
- 平均回答率 70%以上 → **合格**
- 平均回答率 50-69% → **要改善**
- 平均回答率 50%未満 → **不合格**

---

### KPI 1-3: 継続率（2回目以降も使用）

**目標**: ユーザーの60%以上が、2回目以降も自発的に使用

**計測方法**:
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

-- 各ユーザーの継続日数
SELECT
  user_id,
  session_count,
  active_days,
  CASE
    WHEN session_count >= 2 THEN 'Continued'
    ELSE 'One-time'
  END AS user_type
FROM user_session_counts
ORDER BY session_count DESC;
```

**合格ライン**:
- 継続率 60%以上 → **合格**
- 継続率 40-59% → **要改善**
- 継続率 40%未満 → **不合格**

---

### KPI 1-4: 定性評価（インタビュー）

**目標**: 「続けたい」と回答した割合が50%以上

**計測方法**:
- PoC終了後アンケート（Googleフォーム）
- 質問項目:
  1. 「MUEDnoteを今後も使い続けたいですか？」（5段階評価）
  2. 「途中で面倒になりましたか？」（はい/いいえ）
  3. 「Session作成の負担はどうでしたか？」（1-5点）

**合格ライン**:
- 「続けたい」（4-5点）が50%以上 → **合格**
- 「続けたい」（4-5点）が30-49% → **要改善**
- 「続けたい」（4-5点）が30%未満 → **不合格**

---

## 2. 価値仮説の検証

### 仮説

AIインタビューで引き出したQ&Aログは、本人にとって「振り返り・上達」に役立ち、講師にとって「指導・フィードバック」に使える価値があるか。

---

### KPI 2-1: 質問品質スコア

**目標**: 評価シートの平均スコア 3.5/5 以上

**計測方法**:
1. 各ユーザーから**10 Session分**の質問をランダムサンプリング
2. 評価者（講師・プロジェクトオーナー）が`question_quality_evaluation.md`のシートで採点
3. 評価軸：関連度、筆のノリ、深度（各1-5点）

**データ収集SQL**:
```sql
-- ランダムサンプリング（ユーザーごとに10 Session）
WITH ranked_sessions AS (
  SELECT
    s.id AS session_id,
    s.user_id,
    s.title,
    s.user_short_note,
    s.type,
    ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY RANDOM()) AS rn
  FROM sessions s
  WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
)
SELECT
  rs.session_id,
  rs.user_id,
  rs.title,
  rs.user_short_note,
  rs.type,
  iq.id AS question_id,
  iq.text AS question_text,
  iq.focus,
  iq.depth,
  ia.text AS answer_text
FROM ranked_sessions rs
JOIN interview_questions iq ON rs.session_id = iq.session_id
LEFT JOIN interview_answers ia ON iq.id = ia.question_id
WHERE rs.rn <= 10
ORDER BY rs.user_id, rs.session_id, iq."order";
```

**CSV エクスポート**:
```bash
psql $DATABASE_URL -c "COPY (...) TO STDOUT WITH CSV HEADER" > poc_quality_evaluation_sample.csv
```

**合格ライン**:
- 平均スコア 3.5/5以上 → **合格**
- 平均スコア 2.5-3.4 → **要改善**
- 平均スコア 2.5未満 → **不合格**

---

### KPI 2-2: 「完全にズレている質問」の割合

**目標**: 10%未満

**計測方法**:
- 評価シートで「関連度 = 1点」または「総合評価で"完全にズレている"」と判定された質問の割合
- 手動集計（評価シートのデータをスプレッドシートに入力）

**合格ライン**:
- ズレている質問 10%未満 → **合格**
- ズレている質問 10-20% → **要改善**
- ズレている質問 20%以上 → **不合格**

---

### KPI 2-3: 振り返りの価値（定性評価）

**目標**: 「振り返りが役立った」と回答した割合が50%以上

**計測方法**:
- PoC終了後アンケート
- 質問項目:
  1. 「Timelineを見たとき、自分の癖や成長が見えましたか？」（5段階評価）
  2. 「講師に見せたら、役に立ちそうだと思いますか？」（5段階評価）

**合格ライン**:
- 「役立った」（4-5点）が50%以上 → **合格**
- 「役立った」（4-5点）が30-49% → **要改善**
- 「役立った」（4-5点）が30%未満 → **不合格**

---

## 3. データ資産仮説の検証

### 仮説

Session/Interviewログは、将来の弱点分析・自動教材生成の「まともな学習データ」になりうるか。

---

### KPI 3-1: 講師による診断精度

**目標**: 10 Session分のログから、ユーザーの弱点を70%特定可能

**計測方法（盲検評価）**:

1. **データ準備**:
   - ユーザーA、B、C（各10 Session分）のログを匿名化してエクスポート
   - `user_short_note`、`ai_annotations`、`interview_questions`、`interview_answers`のみ提供

2. **講師による診断**:
   - ログだけを見て、以下を診断してもらう:
     - この人が**よく詰まるポイント**（例: サビ、コード進行、ミックスなど）
     - この人の**強み**（例: メロディは早いが、アレンジで悩む）
     - 次のレッスンで**何をテーマにすべきか**

3. **本人の自己申告と照合**:
   - 本人に「自分が苦手だと思う領域」をアンケート
   - 講師の診断と一致率を計算

**データ収集SQL**:
```sql
-- ユーザーごとの全Session情報をエクスポート
SELECT
  s.id AS session_id,
  'user_' || s.user_id AS anonymized_user_id,  -- 匿名化
  s.type,
  s.title,
  s.user_short_note,
  s.ai_annotations,
  s.created_at,
  ARRAY_AGG(
    JSON_BUILD_OBJECT(
      'question', iq.text,
      'focus', iq.focus,
      'depth', iq.depth,
      'answer', ia.text
    ) ORDER BY iq."order"
  ) AS qa_pairs
FROM sessions s
LEFT JOIN interview_questions iq ON s.id = iq.session_id
LEFT JOIN interview_answers ia ON iq.id = ia.question_id
WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY s.id, s.user_id, s.type, s.title, s.user_short_note, s.ai_annotations, s.created_at
ORDER BY s.user_id, s.created_at;
```

**合格ライン**:
- 診断一致率 70%以上 → **合格**（教育価値あり）
- 診断一致率 50-69% → **要改善**
- 診断一致率 50%未満 → **不合格**

---

### KPI 3-2: データの粒度と言語品質

**目標**: 教材生成の素体として、情報の粒度と言語が足りているか

**計測方法**:
- 手動レビュー（プロジェクトオーナー + データサイエンティスト）
- 評価観点:
  1. `user_short_note`の具体性（1-5点）
  2. `interview_answers`の詳細度（1-5点）
  3. `ai_annotations`の有用性（1-5点）

**サンプルSQL**:
```sql
-- Session分析データの詳細度チェック
SELECT
  s.id AS session_id,
  s.user_short_note,
  LENGTH(s.user_short_note) AS note_length,
  s.ai_annotations->>'focusArea' AS focus_area,
  s.ai_annotations->>'intentHypothesis' AS intent_hypothesis,
  COUNT(iq.id) AS question_count,
  COUNT(ia.id) AS answer_count,
  AVG(LENGTH(ia.text)) AS avg_answer_length
FROM sessions s
LEFT JOIN interview_questions iq ON s.id = iq.session_id
LEFT JOIN interview_answers ia ON iq.id = ia.question_id
WHERE s.created_at BETWEEN '[PoC開始日]' AND '[PoC終了日]'
GROUP BY s.id, s.user_short_note, s.ai_annotations
ORDER BY s.created_at;
```

**合格ライン**:
- 平均スコア 3.5/5以上 → **合格**
- 平均スコア 2.5-3.4 → **要改善**
- 平均スコア 2.5未満 → **不合格**

---

## KPIサマリー表

| 仮説 | KPI | 目標値 | 計測方法 | 合格ライン |
|------|-----|--------|----------|-----------|
| **行動仮説** | Session作成数 | 平均7/10 | SQL集計 | 70%以上 |
| | 回答完了率 | 70% | SQL集計 | 70%以上 |
| | 継続率 | 60% | SQL集計 | 60%以上 |
| | 定性評価（続けたい） | 50% | アンケート | 50%以上が「4-5点」 |
| **価値仮説** | 質問品質スコア | 3.5/5 | 評価シート | 平均3.5以上 |
| | ズレている質問 | 10%未満 | 評価シート | 10%未満 |
| | 振り返りの価値 | 50% | アンケート | 50%以上が「4-5点」 |
| **データ資産仮説** | 講師診断精度 | 70% | 盲検評価 | 70%一致 |
| | データ粒度・品質 | 3.5/5 | 手動レビュー | 平均3.5以上 |

---

## PoC合否判定マトリクス

### 判定基準

| 判定 | 条件 | 次のアクション |
|------|------|----------------|
| **◎ 突き抜け** | 全KPIが目標値以上 + 定性評価が高い | Phase 1.4に進む。本格開発スタート。 |
| **○ 行ける** | 8割のKPIが目標値以上 | 改善ポイントを特定し、Phase 1.4で修正。 |
| **△ 方向転換検討** | 5割のKPIが目標値以上 | AI質問なしの「制作日報アプリ」路線を検討。 |
| **✕ 撤退or統合** | 半数以上のKPIが不合格 | MUEDnote単体での展開は中止。MUED本体のサブ機能として統合。 |

---

## データ収集スケジュール

| Week | タスク | 担当 | 成果物 |
|------|--------|------|--------|
| **Week 0** | KPI指標の最終確認 | PM | 本ドキュメント |
| **Week 2-3** | PoC開始・ログ収集開始 | 開発チーム | Session/Q&Aデータ |
| **Week 4** | 中間データチェック | データアナリスト | 中間レポート（Session数、回答率） |
| **Week 5** | PoC終了・全データエクスポート | 開発チーム | CSV/JSON形式のログ |
| **Week 5-6** | 質問品質評価 | 評価者（講師） | 評価シート回収 |
| **Week 6** | 盲検評価（講師診断） | 講師 | 診断結果レポート |
| **Week 6** | アンケート回収 | PM | アンケート集計 |
| **Week 7** | 総合評価・判定 | PM + 開発チーム | 最終レポート + Go/No-Go判断 |

---

## プライバシー配慮事項

### 個人情報の取り扱い

1. **匿名化**:
   - `user_id`は`user_001`などの連番に置き換え
   - `title`、`project_name`に個人名が含まれる場合は削除

2. **データアクセス権限**:
   - 評価者のみがアクセス可能
   - 評価終了後、元データは削除

3. **公開資料**:
   - レポートには匿名化されたサマリーのみ記載
   - 個別のSessionやQ&Aは公開しない

---

## エクスポート用スクリプト例

### 全Session/Q&Aデータのエクスポート

```bash
#!/bin/bash
# export_poc_data.sh

POC_START="2025-11-20"
POC_END="2025-12-10"

# Session一覧
psql $DATABASE_URL -c "COPY (
  SELECT
    id, user_id, type, title, user_short_note,
    ai_annotations, created_at
  FROM sessions
  WHERE created_at BETWEEN '$POC_START' AND '$POC_END'
) TO STDOUT WITH CSV HEADER" > poc_sessions.csv

# Q&Aペア
psql $DATABASE_URL -c "COPY (
  SELECT
    s.id AS session_id,
    s.user_id,
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
) TO STDOUT WITH CSV HEADER" > poc_qa_pairs.csv

echo "Data exported: poc_sessions.csv, poc_qa_pairs.csv"
```

---

## 関連ドキュメント

- **PoC概要**: `/docs/poc/MUEDnote_PoC.md`
- **質問品質評価シート**: `/docs/poc/question_quality_evaluation.md`
- **テスター向けガイド**: `/docs/poc/tester_guide.md`
- **データ収集方法**: `/docs/poc/data_collection.md`

---

**最終更新**: 2025-11-20
**作成**: MUED LMS開発チーム

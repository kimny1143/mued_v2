# MUEDnote PoC ドキュメント一覧

## 概要

このディレクトリには、MUEDnote PoC（概念実証）実施のための評価基準、テスター向けマニュアル、データ収集方法が含まれています。

---

## ドキュメント構成

### 1. MUEDnote_PoC.md（PoC設計書）

**対象者**: プロジェクトオーナー、開発チーム

**内容**:
- PoC実施の背景と目的
- 検証する3つの仮説（行動・価値・データ資産）
- 対象ユーザーとシナリオ
- 評価観点と合否判定基準
- 実行ステップとタイムライン

**使用タイミング**: PoC企画段階で読む

---

### 2. tester_guide.md（テスター向けガイド）

**対象者**: PoC参加テスター（DTM制作者・講師）

**内容**:
- MUEDnoteの目的と使い方（3ステップ）
  1. Session作成
  2. AI質問への回答
  3. Timelineでの振り返り
- PoC期間中のお願い事項（目標: 10 Session）
- フィードバック方法
- FAQ

**使用タイミング**: PoC参加者へのオンボーディング時に配布

---

### 3. question_quality_evaluation.md（質問品質評価シート）

**対象者**: 評価者（講師・プロジェクトオーナー）

**内容**:
- 質問品質を評価するためのテンプレート
- 評価軸の定義
  - 関連度（今の作業に刺さっているか）
  - 筆のノリ（答えやすいか）
  - 深度（適切な深さか）
- 評価例（良い質問 vs 改善が必要な質問）
- スコア集計方法

**使用タイミング**: PoC期間中〜終了後、質問品質を評価する際に使用

---

### 4. kpi_metrics.md（KPI定義と計測方法）

**対象者**: プロジェクトオーナー、データアナリスト、開発チーム

**内容**:
- 3つの仮説ごとのKPI定義
  - 行動仮説: Session作成数、回答完了率、継続率
  - 価値仮説: 質問品質スコア、振り返りの価値
  - データ資産仮説: 講師診断精度、データ粒度
- 各KPIの目標値と合格ライン
- 計測用SQLクエリ
- PoC合否判定マトリクス

**使用タイミング**: PoC期間中のデータ収集、PoC終了後の評価時に参照

---

### 5. data_collection.md（データ収集設計）

**対象者**: 開発チーム、データアナリスト

**内容**:
- 収集するデータ一覧（定量・定性）
- データ取得SQLクエリ集
  - Session作成状況
  - 質問と回答の状況
  - ユーザー行動分析
  - AI分析の品質チェック
- CSVエクスポート方法
- プライバシー配慮事項（匿名化、データ保持期間）

**使用タイミング**: PoC期間中のデータ収集、PoC終了後のエクスポート時に使用

---

## PoC実施の流れ

```
Week 0: 仮説と指標の固定
├─ 📄 MUEDnote_PoC.md を読んで全体像を把握
└─ 📊 kpi_metrics.md でKPIを確認

Week 1: MVP機能をPoCレベルで固める
├─ 開発チームがSession作成 → 質問生成 → 回答 → 振り返りを実装
└─ 🗂️ data_collection.md でデータ収集の準備

Week 2-3: テストユーザー募集＆オンボーディング
├─ 📖 tester_guide.md をテスターに配布
└─ テスターがMUEDnoteの使い方を理解

Week 3-4: PoC本番
├─ テスターが10 Session作成（目標）
└─ 📊 kpi_metrics.md のSQLで進捗確認

Week 4-5: 評価・ふりかえり
├─ ✅ question_quality_evaluation.md で質問品質を採点
├─ 🗂️ data_collection.md のスクリプトでデータエクスポート
└─ 📊 kpi_metrics.md の合否判定マトリクスで最終評価
```

---

## ファイルサイズと読了時間

| ファイル名 | サイズ | 読了時間（目安） |
|-----------|--------|-----------------|
| MUEDnote_PoC.md | 7.8 KB | 10分 |
| tester_guide.md | 9.5 KB | 15分 |
| question_quality_evaluation.md | 7.2 KB | 10分 |
| kpi_metrics.md | 15 KB | 20分 |
| data_collection.md | 17 KB | 25分 |
| **合計** | **56.5 KB** | **80分** |

---

## 関連リソース

### プロジェクト全体のドキュメント

- `/docs/plans/MUEDnote_MVP.md` - MUEDnote MVP計画書
- `/docs/phase1.3-optimization-report.md` - Phase 1.3 最適化レポート

### データベース設計

- `/db/migrations/0010_add_sessions_phase2.sql` - Session/Interview テーブル定義

### API実装

- `/app/api/interviews/sessions/route.ts` - Session作成API
- `/app/api/interviews/questions/route.ts` - 質問生成API
- `/app/api/interviews/answers/route.ts` - 回答保存API

---

## PoC実施前のチェックリスト

開始前に以下を確認してください:

- [ ] `MUEDnote_PoC.md`を読んで、PoCの目的と仮説を理解した
- [ ] `kpi_metrics.md`で、目標値と合格ラインを確認した
- [ ] `tester_guide.md`をテスターに配布できる状態にした
- [ ] `question_quality_evaluation.md`を評価者に共有した
- [ ] `data_collection.md`のSQLクエリをテスト実行し、動作確認した
- [ ] データベースに`sessions`、`interview_questions`、`interview_answers`テーブルが存在する
- [ ] PoC期間の開始日・終了日を決定した
- [ ] テスター候補者（8-10名）をリストアップした
- [ ] アンケートフォーム（Googleフォーム）を作成した
- [ ] Slack/メールでのサポート窓口を設置した

---

## 質問・問い合わせ

PoC実施中の質問は、以下のチャンネルでお願いします:

- **Slack**: #muednote-poc
- **メール**: poc@mued-lms.example.com

---

**最終更新**: 2025-11-20
**作成**: MUED LMS開発チーム

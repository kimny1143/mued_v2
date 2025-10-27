# MUED v2 ドキュメントガイド

**最終更新**: 2025年10月27日
**本番環境**: ✅ **稼働中** ([https://mued.jp](https://mued.jp))

---

## 🚨 最重要ドキュメント

### 🎯 最終総合検証レポート (2025-10-27) ⭐️NEW
**[`FINAL_COMPREHENSIVE_REPORT_2025-10-27.md`](./FINAL_COMPREHENSIVE_REPORT_2025-10-27.md)**
- **総合評価: 87/100** (本番push可能)
- 6エージェント統合検証の最終結果
- 事業計画整合性・DB・テスト・コード品質・ドキュメント・スクリプトの包括評価
- Push前の必須対応事項とデプロイ戦略

### 📊 実装追跡 (最新)
**[`IMPLEMENTATION_TRACKER.md`](./IMPLEMENTATION_TRACKER.md)**
- 全機能の実装状況をリアルタイム追跡
- 優先順位別タスクリスト
- 完了/未完了の詳細ステータス

### 🔍 包括的プロジェクト分析 (2025-10-27)
**[`COMPREHENSIVE_PROJECT_ANALYSIS_2025-10-27.md`](./COMPREHENSIVE_PROJECT_ANALYSIS_2025-10-27.md)**
- システム全体の現状分析
- 技術的債務の評価
- 改善提案とロードマップ

---

## 📂 ドキュメント構造

### 📈 /analysis - 分析レポート
最新の技術分析とコードベース評価
- **[ディレクトリ概要](./analysis/)** | [最適化分析](./analysis/CODEBASE_OPTIMIZATION_ANALYSIS_2025.md) | [実装サマリー](./analysis/IMPLEMENTATION_SUMMARY_2025-10-27.md)

### 🏗️ /architecture - アーキテクチャ設計
システム設計とアーキテクチャドキュメント
- **[ディレクトリ概要](./architecture/README.md)** | [MVP設計](./architecture/mvp-architecture.md) | [ビジネスロジック](./architecture/business-logic-specification.md)

### 💼 /business - ビジネス文書
事業計画と要件定義
- **[ディレクトリ概要](./business/README.md)** | [事業計画](./business/株式会社グラスワークス%20MUEDプロジェクト%20事業計画.md) | [実装対比](./business/implementation-vs-business-plan.md)

### 💾 /database - データベース文書
データベース設計と最適化
- **[ディレクトリ概要](./database/README.md)** | [インデックス実装](./database/index-implementation-report.md)

### 🎨 /features - 機能仕様
各機能の詳細仕様書
- **[ディレクトリ概要](./features/README.md)** | [音楽教材](./music-material-specification.md) | [UI移行](./ui-migration-strategy.md)

### 🛠️ /implementation - 実装ガイド
実装詳細とガイドライン
- **[ディレクトリ概要](./implementation/README.md)** | [MVP計画](./implementation/mvp-implementation-plan.md) | [OpenAI統合](./implementation/openai-function-calling-guide.md)

### 🧪 /testing - テスト戦略
テスト計画と実装（テストディレクトリは `/testing` に存在）
- **[ディレクトリ概要](./testing/README.md)** | [テスト戦略](./TESTING.md) | [E2Eセットアップ](./e2e-test-setup.md)

### 🗺️ /roadmap - ロードマップ
プロジェクトロードマップとマイルストーン
- **[POCからMVPへ](./roadmap/poc-to-mvp-roadmap.md)**

### 🔬 /research - リサーチ
技術調査とリサーチ結果
- **[AIメンターマッチング](./research/ai-mentor-matching-research.md)**

### 🔧 /tools - ツール文書
開発ツールとユーティリティ
- **[ディレクトリ概要](./tools/README.md)** | [Claude Desktop](./claude-desktop-commands.md)

### 📦 /archive - アーカイブ
過去のドキュメントと履歴
- **[アーカイブ概要](./archive/README.md)** | [2025-10-27](./archive/2025-10-27/) | [2025-10-19](./archive/2025-10-19/) | [2025-10-18](./_archive/2025-10-18/)

---

## 🚀 クイックナビゲーション

### 今すぐ確認すべき項目

1. **実装状況を知りたい** → [`IMPLEMENTATION_TRACKER.md`](./IMPLEMENTATION_TRACKER.md)
2. **最新の分析を読みたい** → [`COMPREHENSIVE_PROJECT_ANALYSIS_2025-10-27.md`](./COMPREHENSIVE_PROJECT_ANALYSIS_2025-10-27.md)
3. **MVPチェックリストを確認** → [`implementation/mvp-checklist.md`](./implementation/mvp-checklist.md)
4. **テスト戦略を理解** → [`TEST_STRATEGY.md`](./TEST_STRATEGY.md)

### 開発タスク別ガイド

- **新機能を追加する** → [`architecture/mvp-architecture.md`](./architecture/mvp-architecture.md)
- **AIを統合する** → [`implementation/openai-function-calling-guide.md`](./implementation/openai-function-calling-guide.md)
- **DBを最適化する** → [`implementation/database-improvement-plan.md`](./implementation/database-improvement-plan.md)
- **テストを書く** → [`testing/README.md`](./testing/README.md)

### プロジェクト管理

- **進捗を追跡** → [`implementation/current-progress.md`](./implementation/current-progress.md)
- **ロードマップを確認** → [`roadmap/poc-to-mvp-roadmap.md`](./roadmap/poc-to-mvp-roadmap.md)
- **ビジネス要件を確認** → [`business/implementation-vs-business-plan.md`](./business/implementation-vs-business-plan.md)

---

## 📝 その他のドキュメント

### 技術仕様
- **[`music-material-specification.md`](./music-material-specification.md)** - 音楽教材仕様
- **[`ui-migration-strategy.md`](./ui-migration-strategy.md)** - UI移行戦略
- **[`claude-desktop-commands.md`](./claude-desktop-commands.md)** - Claude Desktop コマンドリファレンス

### MCP関連
- **[`implementation/mcp-test-request.md`](./implementation/mcp-test-request.md)** - MCPテストリクエスト

---

## 🔄 更新履歴

- **2025-10-27**: ドキュメント構造改善、各ディレクトリにREADME追加、重複文書の整理
- **2025-10-27**: IMPLEMENTATION_TRACKER.md追加、データベースインデックス35個適用完了
- **2025-10-19**: 包括的分析レポート作成、DB最適化計画策定
- **2025-10-18**: 本番環境検証、ステータスレポート更新
- **2025-10-10**: 本番環境デプロイ完了

---

## 💡 ドキュメント管理方針

### 命名規則
- 分析レポート: `{TYPE}_ANALYSIS_{YYYY-MM-DD}.md`
- 実装ドキュメント: `{feature}-{type}.md`
- アーカイブ: `archive/{YYYY-MM-DD}/`

### 更新サイクル
- **IMPLEMENTATION_TRACKER.md**: 日次更新
- **current-progress.md**: 週次更新
- **分析レポート**: 月次またはマイルストーン時

### アーカイブポリシー
- 古い分析レポートは日付ごとにアーカイブ
- 実装ドキュメントは最新版を維持
- 履歴的価値のあるドキュメントは保存

---

*このREADMEはドキュメント全体のナビゲーションガイドです。各ドキュメントの詳細は個別ファイルを参照してください。*
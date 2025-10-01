# MUED v2 ドキュメントガイド

**最終更新**: 2025年10月1日

---

## 🚀 クイックスタート

### ⭐ まず最初に読むべき文書
→ **`implementation/current-progress.md`** - POC完了時点の実装状況

### 今すぐ実装を始める
→ **`implementation/mvp-checklist.md`** を開く

### 全体像を理解する
→ **`roadmap/poc-to-mvp-roadmap.md`** を読む

---

## 📖 必須文書（実装に必要）

### 0. 現在の状況 ⭐ NEW
**`implementation/current-progress.md`**
- POC完了時点（Day 2）の実装状況
- 完了済み機能・未実装機能の一覧
- 次のステップと優先順位
- 技術スタックの差分

### 1. ロードマップ
**`roadmap/poc-to-mvp-roadmap.md`**
- POC→MVP全体計画
- 43日間のスケジュール
- Phase別マイルストーン

### 2. アーキテクチャ
**`architecture/mvp-architecture.md`**
- システム設計（OpenAI + REST API）
- データベーススキーマ
- API設計とセキュリティ

**`architecture/business-logic-specification.md`**
- ビジネスルール定義
- サブスクリプション管理
- レベニューシェア計算

**`architecture/mcp-feasibility-analysis.md`**
- MCP技術検証結果
- コスト分析
- 段階的導入戦略

### 3. 実装ガイド
**`implementation/current-progress.md`** ⭐
- 現在の進捗状況（25%完了）
- 完了済み・未実装機能
- 優先タスク一覧

**`implementation/mvp-implementation-plan.md`**
- 詳細実装計画
- Phase別タスク
- コード例付き

**`implementation/mvp-checklist.md`**
- 162項目のタスクリスト
- Day別進捗管理
- 完了基準

**`implementation/openai-function-calling-guide.md`**
- OpenAI統合方法
- 自然言語処理の実装
- コスト最適化

### 4. 事業計画
**`business/株式会社グラスワークス MUEDプロジェクト 事業計画.md`**
- ビジネス要件
- 収益モデル
- 成功指標

---

## 📁 ディレクトリ構成

```
docs/
├── README.md                                    # このファイル
├── roadmap/
│   └── poc-to-mvp-roadmap.md                   # 全体ロードマップ
├── architecture/
│   ├── mvp-architecture.md                     # システム設計
│   ├── business-logic-specification.md         # ビジネスロジック
│   └── mcp-feasibility-analysis.md            # MCP技術検証
├── implementation/
│   ├── current-progress.md                    # ⭐ 現在の進捗状況
│   ├── mvp-implementation-plan.md             # 実装計画
│   ├── mvp-checklist.md                       # タスクリスト
│   └── openai-function-calling-guide.md       # OpenAI実装
├── business/
│   └── 株式会社グラスワークス MUEDプロジェクト 事業計画.md
└── _archive/                                   # 過去の文書
```

---

## 🎯 役割別ガイド

### 開発者（Claude Code / エンジニア）
1. **`implementation/current-progress.md`** ⭐ - 現状把握
2. `implementation/mvp-checklist.md` - 今日のタスク確認
3. `implementation/openai-function-calling-guide.md` - 実装方法
4. `architecture/mvp-architecture.md` - システム設計参照

**次にやるべきこと**:
- Week 1-2: OpenAI Function Calling統合（14時間）
- Week 3: AI教材生成機能（24.5時間）
- Week 4: サブスクリプション完成（14時間）

### プロジェクトマネージャー
1. **`implementation/current-progress.md`** ⭐ - 進捗状況（25%完了）
2. `roadmap/poc-to-mvp-roadmap.md` - 全体計画
3. `implementation/mvp-checklist.md` - タスク状況
4. `architecture/mcp-feasibility-analysis.md` - 技術判断の根拠

**現在の状況**:
- 進捗: 48/150時間（25%）
- 完成予定: 2025年12月5日
- 主要リスク: OpenAI統合が未着手

### 意思決定者（起業家）
1. **`implementation/current-progress.md`** ⭐ - 何ができて何ができないか
2. `business/株式会社グラスワークス MUEDプロジェクト 事業計画.md` - ビジネス要件
3. `roadmap/poc-to-mvp-roadmap.md` - 実装計画
4. `architecture/mcp-feasibility-analysis.md` - 技術戦略

**現在の状態**:
- ✅ 基本的な予約システム動作
- ❌ AI機能は未実装（サービスの核心機能）
- ❌ サブスクリプション収益化は未完成

---

## 📊 現在の状況

- **開始日**: 2025年9月27日
- **POC完了**: 2025年9月29日（Day 2）
- **MVP目標日**: 2025年12月5日
- **総工数**: 150時間（43実働日）
- **完了工数**: 48時間相当（25%）
- **残り工数**: 102時間（30日間）
- **1日稼働**: 3.5時間

**進捗状況**: 🟢 順調（POC完了、基盤構築進行中）

---

## ❓ よくある質問

### Q: 今何ができて、何ができない？
**A**: `implementation/current-progress.md` 参照

### Q: どこから読めばいい？
**A**: まず `implementation/current-progress.md`、次に `roadmap/poc-to-mvp-roadmap.md`

### Q: 今日何をすべき？
**A**: `implementation/current-progress.md` の「次のステップ」を確認

### Q: OpenAIをどう実装する？
**A**: `implementation/openai-function-calling-guide.md`

### Q: MCPは使わないの？
**A**: `architecture/mcp-feasibility-analysis.md` 参照（Phase 2以降で検討）

### Q: なぜPrismaじゃなくてDrizzle？
**A**: POC段階でパフォーマンスと型安全性を重視して選択。実装・文書ともにDrizzleに統一済み。

---

## 📝 文書管理

### アーカイブポリシー
- 実装に不要な文書は `_archive/` に移動
- 過去の検討内容や旧バージョンを保管
- 混乱を避けるため、必須文書のみ公開

### 更新ルール
- 実装計画の変更時は即座に文書更新
- バージョン番号を明記
- 変更履歴を記録

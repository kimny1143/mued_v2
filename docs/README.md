# MUED v2 ドキュメント

**最終更新**: 2025-12-09
**ステータス**: Phase 1 実装中 (約75%完了)

---

## クイックリンク

| ドキュメント | 説明 |
|-------------|------|
| [自己レビューレポート](reviews/2025-12-09-self-review-report.md) | 最新の実装状況・品質分析 |
| [CHANGELOG](CHANGELOG.md) | 変更履歴 |
| [システムアーキテクチャ](architecture/SYSTEM_ARCHITECTURE.md) | 技術アーキテクチャ全体像 |
| [CLAUDE.md](../CLAUDE.md) | プロジェクトルート設定 |

---

## プロジェクト状況

### Phase 1 完成度: 約75%

#### 実装済み機能

| 機能 | API | Repository | UI | テスト |
|------|-----|------------|-----|--------|
| メンタースロット CRUD | 完了 | 完了 | 完了 | 未着手 |
| 繰り返しスロット作成 | 完了 | 完了 | 完了 | 未着手 |
| Stripe Webhook (11イベント) | 完了 | - | - | 未着手 |
| メール通知 (Resend) | 完了 | - | - | 未着手 |
| 予約作成 | 完了 | 完了 | 一部 | 未着手 |

#### 進行中

- 予約キャンセル API
- 生徒側キャンセル UI
- スロット編集フォーム
- API ドキュメント作成

#### 計画中

- 決済履歴ページ (`/dashboard/payments`)
- メンタープロフィールページ
- サーバーサイドページネーション
- ユニットテスト・E2E テスト拡充

---

## ドキュメント構成

```
docs/
├── api/                    # API ドキュメント (作成予定)
├── architecture/           # システムアーキテクチャ
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── MUED_ARCHITECTURE_MERMAID_DIAGRAMS.md
│   └── business-logic-specification.md
├── business/               # 事業戦略・企画
│   ├── MUED_Unified_Strategy_2025Q4.md
│   ├── MUEDNOTE_INTEGRATED_SPEC_V2.md
│   └── MUEDnote/          # MUEDnote関連
├── database/               # データベース運用
│   ├── README.md
│   ├── session-interview-schema.md
│   └── session-quickstart.md
├── deployment/             # デプロイメントガイド
│   ├── deployment-checklist.md
│   ├── environment-variables.md
│   └── github-actions-setup.md
├── development/            # 開発ガイド
│   ├── PHASE1_CHECKLIST.md
│   ├── openai-abc-technical-guide.md
│   ├── claude-material-generator-guide.md
│   ├── typescript-strict-rules.md
│   ├── accessibility-prevention-strategy.md
│   ├── rag-service-usage.md
│   └── type-safety-migration-guide.md
├── features/               # 機能ドキュメント
│   ├── i18n-implementation-guide.md
│   ├── plugin-management-guide.md
│   ├── openai-abc-generation-guide.md
│   └── muednote-chat-ui-design.md
├── guides/                 # ハウツーガイド
│   ├── ci-cd-quick-implementation.md
│   └── GIT_WORKTREE_WORKFLOW.md
├── mcp/                    # MCP サーバードキュメント
│   ├── README.md
│   └── mcp-browser-debug.md
├── reviews/                # コードレビュー・レポート
│   ├── 2025-12-09-self-review-report.md
│   └── 2025-12-09-reservation-system-enhancement.md
├── testing/                # テスト戦略
│   ├── README.md
│   ├── TESTING_GUIDE.md
│   └── TEST_STRATEGY.md
├── UXUI/                   # UX/UI デザイン
│   ├── CHAT_UX_PATTERNS.md
│   └── UX_DESIGN_PRINCIPLES.md
├── prompts/                # AI プロンプト
│   ├── chatgpt-music-prompt.md
│   └── claude-desktop-music-prompt.md
├── research/               # 調査・研究
│   ├── README.md
│   └── openai-vs-claude-comparison.md
└── archive/                # 過去のドキュメント
    ├── 2025-historical/
    ├── business-plans/
    ├── phase1.1-deprecated/
    ├── phase1.3-reports/
    └── legacy-assets/
```

---

## 新規開発者向け

### クイックスタート

1. **プロジェクト概要を理解する**
   - [PHILOSOPHY.md](PHILOSOPHY.md) - MUED の思想（Difference / Note / Form）
   - [システムアーキテクチャ](architecture/SYSTEM_ARCHITECTURE.md) - 技術スタック全体像

2. **開発環境をセットアップする**
   ```bash
   npm install
   cp .env.local.example .env.local
   # .env.local を編集
   npm run db:test-connection
   npm run dev
   ```

3. **コーディング規約を確認する**
   - [CLAUDE.md](../CLAUDE.md) - プロジェクト全体のガイドライン
   - [TypeScript Strict Rules](development/typescript-strict-rules.md)

4. **テストを実行する**
   ```bash
   npm run test           # ユニットテスト
   npm run test:e2e       # E2E テスト
   npm run typecheck      # 型チェック
   npm run lint           # Lint
   ```

### 主要技術スタック

| カテゴリ | 技術 |
|---------|------|
| Frontend | Next.js 15.5, React 19, TypeScript, TailwindCSS 4 |
| Backend | Next.js API Routes, Clerk 認証 |
| Database | Neon PostgreSQL, Drizzle ORM |
| Payments | Stripe |
| Email | Resend |
| AI | OpenAI GPT-5 (本番), Claude (開発/MCP) |
| Testing | Vitest (unit), Playwright (E2E) |

---

## 最近の更新

### [2025-12-09] 予約システム拡張

- **Stripe Webhook 処理**: 11イベントタイプ対応、冪等性確保
- **メンタースロット管理 API**: 完全な CRUD 実装
- **メール通知システム**: Resend 統合、テンプレートベース
- **繰り返しスケジュール UI**: SWR ベースの hook、フォームコンポーネント
- **自己レビューレポート**: 品質分析・改善計画

### [2025-10-29] ドキュメント大規模整理

- マスタードキュメント作成: `MUED_Unified_Strategy_2025Q4.md`
- Phase 2 スプリント計画策定
- アーカイブディレクトリ整理
- CHANGELOG.md 導入

### [2025-10-27] 包括的レポート作成

- 実装トラッカー導入
- データベース最適化レポート
- テスト戦略文書化

### [2025-10-19] データベース最適化

- インデックス実装
- パフォーマンス最適化計画

### [2025-10-18] 初回本番デプロイ

- 本番環境検証完了
- MCP テストインフラ構築

---

## 主要ドキュメント

### 設計・アーキテクチャ

| ドキュメント | 説明 |
|-------------|------|
| [PHILOSOPHY.md](PHILOSOPHY.md) | Difference / Note / Form の3本柱思想 |
| [システムアーキテクチャ](architecture/SYSTEM_ARCHITECTURE.md) | 9つの Mermaid 図で技術構成を解説 |
| [ビジネスロジック仕様](architecture/business-logic-specification.md) | ドメインルール詳細 |
| [roadmap.md](roadmap.md) | Phase 0-4 の実装ロードマップ |

### 開発ガイド

| ドキュメント | 説明 |
|-------------|------|
| [Phase 1 チェックリスト](development/PHASE1_CHECKLIST.md) | 現在進行中タスク |
| [OpenAI ABC 技術ガイド](development/openai-abc-technical-guide.md) | ABC 記譜法生成の実装 |
| [Claude Material Generator](development/claude-material-generator-guide.md) | MCP による教材生成 |
| [型安全性移行ガイド](development/type-safety-migration-guide.md) | TypeScript strict 対応 |

### テスト

| ドキュメント | 説明 |
|-------------|------|
| [テストガイド](testing/TESTING_GUIDE.md) | テスト戦略全体像 |
| [テスト戦略](testing/TEST_STRATEGY.md) | ユニット/E2E/統合テスト |
| [テスト README](testing/README.md) | テスト実行方法 |

### デプロイメント

| ドキュメント | 説明 |
|-------------|------|
| [デプロイチェックリスト](deployment/deployment-checklist.md) | 本番リリース前確認事項 |
| [環境変数](deployment/environment-variables.md) | 必須環境変数一覧 |
| [GitHub Actions](deployment/github-actions-setup.md) | CI/CD パイプライン設定 |

---

## 関連リソース

- [PR レビューガイド](PR_REVIEW_GUIDE.md)
- [Git Worktree ワークフロー](guides/GIT_WORKTREE_WORKFLOW.md)
- [MCP サーバー一覧](mcp/README.md)

---

## アーカイブポリシー

- 新バージョンに置き換えられたドキュメントは `archive/` に移動
- 履歴的価値のあるドキュメントは日付プレフィックス付きで保存
- 実装詳細が統合文書に吸収されたものはアーカイブ

---

*このドキュメントは 2025-12-09 に更新されました。*

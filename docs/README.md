# MUED v2 ドキュメント

**最終更新**: 2025-12-09
**ステータス**: Phase 1 実装中 (約25%完了)

---

## これは何か？

MUED は**音楽制作特化プラットフォーム**です。3つの柱で音楽制作者の成長を支援します：

1. **Difference（耳）**: 音の微細な違いを聴き分ける能力
2. **Note（記録）**: 制作・学習のログを資産化 → **MUEDnote**
3. **Form（構造）**: 楽曲構造を理解し制作に活かす能力

現在は2つの主要コンポーネントを並行開発中：

- **MUEDnote**: デスクトップ沈黙コンソール（Tauri製、DAWオーバーレイ）
- **LMS**: Learning Management System（レッスン予約・教材管理・メンター機能）

---

## クイックリンク

| 重要度 | ドキュメント | 説明 |
|--------|-------------|------|
| **必読** | [PHILOSOPHY.md](PHILOSOPHY.md) | Difference/Note/Form の3本柱思想 |
| **必読** | [roadmap.md](roadmap.md) | Phase 0-4 ロードマップ（現実的進捗） |
| **必読** | [MUEDnote v6.1](business/MUEDnote/muednote_master_plan_v6.1.md) | MUEDnote 単一仕様書 |
| 参照 | [自己レビュー](reviews/2025-12-09-self-review-report.md) | 実装状況・品質分析 |
| 参照 | [CHANGELOG](CHANGELOG.md) | 変更履歴 |
| 参照 | [システムアーキテクチャ](architecture/SYSTEM_ARCHITECTURE.md) | 技術アーキテクチャ |

---

## プロジェクト状況

### Phase 1 完成度: 約25%

| サブフェーズ | 状態 | 完成度 |
|-------------|------|--------|
| 1.1 LMS基盤（バックエンド）| 完了 | 100% |
| 1.2 LMS基盤（フロントエンド）| 進行中 | 50% |
| 1.3 MUEDnote デスクトップ | 未着手 | 0% |
| 1.4 AI/HLA 処理 | 未着手 | 0% |

#### 実装済み（Phase 1.1）

- メンタースロット管理 API（CRUD、繰り返しスロット生成）
- 予約システム API（Stripe Webhook 11イベント対応）
- メール通知システム（Resend 統合）
- Repository パターン実装

#### 進行中（Phase 1.2）

- スロット作成/一覧表示 UI ✅
- 予約キャンセル UI
- 決済履歴ページ
- メンタープロフィールページ

#### 未着手（Phase 1.3-1.4）

- MUEDnote Tauri デスクトップアプリ (`apps/muednote-v3/`)
- 沈黙コンソール UI（0.5秒オーバーレイ）
- HLA 処理（意図解析、パターン抽出、資産化）

---

## ドキュメント構成（19ファイル, 4,910行）

```
docs/
├── README.md               # このファイル
├── PHILOSOPHY.md           # ★ 思想（Difference/Note/Form）
├── roadmap.md              # ★ Phase 0-4 ロードマップ
├── CHANGELOG.md            # 変更履歴
├── architecture/
│   └── SYSTEM_ARCHITECTURE.md
├── business/MUEDnote/
│   └── muednote_master_plan_v6.1.md  # ★ MUEDnote 単一仕様書
├── database/               # DB運用
├── deployment/             # 環境変数・GitHub Actions
├── development/            # TypeScript ルール
├── mcp/                    # MCP サーバー
├── reviews/                # 実装レビュー
├── testing/                # テストガイド
└── archive/                # 過去のドキュメント（74%削減分）
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

## 主要ドキュメント（カテゴリ別）

### 設計・思想

| ドキュメント | 説明 |
|-------------|------|
| [PHILOSOPHY.md](PHILOSOPHY.md) | Difference/Note/Form の3本柱思想 |
| [roadmap.md](roadmap.md) | Phase 0-4 の実装ロードマップ |
| [MUEDnote v6.1](business/MUEDnote/muednote_master_plan_v6.1.md) | MUEDnote 単一仕様書（沈黙コンソール）|

### 技術

| ドキュメント | 説明 |
|-------------|------|
| [システムアーキテクチャ](architecture/SYSTEM_ARCHITECTURE.md) | 技術構成を解説 |
| [環境変数](deployment/environment-variables.md) | 必須環境変数一覧 |
| [TypeScript Strict Rules](development/typescript-strict-rules.md) | コーディング規約 |

### テスト・デプロイ

| ドキュメント | 説明 |
|-------------|------|
| [テストガイド](testing/TESTING_GUIDE.md) | テスト戦略全体像 |
| [GitHub Actions](deployment/github-actions-setup.md) | CI/CD 設定 |

---

## アーカイブポリシー

- 新バージョンに置き換えられたドキュメントは `archive/` に移動
- v2.0 Web チャットアプローチは `archive/muednote-alternative-vision/` に保存
- 完了済みタスクは `archive/2025-12-completed/` に保存

---

*最終更新: 2025-12-09*

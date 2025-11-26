# MUEDnote v3 - Desktop Application

**バージョン**: 3.0.0-alpha
**作成日**: 2025-11-26
**ステータス**: 開発中

## 概要

MUEDnoteは音楽学習者と制作者のための「考えを整理してくれるAIチャット」のデスクトップ版です。

## 技術スタック

```yaml
Framework: Tauri v2
Frontend: React 19 + Vite + TypeScript
Backend: Rust
Database: Neon PostgreSQL (SQLx)
Styling: TailwindCSS 4
```

## アーキテクチャ

### Local-First設計

- 認証不要（device_idベース）
- Neon PostgreSQLへ直接接続
- オフライン対応予定

### データモデル

```sql
-- セッション管理
chat_sessions (id, device_id, title, is_active, ...)

-- メッセージ
chat_messages (id, session_id, role, content, created_at)

-- AI設定（将来）
ai_profiles (id, device_id, personality_preset, ...)
ai_memories (id, device_id, memory_type, key, value, ...)
```

## 機能

### 実装済み

- [x] Fragment Console (Cmd+Shift+Space)
- [x] メッセージ保存・表示
- [x] ダッシュボード (Cmd+Shift+D)
- [x] メッセージ削除
- [x] ウィンドウドラッグ
- [x] 動的ウィンドウリサイズ

### 予定

- [ ] AIアシスタント応答
- [ ] タグ・検索機能
- [ ] オフラインモード
- [ ] MUED LMS連携（オプション）

## 開発

```bash
# 開発サーバー起動
npm run tauri:dev

# ビルド
npm run tauri:build
```

## ファイル構成

```
apps/muednote-v3/
├── src/                    # React frontend
│   ├── App.tsx            # メインコンポーネント
│   ├── components/        # UIコンポーネント
│   └── utils/             # Tauri IPC ユーティリティ
├── src-tauri/             # Rust backend
│   ├── src/lib.rs         # コマンド定義
│   └── tauri.conf.json    # Tauri設定
└── .env.local             # 環境変数
```

## 環境変数

```
MUEDNOTE_DATABASE_URL=postgres://...
```

## 関連ドキュメント

- [MUED統合戦略](../../docs/business/MUED_Unified_Strategy_2025Q4.md)
- [データベースマイグレーション](../../db/migrations/0010_muednote_v3_chat_tables.sql)

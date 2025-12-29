# MUEDnote v7 プロジェクト概要

**最終更新**: 2025-12-29
**このドキュメントについて**: プロジェクト再開時の最初の一読用。概要把握が目的。

---

## これは何？

**MUEDnote v7** は、音楽制作者の独り言を自動でテキスト化し、思考ログとして蓄積する iOS アプリ。

- **入力**: 常時音声キャプチャ（オンデバイス whisper.rn）
- **出力**: タイムスタンプ付き思考ログ
- **UX**: セッションタイマー → 自動文字起こし → レビュー → 保存

MUED 理念「出力は AI、判断と欲は人間」に基づき、創作過程の思考を記録する。

---

## 現在のステータス

| 項目 | 状態 |
|------|------|
| **フェーズ** | MVP 実機テスト完了 |
| **次のマイルストーン** | VAD 追加、精度チューニング |
| **ブロッカー** | なし |

### MVP 実装進捗

| 機能 | 状態 | 備考 |
|------|------|------|
| セッションタイマー | ✅ 完了 | HomeScreen, SessionScreen |
| 音声キャプチャ | ✅ 完了 | expo-av, whisper.rn |
| オンデバイス文字起こし | ✅ 完了 | RealtimeTranscriber |
| ローカルキャッシュ | ✅ 完了 | AsyncStorage |
| レビュー画面 | ✅ 完了 | ログ一覧、メモ、保存/破棄 |
| サーバー同期 | ✅ 完了 | Neon DB + Drizzle ORM |
| オンボーディング | ✅ 完了 | 三層構造 |
| **iOS 実機テスト** | ✅ 完了 | 2025-12-22 動作確認済み |

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│  MUEDnote iOS App (React Native + Expo)                 │
│                                                         │
│  ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │ Screens     │    │ Audio Pipeline                  │ │
│  │             │    │                                 │ │
│  │ • Home      │    │  expo-av → whisper.rn           │ │
│  │ • Session   │    │  (RealtimeTranscriber + VAD)    │ │
│  │ • Review    │    │                                 │ │
│  │ • Onboarding│    └────────────────┬────────────────┘ │
│  └──────┬──────┘                     │                  │
│         │                            ▼                  │
│         │         ┌──────────────────────────────────┐  │
│         └────────▶│ Local Storage                    │  │
│                   │ • Zustand (UI state)             │  │
│                   │ • AsyncStorage (sessions/logs)   │  │
│                   └──────────────┬───────────────────┘  │
└──────────────────────────────────┼──────────────────────┘
                                   │ 保存時のみ
                                   ▼
┌──────────────────────────────────────────────────────────┐
│  mued_v2 Backend (Next.js API Routes)                    │
│  POST /api/muednote/sessions/sync                        │
└──────────────────────────────────┬───────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────┐
│  Neon PostgreSQL + Drizzle ORM                           │
│  • muednote_mobile_sessions                              │
│  • muednote_mobile_logs                                  │
└──────────────────────────────────────────────────────────┘
```

---

## 開発を再開するには

### 1. 現状確認

```bash
# 最新コードを取得
git pull origin main

# 依存関係確認
cd apps/muednote-mobile && npm install
```

### 2. 開発サーバー起動

```bash
# Expo 開発サーバー
cd apps/muednote-mobile
npx expo start
```

### 3. 実機テスト（iOS）

```bash
# prebuild が必要な場合
npx expo prebuild --platform ios

# Xcode でビルド
open ios/MuedNotePoc.xcworkspace
# → Xcode で Personal Team 署名 → 実機ビルド
```

### 4. サーバー側確認

```bash
# mued_v2 ルートで
npm run dev

# DB 接続確認
npm run db:test-connection
```

---

## 関連文書

### 仕様 (`specs/`)

| ドキュメント | 用途 |
|-------------|------|
| **[specs/muednote_v7_mvp_spec.md](specs/muednote_v7_mvp_spec.md)** | MVP 詳細仕様（画面設計、API、DB スキーマ） |
| **[specs/muednote_master_plan_v7.md](specs/muednote_master_plan_v7.md)** | v7 統合仕様（コンセプト、全体設計） |
| **[specs/muednote_rest_tracker_spec.md](specs/muednote_rest_tracker_spec.md)** | 休憩トラッカー仕様 |

### DAW連携 (`daw/`)

| ドキュメント | 用途 |
|-------------|------|
| **[daw/muednote-daw-poc-report.md](daw/muednote-daw-poc-report.md)** | OSC版 PoC検証レポート |
| **[daw/muednote-daw-full-scope.md](daw/muednote-daw-full-scope.md)** | フルスコープ・ロードマップ |

### 開発ログ (`mvp/`)

| ドキュメント | 用途 |
|-------------|------|
| **[mvp/](mvp/)** | MVP テスト記録・日次ログ |

### コード

| パス | 内容 |
|------|------|
| `apps/muednote-mobile/` | React Native アプリ本体 |
| `apps/muednote-hub-macos/` | Swift macOS メニューバーアプリ（DAW連携） |
| `app/api/muednote/` | Next.js API エンドポイント |
| `db/schema/muednote-mobile.ts` | Drizzle スキーマ定義 |

---

## ドキュメント履歴

### v7（現行）: モバイルファースト

- **アプローチ**: React Native + Expo + whisper.rn
- **対象**: iOS（Android は Phase 2）
- **状態**: MVP 実装完了

### v6.1（アーカイブ）: デスクトップ版

- **アプローチ**: Tauri + Rust デスクトップアプリ
- **状態**: 開発中断、v7 に移行

アーカイブ済みドキュメント:
- `muednote_master_plan_v6.1.md` - デスクトップ版仕様
- `archive/` - 過去バージョン（v3.x, v5.0 など）

---

*プロジェクト再開時はこのドキュメントを最初に確認してください。*

# MUEDnote Spotlight Input MVP 実装計画書

**作成日**: 2025-12-02
**バージョン**: 1.0
**ステータス**: 承認待ち

---

## 1. エグゼクティブサマリー

### 1.1 目的

MUEDnoteを「起動して使うツール」から「**思考の断片を即座に投入できる常駐型メモシステム**」へ進化させる。

### 1.2 コア機能

- **Cmd+Shift+Space** で呼び出される Spotlight風1行入力バー
- メニューバー常駐（Dockアイコン非表示）
- 入力即送信・即消滅のミニマルUI

### 1.3 実現可能性判定

| 観点 | 評価 | 根拠 |
|------|------|------|
| 技術的実現可能性 | **高** | 既存実装70%、追加2〜3日で常駐化可能 |
| 仕様完成度 | **中** | 一部追記必要（パフォーマンス要件、System Tray詳細） |
| テスト実現性 | **中** | デスクトップE2E自動化に制約あり |

**結論**: MVP実装は**承認推奨**。

---

## 2. 現状分析

### 2.1 既存実装（apps/muednote-v3）

| 機能 | 状態 | 実装箇所 |
|------|------|----------|
| グローバルホットキー (Cmd+Shift+Space) | 実装済み | `src-tauri/src/lib.rs:243` |
| 1行入力バー UI | 実装済み | `src/components/FragmentInput.tsx` |
| Fragment送信処理 | 実装済み | `src-tauri/src/lib.rs:54-136` |
| DB接続（Neon PostgreSQL） | 実装済み | `sqlx` 経由 |
| ウィンドウ表示/非表示切り替え | 実装済み | `toggle_visibility` コマンド |

### 2.2 未実装項目

| 機能 | 状態 | 必要な作業 |
|------|------|-----------|
| System Tray（メニューバー常駐） | 未実装 | `tauri-plugin-tray` 導入 |
| Dockアイコン非表示 | 未実装 | `LSUIElement` 設定 |
| 起動時バックグラウンド化 | 未実装 | `visible: false` 設定 |
| MUED LMS API連携 | 未実装 | HTTP クライアント追加 |
| カーソル位置取得 | 未実装 | Phase 2 で検討 |

### 2.3 技術スタック

```
Runtime:     Tauri 2.9.2 + Rust
Frontend:    React + TypeScript + Vite
Database:    Neon PostgreSQL (sqlx)
Auth:        Clerk（LMS連携時）/ デバイストークン（ローカル）
```

---

## 3. 実装フェーズ

### 概要

```
Phase 1: 常駐化基盤     [1週間]  ← MVP Core
Phase 2: API連携        [1週間]
Phase 3: 品質保証       [1週間]
Phase 4: UX改善         [オプション]
─────────────────────────────────
合計: 3週間（Phase 4除く）
```

---

## 4. Phase 1: 常駐化基盤（MVP Core）

### 4.1 目標

アプリをメニューバー常駐型に変更し、Spotlightライクな呼び出しを実現する。

### 4.2 タスク一覧

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 1.1 | System Tray プラグイン導入 | 0.5日 | 必須 |
| 1.2 | System Tray アイコン作成 | 0.5日 | 必須 |
| 1.3 | System Tray メニュー実装 | 1日 | 必須 |
| 1.4 | Dockアイコン非表示設定 | 0.5日 | 必須 |
| 1.5 | 起動時バックグラウンド化 | 0.5日 | 必須 |
| 1.6 | macOS権限ガイダンスUI | 1日 | 必須 |
| 1.7 | 入力バーUI調整（仕様準拠） | 1日 | 必須 |

### 4.3 技術詳細

#### 4.3.1 System Tray 実装

```toml
# Cargo.toml 追加
tauri-plugin-tray = "2"
```

```rust
// lib.rs - System Tray セットアップ
use tauri_plugin_tray::{TrayIconBuilder, TrayIconEvent};

.plugin(tauri_plugin_tray::init())
.setup(|app| {
    let tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_tray_icon_event(|tray, event| {
            // クリック時の処理
        })
        .build(app)?;
    Ok(())
})
```

#### 4.3.2 System Tray メニュー仕様

```
┌─────────────────────┐
│ MUEDnote            │
├─────────────────────┤
│ 入力バーを開く ⌘⇧Space │
│ ダッシュボード ⌘⇧D   │
├─────────────────────┤
│ 設定...             │
├─────────────────────┤
│ MUEDnoteを終了      │
└─────────────────────┘
```

#### 4.3.3 Dockアイコン非表示

```json
// tauri.conf.json
{
  "app": {
    "windows": [{
      "visible": false,
      "skipTaskbar": true
    }]
  },
  "bundle": {
    "macOS": {
      "minimumSystemVersion": "10.13",
      "exceptionDomain": null,
      "signingIdentity": null,
      "entitlements": null,
      "infoPlist": {
        "LSUIElement": true
      }
    }
  }
}
```

#### 4.3.4 入力バーUI仕様

| 項目 | 値 |
|------|-----|
| 幅 | 400〜480px |
| 高さ | 36px（1行限定） |
| 背景色 | #1F1F1F（85%透過） |
| 角丸 | 8px |
| フォント | システムフォント 14〜15px |
| 表示位置 | 画面中央（MVP） |
| 自動消滅 | 5秒無操作 |
| フェードアウト | 0.1秒以内 |

### 4.4 成果物

- [ ] メニューバーにMUEDnoteアイコン表示
- [ ] Dockにアイコン非表示
- [ ] Cmd+Shift+Space で入力バー呼び出し
- [ ] 入力バーが仕様通りのUIで表示
- [ ] macOS権限リクエストのガイダンス表示

---

## 5. Phase 2: API連携

### 5.1 目標

MUED LMS バックエンドとの連携を確立し、クラウド同期を実現する。

### 5.2 タスク一覧

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 2.1 | HTTP クライアント追加（reqwest） | 0.5日 | 必須 |
| 2.2 | デバイストークン管理実装 | 1日 | 必須 |
| 2.3 | `/api/muednote/fragments` 連携 | 1日 | 必須 |
| 2.4 | オフラインキュー実装 | 1.5日 | 推奨 |
| 2.5 | エラートースト実装 | 0.5日 | 必須 |
| 2.6 | 送信データ形式実装 | 0.5日 | 必須 |

### 5.3 技術詳細

#### 5.3.1 送信データ形式

```json
{
  "text": "<入力文字列>",
  "timestamp": 1733120000,
  "contextHint": {
    "activeApp": "Logic Pro",
    "activeProject": "/Users/.../SongA",
    "cursorInfo": "optional"
  }
}
```

#### 5.3.2 API エンドポイント

```
POST https://mued.jp/api/muednote/fragments
Authorization: Bearer <device_token>
Content-Type: application/json
```

#### 5.3.3 オフラインキュー

```rust
// ローカルSQLiteにキュー保存
struct PendingFragment {
    id: String,
    content: String,
    timestamp: u64,
    retry_count: u32,
    created_at: DateTime<Utc>,
}

// ネットワーク復帰時に自動再送
```

### 5.4 成果物

- [ ] Fragment が LMS API に送信される
- [ ] デバイストークンで認証
- [ ] オフライン時はローカルキューに保存
- [ ] ネットワーク復帰時に自動同期
- [ ] エラー時にトースト表示（5秒、右上）

---

## 6. Phase 3: 品質保証

### 6.1 目標

テスト基盤を構築し、MVP品質を担保する。

### 6.2 タスク一覧

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 3.1 | Vitest 導入・設定 | 0.5日 | 必須 |
| 3.2 | FragmentInput.tsx ユニットテスト | 1日 | 必須 |
| 3.3 | Tauri コマンド モック作成 | 0.5日 | 必須 |
| 3.4 | Rust ユニットテスト追加 | 1日 | 推奨 |
| 3.5 | 手動テストチェックリスト作成 | 0.5日 | 必須 |
| 3.6 | パフォーマンス検証（0.5秒の壁） | 1日 | 必須 |
| 3.7 | アクセシビリティ権限テスト | 0.5日 | 必須 |

### 6.3 テスト戦略

#### 6.3.1 自動テスト

| テスト種別 | ツール | カバレッジ目標 |
|-----------|--------|---------------|
| フロントエンド Unit | Vitest + @tauri-apps/api/mocks | 90% |
| バックエンド Unit | cargo test | 70% |
| 統合テスト | Vitest + Testcontainers | 主要パス |

#### 6.3.2 手動テストチェックリスト

**ホットキー機能**
- [ ] Cmd+Shift+Space で入力バー表示
- [ ] Logic Pro 使用中に呼び出し可能
- [ ] Safari 使用中に呼び出し可能
- [ ] 複数回連続呼び出しで正常動作

**入力バーUI**
- [ ] 画面中央に表示
- [ ] サイズが仕様通り（400〜480px × 36px）
- [ ] 5秒無操作でフェードアウト
- [ ] フェードアウトが0.1秒以内

**API通信**
- [ ] Enter で送信成功
- [ ] Escape でキャンセル
- [ ] オフライン時にローカル保存
- [ ] ネットワーク復帰で自動同期

**常駐動作**
- [ ] メニューバーにアイコン表示
- [ ] Dockにアイコン非表示
- [ ] アイドル時 CPU < 1%
- [ ] アイドル時メモリ < 50MB

### 6.4 パフォーマンス要件

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| ホットキー → 入力バー表示 | < 100ms | タイムスタンプ計測 |
| Enter → API送信完了 | < 500ms | 「0.5秒の壁」 |
| フェードアウト | < 100ms | アニメーション設定 |
| アイドル時 CPU | < 1% | Activity Monitor |
| アイドル時メモリ | < 50MB | Activity Monitor |

### 6.5 成果物

- [ ] Vitest テストスイート
- [ ] 手動テストチェックリスト（Markdown）
- [ ] パフォーマンス計測レポート
- [ ] テストカバレッジレポート

---

## 7. Phase 4: UX改善（オプション）

### 7.1 目標

MVP後のUX向上施策。優先度に応じて実装。

### 7.2 タスク一覧

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 4.1 | カーソル位置追従 | 2日 | 中 |
| 4.2 | contextHint 自動検出 | 2日 | 中 |
| 4.3 | ログイン時自動起動 | 0.5日 | 高 |
| 4.4 | AI整形プレビュー | 3日 | 低 |
| 4.5 | 履歴表示機能 | 2日 | 中 |

### 7.3 カーソル位置追従の注意点

- Tauri 2.0.0-beta.17 以降で `cursor_position` 利用可能
- マルチモニター環境で不安定な報告あり
- フォールバック（画面中央）を必ず実装

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| macOSアクセシビリティ権限の拒否 | 高 | 中 | 初回起動時のガイダンスUI、権限なしでも基本動作 |
| カーソル位置取得の不安定性 | 中 | 高 | Phase 4 に延期、画面中央固定で代替 |
| オフライン時のデータロス | 高 | 低 | ローカルSQLiteキュー実装 |
| デスクトップE2Eテスト不可 | 中 | 確定 | 手動テストチェックリストで代替 |
| Tauri プラグイン互換性 | 中 | 低 | 安定版のみ使用、beta避ける |

---

## 9. スケジュール

```
Week 1 (Phase 1)
├── Day 1-2: System Tray 実装
├── Day 3: Dock非表示 + バックグラウンド化
├── Day 4: 権限ガイダンスUI
└── Day 5: 入力バーUI調整

Week 2 (Phase 2)
├── Day 1: HTTP クライアント + デバイストークン
├── Day 2-3: API連携実装
├── Day 4: オフラインキュー
└── Day 5: エラーハンドリング + トースト

Week 3 (Phase 3)
├── Day 1-2: Vitest導入 + ユニットテスト
├── Day 3: Rustテスト + 統合テスト
├── Day 4: パフォーマンス検証
└── Day 5: 手動テスト + ドキュメント整備
```

---

## 10. 成果物一覧

### 10.1 コード成果物

| 成果物 | パス |
|--------|------|
| System Tray 実装 | `apps/muednote-v3/src-tauri/src/tray.rs` |
| API クライアント | `apps/muednote-v3/src-tauri/src/api.rs` |
| オフラインキュー | `apps/muednote-v3/src-tauri/src/queue.rs` |
| フロントエンドテスト | `apps/muednote-v3/src/__tests__/` |
| Rustテスト | `apps/muednote-v3/src-tauri/src/tests/` |

### 10.2 ドキュメント成果物

| 成果物 | パス |
|--------|------|
| 本計画書 | `docs/business/MUEDnote/muednote_spotlight_mvp_implementation_plan.md` |
| 検証レポート | `docs/business/MUEDnote/muednote_spotlight_mvp_verification_report.md` |
| テスト戦略 | `docs/testing/muednote-spotlight-test-strategy.md` |
| 手動テストチェックリスト | `docs/testing/muednote-manual-test-checklist.md`（作成予定） |

---

## 11. 承認

| 役割 | 名前 | 日付 | 署名 |
|------|------|------|------|
| プロダクトオーナー | | | |
| テックリード | | | |
| QA | | | |

---

## 付録

### A. 関連ドキュメント

- [元仕様書] `docs/business/MUEDnote/muednote_spotlight_mvp_spec_v1.0.md`
- [アーキテクト検証] `docs/architecture/muednote-spotlight-mvp-feasibility-report.md`
- [テスト戦略詳細] `docs/testing/muednote-spotlight-test-strategy.md`

### B. 仕様書への追記推奨事項

元仕様書に以下の追記を推奨：

1. **パフォーマンス要件セクション追加**
   - 「0.5秒の壁」の明記
   - 各操作のレイテンシ目標

2. **System Tray メニュー仕様**
   - メニュー項目の定義
   - ショートカットキー表示

3. **認証方式の詳細**
   - デバイストークン vs Clerk認証
   - トークン更新フロー

4. **DAWフォーカス復帰仕様**
   - 入力完了後のフォーカス戻し動作

5. **UI消滅速度の統一**
   - 0.1秒以内に統一（現状0.15〜0.25秒と記載）

### C. ファイル命名変更 **完了**

```
旧: [GPT5]muednote_additional_plan_v_6_1.md
新: muednote_spotlight_mvp_spec_v1.0.md
```

ステータス: 2025-12-02 にリネーム完了。歴史的文書は `archive/` ディレクトリに移動済み。

---

*本計画書は検証レポートに基づき作成。実装開始前に承認を取得すること。*

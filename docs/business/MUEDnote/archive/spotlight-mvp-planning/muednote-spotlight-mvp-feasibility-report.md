# アーキテクト検証レポート: MUEDnote Spotlight Input MVP

**作成日**: 2025-12-02
**バージョン**: 1.0
**ステータス**: 実装可能（条件付き）

---

## 1. 現在の構成サマリー

### 1.1 プロジェクト構成

MUEDnote v3は既にTauri 2.xベースのデスクトップアプリとして実装されています。

```
apps/muednote-v3/
├── src/                    # Reactフロントエンド
│   ├── App.tsx             # メインアプリケーション
│   ├── components/
│   │   └── FragmentInput.tsx  # 入力バーコンポーネント（既存）
│   └── utils/
│       └── tauri.ts        # Tauri APIラッパー
├── src-tauri/              # Rustバックエンド
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs         # エントリーポイント
│   │   └── lib.rs          # コア機能
│   └── tauri.conf.json     # Tauri設定
└── package.json
```

### 1.2 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Tauri | 2.9.2 |
| フロントエンド | React + TypeScript | 18.3.1 |
| ビルドツール | Vite | 5.3.4 |
| アニメーション | framer-motion | 12.x |
| バックエンド | Rust + sqlx | - |
| データベース | PostgreSQL (Neon) | - |

### 1.3 既に実装済みの機能

現在のmuednote-v3には、MVPで必要な多くの機能が**既に実装済み**です：

| 機能 | 状態 | 実装ファイル |
|------|------|-------------|
| グローバルホットキー (Cmd+Shift+Space) | **実装済み** | `lib.rs:243` |
| 1行入力バー | **実装済み** | `FragmentInput.tsx` |
| Fragment送信処理 | **実装済み** | `lib.rs:54-136` |
| ウィンドウサイズ変更 | **実装済み** | `App.tsx:26-34` |
| ESCキーで閉じる | **実装済み** | `FragmentInput.tsx:78-86` |
| DB接続（Neon PostgreSQL） | **実装済み** | `lib.rs:206-233` |

**重要な発見**: MVP仕様の約70%は既存実装でカバー可能です。

---

## 2. 技術的実現可能性

### 2.1 グローバルホットキー

**判定: 実装済み・完全対応**

現在の実装（`lib.rs:240-259`）：

```rust
// グローバルホットキーを登録 (Cmd+Shift+Space)
app.handle().global_shortcut().on_shortcut(
    "CmdOrCtrl+Shift+Space",
    move |_app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            if let Err(e) = app_handle.emit("toggle-console", ()) {
                eprintln!("Failed to emit toggle-console event: {}", e);
            }
        }
    }
)?;
```

使用プラグイン：
- `tauri-plugin-global-shortcut = "2.2.0"` （Cargo.tomlで確認）

**技術的評価**:
- Tauri 2.xの`global-shortcut`プラグインは安定
- macOSのアクセシビリティ権限が必要（後述）
- バックグラウンド動作時も捕捉可能

### 2.2 カーソル位置取得

**判定: 実装可能（追加実装必要）**

Tauri 2.0.0-beta.17以降で`cursor_position`メソッドが追加されています。

**実装アプローチ**:

```rust
// Rust側 - カーソル位置を取得
#[tauri::command]
async fn get_cursor_position(app_handle: AppHandle) -> Result<(f64, f64), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let position = window.cursor_position()
            .map_err(|e| e.to_string())?;
        Ok((position.x, position.y))
    } else {
        Err("Window not found".to_string())
    }
}
```

**代替手段**（より信頼性が高い）:
- `mouse_position` Rustクレート
- `enigo` Rustクレート

**懸念事項**:
- マルチモニター環境での座標計算に注意が必要
- macOSでの垂直配置モニターで不具合報告あり

**MVP推奨**: カーソル付近表示ではなく、**画面中央固定**を初期実装とする。これは既存実装で対応済み。

### 2.3 メニューバー常駐（System Tray）

**判定: 追加実装必要・実装可能**

Tauri 2.0では`tray-icon`機能フラグを使用します。

**必要な変更**:

1. `tauri.conf.json`への設定追加：
```json
{
  "app": {
    "withGlobalTauri": true,
    "trayIcon": {
      "iconPath": "icons/tray-icon.png",
      "iconAsTemplate": true
    }
  }
}
```

2. Rust側の実装：
```rust
use tauri::tray::{TrayIconBuilder, MenuBuilder, MenuItemBuilder};

// setup内でトレイアイコンを初期化
TrayIconBuilder::new()
    .icon(app.default_window_icon().unwrap().clone())
    .menu(&menu)
    .on_menu_event(|app, event| {
        // メニューイベント処理
    })
    .build(app)?;
```

3. Dockアイコン非表示（macOS専用）：
```rust
#[cfg(target_os = "macos")]
app.set_activation_policy(tauri::ActivationPolicy::Accessory);
```

**参考リソース**:
- [Tauri 2.0 System Tray公式ドキュメント](https://v2.tauri.app/learn/system-tray/)
- [macOS Menubar App Example](https://github.com/ahkohd/tauri-macos-menubar-app-example)

### 2.4 軽量性

**判定: 条件付きで達成可能**

**現在のリソース消費要因**:

| 要素 | 影響度 | 備考 |
|------|-------|------|
| Rustバイナリ | 低 | 約20-30MB（最適化後） |
| WebView | 中 | macOSはWKWebViewを使用 |
| DB接続プール | 中 | 現在5コネクション |
| React + framer-motion | 低 | 必要時のみレンダリング |

**軽量化推奨事項**:

1. **DB接続の遅延初期化**
   - 現在: 起動時に即座に接続
   - 改善: 初回入力時に接続

2. **WebViewのサスペンド**
   - 非表示時にWebViewを一時停止

3. **バイナリサイズ最適化**
   ```toml
   [profile.release]
   lto = true
   strip = true
   codegen-units = 1
   ```

**メモリ使用量目標**: 50-80MB（アイドル時）

---

## 3. 既存システムとの統合

### 3.1 バックエンドAPI設計

現在、MUEDnoteには**2つの独立したデータパス**が存在します：

**パスA: Tauri直接DB接続（現在の実装）**
```
MUEDnote Tauri App
    ↓ sqlx (Rust)
Neon PostgreSQL (chat_messages, chat_sessions)
```

**パスB: MUED LMS v2 API経由**
```
MUEDnote Tauri App
    ↓ HTTP POST
MUED LMS v2 (Next.js API Routes)
    ↓ Drizzle ORM
Neon PostgreSQL (muednote_v3.fragments)
```

**MVP推奨アーキテクチャ**:

```
┌────────────────────────────────────────┐
│         MUEDnote Tauri App             │
│  ┌──────────────────────────────────┐  │
│  │   FragmentInput Component        │  │
│  │   (React + framer-motion)        │  │
│  └──────────────────────────────────┘  │
│              ↓ Tauri IPC               │
│  ┌──────────────────────────────────┐  │
│  │   Rust Backend                   │  │
│  │   - Global Shortcut Handler      │  │
│  │   - Fragment Processor           │  │
│  └──────────────────────────────────┘  │
└───────────────┬────────────────────────┘
                ↓ HTTP POST (with device token)
┌───────────────────────────────────────────────┐
│           MUED LMS v2 (Next.js)               │
│  ┌─────────────────────────────────────────┐  │
│  │  POST /api/muednote/fragments           │  │
│  │  - Device token validation              │  │
│  │  - User ID resolution                   │  │
│  │  - Fragment storage                     │  │
│  └─────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────┘
                ↓
┌───────────────────────────────────────────────┐
│  Neon PostgreSQL                              │
│  - muednote_v3.fragments                      │
│  - muednote_v3.projects                       │
│  - muednote_v3.tags                           │
└───────────────────────────────────────────────┘
```

**既存API活用**:

`/api/muednote/fragments`（POST）が既に存在：

```typescript
// 既存API仕様
POST /api/muednote/fragments
{
  "content": "string (1-10000文字)",
  "projectId": "uuid (optional)",
  "importance": "low|medium|high|critical"
}

// 認証: Bearer token or Clerk session
Authorization: Bearer ${DEV_AUTH_TOKEN}
```

### 3.2 認証・セッション管理

**現在の認証フロー**（`/api/muednote/fragments/route.ts`）:

1. Clerk認証（Webアプリ用）
2. 開発トークン認証（`DEV_AUTH_TOKEN`環境変数）

**MVP向け認証設計**:

```
┌─────────────────────────────────────────────────┐
│  認証フロー                                      │
├─────────────────────────────────────────────────┤
│  1. 初回起動時                                   │
│     └─ デバイス登録（ブラウザでOAuth認証）       │
│     └─ デバイストークン発行・ローカル保存        │
│                                                  │
│  2. 以降のAPI呼び出し                            │
│     └─ Authorization: Bearer {device_token}      │
│     └─ サーバー側でuser_idに変換                 │
└─────────────────────────────────────────────────┘
```

**実装推奨**:

```rust
// Rust側 - デバイストークン管理
use keyring::Entry;

fn get_device_token() -> Result<String, String> {
    let entry = Entry::new("muednote", "device_token")?;
    entry.get_password().map_err(|e| e.to_string())
}

fn save_device_token(token: &str) -> Result<(), String> {
    let entry = Entry::new("muednote", "device_token")?;
    entry.set_password(token).map_err(|e| e.to_string())
}
```

---

## 4. リスクと課題

### 4.1 技術的リスク

| リスク | 発生確率 | 影響度 | 軽減策 |
|--------|---------|--------|--------|
| カーソル位置取得の不安定性 | 中 | 低 | MVP時は画面中央固定で回避 |
| マルチモニター対応 | 中 | 中 | 単一モニター前提で開始 |
| WebView起動遅延 | 低 | 中 | プリロード + キャッシュ |
| DB接続タイムアウト | 低 | 高 | 接続プール + リトライ |
| Tauri 2.x breaking changes | 低 | 高 | バージョン固定 |

### 4.2 macOS権限関連

| 権限 | 必要性 | 取得方法 | ユーザー体験への影響 |
|------|--------|----------|---------------------|
| アクセシビリティ | 必須 | システム環境設定 > セキュリティ | 初回のみダイアログ表示 |
| ネットワーク | 自動 | App Sandbox設定 | 影響なし |
| キーチェーンアクセス | 推奨 | 初回トークン保存時 | 初回のみダイアログ表示 |

**アクセシビリティ権限のUX考慮事項**:

```
初回起動時のフロー:
1. アプリ起動
2. アクセシビリティ権限要求ダイアログ
3. 「システム環境設定を開く」ボタン
4. ユーザーが手動で許可
5. アプリ再起動（必要な場合）
```

**実装**: 権限チェック + ガイダンス表示

```rust
// macOS権限チェック（例）
#[cfg(target_os = "macos")]
fn check_accessibility_permission() -> bool {
    use accessibility_sys::AXIsProcessTrusted;
    unsafe { AXIsProcessTrusted() }
}
```

---

## 5. 推奨アーキテクチャ

### 5.1 実装アプローチ

**アプローチ: 既存実装の段階的拡張**

現在のmuednote-v3をベースに、以下の変更を加える：

```
変更範囲:
├── src-tauri/
│   ├── Cargo.toml        # 依存関係追加（keyring, reqwest）
│   ├── src/lib.rs        # API呼び出し追加
│   └── tauri.conf.json   # System Tray設定追加
├── src/
│   ├── components/
│   │   └── FragmentInput.tsx  # 軽微な調整のみ
│   └── App.tsx           # 状態管理調整
└── 新規追加
    └── src-tauri/src/api.rs  # LMS API連携モジュール
```

### 5.2 フェーズ分け提案

#### Phase 1: MVP Core（1週間）

**目標**: 基本的なSpotlight Input動作

| タスク | 工数 | 優先度 |
|--------|------|--------|
| System Tray実装 | 2日 | 高 |
| Dockアイコン非表示 | 0.5日 | 高 |
| LMS API連携（/api/muednote/fragments） | 2日 | 高 |
| デバイストークン管理 | 1日 | 高 |
| 権限チェック + ガイダンスUI | 0.5日 | 中 |

**Phase 1完了時の状態**:
- Cmd+Shift+Spaceで入力バー表示
- 入力 → Enter → MUED LMS APIへPOST
- メニューバー常駐
- Dockに表示されない

#### Phase 2: UX改善（1週間）

| タスク | 工数 | 優先度 |
|--------|------|--------|
| カーソル位置近くにウィンドウ表示 | 2日 | 中 |
| 入力履歴表示 | 1日 | 中 |
| オフライン対応（ローカルキュー） | 2日 | 中 |
| メモリ最適化 | 1日 | 低 |

#### Phase 3: 高度な機能（オプション）

| タスク | 工数 | 優先度 |
|--------|------|--------|
| contextHint自動検出 | 3日 | 低 |
| AI整形プレビュー | 2日 | 低 |
| プロジェクト選択UI | 2日 | 低 |

---

## 6. 結論

### 6.1 実装可否の判定

**判定: 実装可能**

### 6.2 理由

1. **既存実装の活用**
   - グローバルホットキー：実装済み
   - 入力バーUI：実装済み
   - Fragment処理：実装済み

2. **技術的障壁の低さ**
   - Tauri 2.xはSystem Tray/グローバルショートカットを標準サポート
   - 必要なRustクレートは安定版が存在

3. **既存API連携の容易さ**
   - `/api/muednote/fragments`が既に存在
   - 認証メカニズム（DEV_AUTH_TOKEN）が利用可能

### 6.3 推奨事項

1. **MVP優先実装項目**
   - System Tray化
   - LMS API連携
   - Dockアイコン非表示

2. **後回しにすべき項目**
   - カーソル位置取得（画面中央で代替）
   - contextHint自動検出
   - AI整形プレビュー

3. **リスク軽減策**
   - macOS権限のUXガイダンスを初期段階で実装
   - オフライン時のローカルキュー実装を検討

### 6.4 次のアクション

1. `tauri.conf.json`へのSystem Tray設定追加
2. Rust側のLMS API呼び出しモジュール実装
3. デバイストークン管理の実装
4. 初回権限設定のユーザーガイド作成

---

## 参考リソース

- [Tauri 2.0 System Tray公式ドキュメント](https://v2.tauri.app/learn/system-tray/)
- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/)
- [macOS Menubar App Example (GitHub)](https://github.com/ahkohd/tauri-macos-menubar-app-example)
- [Tauri cursor_position API](https://github.com/tauri-apps/tauri/issues/9250)
- [mouse_position crate](https://crates.io/crates/mouse_position)

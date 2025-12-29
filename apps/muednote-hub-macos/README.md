# MUEDnote Hub for macOS

AbletonOSC からのパラメータ変更をキャプチャし、MUED サーバーに送信する macOS メニューバーアプリ。

## 機能

- **メニューバー常駐**: システムメニューバーに常駐し、接続状態をアイコンで表示
- **OSC受信**: AbletonOSC (UDP 11001) からのパラメータ変更を受信
- **デバウンス処理**: 500ms のデバウンスで効率的にログを集約
- **API送信**: MUED サーバーに DAW ログを送信
- **認証**: Clerk OAuth または API キー認証に対応

## 必要条件

- macOS 14.0 (Sonoma) 以降
- Xcode 15.0 以降
- Ableton Live + AbletonOSC

## セットアップ

### 1. AbletonOSC のインストール

1. [AbletonOSC](https://github.com/ideoforms/AbletonOSC) をダウンロード
2. `AbletonOSC` フォルダを MIDI Remote Scripts にコピー:
   ```
   ~/Music/Ableton/User Library/Remote Scripts/AbletonOSC
   ```
3. Ableton Live を再起動
4. Preferences > Link, Tempo & MIDI > Control Surface で "AbletonOSC" を選択

### 2. ビルド & 実行

```bash
cd apps/muednote-hub-macos
swift build
swift run
```

または Xcode で開く:
```bash
open apps/muednote-hub-macos/Package.swift
```

## アーキテクチャ

```
Sources/MUEDnoteHub/
├── MUEDnoteHubApp.swift      # @main エントリポイント + AppState
├── Models/
│   └── DAWLog.swift          # DAW ログデータモデル
├── Services/
│   ├── OSCReceiverService.swift  # OSC 受信 + デバウンス
│   └── APIClient.swift           # HTTP API クライアント
└── Views/
    ├── MenuBarView.swift     # メニューバーポップオーバー
    └── SettingsView.swift    # 設定画面
```

## 依存関係

- [OSCKit](https://github.com/orchetect/OSCKit) - OSC プロトコル実装
- [KeychainAccess](https://github.com/kishikawakatsumi/KeychainAccess) - 認証トークンの安全な保存

## 設定

### 環境変数

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `MUED_API_URL` | `http://localhost:3000` | MUED サーバー URL |

### OSC ポート

| ポート | 用途 |
|--------|------|
| 11000 | Ableton 受信 (送信先) |
| 11001 | Ableton 送信 (受信元) |

## Phase 2 TODO

- [ ] Clerk OAuth フロー実装
- [ ] カスタム URL スキーム (`muednote://`) 登録
- [ ] ログイン起動 (Login Items) 対応
- [ ] macOS 通知対応
- [ ] DMG パッケージング

## 関連

- [muednote-mobile](../muednote-mobile) - iOS アプリ (Expo/React Native)
- [scripts/daw-hub](../../scripts/daw-hub) - Node.js CLI 版（開発用）
- [AbletonOSC](https://github.com/ideoforms/AbletonOSC) - Ableton Live OSC 連携

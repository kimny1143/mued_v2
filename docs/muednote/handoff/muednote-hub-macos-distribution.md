# MUEDnote Hub macOS - 配布状況・LP/ダッシュボード更新用

**最終更新**: 2026-01-29
**ステータス**: 配布準備完了

---

## 現状サマリ

| 項目 | 状態 | 値 |
|------|------|-----|
| バージョン | ✅ | 1.0.0 |
| コード署名 | ✅ 完了 | Developer ID Application: glasswerks inc. |
| Apple 公証 | ✅ 完了 | Notarized Developer ID |
| Staple | ✅ 完了 | チケット埋め込み済み |
| 配布準備 | ✅ 完了 | `dist/MUEDnoteHub.app`, `dist/MUEDnoteHub.zip` |

---

## 配布ファイル

### ファイル一覧

| ファイル | パス | サイズ | 用途 |
|----------|------|--------|------|
| アプリ本体 | `apps/muednote-hub-macos/dist/MUEDnoteHub.app` | - | 直接配布可 |
| ZIP | `apps/muednote-hub-macos/dist/MUEDnoteHub.zip` | 637KB | ダウンロード配布用 |

### ダウンロードリンク

```
https://mued.jp/downloads/MUEDnoteHub.zip
```

**配置場所**: `mued_v2/public/downloads/MUEDnoteHub.zip`

Vercel デプロイで自動的に配信される。

---

## アプリ情報（LP/ダッシュボード表示用）

### 基本情報

| 項目 | 値 |
|------|-----|
| アプリ名 | MUEDnote Hub |
| バンドルID | `com.mued.muednote-hub` |
| バージョン | 1.0.0 |
| プラットフォーム | macOS |
| 最小OS | macOS 14.0 (Sonoma) 以降 |
| アーキテクチャ | Apple Silicon (arm64) |
| アプリ種別 | メニューバー常駐アプリ |

### 機能一覧

| 機能 | 説明 |
|------|------|
| DAWパラメータ記録 | Ableton Live のパラメータ変更を自動記録 |
| クラウド同期 | MUEDnote サーバーにリアルタイム送信 |
| メニューバー常駐 | システムに常駐し、接続状態をアイコンで表示 |
| ログイン時起動 | macOS 起動時に自動起動（設定可） |
| Clerk認証 | MUEDnote アカウントでログイン |

### 対応DAW

| ツール | 対応状況 | 備考 |
|--------|----------|------|
| Ableton Live | ✅ 対応 | AbletonOSC 経由 |
| Logic Pro | 🔜 予定 | 将来対応予定 |
| Pro Tools | 🔜 予定 | 将来対応予定 |

### 必要な追加ツール

| ツール | 必須/任意 | 説明 |
|--------|----------|------|
| AbletonOSC | 必須 (Ableton使用時) | Ableton ↔ Hub 間の通信ブリッジ |

---

## ユーザー向けセットアップ手順

### インストール

1. `MUEDnoteHub.zip` をダウンロード
2. ZIPを展開
3. `MUEDnoteHub.app` を `/Applications` にドラッグ
4. 初回起動時に「開発元を検証」ダイアログ → **開く** をクリック

### AbletonOSC セットアップ（Ableton Live ユーザー）

1. [AbletonOSC](https://github.com/ideoforms/AbletonOSC) をダウンロード
2. `AbletonOSC` フォルダを以下にコピー:
   ```
   ~/Music/Ableton/User Library/Remote Scripts/AbletonOSC
   ```
3. Ableton Live を再起動
4. **Preferences** > **Link, Tempo & MIDI** > **Control Surface** で `AbletonOSC` を選択

### 初回起動

1. MUEDnote Hub を起動（メニューバーにアイコン表示）
2. メニューバーアイコンをクリック → **Login** をクリック
3. ブラウザで MUEDnote アカウントにログイン
4. 認証完了後、自動的にアプリに戻る

---

## 技術詳細

### ネットワーク

| 項目 | 値 |
|------|-----|
| OSC 受信ポート | UDP 11001 |
| OSC 送信ポート | UDP 11000 |
| API エンドポイント | `https://mued.jp/api/muednote/daw-log` |

### 認証

| 項目 | 値 |
|------|-----|
| 認証方式 | Clerk OAuth |
| コールバック URL スキーム | `muednote://` |
| トークン保存 | macOS Keychain |

### Entitlements（権限）

| 権限 | 用途 |
|------|------|
| `com.apple.security.network.client` | API通信、OSC送信 |
| `com.apple.security.network.server` | OSC受信 (UDP 11001) |

---

## LP/ダッシュボード実装メモ

### ダウンロードボタン

```jsx
// 例: ダッシュボードのダウンロードセクション
<DownloadButton
  platform="macos"
  version="1.0.0"
  downloadUrl="https://mued.jp/downloads/MUEDnoteHub.zip"
  requirements="macOS 14.0 (Sonoma) 以降"
/>
```

### 表示テキスト例

**日本語**:
> MUEDnote Hub をダウンロードして、Ableton Live での制作を自動記録しましょう。

**英語**:
> Download MUEDnote Hub to automatically log your production sessions in Ableton Live.

### システム要件表示

```
macOS 14.0 (Sonoma) 以降
Apple Silicon (M1/M2/M3)
Ableton Live + AbletonOSC（推奨）
```

---

## 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [README.md](../../../apps/muednote-hub-macos/README.md) | 開発者向けセットアップ |
| [muednote-hub-macos-notarization-20260121.md](./muednote-hub-macos-notarization-20260121.md) | 公証作業ログ（履歴） |

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-01-29 | Staple 完了、配布準備完了 |
| 2026-01-21 | 公証完了（Apple サーバー障害後に解消） |
| 2026-01-21 | 署名完了、公証提出 |

# MUEDnote PoC

Whisper音声認識のiOS実機検証用アプリ

## 検証項目

- [ ] whisper-small の日本語認識精度（80%以上目標）
- [ ] リアルタイム性（発話から2秒以内）
- [ ] バッテリー消費（10分で5%以下）
- [ ] バックグラウンド動作

## セットアップ

### 1. 依存関係インストール

```bash
cd apps/muednote-poc
npm install
```

### 2. iOS用にprebuild

whisper.rnはネイティブモジュールを使用するため、Expo Goでは動作しません。
実機テストにはprebuildが必要です。

```bash
# iOS用にネイティブプロジェクト生成
npx expo prebuild --platform ios

# Xcodeでビルド
cd ios
pod install
open MUEDnotePoC.xcworkspace
```

### 3. Whisperモデルの準備

whisper-smallモデル（約244MB）をダウンロードしてプロジェクトに追加：

```bash
# モデルダウンロード（huggingface）
curl -L -o assets/ggml-small.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
```

または、アプリ初回起動時にダウンロードする実装も可能。

### 4. 実機ビルド

1. Xcodeで `MUEDnotePoC.xcworkspace` を開く
2. Signing & Capabilities でチームを設定
3. 実機を接続してビルド

## 開発モード（Expo Go）

録音機能のみテストする場合は、Whisperなしでも動作確認可能：

```bash
npx expo start
```

→ Expo Goアプリでスキャン（録音のみ動作、文字起こしは無効）

## ファイル構成

```
muednote-poc/
├── App.tsx          # メインアプリ
├── app.json         # Expo設定
├── assets/
│   └── ggml-small.bin  # Whisperモデル（要ダウンロード）
└── ios/             # prebuild後に生成
```

## 計測項目

アプリ内で以下を表示：

- **平均遅延**: 録音停止から認識完了までの時間
- **処理数**: 文字起こし完了回数
- **Status**: 初期化状態

## トラブルシューティング

### "マイクの許可が必要です"
設定 → MUEDnote PoC → マイクを許可

### Whisperモデルが読み込めない
- モデルファイルが正しい場所にあるか確認
- ファイルサイズが244MB程度あるか確認

### prebuildでエラー
```bash
# キャッシュクリア
npx expo prebuild --clean --platform ios
```

## 次のステップ

PoC成功後：
1. RealtimeTranscriberによるストリーミング処理
2. VAD（音声区間検出）の導入
3. MVP機能の実装（タイマー、保存など）

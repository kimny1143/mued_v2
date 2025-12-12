# MUEDnote PoC 検証ログ

このドキュメントは MUEDnote v7 MVP の技術検証（PoC）の記録です。

---

## 2025-12-12 セッション1: Expo Go 録音テスト

### 目的
- expo-av による録音機能の動作確認
- whisper.rn 導入前の基盤テスト

### 環境
- macOS (Apple Silicon)
- Expo SDK 54.0.28
- React Native 0.81.5
- whisper.rn 0.5.4（インストール済み、未使用）
- テスト端末: iPhone + Expo Go

### 発生した問題と解決

#### 1. whisper.rn ネイティブモジュールエラー
- **現象**: `require('whisper.rn')` 実行時に Expo Go がクラッシュ
- **エラー**: `Your JavaScript code tried to access a native module that doesn't exist`
- **原因**: whisper.rn はネイティブモジュールを使用するため、Expo Go では動作しない
- **解決**:
  - `metro.config.js` を作成し、whisper.rn を空モジュールに置換
  - App.tsx から require 呼び出しを削除

```javascript
// metro.config.js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'whisper.rn') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

#### 2. assets/images ディレクトリ不在エラー
- **現象**: `ENOENT: no such file or directory, scandir 'assets/images'`
- **解決**: `mkdir -p assets/images` でディレクトリ作成

#### 3. SafeAreaView 非推奨警告
- **現象**: `SafeAreaView has been deprecated and will be removed`
- **解決**: `react-native` から `react-native-safe-area-context` に移行

#### 4. React key 重複エラー
- **現象**: `Encountered two children with the same key`
- **原因**: `Date.now()` が同じミリ秒で複数回呼ばれ、同一IDが生成された
- **解決**: ID生成を `${Date.now()}-${prev.length}` に変更

#### 5. expo-file-system getInfoAsync 非推奨
- **現象**: `Method getInfoAsync is deprecated`
- **解決**: 新しい `FileSystem.File` API に移行（フォールバック付き）

### 結果
| 項目 | 結果 |
|------|------|
| アプリ起動 | OK |
| マイク許可ダイアログ | OK |
| 録音開始/停止 | OK |
| WAVファイル生成 | OK |
| ファイルサイズ取得 | 要確認（API移行後） |
| Whisper文字起こし | 未検証（prebuild後） |

### 次のステップ
1. ~~録音テストの最終確認（ログ出力確認）~~ ✅
2. ~~`npx expo prebuild --platform ios` で実機ビルド準備~~ ✅
3. ~~Whisper モデル（ggml-small.bin）のダウンロード~~ ✅
4. ~~実機での文字起こしテスト~~ ✅

---

## 2025-12-12 セッション2: 実機 Whisper 文字起こしテスト

### 目的
- iOS 実機での whisper.rn 動作検証
- 日本語音声認識の精度・遅延確認

### 環境
- macOS (Apple Silicon)
- Expo SDK 54.0.28 + prebuild
- React Native 0.81.5
- whisper.rn 0.5.4
- Whisper モデル: ggml-small.bin (465MB)
- テスト端末: iPhone 15 (iOS 15.x)
- Xcode 16.x (Personal Team 署名)

### 発生した問題と解決

#### 1. Xcode 署名エラー "Communication with Apple failed"
- **現象**: Personal Team 選択時に「No profiles for 'com.glassworks.muednote.poc' were found」
- **原因**: シミュレーターが選択されていた
- **解決**: 実機（iPhone）を選択してから Team を選択 → 自動的にプロビジョニング生成

#### 2. CLI ビルド失敗 "xcode-select"
- **現象**: `npx expo run:ios --device` でエラー
- **解決**: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` 実行後、Xcode GUI から直接ビルド

#### 3. アプリ起動時 "No script URL provided"
- **現象**: iPhone でアプリ起動後、Metro バンドラーに接続できない
- **原因**: Metro bundler が起動していなかった
- **解決**: `npx expo start` でMetro起動後、アプリ再起動

#### 4. Whisper モデル読み込み失敗 "undefinedassets/ggml-small.bin"
- **現象**: `FileSystem.bundleDirectory` が iOS で `undefined` を返す
- **原因**: expo-file-system の `bundleDirectory` は iOS では使用不可
- **解決**:
  - `isBundleAsset: true` オプションを使用
  - Xcode の "Copy Bundle Resources" にモデルを追加

```typescript
// App.tsx
const context = await initWhisper({
  filePath: 'ggml-small.bin',
  isBundleAsset: true,  // iOS バンドルから読み込み
});
```

#### 5. iPhone での開発者証明書信頼
- **現象**: アプリインストール後、起動時に「信頼されていないデベロッパ」エラー
- **解決**: 設定 → 一般 → VPN とデバイス管理 → デベロッパアプリで信頼

### 結果
| 項目 | 結果 |
|------|------|
| Xcode ビルド | OK |
| 実機インストール | OK |
| Metro 接続 | OK |
| Whisper モデル読み込み | OK |
| 日本語音声認識 | OK |
| 認識遅延 | **1466ms** (0.33MB 音声) |

### テスト結果サンプル
```
入力音声: 「テストです。MUEDnoteの録音テストです。以上。」
認識結果: 「テストですミュードの音の録音テストです以上」
処理時間: 1466ms
```

### 所見
- whisper-small モデルで日本語認識は実用レベル
- 固有名詞（MUEDnote → ミュードの音の）は誤認識あり（想定内）
- 処理遅延 1.5秒程度は許容範囲
- リアルタイム文字起こしには追加最適化が必要

### 次のステップ
1. リアルタイムストリーミング文字起こしの実装
2. VAD（Voice Activity Detection）の導入
3. UI/UX 改善（録音インジケーター等）
4. whisper-base/tiny モデルでの速度比較

---

## 現在の状態（セッション引き継ぎ用）

**最終更新**: 2025-12-12 16:00 JST

### 完了したこと
- Expo Go録音テスト環境構築
- iOS prebuild + Xcode ビルド成功
- Whisper モデル（ggml-small.bin）導入
- **実機での日本語音声認識動作確認** ✅

### 次にやること
1. リアルタイム文字起こし機能の検討
2. VAD 導入でセグメント分割
3. より小さいモデル（tiny/base）での速度検証

### 注意事項
- POCワークツリー: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2-poc`
- ブランチ: `funny-heyrovsky`
- 変更は未コミット状態（コミット推奨）

---

## テンプレート（次回以降用）

```
## YYYY-MM-DD セッションN: タイトル

### 目的
-

### 環境
-

### 発生した問題と解決

#### 1. 問題タイトル
- **現象**:
- **原因**:
- **解決**:

### 結果
| 項目 | 結果 |
|------|------|

### 次のステップ
1.
```

# MUEDnote Audio Resampler 実装記録

**日付**: 2025-12-22
**フェーズ**: MVP Phase 2 準備

---

## 背景

### 課題

MUEDnote は音楽練習のボイスメモアプリであり、2つの用途がある：

1. **文字起こし** → Whisper が 16kHz を要求
2. **音楽制作** → 最低 44.1kHz / 48kHz が必要（ハミング、メロディのアイデア）

現在の実装（16kHz 録音）では音楽制作用途に不十分。

### iOS Voice Memos の仕様

| 項目 | 値 |
|------|-----|
| サンプルレート | **48kHz** |
| ビットレート | 約119 kbps |
| コーデック | AAC (M4A) |

Apple は 48kHz を採用（映像制作との互換性のため）。

---

## 技術選定

### whisper.rn vs WhisperKit

| 観点 | WhisperKit | whisper.rn (whisper.cpp) |
|------|------------|--------------------------|
| 速度 | 1.86x〜2.85x 高速（Neural Engine） | 普通 |
| 音質への対応 | 低品質音声で問題あり | より正確 |
| beam search | CoreML制約で不可 | 対応 |
| プラットフォーム | iOS のみ | iOS + Android |
| リサンプル | 組み込み済み | 要実装 |

**決定**: whisper.rn を維持（将来の Android 対応 + 音声認識精度）

参考:
- [WhisperKit vs whisper.cpp Issue #109](https://github.com/argmaxinc/WhisperKit/issues/109)

### リサンプル方式

| 方式 | 状態 |
|------|------|
| ffmpeg-kit-react-native | ❌ 2025年6月にアーカイブ（廃止） |
| react-native-audio-api | △ 可能だが追加依存 |
| **iOS ネイティブ（AVAudioConverter）** | ✅ 採用 |

**決定**: AVAudioConverter を使った Expo ネイティブモジュール

理由:
- Apple 公式 API（TN3136）
- 依存ライブラリなし
- WhisperKit と同じ 10MB チャンク処理で長時間音声対応

参考:
- [WhisperKit Issue #16 - Resample in chunks](https://github.com/argmaxinc/WhisperKit/issues/16)
- [Apple TN3136 - AVAudioConverter](https://developer.apple.com/documentation/technotes/tn3136-avaudioconverter-performing-sample-rate-conversions)

---

## 実装

### ディレクトリ構造

```
modules/audio-resampler/
├── package.json              # モジュール定義
├── expo-module.config.json   # Expo モジュール設定
├── index.ts                  # エクスポート
├── src/
│   └── AudioResamplerModule.ts   # TypeScript インターフェース
└── ios/
    ├── AudioResampler.podspec    # CocoaPods 設定
    └── AudioResamplerModule.swift  # AVAudioConverter 実装
```

### API

```typescript
import { resample } from '../../modules/audio-resampler';

const result = await resample({
  inputPath: '/path/to/48kHz.wav',
  outputPath: '/path/to/16kHz.wav',
  targetSampleRate: 16000,  // デフォルト: 16000
  chunkSizeMB: 10,          // デフォルト: 10
});

// 結果
{
  success: boolean;
  outputPath: string;
  inputSampleRate: number;   // 元のサンプルレート
  outputSampleRate: number;  // 変換後のサンプルレート
  durationMs: number;        // 処理時間
  error?: string;
}
```

### 処理フロー

```
┌─────────────────────────────────────────────────────────────────┐
│  録音 (expo-av)                                                  │
│  48kHz / 16bit / mono / WAV                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  リサンプリング (AudioResamplerModule)                           │
│  AVAudioConverter / 10MB チャンク処理                            │
│  48kHz → 16kHz                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  文字起こし (whisper.rn)                                         │
│  16kHz WAV を処理                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  クリーンアップ                                                  │
│  16kHz ファイル削除 / 48kHz WAV 保持（音楽制作用）               │
└─────────────────────────────────────────────────────────────────┘
```

### Swift 実装のポイント

```swift
// 1. 入力ファイルを開く
let inputFile = try AVAudioFile(forReading: inputURL)

// 2. 出力フォーマット設定
let outputFormat = AVAudioFormat(
    commonFormat: .pcmFormatFloat32,
    sampleRate: 16000,
    channels: 1,
    interleaved: false
)

// 3. コンバーター作成
let converter = AVAudioConverter(from: inputFormat, to: outputFormat)

// 4. チャンク単位で処理（メモリ効率）
let chunkFrames = (chunkSizeMB * 1024 * 1024) / bytesPerFrame

while currentFrame < inputFile.length {
    // 読み込み → 変換 → 出力バッファに追加
}

// 5. Float32 → Int16 変換して WAV 保存
```

### whisperService.ts の変更

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 録音サンプルレート | 16kHz | 48kHz |
| 録音ビットレート | 256kbps | 768kbps |
| Whisper 処理前 | なし | リサンプリング追加 |
| 保持するファイル | 16kHz | 48kHz（音楽制作用） |

---

## ファイルサイズ見積もり

| 録音時間 | 48kHz WAV | 16kHz WAV (処理用) |
|----------|-----------|-------------------|
| 1分 | 約 5.8 MB | 約 1.9 MB |
| 5分 | 約 29 MB | 約 9.6 MB |
| 15分 | 約 86 MB | 約 29 MB |
| 60分 | 約 345 MB | 約 115 MB |
| 3時間 | 約 1 GB | 約 345 MB |

---

## 検証予定

### 処理時間ベンチマーク

| 録音時間 | リサンプル時間 | Whisper 時間 | 合計 |
|----------|---------------|--------------|------|
| 1分 | ? | ? | ? |
| 5分 | ? | ? | ? |
| 15分 | ? | ? | ? |
| 60分 | ? | ? | ? |

※ 実機テスト後に記入

### 確認項目

- [ ] 48kHz 録音が正常に動作
- [ ] リサンプリングが正常に完了
- [ ] Whisper 文字起こしの精度（16kHz 直接録音と比較）
- [ ] 長時間録音でのメモリ安定性
- [ ] 48kHz WAV の音楽制作ソフトへの読み込み

---

## 次のステップ

1. **Xcode ビルド** → 実機インストール
2. **実機テスト** → 1分/5分 の録音で基本動作確認
3. **ベンチマーク** → 処理時間計測
4. **長時間テスト** → 15分/60分 でメモリ安定性確認

---

*記録: 2025-12-22*

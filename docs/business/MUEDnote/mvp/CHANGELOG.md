# MUEDnote v7 MVP Changelog

このドキュメントは MUEDnote v7 MVP の実装履歴です。

> **PoC（技術検証）は完了済み**: [poc-log.md](./poc-log.md) を参照

---

## Phase 1: コアフロー実装（2025-12-22 完了）

### 概要
MVP の基本フロー完成: アプリ起動 → タイマー設定 → 録音 → 文字起こし → DB同期

### 実装内容

#### バッチ処理方式
PoC 結論「タイマー連動ならバッチ処理が最適」を反映。

| コンポーネント | 実装 |
|---------------|------|
| 録音 | expo-av（WAV 48kHz mono）※音楽制作品質 |
| 文字起こし | whisper.rn（セッション終了後にバッチ処理） |
| 状態管理 | Zustand（sessionStore） |
| ローカル保存 | AsyncStorage |
| サーバー同期 | Next.js API Routes + Neon PostgreSQL |

#### 主要機能
| 機能 | 状態 |
|------|------|
| タイマー設定（1/5/15/60分） | ✅ |
| バッチ録音 | ✅ |
| バッチ文字起こし | ✅ |
| ハルシネーション除去 | ✅ |
| 重複除去 | ✅ |
| ローカル保存 | ✅ |
| サーバー同期 | ✅ |
| 音声ファイル共有 | ✅ |
| オンボーディング（三層構造） | ✅ |

#### 技術的な修正
1. **重複除去**: Whisper セグメントの重複を Set で除去（51件→8件、85%削減）
2. **ハルシネーション処理**: 全体除外→部分除去に変更（実発話を保持）
3. **ATS設定**: 開発サーバーへの HTTP 接続許可
4. **DB同期フロー**: 音声共有前に同期完了（データ安全性確保）
5. **log_count修正**: サブクエリ→LEFT JOIN に変更

### テスト結果
- 実機（iPhone 15）でエンドツーエンド動作確認
- 文字起こし処理時間: 約4-7秒
- DB同期: 正常動作

---

## Phase 2: 音声処理パイプライン（2025-12-23 完了）

### 概要
音楽制作品質（48kHz）で録音しつつ、Whisper処理と効率的な保存を両立するパイプラインを実装。

### 実装内容

#### 1. AudioResampler（リサンプリング）
48kHz → 16kHz 変換（Whisper は 16kHz のみ対応）

| 項目 | 内容 |
|------|------|
| 技術 | AVAudioConverter（iOS ネイティブ） |
| 処理方式 | 10MB チャンク処理 |
| パフォーマンス | **17-25ms**（1分音声） |

**技術選定の経緯:**
| 候補 | 結果 |
|------|------|
| WhisperKit に移行 | ❌ iOS 専用、低品質音声で問題 |
| ffmpeg-kit-react-native | ❌ 2025年6月にアーカイブ |
| **AVAudioConverter** | ✅ 採用 |

#### 2. AudioEncoder（M4A変換）
WAV → M4A 変換（共有時の容量削減）

| 項目 | 内容 |
|------|------|
| 技術 | AVAssetWriter + AAC エンコード |
| ビットレート | 128kbps |
| 圧縮率 | **5-6倍**（10MB → 1.7MB） |
| パフォーマンス | **400-450ms**（1分音声） |

### 音声処理フロー（完成形）
```
録音(48kHz WAV) → リサンプル(16kHz WAV) → Whisper → DB同期 → M4A変換 → 共有
     ↓                    ↓                              ↓
  音楽制作品質        Whisper処理用                   容量効率化
  (~5.6MB/分)                                       (~1MB/分)
```

### ファイル構成
```
modules/
├── audio-resampler/
│   ├── expo-module.config.json
│   ├── package.json
│   ├── index.ts
│   ├── src/AudioResamplerModule.ts
│   └── ios/
│       ├── AudioResampler.podspec
│       └── AudioResamplerModule.swift
└── audio-encoder/
    ├── expo-module.config.json
    ├── package.json
    ├── index.ts
    ├── src/AudioEncoderModule.ts
    └── ios/
        ├── AudioEncoder.podspec
        └── AudioEncoderModule.swift
```

### 実装時の課題と解決

| 課題 | 解決策 |
|------|--------|
| モジュールがランタイムでロードされない | package.json の dependencies に `file:./modules/xxx` で追加 |
| file:// URL が Swift で開けない | URL(string:) と URL(fileURLWithPath:) を使い分け |

### テスト結果（実機 iPhone 15）

| 処理 | 時間 | 備考 |
|------|------|------|
| リサンプリング | 17-25ms | 1分音声 |
| Whisper文字起こし | 6-11秒 | 1分音声、ggml-small モデル |
| M4Aエンコード | 400-450ms | 128kbps |
| **合計** | **約7-12秒** | 1分音声の全処理 |

---

## Phase 2: 予定

| 項目 | 優先度 | 状態 | 備考 |
|------|--------|------|------|
| Audio Resampler | 高 | ✅ 完了 | 48kHz→16kHz |
| Audio Encoder | 高 | ✅ 完了 | WAV→M4A |
| 履歴表示画面 | 高 | 🔲 | 過去セッション閲覧 |
| TestFlight配布 | 高 | 🔲 | App Store Connect 設定 |
| 長時間テスト | 中 | 🔲 | 5分/15分/60分ベンチマーク |
| セッションエクスポート（JSON） | 中 | 🔲 | ユーザーリクエスト |
| HLA構造化（有料機能） | 中 | 🔲 | gpt-4.1-nano 使用 |
| hum検出 | 低 | 🔲 | Phase 3 PoC 予定 |

---

*最終更新: 2025-12-23*

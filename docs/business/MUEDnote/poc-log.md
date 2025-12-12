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

## 2025-12-12 セッション3: VAD + RealtimeTranscriber 検証

### 目的
- VAD（Voice Activity Detection）による音声検出の実用性検証
- whisper.rn の RealtimeTranscriber API の動作確認
- リアルタイム文字起こしのUX評価

### 環境
- macOS (Apple Silicon)
- Expo SDK 54.0.28 + prebuild
- React Native 0.81.5
- whisper.rn 0.5.4
- Whisper モデル: ggml-small.bin (465MB)
- VAD モデル: ggml-silero-vad.bin (864KB)
- テスト端末: iPhone 15 (iOS 15.x)

### 実装内容

#### 1. VAD モデルの導入
- silero-vad モデル（864KB）をダウンロード
- Xcode の "Copy Bundle Resources" に追加
- `initWhisperVad()` で初期化

#### 2. RealtimeTranscriber の統合
- whisper.rn の `RealtimeTranscriber` クラスを使用
- Metro の custom resolver で submodule import を解決
- `AudioPcmStreamAdapter` で音声ストリームを取得

```javascript
// metro.config.js - whisper.rn submodule 解決
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('whisper.rn/src/')) {
    const subPath = moduleName.replace('whisper.rn/src/', '');
    const resolvedPath = path.join(whisperRnPath, 'lib', 'module', subPath);
    // ...
  }
};
```

#### 3. VAD 設定のチューニング
最終的な設定値：

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| `threshold` | 0.3 | 感度（低いほど敏感） |
| `minSilenceDurationMs` | 800ms | 無音判定までの待機時間 |
| `speechPadMs` | 200ms | 音声前後のパディング |
| `audioSliceSec` | 15秒 | スライス長 |
| `vadThrottleMs` | 2000ms | VAD処理頻度制限 |

### 発生した問題と解決

#### 1. RealtimeTranscriber の import エラー
- **現象**: `Unable to resolve "whisper.rn/src/realtime-transcription"`
- **原因**: whisper.rn の package.json exports が Metro で解決されない
- **解決**: metro.config.js で custom resolver を追加し、`lib/module` ディレクトリにリダイレクト

#### 2. NativeEventEmitter エラー
- **現象**: `NativeEventEmitter() requires a non-null argument`
- **原因**: Metro resolver が TypeScript ソース（src/）を参照していた
- **解決**: ビルド済み JavaScript（lib/module/）を参照するよう修正

#### 3. 認識結果の重複
- **現象**: 同じ認識結果が2回ログに出力される
- **原因**: RealtimeTranscriber が `speech_start` と `speech_end` の両方で transcribe をトリガー
- **解決**: `processedSlicesRef` (Set) で処理済みスライスを追跡し、重複スキップ

#### 4. expo-clipboard ネイティブモジュールエラー
- **現象**: `Cannot find native module 'ExpoClipboard'`
- **原因**: expo-clipboard はネイティブビルドが必要
- **解決**: React Native 標準の `Clipboard` API に変更（ビルド不要）

### 結果
| 項目 | 結果 |
|------|------|
| VAD モデル読み込み | OK |
| 音声検出（speech_start/end） | OK |
| リアルタイム文字起こし | OK |
| 認識精度 | 実用レベル |
| 認識遅延 | 約1000ms |
| 重複防止 | OK |

### 所見

#### VAD の限界
- スライスベースの設計のため、**連続発話の途切れ**が発生しやすい
- 「音声終了」判定後の「再開」検出が遅い
- チューニングで改善できるが、完璧なリアルタイム感は難しい

#### 最終製品への示唆
MUEDnote の想定ユースケース（タイマー連動でメモを録音）を考えると：

```
タイマー開始 → 録音継続 → タイマー終了 → まとめて文字起こし → DB保存
```

この流れなら **VAD は不要** で、シンプルな「バッチ処理」で十分。

#### PoC の結論
| 方式 | 適性 |
|------|------|
| VAD + リアルタイム | 会話UI向き、MUEDnote には過剰 |
| バッチ処理 | タイマー連動メモには最適 |

### 次のステップ
1. ~~リアルタイム文字起こし機能の検討~~ ✅ 検証完了
2. ~~VAD 導入でセグメント分割~~ ✅ 検証完了（本番では不要と判断）
3. ~~Tauri オーバーレイ UI PoC~~ → **不要**（v7はスマホアプリ完結、PC連携なし）
4. HLA（乱文構造化）PoC
5. ローカルログ + 検索
6. タイマーUI統合

---

## 2025-12-12 セッション4: HLA（乱文構造化）PoC

### 目的
- Whisper文字起こし結果（断片的な独り言）をGPTで構造化
- カテゴリ分類（idea/todo/tips/frustration）の精度検証
- 要約の深度保持（抽象化しすぎない）の検証
- モデル選定とコスト・速度の評価

### 環境
- Node.js + ESM
- OpenAI API
- 検証モデル: gpt-4.1-mini, gpt-4.1-nano, gpt-5-mini

### 実装内容

#### 1. テストデータ作成
DTMer/音楽制作者の独り言を9パターン作成：
- `realistic_mixed`: 実際の独り言（断片的、接続詞多め）
- `very_fragmented`: ほぼ感嘆詞と指示語のみ
- `raw_session`: 作業中の生々しい独り言
- `idea_fragments`: アイデア出し中
- `mixing_session`: ミックス作業中（プラグイン・技術用語多め）
- `late_night`: 深夜テンション（疲労・焦り）
- `tech_trouble`: 機材トラブル系
- `creative_burst`: 創作アイデア爆発
- `uncertainty`: 悩み・迷い系

#### 2. プロンプト設計
```
## カテゴリ分類（できるだけ多く拾う）
- idea: 「〜かも」「〜したら」「〜ありだな」→ アイデア
- todo: 「〜しないと」「明日まで」「やんないと」→ タスク
- tips: 「〜なるんだよね」「前もやった」→ 学び・経験
- frustration: 「もう」「なんで」「マジで」「ダメだ」「うわ〜」→ 不満

## 重要ルール
1. 感嘆詞のみ（「んーーー」「あ〜〜」単独）はスキップ
2. 意味ある発言はすべて拾う（4〜10個程度）
3. 具体的内容を残す（Dm7, G7, コンプ, BPM等）
4. 1文に複数カテゴリ混在→主要なもの1つ選択
```

#### 3. モデル比較

| モデル | 処理時間 | 成功 | 備考 |
|--------|----------|------|------|
| gpt-5-mini | 18.8s | NG | 推論モデル、`max_tokens`使用不可、`temperature`固定 |
| gpt-4.1-nano | 3.2s | OK | 高速・安定・JSON出力良好 |
| gpt-4.1-mini | 10s平均 | OK | nano より遅いが品質同等 |

**結論: gpt-4.1-nano を採用**

### 発生した問題と解決

#### 1. gpt-5系 APIパラメータエラー
- **現象**: `Unsupported parameter: 'max_tokens'`
- **原因**: gpt-5系は推論モデルで `max_tokens` ではなく `max_completion_tokens` を使用
- **解決**: モデル名で分岐して適切なパラメータを設定

#### 2. gpt-5系 temperatureエラー
- **現象**: `Only the default (1) value is supported`
- **原因**: 推論モデルは temperature 変更不可
- **解決**: gpt-5系では temperature パラメータを省略

#### 3. ESM モジュール解決エラー
- **現象**: `Cannot find module './test-inputs'` (ts-node使用時)
- **原因**: ESM環境でのTypeScript local import解決問題
- **解決**: `.mjs` ファイルに移行し、インラインでデータ定義

### 結果

9パターンの全テスト成功:

| テストケース | 処理時間 | items数 | カテゴリ分布 |
|-------------|---------|--------|-------------|
| realistic_mixed | 9.9s | 7 | idea:2, todo:3, tips:1, frustration:1 |
| very_fragmented | 3.2s | 1 | todo:1（情報量少→正しく最小抽出）|
| raw_session | 8.2s | 7 | todo:3, frustration:4 |
| idea_fragments | 8.7s | 6 | idea:5, frustration:1 |
| mixing_session | 14.8s | 13 | idea:4, todo:5, tips:2, frustration:3 |
| late_night | 9.9s | 9 | todo:2, frustration:7 |
| tech_trouble | 11.4s | 7 | frustration:7 |
| creative_burst | 10.6s | 9 | idea:6, todo:2, frustration:1 |
| uncertainty | 10.4s | 9 | idea:4, todo:1, frustration:5 |

### 品質評価

#### 具体性保持 ✅
- 音楽用語（Dm7, G7, BPM, コンプ, サイドチェイン等）が正しく残る
- プラグイン名（Serum, Pro-Q3, Ozone等）も保持

#### カテゴリ判定 ✅
- `tech_trouble` → frustration 7個（100%正確）
- `creative_burst` → idea 6個（正しくアイデア中心）
- `late_night` → frustration 7個 + todo 2個（疲労+締め切り意識）

#### mood判定 ✅
- frustrated / creative / mixed が適切に判定

### UX考察

#### 処理時間（約10秒）について
- **リアルタイム表示には長い** → ただし不要
- **バッチ処理なら問題なし** → MUEDnoteの想定ユースケース

#### 想定フロー
```
タイマー終了 → 生テキスト即時保存 → バックグラウンドでHLA処理 → 後で見返す時に構造化済み
```

#### マネタイズポイント
- 無料: 生テキストの保存・閲覧のみ
- 有料: HLA構造化 + カテゴリ検索 + AI要約

### 次のステップ
1. ~~HLA（乱文構造化）PoC~~ ✅ 検証完了
2. **ローカルログ + 検索** - Neon PostgreSQL (API経由) + AsyncStorage (オフラインキャッシュ)
3. **タイマーUI統合** - 練習タイマーとメモの統合
4. **課金設計** - HLA処理を有料機能として設計

---

## 現在の状態（セッション引き継ぎ用）

**最終更新**: 2025-12-12 23:30 JST

### データベース構成（確定）
| レイヤー | 技術 | 用途 |
|---------|------|------|
| **サーバーDB** | Neon PostgreSQL (`muednote_v3` スキーマ) | fragments, projects, tags 等のマスタデータ |
| **API** | Next.js API Routes + Drizzle ORM | MUED LMS v2 の既存基盤を使用 |
| **ローカルキャッシュ** | AsyncStorage | オフライン閲覧用 |
| **認証** | Clerk | MUED共通認証 |

> **注**: SQLite や Supabase は使用しない。MUED LMS v2 の既存 Neon + API Routes 基盤を活用。

### 完了したこと
- Expo Go録音テスト環境構築
- iOS prebuild + Xcode ビルド成功
- Whisper モデル（ggml-small.bin）導入
- **実機での日本語音声認識動作確認** ✅
- **VAD（silero-vad）導入・動作確認** ✅
- **RealtimeTranscriber 統合** ✅
- **PoC 結論：タイマー連動ならバッチ処理が最適** ✅
- **HLA（乱文構造化）PoC 完了** ✅
  - gpt-4.1-nano 採用（高速・安定）
  - 9パターンのテストデータで検証
  - カテゴリ分類・具体性保持・mood判定すべて良好
  - 処理時間10秒はバッチ処理なら問題なし
  - マネタイズポイント: HLA構造化を有料機能に
- **DB PoC（muednote_v3スキーマ検証）完了** ✅
  - 既存 `muednote_v3` スキーマが HLA データ保存に適合
  - JSONB 検索（`action_items @> '[{"category": "..."}]'`）動作確認
  - mood 検索（`emotions->>'mood' = '...'`）動作確認
  - 日本語全文検索（ILIKE）動作確認
  - テストスクリプト: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/muednote-db-poc.mjs`

### 次にやること
> **注意**: MUEDnote v7 はスマホアプリ（iOS）で完結する方針。
> PC版 Tauri は v7 スコープ外。DAWプラグイン構想は将来検討として保留。

1. ~~Tauri オーバーレイ UI PoC~~ → **v7スコープ外**（将来検討）
2. ~~HLA（乱文構造化）PoC~~ → **完了** ✅
3. ~~ローカルログ + 検索（DB検証）~~ → **完了** ✅（muednote_v3スキーマ採用）
4. **Expo → API Routes 接続** - 認証付きAPI呼び出しの検証
5. **タイマーUI統合** - 練習タイマーとメモの統合
6. **Share Extension（外部ツール連携）** - WhisperFlow等からテキスト受け取り
7. **課金設計** - HLA処理を有料機能として設計

### 音声入力オプション（v7）

| 入力元 | 方式 | 想定ユーザー |
|--------|------|-------------|
| **内蔵Whisper** | タイマー連動録音 → バッチ処理 | 一般ユーザー（デフォルト） |
| **外部ツール連携** | Share Extension / URL Scheme | WhisperFlow等のパワーユーザー |

**マネタイズ:**
- HLA処理は入力元に関係なく有料（処理コストは同じ）
- 外部連携自体は無料で開放（ユーザー獲得優先）

### 将来構想（v8以降）
- **DAWプラグイン**: VST/AU形式でDAW内からメモ録音（要検討）
- **WhisperFlow PC連携**: PC音声入力はWhisperFlowに任せ、MUEDnoteは受け取り側に
  - fn押して喋る → WhisperFlow → MUEDnoteに送信
  - Tauri単体でのPC版は不要（WhisperFlowとfnキー取り合いに勝てない）
- **MIDI/オーディオ解析**: DAWからのデータ取得で自動コンテキスト付与（将来）

> **ポジショニング**: MUEDnoteはスマホでの制作メモに特化。外部音声認識ツール（WhisperFlow等）との連携でパワーユーザーにも対応。

### 注意事項
- POCワークツリー: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2-poc`
- ブランチ: `funny-heyrovsky`
- コミット済み: `6f23d235` (feat: Add VAD-enabled realtime transcription)

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

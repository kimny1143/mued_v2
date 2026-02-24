# MUEDear 実装引き継ぎドキュメント

**作成日**: 2026-01-21
**新リポジトリ**: https://github.com/kimny1143/mued_nativeapps

---

## プロジェクト概要

MUEDearは音楽制作者向けの耳トレーニングアプリ（React Native / Expo）。
周波数識別、コンプレッション検出などのゲームで「ゴールデンイヤー」を鍛える。

---

## 現在の実装状況

### 完了済み ✅

| 機能 | 詳細 |
|------|------|
| **MuFreQゲーム** | 周波数当てクイズ、10ラウンド制 |
| **リアルタイムEQ処理** | BiquadFilterNode (+12dB boost) |
| **インタラクティブスペクトラム** | 5スタイル (bar, line, mirror, glow, dots) |
| **A/B比較** | オリジナル vs EQ処理済み音声の切り替え |
| **AdMob統合** | リワード広告 (3プレイ/広告、5回/日上限) |
| **プレイ制限** | 1日5回 + 広告ボーナス |
| **縦横対応** | Portrait / Landscape レイアウト |
| **オーディオファイル** | 10トラック収録 (M4A形式) |

### 未実装 ⏳

| ゲーム | 説明 | 優先度 |
|--------|------|--------|
| **MuComp** | コンプレッション検出 | High |
| **MuRush** | 60秒タイムアタック | Medium |
| **MuVerb** | リバーブ違い検出 | Medium |
| **MuWidth** | ステレオ幅識別 | Low |

### App Store提出前のTODO

- [ ] アプリアイコン (1024x1024)
- [ ] スプラッシュスクリーン
- [ ] プライバシーポリシーURL
- [ ] App Store用スクリーンショット
- [ ] アプリ説明文 (日英)
- [ ] TestFlight内部テスト

---

## アーキテクチャ

```
src/
├── components/
│   ├── game/
│   │   └── InteractiveSpectrum.tsx  # タップ可能スペクトラム表示
│   ├── ui/
│   │   └── Button.tsx
│   ├── AdModal.tsx                   # 広告視聴モーダル
│   └── Hoo.tsx                       # マスコットキャラ
├── screens/
│   ├── HomeScreen.tsx
│   ├── GameSelectScreen.tsx
│   ├── ResultScreen.tsx
│   └── games/
│       ├── MuFreQScreen.tsx          # ✅ 実装済み
│       ├── MuCompScreen.tsx          # プレースホルダー
│       ├── MuRushScreen.tsx          # プレースホルダー
│       ├── MuVerbScreen.tsx          # プレースホルダー
│       └── MuWidthScreen.tsx         # プレースホルダー
├── services/
│   ├── audioService.ts               # オーディオエンジン (react-native-audio-api)
│   ├── adService.ts                  # AdMob管理
│   └── storageService.ts             # AsyncStorage永続化
├── stores/
│   └── gameStore.ts                  # Zustand状態管理
├── types/
│   └── game.ts                       # 型定義、定数
├── utils/
│   └── logger.ts                     # 本番ログ無効化
└── constants/
    └── theme.ts                      # デザイントークン
```

---

## 重要な技術詳細

### オーディオ処理

```
SourceNodeA (original) ─→ AnalyserNode ─→ GainNodeA ─┐
                                                      ├→ MasterGain ─→ Destination
SourceNodeB (original) ─→ EQFilter ─→ GainNodeB ────┘
```

- **メモリリーク対策**: 各ラウンドで `shutdown()` + `initAudioSystem()` でAudioContext完全リセット
- **WAVパース**: iOS `decodeAudioData` バグ回避のため手動パース実装
- **EQ設定**: Q=1.0, Gain=+12dB (耳トレ用に誇張)

### 環境変数

```bash
# .env.local (gitignore済み)
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-xxx
EXPO_PUBLIC_ADMOB_REWARDED_IOS=ca-app-pub-xxx/xxx
```

### AdMob設定

- **App ID**: `ca-app-pub-2023025421287631~2935925498`
- **Ad Unit ID**: `ca-app-pub-2023025421287631/4450341234`
- 開発時は自動でテスト広告を使用

---

## コードレビュー対応済み

| 問題 | 対応 |
|------|------|
| AdMob IDハードコード | 環境変数化 |
| アニメーションループのメモリリーク | isMountedチェック追加 |
| オーディオ初期化のレースコンディション | キャンセル処理追加 |
| console.log本番露出 | logger utility作成 |
| 入力バリデーション | submitAnswerに検証追加 |

---

## 次の実装ステップ

### 1. MuCompゲーム実装

コンプレッション検出ゲーム。A/Bで圧縮あり/なしを比較。

```typescript
// audioService.tsに追加が必要
private compressorNode: DynamicsCompressorNode | null = null;

// 設定例
compressor.threshold.value = -24;
compressor.ratio.value = 4;
compressor.attack.value = 0.003;
compressor.release.value = 0.25;
```

### 2. MuRush実装

60秒タイムアタック。MuFreQのロジック再利用、タイマー追加。

### 3. リポジトリ移行

```bash
# mued_nativeappsに移行後
cd apps/muedear
git remote add origin https://github.com/kimny1143/mued_nativeapps.git
```

---

## 開発コマンド

```bash
# 開発
npm run ios          # iOSシミュレータ
npm run ios:device   # 実機

# ビルド
npx expo prebuild    # ネイティブコード生成
npx expo run:ios     # iOSビルド

# キャッシュクリア
npx expo start -c    # Metro bundler キャッシュクリア
```

---

## 既知の問題

1. **Landscape時のSafeArea**: 一部デバイスでノッチ対応が不完全
2. **Android未テスト**: 実機がないため動作未確認
3. **広告テスト**: TestFlightでの実広告テストが必要

---

## 参考ドキュメント

- [Figma AI Design Spec](../docs/muedear/figma-ai-design-spec.md)
- [react-native-audio-api](https://github.com/software-mansion/react-native-audio-api)
- [react-native-google-mobile-ads](https://docs.page/invertase/react-native-google-mobile-ads)

---

*最終更新: 2026-01-21*

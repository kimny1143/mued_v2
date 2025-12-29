# MUEDnote Mobile - 1st MVP

> 集中して、休む。それだけでいい。

MUEDnote は、科学的根拠に基づいた集中・休憩サイクルを促進し、音声メモを記録する iOS アプリです。

---

## 理念

### 「出力はAI、判断と欲は人間」

MUEDnote は MUED プラットフォームの一部として、創作活動における人間の判断と気づきを記録・資産化することを目的としています。

**核心コンセプト**:
- AIは思考の鏡。代替ではなく拡張
- 創作 = 選び続けること
- 違和感も納得感も価値として残す

### なぜ「集中・休憩トラッカー」なのか

音楽制作者は長時間のフロー状態に入りがちですが、研究によれば:
- 創造的作業は1日約4時間が上限（K. Anders Ericsson）
- 90分を超える集中は効率が低下（ウルトラディアンリズム）
- 適切な休憩が次のセッションの質を向上

MUEDnote は「もっと作業したい」という欲と「休憩が必要」という科学的知見のバランスを取る相棒です。

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **フレームワーク** | React Native (Expo SDK 54) |
| **言語** | TypeScript 5.7 |
| **状態管理** | Zustand 5 |
| **認証** | Clerk |
| **ローカルストレージ** | AsyncStorage |
| **音声認識** | whisper.rn (ggml-small モデル) |
| **音声録音** | expo-av |
| **UI** | React Native + カスタム Glassmorphism |
| **バックエンド** | Next.js API Routes (MUED LMS v2) |
| **データベース** | Neon PostgreSQL |

### ネイティブモジュール

```
modules/
├── audio-encoder/     # WAV → M4A 変換
└── audio-resampler/   # 48kHz → 16kHz リサンプリング
```

---

## 画面構成

```
SignIn → Onboarding → Home ←→ History/Settings（スワイプ）
                        ↓
                    Session → Break → Review → Home
```

### 1. ホーム画面 (HomeScreen)

- **Hoo**: フクロウ型マスコット（画面中央に大きく表示）
- **モード選択**: Pomodoro / Standard / Deep Work / Custom
- **今日の累計**: ヘッダー左に表示（4時間超過で警告）
- **上スワイプ**: ダッシュボード（集中の科学）を表示
- **左スワイプ**: 設定画面へ
- **右スワイプ**: 履歴画面へ

### 2. セッション画面 (SessionScreen)

- **Hoo**: 音声に反応してスケールアニメーション
- **タイマー**: カウントダウン表示（録音中インジケーター付き）
- **音声録音**: バックグラウンドで録音継続
- **終了ボタン**: タップで休憩画面へ

### 3. 休憩画面 (BreakScreen)

- **休憩タイマー**: モードに応じた推奨休憩時間
- **バックグラウンド処理**: 録音を文字起こし・M4A変換
- **次モード選択**: ボトムシートでモード変更可能
- **4時間警告**: 累計4時間超過時に表示

### 4. レビュー画面 (ReviewScreen)

- **統計**: 録音時間、ログ数
- **文字起こし結果**: タイムスタンプ付きログ一覧
- **メモ入力**: セッションにメモを追加
- **同期**: サーバーにデータ送信
- **保存**: ローカルのみに保存
- **破棄**: セッションを削除

### 5. 履歴画面 (HistoryScreen)

- **日付グループ**: セッションを日付ごとに表示
- **2段階展開**: 日付 → セッション → ログ
- **プルリフレッシュ**: 最新データを取得

### 6. 設定画面 (HooSettingsScreen)

- **ログアウト**: Clerk認証のサインアウト
- **Hoo音声反応**: アニメーション閾値・速度の調整

---

## フォーカスモード

研究に基づいた3つのプリセット + カスタム設定:

| モード | 集中時間 | 休憩時間 | 根拠 |
|--------|---------|---------|------|
| **Pomodoro** | 25分 | 5分 | Francesco Cirillo - 短い集中の反復 |
| **Standard** | 50分 | 17分 | DeskTime研究 - 最も生産的な人の働き方 |
| **Deep Work** | 90分 | 20分 | ウルトラディアンリズム - 人間の自然な集中サイクル |
| **Custom** | 5-120分 | - | ユーザー設定 |

---

## コア機能

### 1. 音声録音 & 文字起こし

```
録音（48kHz WAV）
    ↓
セッション終了
    ↓
リサンプリング（16kHz）
    ↓
Whisper 文字起こし（on-device）
    ↓
ハルシネーション除去
    ↓
ログとして保存
```

**ハルシネーション除去**:
- `(音楽)`, `(字幕)` などの定型句を削除
- 無音時のお疲れ様でした系を除去

### 2. Hoo 音声反応アニメーション

```typescript
// 音量に比例してスケールアップ
const targetScale = 1 + (maxScaleChange * normalizedVolume);

// アタック＆リリース方式
Animated.sequence([
  Animated.timing(volumeScaleAnim, { toValue: targetScale, duration: 80 }),
  Animated.timing(volumeScaleAnim, { toValue: 1, duration: 120 }),
]).start();
```

### 3. 1日累計トラッキング

- 日付が変わると自動リセット
- 4時間超過で警告表示
- セッション完了時に累計更新

### 4. データ同期

```
Local (AsyncStorage)
    ↓
セッション完了 → レビュー画面
    ↓
同期ボタン → API送信
    ↓
Server (Neon PostgreSQL)
```

---

## ファイル構成

```
apps/muednote-mobile/
├── App.tsx                           # メインエントリ、画面遷移
├── src/
│   ├── api/
│   │   ├── client.ts                 # API クライアント
│   │   └── types.ts                  # 型定義
│   ├── cache/storage.ts              # AsyncStorage ラッパー
│   ├── components/
│   │   ├── Hoo.tsx                   # マスコットキャラクター
│   │   ├── DashboardContent.tsx      # 集中の科学（記事）
│   │   ├── ModeSelector.tsx          # モード選択
│   │   └── SessionControlBar.tsx     # 共通コントロールバー
│   ├── constants/
│   │   ├── theme.ts                  # テーマ定数
│   │   └── hooMessages.ts            # Hooのメッセージ
│   ├── providers/
│   │   ├── ClerkProvider.tsx         # Clerk認証
│   │   └── ThemeProvider.tsx         # ダーク/ライトモード
│   ├── screens/
│   │   ├── HomeScreen.tsx            # ホーム
│   │   ├── SessionScreen.tsx         # セッション（録音中）
│   │   ├── BreakScreen.tsx           # 休憩
│   │   ├── ReviewScreen.tsx          # レビュー
│   │   ├── HistoryScreen.tsx         # 履歴
│   │   ├── HooSettingsScreen.tsx     # 設定
│   │   ├── OnboardingScreen.tsx      # オンボーディング
│   │   └── SignInScreen.tsx          # サインイン
│   ├── services/
│   │   ├── whisperService.ts         # 録音 & 文字起こし
│   │   └── syncService.ts            # 同期サービス
│   ├── stores/
│   │   ├── sessionStore.ts           # セッション状態 (Zustand)
│   │   └── hooSettingsStore.ts       # Hoo設定 (Zustand)
│   ├── types/timer.ts                # FocusMode型定義
│   └── utils/sound.ts                # 効果音 & ハプティクス
└── modules/
    ├── audio-encoder/                # M4A エンコーダー
    └── audio-resampler/              # リサンプラー
```

---

## 使用方法

### 開発環境のセットアップ

```bash
# 依存関係インストール
cd apps/muednote-mobile
npm install

# iOS プレビルド（初回のみ）
npm run prebuild

# 開発サーバー起動
npm start

# iOS シミュレーターで実行
npm run ios
```

### 環境変数

```bash
# .env.local
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
EXPO_PUBLIC_DEV_TOKEN=dev_token_xxx
```

### 基本的な使い方

1. **サインイン**: Clerk認証でログイン
2. **モード選択**: ホーム画面でフォーカスモードを選択
3. **セッション開始**: 開始ボタンをタップ
4. **録音中**: 作業しながら声でメモ
5. **セッション終了**: 終了ボタンで休憩へ
6. **休憩**: 推奨時間の休憩を取る
7. **レビュー**: 文字起こし結果を確認、同期または保存
8. **履歴確認**: ホームから右スワイプで過去のセッションを閲覧

---

## デザインシステム

### Endel風グラスモーフィズム

```typescript
// 背景
backgroundColor: 'rgba(255, 255, 255, 0.05)'

// ボーダー
borderColor: 'rgba(255, 255, 255, 0.1)'
borderWidth: 1

// コントロールバー
borderRadius: 24 // borderRadius.xxl
```

### アクションボタン

| タイプ | サイズ | 用途 |
|-------|--------|------|
| メイン | 52x52 | 開始、同期 |
| セカンダリ | 44x44 | 終了、保存 |

### カラーパレット

```typescript
// ダークモード
background: '#0a0a1a'
backgroundSecondary: '#16213e'
primary: '#4c9aff'
textPrimary: '#ffffff'
textSecondary: '#a8b3cf'
textMuted: '#6b7280'
error: '#ef4444'
warning: '#f59e0b'
```

---

## 関連ドキュメント

- [MUED Philosophy](../../docs/PHILOSOPHY.md) - プラットフォーム全体の思想
- [開発進捗](../../docs/dev-progress-2025-12-29.md) - 詳細な開発履歴
- [ロードマップ](../../docs/roadmap.md) - 今後の計画

---

## ライセンス

Private - MUED Project

---

*1st MVP 完成: 2025-12-29*

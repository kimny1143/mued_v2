# MUEDnote 開発進捗 - 2025-12-29

## 概要

MUEDnote モバイルアプリのUI/UX改善と機能実装の進捗。

**1st MVP 完成** 🎉

---

## 1. UI/UX 全面刷新（完了）

### Endel風デザインシステム

全画面でグラスモーフィズム + コントロールバー形式を統一。

#### デザイン仕様
- **背景**: `rgba(255, 255, 255, 0.05)`
- **ボーダー**: `rgba(255, 255, 255, 0.1)`
- **コントロールバー**: 画面下部に固定、丸角 `borderRadius.xxl`
- **アクションボタン**: 円形 52x52（メイン）、44x44（セカンダリ）

#### 対象ファイル
- `src/screens/HomeScreen.tsx` - Hoo + コントロールバー
- `src/screens/SessionScreen.tsx` - 録音中UI
- `src/screens/BreakScreen.tsx` - 休憩 + 次モード選択
- `src/screens/ReviewScreen.tsx` - ログ一覧 + メモ入力
- `src/components/SessionControlBar.tsx` - 共通コントロールバー

---

## 2. フォーカスモードシステム（完了）

### 研究に基づくプリセット

| モード | 時間 | 休憩 | 根拠 |
|--------|------|------|------|
| Pomodoro | 25分 | 5分 | 初心者・細かいタスク |
| Standard | 50分 | 17分 | DeskTime研究 |
| Deep Work | 90分 | 20分 | ウルトラディアンリズム |
| Custom | 5-120分 | - | ユーザー設定 |

### 実装ファイル
- `src/types/timer.ts` - FocusMode型定義、FOCUS_MODES配列
- `src/components/SessionControlBar.tsx` - モード選択UI

```typescript
export const FOCUS_MODES: FocusMode[] = [
  { id: 'pomodoro', focusDuration: 25 * 60, breakDuration: 5 * 60, ... },
  { id: 'standard', focusDuration: 50 * 60, breakDuration: 17 * 60, ... },
  { id: 'deepwork', focusDuration: 90 * 60, breakDuration: 20 * 60, ... },
  { id: 'custom', focusDuration: 0, breakDuration: 0, ... },
];

export const CUSTOM_MODE_LIMITS = {
  minFocusDuration: 5 * 60,
  maxFocusDuration: 120 * 60,
  step: 5 * 60,
};
```

---

## 3. Hoo 音声反応アニメーション（完了）

### 実装詳細

- **メータリング**: `expo-av` の `isMeteringEnabled: true`
- **アニメーション**: scale 1.0〜1.05倍、アタック/リリース方式
- **設定画面**: スワイプで遷移、各パラメータ調整可能

### 関連ファイル
- `src/components/Hoo.tsx` - volumeLevel prop、アニメーション
- `src/screens/HooSettingsScreen.tsx` - 設定UI
- `src/stores/hooSettingsStore.ts` - Zustand + AsyncStorage永続化
- `src/services/whisperService.ts` - メータリングコールバック

---

## 4. ナビゲーション（完了）

### 画面フロー

```
SignIn → Onboarding → Home ←→ Settings（スワイプ）
                        ↓
                    Session → Break → Review → Home
                                 ↓
                              Session（次セッション）
```

### スワイプナビ
- **Home → 左スワイプ → Settings**
- **Settings → 右スワイプ → Home**
- 25%スワイプで遷移、PanResponder実装

---

## 5. 1日累計トラッキング（完了）

### 実装内容
- 累計時間をAsyncStorageに保存（日付が変わるとリセット）
- ホーム画面ヘッダーに累計表示（左側）
- 4時間超過でアラート表示（赤色 + Hooメッセージ）

### 関連ファイル
- `src/cache/storage.ts` - DailyTotal型、getDailyTotal/addToDailyTotal関数
- `src/stores/sessionStore.ts` - dailyTotal state追加
- `src/screens/HomeScreen.tsx` - ヘッダーに累計表示

```typescript
// DailyTotal型
export interface DailyTotal {
  date: string; // YYYY-MM-DD形式
  totalSeconds: number;
  sessionCount: number;
}
```

---

## 6. 休憩推奨メッセージ（完了）

### 実装内容
モードに応じた休憩中/休憩後のHooメッセージを実装。

| 休憩時間 | 休憩中メッセージ | 休憩後メッセージ |
|---------|-----------------|-----------------|
| 5分以下 | 軽く深呼吸してね | リフレッシュできた？ |
| 10-16分 | 少し体を動かしてみて | リフレッシュできた？ |
| 17分以上 | ストレッチや水分補給もいいよ | 集中力も回復したね！ |

### 関連ファイル
- `src/screens/BreakScreen.tsx` - getHooMessage関数更新

---

## 7. 完了した変更ファイル一覧

```
apps/muednote-mobile/
├── App.tsx                           # 画面遷移、スワイプナビ
├── src/
│   ├── api/
│   │   ├── client.ts                 # API クライアント
│   │   └── types.ts                  # FocusModeId 型定義
│   ├── cache/storage.ts              # AsyncStorage、HooSettings
│   ├── components/
│   │   ├── Hoo.tsx                   # 音声反応アニメーション
│   │   ├── ModeSelector.tsx          # モード選択コンポーネント
│   │   └── SessionControlBar.tsx     # Endel風コントロールバー
│   ├── constants/theme.ts            # テーマ定数
│   ├── providers/
│   │   ├── ClerkProvider.tsx         # Clerk認証
│   │   └── ThemeProvider.tsx         # ダーク/ライトモード
│   ├── screens/
│   │   ├── HomeScreen.tsx            # コントロールバー形式
│   │   ├── SessionScreen.tsx         # コントロールバー形式
│   │   ├── BreakScreen.tsx           # コントロールバー形式
│   │   ├── ReviewScreen.tsx          # コントロールバー形式
│   │   ├── HooSettingsScreen.tsx     # Hoo設定
│   │   ├── OnboardingScreen.tsx      # オンボーディング
│   │   └── SignInScreen.tsx          # サインイン
│   ├── services/
│   │   ├── whisperService.ts         # 録音、メータリング
│   │   └── syncService.ts            # 同期サービス
│   ├── stores/
│   │   ├── sessionStore.ts           # セッション状態管理
│   │   └── hooSettingsStore.ts       # Hoo設定永続化
│   ├── types/timer.ts                # FocusMode型、プリセット
│   └── utils/sound.ts                # 効果音
```

---

## 8. 履歴画面（完了）

### 実装内容

- **スワイプナビ**: ホーム画面から右スワイプで履歴画面へ
- **日付グループ化**: セッションを日付ごとに折りたたみ式で表示
- **2段階展開**: 日付タップ → セッション一覧、セッションタップ → ログ詳細
- **プルリフレッシュ**: 下に引っ張って更新

### ナビゲーション構造

```
History ←（右スワイプ）← Home →（左スワイプ）→ Settings
```

### 関連ファイル
- `src/screens/HistoryScreen.tsx` - 履歴画面
- `App.tsx` - PanResponder更新（双方向スワイプ）

---

## 9. ダッシュボード記事拡充（完了）

### 実装内容

- **ポモドーロ記事追加**: Francesco Cirillo考案、25分集中の詳細解説
- **ウルトラディアンリズム言及**: Deep Workモードの説明に追加
- **参照URL追加**: 全記事に出典とリンクを追加
- **リンクボタン**: 「詳細」ボタンでLinking.openURL

### 記事一覧

| 記事 | 内容 | 出典 |
|-----|------|------|
| ポモドーロとは？ | 25分集中の科学 | Francesco Cirillo |
| 90分の秘密 | ウルトラディアンリズム | Kleitman, N. |
| 3つのモード | Pomodoro/Standard/Deep Work | DeskTime, Cal Newport |
| クリエイターの集中 | フロー状態に必要な時間 | Cognitive Research |
| 1日4時間の壁 | 創造的作業の限界 | K. Anders Ericsson |
| 休憩の大切さ | 脳のサインを聞く | Andrew Huberman |

### 関連ファイル
- `src/components/DashboardContent.tsx` - 記事データ、リンク機能

---

## 10. オンボーディング更新（完了）

### 変更内容

**タグライン**（Layer 0）:
```
集中して、休む。
それだけでいい。
```

**要約カード**（Layer 1）:
| カード | タイトル | 内容 |
|-------|---------|------|
| 1 | 時間を決めて集中 | 25分、50分、90分から選択。Hooが休憩を促す |
| 2 | 声で気づきを記録 | 作業中のアイデアを声に出すだけ。Hooが書き起こし |
| 3 | 記録を振り返る | 集中した時間はすべて記録。右スワイプで履歴確認 |

### 設計方針
- 哲学的なメッセージから実用的な説明へ変更
- ユーザーが最初に何をすればいいかを明確に

### 関連ファイル
- `src/screens/OnboardingScreen.tsx` - タグライン、カード内容

---

## 11. 設定画面整理（完了）

### 変更内容

- **タイマー設定削除**: ホーム画面にあるため不要
- **Hoo設定折りたたみ**: アコーディオン形式で格納
- **タイトル変更**: 「Hoo 設定」→「設定」

### 関連ファイル
- `src/screens/HooSettingsScreen.tsx` - アコーディオン実装

---

## 12. 設計決定事項

### UI/UX
- **Endel風**: グラスモーフィズム、ミニマル、ダークモード
- **コントロールバー**: 全画面で統一、Hoo中央配置
- **モーダル**: ボトムシート形式

### アニメーション
- **Hoo**: scaleアニメーション（控えめ）
- **スワイプ**: Animated.Value + PanResponder

### 時間設定
- **研究ベース**: 25/50/90分プリセット
- **カスタム制限**: 最大120分（長時間作業非推奨）

---

*最終更新: 2025-12-29*

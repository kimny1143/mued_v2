# MUEDnote タイマーモードUI改善案

作成日: 2025-12-28

## 概要

研究に基づいた集中メソッドごとのモードでタイマーを動かすUI改善案。

---

## 1. 現状の問題点

### 現在のUI構成
- プリセットボタン（60分/90分/120分）
- ホイールピッカー（カスタム時間、最大12時間）
- 両方が並存して煩雑

### 問題
1. ホイールピッカーとプリセットの役割が曖昧
2. 12時間まで設定可能は研究結果に反する
3. 休憩時間の概念がない
4. メソッドの意図が伝わらない

---

## 2. 提案するUI設計

### コンセプト: 「メソッド選択」

ユーザーは時間ではなく**メソッド**を選ぶ。各メソッドには研究に基づいた最適な時間と休憩が設定済み。

### モード構成

| モード | 集中時間 | 休憩時間 | アイコン | 対象ユーザー |
|--------|---------|---------|---------|-------------|
| **Pomodoro** | 25分 | 5分 | 🍅 → Timer | 初心者、短いタスク |
| **Standard** | 50分 | 17分 | ☕ → Coffee | 一般的な作業 |
| **Deep Work** | 90分 | 20分 | 🧠 → Brain | 創作、没入作業 |
| **Custom** | 5-120分 | 設定可 | ⚙️ → Settings | 上級者 |

※ 絵文字はLucide Iconsに置き換え

---

## 3. UIワイヤーフレーム

```
┌─────────────────────────────────────┐
│                                     │
│           [Auto] ← テーマ切替       │
│                                     │
│                                     │
│              🦉                     │
│             Hoo                     │
│        「準備できたよ！」            │
│                                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Today: 1h 25m / 4h              ││ ← 1日累計
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░░ ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────┬─────┬─────┬─────┐         │
│  │ 25m │ 50m │ 90m │ ⚙️  │         │ ← モードセレクター
│  │Pomo │ Std │Deep │Cust │         │
│  └─────┴─────┴─────┴─────┘         │
│                                     │
│        Selected: Deep Work          │
│        90min + 20min break          │
│                                     │
│              ⏺                      │ ← 録音ボタン
│           Start                     │
│                                     │
└─────────────────────────────────────┘
```

---

## 4. モードセレクター詳細

### 4.1 セグメントコントロール

```tsx
// 横並びのセグメント（グラスモーフィズム）
<View style={styles.modeSelector}>
  {modes.map((mode) => (
    <TouchableOpacity
      key={mode.id}
      style={[
        styles.modeButton,
        selectedMode === mode.id && styles.modeButtonActive
      ]}
    >
      <Icon name={mode.icon} size={20} />
      <Text style={styles.modeLabel}>{mode.label}</Text>
      <Text style={styles.modeDuration}>{mode.duration}m</Text>
    </TouchableOpacity>
  ))}
</View>
```

### 4.2 スタイル（グラスモーフィズム）

```tsx
const styles = StyleSheet.create({
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  modeButtonActive: {
    backgroundColor: colors.primary, // #6c5ce7
  },
  modeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modeDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
```

---

## 5. カスタムモード

### トリガー
カスタムボタン（⚙️）をタップするとモーダルまたはインライン展開

### 制限
- 集中時間: 5分〜120分（5分刻み）
- 休憩時間: 0分〜30分（5分刻み）

### UI案: スライダー

```
┌─────────────────────────────────────┐
│         Custom Mode                 │
│                                     │
│  Focus Time                         │
│  ────●───────────────────  45min    │
│  5min                      120min   │
│                                     │
│  Break Time                         │
│  ──────●─────────────────  10min    │
│  0min                       30min   │
│                                     │
│           [ Apply ]                 │
└─────────────────────────────────────┘
```

---

## 6. 1日累計トラッキング

### 表示位置
モードセレクターの上部に配置

### デザイン

```tsx
<View style={styles.dailyProgress}>
  <Text style={styles.dailyLabel}>Today</Text>
  <View style={styles.progressBar}>
    <View style={[styles.progressFill, { width: `${progress}%` }]} />
  </View>
  <Text style={styles.dailyTime}>1h 25m / 4h</Text>
</View>
```

### 4時間超過アラート

```tsx
// 4時間を超えた場合
{totalMinutes > 240 && (
  <View style={styles.warningBanner}>
    <AlertTriangle size={16} color={colors.warning} />
    <Text style={styles.warningText}>
      今日はよく頑張りました！明日に備えて休みましょう
    </Text>
  </View>
)}
```

---

## 7. セッション中の表示

### タイマー表示

```
┌─────────────────────────────────────┐
│  ◉ REC          Deep Work    0:45  │
├─────────────────────────────────────┤
│                                     │
│              🦉                     │
│             Hoo                     │
│         (音声に反応)                │
│                                     │
│           45:23                     │ ← 残り時間
│                                     │
│    ████████████░░░░░░░░░░░░░░░     │ ← 進捗バー
│                                     │
│         [ ⏹ Stop ]                  │
│                                     │
└─────────────────────────────────────┘
```

### 終了時メッセージ

モードに応じた休憩推奨:

| モード | メッセージ |
|--------|-----------|
| Pomodoro | 5分休憩しましょう！軽いストレッチがおすすめ |
| Standard | 17分の休憩タイム！外の空気を吸ってみて |
| Deep Work | 20分しっかり休みましょう。脳をリフレッシュ！ |

---

## 8. データ構造

### モード定義

```typescript
// types/timer.ts
export interface FocusMode {
  id: 'pomodoro' | 'standard' | 'deepwork' | 'custom';
  label: string;
  icon: string; // Lucide icon name
  focusDuration: number; // seconds
  breakDuration: number; // seconds
  description: string;
}

export const FOCUS_MODES: FocusMode[] = [
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    icon: 'Timer',
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    description: '短い集中と休憩を繰り返す',
  },
  {
    id: 'standard',
    label: 'Standard',
    icon: 'Coffee',
    focusDuration: 50 * 60,
    breakDuration: 17 * 60,
    description: 'バランスの取れた標準セッション',
  },
  {
    id: 'deepwork',
    label: 'Deep Work',
    icon: 'Brain',
    focusDuration: 90 * 60,
    breakDuration: 20 * 60,
    description: '創作・没入作業に最適',
  },
];
```

### ストレージ

```typescript
// stores/timerStore.ts
interface TimerState {
  selectedMode: FocusMode['id'];
  customFocusDuration: number;
  customBreakDuration: number;
  dailyTotalSeconds: number;
  lastSessionDate: string; // YYYY-MM-DD
}
```

---

## 9. セッションログ（時刻ベース記録）

### 設計方針

従来の「経過秒数」ではなく**日付時刻ベース**でログを記録する。

**メリット:**
- ログの可読性向上（いつ作業したかが一目瞭然）
- OSC拡張との整合性（DAW連携時にタイムコード同期しやすい）
- 分析・可視化が容易（時間帯別の集中パターンなど）

### データ構造

```typescript
// types/session.ts
export interface SessionLog {
  id: string;                    // UUID
  mode: FocusMode['id'];         // 使用モード
  startedAt: string;             // ISO8601: "2025-12-28T14:30:00.000Z"
  endedAt: string | null;        // ISO8601 or null（進行中）
  plannedDuration: number;       // 予定時間（秒）
  actualDuration: number;        // 実際の時間（秒）- 計算で算出可能だがキャッシュ
  status: 'completed' | 'interrupted' | 'in_progress';
  transcription?: string;        // 文字起こし結果
}

// stores/sessionLogStore.ts
interface SessionLogState {
  logs: SessionLog[];
  currentSession: SessionLog | null;
}
```

### ログ例

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "mode": "deepwork",
  "startedAt": "2025-12-28T14:30:00.000+09:00",
  "endedAt": "2025-12-28T16:00:00.000+09:00",
  "plannedDuration": 5400,
  "actualDuration": 5400,
  "status": "completed"
}
```

### 1日累計の計算

```typescript
// utils/sessionUtils.ts
export function getTodayTotalSeconds(logs: SessionLog[]): number {
  const today = new Date().toISOString().split('T')[0]; // "2025-12-28"

  return logs
    .filter(log => log.startedAt.startsWith(today))
    .filter(log => log.status !== 'in_progress')
    .reduce((total, log) => total + log.actualDuration, 0);
}
```

### OSC拡張への備え

将来的にDAW（Ableton/Logic等）とOSC連携する際、タイムスタンプベースのログがあれば:

- セッション開始時刻とDAWのプロジェクト開始時刻を同期
- 録音区間とDAWのマーカーを対応付け
- タイムライン上での可視化が容易

---

## 10. Hooのモード説明機能

### コンセプト

モード選択時にHooがそのモードについて簡単に説明する。親しみやすさと教育的効果を両立。

### 各モードのHooセリフ

| モード | Hooのセリフ |
|--------|------------|
| **Pomodoro** | 「Ho Hoo！25分集中して5分休む、ポモドーロだね。短く区切ってリズムよく！」 |
| **Standard** | 「Ho Hoo！50分の標準セッション。バランスよく集中できるよ！」 |
| **Deep Work** | 「Ho Hoo！90分のディープワーク。創作に没頭するならこれだね！」 |
| **Custom** | 「Ho Hoo！自分だけの時間設定。最大120分まで選べるよ！」 |

### UI実装

```tsx
// components/Hoo.tsx に追加
interface HooProps {
  // ... existing props
  modeMessage?: string;  // モード選択時のメッセージ
}

// screens/HomeScreen.tsx
import { playHooSound } from '../utils/sound';

const handleModeSelect = async (mode: FocusMode) => {
  setSelectedMode(mode.id);
  setHooMessage(mode.hooMessage);  // Hooに説明させる
  setHooSpeaking(true);            // アニメーション開始

  // Ho Hoo音声を再生
  await playHooSound();

  // 2.5秒後にメッセージをクリア
  setTimeout(() => {
    setHooMessage(undefined);
    setHooSpeaking(false);
  }, 2500);
};
```

### 音声ファイル

既存のアセットを使用:
- `assets/sounds/hoo.m4a` - 「Ho Hoo」の鳴き声

### 音声再生タイミング

| シーン | 音声 | 関数 |
|--------|------|------|
| モード選択時 | Ho Hoo | `playHooSound()` |
| セッション開始時 | アイコン音 | `playSessionStartSound()` |
| セッション終了時 | Ho Hoo | `playSessionEndSound()` |
| ログ保存時 | Ho Hoo | `playLogSavedSound()` |

### モード定義への追加

```typescript
// types/timer.ts
export interface FocusMode {
  id: 'pomodoro' | 'standard' | 'deepwork' | 'custom';
  label: string;
  icon: string;
  focusDuration: number;
  breakDuration: number;
  description: string;
  hooMessage: string;  // ← 追加
}

export const FOCUS_MODES: FocusMode[] = [
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    icon: 'Timer',
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    description: '短い集中と休憩を繰り返す',
    hooMessage: 'Ho Hoo！25分集中して5分休む、ポモドーロだね。短く区切ってリズムよく！',
  },
  {
    id: 'standard',
    label: 'Standard',
    icon: 'Coffee',
    focusDuration: 50 * 60,
    breakDuration: 17 * 60,
    description: 'バランスの取れた標準セッション',
    hooMessage: 'Ho Hoo！50分の標準セッション。バランスよく集中できるよ！',
  },
  {
    id: 'deepwork',
    label: 'Deep Work',
    icon: 'Brain',
    focusDuration: 90 * 60,
    breakDuration: 20 * 60,
    description: '創作・没入作業に最適',
    hooMessage: 'Ho Hoo！90分のディープワーク。創作に没頭するならこれだね！',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: 'Settings',
    focusDuration: 0,  // カスタム値
    breakDuration: 0,
    description: '自分だけの時間設定',
    hooMessage: 'Ho Hoo！自分だけの時間設定。最大120分まで選べるよ！',
  },
];
```

### アニメーション

モード選択時:
1. Hooが軽くバウンス（isSpeaking: true）
2. 吹き出しでメッセージ表示
3. 2.5秒後にフェードアウト

---

## 11. 実装ステップ

### Phase 1: モードセレクター
1. [ ] `types/timer.ts` - モード型定義
2. [ ] `constants/theme.ts` - TIMER_OPTIONS を FOCUS_MODES に置換
3. [ ] `components/ModeSelector.tsx` - 新規作成
4. [ ] `screens/HomeScreen.tsx` - ModeSelector統合

### Phase 2: カスタムモード
5. [ ] `components/CustomModeModal.tsx` - スライダーUI
6. [ ] カスタム設定の永続化

### Phase 3: 累計トラッキング
7. [ ] `stores/dailyProgressStore.ts` - 1日累計ストア
8. [ ] `components/DailyProgress.tsx` - プログレスバー
9. [ ] 4時間超過アラート

### Phase 4: セッション改善
10. [ ] セッション終了メッセージの実装
11. [ ] 休憩タイマー（オプション）

---

## 10. 削除対象

- `components/TimePicker.tsx` - ホイールピッカー削除
- `TIMER_OPTIONS` - FOCUS_MODES に置換

---

## 11. デザインチェックリスト

- [ ] Lucide Icons使用（絵文字不使用）
- [ ] ダークモード対応
- [ ] グラスモーフィズム適用
- [ ] タップ可能要素に適切なフィードバック
- [ ] 320px幅でも使いやすいレイアウト

---

*UI/UX Pro Max Skill - MUED Edition*

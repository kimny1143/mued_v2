# MUEDnote v7 MVP 詳細設計書

**バージョン**: 7.0 MVP
**作成日**: 2025-12-12
**ステータス**: ドラフト

---

## 1. エグゼクティブサマリー

### 1.1 MVPの定義

MUEDnote v7 MVPは、**音楽制作者の独り言を自動でテキスト化し、思考ログとして蓄積する**iOSアプリ。

- **入力**: 常時音声キャプチャ（オンデバイス処理）
- **出力**: タイムスタンプ付き思考ログ
- **UX**: セッションタイマー + レビュー + 保存

### 1.2 MVPで実装する機能

| 機能 | 優先度 | 説明 |
|-----|-------|-----|
| セッションタイマー | P0 | 60/90/120分の制作セッション管理 |
| 音声キャプチャ | P0 | バックグラウンド常時録音 |
| オンデバイス文字起こし | P0 | whisper.rnによるローカル処理 |
| 思考ログ蓄積 | P0 | ローカルDBにテキスト保存 |
| レビュー画面 | P0 | セッション終了後のログ確認 |
| サーバー同期 | P0 | 保存時のみクラウドにアップロード |

### 1.3 MVPで実装しない機能（Phase 2以降）

- hum（鼻歌）検出・音声素材保存
- Android対応
- プッシュ通知
- オフライン同期（保存の後回し機能）
- HLA（Human Learning Algorithm）による高度な分析

---

## 2. 技術スタック

### 2.1 確定技術

| レイヤー | 技術 | 理由 |
|---------|------|------|
| **フレームワーク** | React Native + Expo | 既存React/TS知識活用、迅速な開発 |
| **音声認識** | whisper.rn | オンデバイスWhisper、iOS最適化済み |
| **ローカルDB** | SQLite（expo-sqlite） | オフライン対応、軽量 |
| **状態管理** | Zustand | シンプル、React Native相性◎ |
| **バックエンド** | 既存mued_v2 Next.js API | 95%流用可能 |
| **クラウドDB** | Neon PostgreSQL | 既存スキーマ流用 |
| **認証** | Clerk | 既存認証基盤流用 |

### 2.2 Whisperモデル選定

| モデル | サイズ | 精度 | 速度 | 推奨 |
|-------|-------|------|------|------|
| tiny | 39MB | 低 | 最速 | × |
| base | 74MB | 中 | 速い | △ |
| small | 244MB | 高 | 中 | ◎ MVP推奨 |
| medium | 769MB | 最高 | 遅い | × |

**決定**: `whisper-small` を使用
- 日本語認識精度が実用レベル
- iPhone 12以降で快適に動作
- アプリサイズ許容範囲（〜300MB）

---

## 3. アーキテクチャ

### 3.1 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│  MUEDnote iOS App (React Native + Expo)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐    ┌────────────────────────────────┐   │
│  │ Presentation  │    │ Audio Pipeline                 │   │
│  │ Layer         │    │                                │   │
│  │               │    │  ┌──────────┐   ┌──────────┐  │   │
│  │ ・TimerScreen │    │  │ expo-av  │ → │whisper.rn│  │   │
│  │ ・ReviewScreen│    │  │ Mic      │   │ VAD +    │  │   │
│  │ ・HistoryList │    │  │ Stream   │   │ Transcribe│  │   │
│  │               │    │  └──────────┘   └────┬─────┘  │   │
│  └───────┬───────┘    │                      │        │   │
│          │            └──────────────────────┼────────┘   │
│          │                                   │            │
│          ▼                                   ▼            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Local Storage Layer                                 │  │
│  │                                                     │  │
│  │  ┌─────────────┐    ┌─────────────┐               │  │
│  │  │ Zustand     │    │ SQLite      │               │  │
│  │  │ (UI State)  │    │ (Logs DB)   │               │  │
│  │  └─────────────┘    └─────────────┘               │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                            │
└──────────────────────────────┼────────────────────────────┘
                               │ 保存時のみ
                               ▼
┌──────────────────────────────────────────────────────────┐
│  mued_v2 Backend (Next.js API Routes)                    │
│                                                          │
│  POST /api/muednote/sessions     ← セッション作成        │
│  POST /api/muednote/logs         ← ログ一括保存          │
│  GET  /api/muednote/sessions     ← 履歴取得              │
└──────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│  Neon PostgreSQL (既存スキーマ拡張)                      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 データフロー

```
[セッション開始]
      │
      ▼
┌─────────────────────────────────────────────┐
│ 音声ストリーム取得 (expo-av)                │
│ ・サンプルレート: 16kHz                     │
│ ・チャンネル: モノラル                       │
│ ・バックグラウンド録音有効                   │
└─────────────────┬───────────────────────────┘
                  │ 連続音声フレーム
                  ▼
┌─────────────────────────────────────────────┐
│ whisper.rn RealtimeTranscriber              │
│ ・VAD (Voice Activity Detection)            │
│ ・音声区間のみWhisper推論                    │
│ ・自動スライス（発話単位で区切り）           │
└─────────────────┬───────────────────────────┘
                  │ テキスト断片 + タイムスタンプ
                  ▼
┌─────────────────────────────────────────────┐
│ ローカルバッファ (SQLite)                   │
│ ・session_id                                │
│ ・timestamp_sec                             │
│ ・text                                      │
│ ・confidence                                │
└─────────────────┬───────────────────────────┘
                  │ セッション終了
                  ▼
┌─────────────────────────────────────────────┐
│ レビュー画面                                │
│ ・ログ一覧表示（時系列）                    │
│ ・個別削除可能                              │
│ ・「保存」or「破棄」選択                    │
└─────────────────┬───────────────────────────┘
                  │ 保存選択時
                  ▼
┌─────────────────────────────────────────────┐
│ サーバー同期                                │
│ POST /api/muednote/logs                     │
│ ・一括アップロード                          │
│ ・成功後ローカルDB削除                      │
└─────────────────────────────────────────────┘
```

---

## 4. 画面設計

### 4.1 画面一覧

| 画面 | 役割 | 主要コンポーネント |
|-----|------|------------------|
| HomeScreen | ホーム、セッション開始 | StartButton, HistoryList |
| SessionScreen | セッション中 | Timer, RecordingIndicator, StopButton |
| ReviewScreen | ログレビュー | LogList, SaveButton, DiscardButton |
| SettingsScreen | 設定 | TimerDuration, AccountInfo |

### 4.2 画面遷移

```
[App Launch]
      │
      ▼
┌─────────────┐
│ HomeScreen  │◀─────────────────────────────┐
│             │                              │
│ [セッション │                              │
│  開始]      │                              │
└──────┬──────┘                              │
       │                                     │
       ▼                                     │
┌─────────────┐                              │
│SessionScreen│                              │
│             │                              │
│ 00:45:23    │ ← タイマー表示               │
│ ● REC      │ ← 録音インジケータ            │
│             │                              │
│ [終了]      │                              │
└──────┬──────┘                              │
       │ タイマー終了 or 手動終了            │
       ▼                                     │
┌─────────────┐                              │
│ReviewScreen │                              │
│             │                              │
│ ログ一覧    │                              │
│ ────────── │                              │
│ 00:05 「このコード進行で...」              │
│ 00:12 「ベースもう少し...」                │
│ 00:25 「やっぱり戻そう」                   │
│             │                              │
│ [保存] [破棄]                              │
└──────┬──────┘                              │
       │                                     │
       ├─── 保存 ───▶ サーバー同期 ──────────┤
       │                                     │
       └─── 破棄 ───▶ ローカルDB削除 ────────┘
```

### 4.3 UI設計原則

v6.1の「沈黙のコンソール」哲学を継承：

| 原則 | 実装 |
|-----|------|
| **最小限のUI** | セッション中は時計と録音ドットのみ |
| **中断なし** | 通知・ポップアップ一切なし |
| **即時復帰** | アプリを閉じても録音継続（バックグラウンド） |
| **事後確認** | レビューはセッション終了後のみ |

---

## 5. データ設計

### 5.1 ローカルDB（SQLite）

```sql
-- セッション管理
CREATE TABLE local_sessions (
  id TEXT PRIMARY KEY,           -- UUID
  duration_sec INTEGER NOT NULL, -- 設定時間（3600/5400/7200）
  started_at TEXT NOT NULL,      -- ISO8601
  ended_at TEXT,                 -- ISO8601
  status TEXT NOT NULL,          -- 'active' | 'completed' | 'synced'
  created_at TEXT NOT NULL
);

-- 思考ログ
CREATE TABLE local_logs (
  id TEXT PRIMARY KEY,           -- UUID
  session_id TEXT NOT NULL,      -- FK
  timestamp_sec REAL NOT NULL,   -- セッション開始からの秒数
  text TEXT NOT NULL,            -- 文字起こし結果
  confidence REAL,               -- Whisper信頼度（0-1）
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES local_sessions(id)
);

-- インデックス
CREATE INDEX idx_local_logs_session ON local_logs(session_id);
CREATE INDEX idx_local_sessions_status ON local_sessions(status);
```

### 5.2 サーバーDB（Neon PostgreSQL）

既存スキーマを拡張：

```sql
-- 新規テーブル: muednote_sessions
CREATE TABLE muednote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,         -- Clerk user_id
  duration_sec INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  device_id TEXT,                -- 将来のマルチデバイス対応用
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新規テーブル: muednote_logs
CREATE TABLE muednote_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES muednote_sessions(id),
  timestamp_sec REAL NOT NULL,
  text TEXT NOT NULL,
  confidence REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_muednote_sessions_user ON muednote_sessions(user_id);
CREATE INDEX idx_muednote_logs_session ON muednote_logs(session_id);
```

### 5.3 API設計

#### POST /api/muednote/sessions

セッション作成

```typescript
// Request
{
  duration_sec: number;      // 3600 | 5400 | 7200
  started_at: string;        // ISO8601
  ended_at: string;          // ISO8601
}

// Response
{
  id: string;                // UUID
  created_at: string;
}
```

#### POST /api/muednote/logs

ログ一括保存

```typescript
// Request
{
  session_id: string;
  logs: Array<{
    timestamp_sec: number;
    text: string;
    confidence?: number;
  }>;
}

// Response
{
  saved_count: number;
}
```

#### GET /api/muednote/sessions

セッション履歴取得

```typescript
// Response
{
  sessions: Array<{
    id: string;
    duration_sec: number;
    started_at: string;
    ended_at: string;
    log_count: number;
  }>;
}
```

#### GET /api/muednote/sessions/:id/logs

特定セッションのログ取得

```typescript
// Response
{
  session: { ... },
  logs: Array<{
    id: string;
    timestamp_sec: number;
    text: string;
    confidence: number;
  }>;
}
```

---

## 6. 音声処理パイプライン

### 6.1 whisper.rn設定

```typescript
import { initWhisper, WhisperContext } from 'whisper.rn';

// 初期化
const whisperContext = await initWhisper({
  filePath: 'whisper-small.bin',  // バンドルされたモデル
  isBundledAsset: true,
});

// RealtimeTranscriber設定
const realtimeTranscriber = whisperContext.createRealtimeTranscriber({
  language: 'ja',                  // 日本語
  maxLen: 0,                       // 無制限
  tokenTimestamps: true,           // タイムスタンプ有効
  vadMs: 2000,                     // 2秒の無音で区切り
  onTranscribe: (result) => {
    // テキスト断片を受け取るコールバック
    handleTranscription(result);
  },
});
```

### 6.2 音声取得（expo-av）

```typescript
import { Audio } from 'expo-av';

// 録音設定
const recordingOptions = {
  android: { /* Android設定（Phase 2） */ },
  ios: {
    extension: '.wav',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,        // Whisper要求
    numberOfChannels: 1,      // モノラル
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

// バックグラウンド録音許可
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,
  staysActiveInBackground: true,  // 重要：バックグラウンド継続
  playsInSilentModeIOS: true,
});
```

### 6.3 処理フロー実装

```typescript
// セッション開始
async function startSession(durationSec: number) {
  // 1. ローカルDBにセッション作成
  const sessionId = await createLocalSession(durationSec);

  // 2. 録音開始
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(recordingOptions);
  await recording.startAsync();

  // 3. Whisperストリーム開始
  realtimeTranscriber.start();

  // 4. タイマー開始
  startTimer(durationSec, () => endSession(sessionId));

  return sessionId;
}

// 文字起こし結果ハンドリング
function handleTranscription(result: TranscriptionResult) {
  if (result.text.trim().length > 0) {
    // ローカルDBに保存
    saveLocalLog({
      session_id: currentSessionId,
      timestamp_sec: result.startTime,
      text: result.text,
      confidence: result.confidence,
    });
  }
}

// セッション終了
async function endSession(sessionId: string) {
  // 1. 録音停止
  await recording.stopAndUnloadAsync();
  realtimeTranscriber.stop();

  // 2. セッションステータス更新
  await updateLocalSession(sessionId, {
    status: 'completed',
    ended_at: new Date().toISOString(),
  });

  // 3. レビュー画面へ遷移
  navigation.navigate('Review', { sessionId });
}
```

---

## 7. 状態管理

### 7.1 Zustand Store設計

```typescript
import { create } from 'zustand';

interface SessionState {
  // セッション状態
  currentSessionId: string | null;
  isRecording: boolean;
  elapsedSeconds: number;
  durationSeconds: number;

  // ログバッファ（UIリアルタイム表示用）
  recentLogs: Array<{
    timestamp_sec: number;
    text: string;
  }>;

  // アクション
  startSession: (duration: number) => Promise<void>;
  endSession: () => Promise<void>;
  addLog: (log: { timestamp_sec: number; text: string }) => void;
  tick: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSessionId: null,
  isRecording: false,
  elapsedSeconds: 0,
  durationSeconds: 0,
  recentLogs: [],

  startSession: async (duration) => {
    const sessionId = await startSessionPipeline(duration);
    set({
      currentSessionId: sessionId,
      isRecording: true,
      elapsedSeconds: 0,
      durationSeconds: duration,
      recentLogs: [],
    });
  },

  endSession: async () => {
    await endSessionPipeline(get().currentSessionId);
    set({
      currentSessionId: null,
      isRecording: false,
    });
  },

  addLog: (log) => {
    set((state) => ({
      recentLogs: [...state.recentLogs.slice(-50), log], // 直近50件
    }));
  },

  tick: () => {
    set((state) => ({
      elapsedSeconds: state.elapsedSeconds + 1,
    }));
  },
}));
```

---

## 8. iOS固有の考慮事項

### 8.1 Info.plist設定

```xml
<!-- マイク使用許可 -->
<key>NSMicrophoneUsageDescription</key>
<string>制作中の思考をテキスト化するために、音声を録音します。録音データはセッション終了後に確認でき、保存するかどうかを選択できます。</string>

<!-- バックグラウンド録音 -->
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>

<!-- 音声認識使用許可（オプション、Apple Speech使用時） -->
<key>NSSpeechRecognitionUsageDescription</key>
<string>音声をテキストに変換するために使用します。</string>
```

### 8.2 プライバシー対応

| 要件 | 実装 |
|-----|------|
| 録音同意 | 初回起動時に明示的な同意画面 |
| データローカル保持 | 「保存」押下までサーバー送信なし |
| 削除機能 | レビュー画面で個別/一括削除可能 |
| データエクスポート | Phase 2で対応（GDPR準拠） |

### 8.3 バッテリー最適化

| 対策 | 実装 |
|-----|------|
| VAD活用 | 無音区間はWhisper推論をスキップ |
| モデル最適化 | CoreML変換済みモデル使用 |
| 画面OFF対応 | バックグラウンドで最小限の処理 |

---

## 9. 開発スケジュール

### Phase 1: MVP（8週間）

| 週 | タスク | 成果物 |
|---|--------|--------|
| **1** | プロジェクト構築 | Expo + whisper.rn動作確認 |
| **2** | 音声パイプライン | 録音→文字起こし基本動作 |
| **3** | ローカルDB | SQLiteスキーマ、CRUD |
| **4** | セッション画面 | タイマー、録音インジケータ |
| **5** | レビュー画面 | ログ一覧、保存/破棄 |
| **6** | サーバー連携 | API実装、同期処理 |
| **7** | 統合テスト | E2Eフロー確認 |
| **8** | バグ修正、最適化 | TestFlight配布可能 |

### マイルストーン

- **Week 2完了**: 「話す→テキスト表示」が動作
- **Week 5完了**: 「セッション→レビュー→ローカル保存」が動作
- **Week 8完了**: 「サーバー同期まで含めた全フロー」が動作

---

## 10. リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| whisper.rn精度不足 | UX低下 | smallモデル検証、必要ならmedium |
| バッテリー消費 | ユーザー離脱 | VAD最適化、省電力モード検討 |
| バックグラウンド制限 | 録音中断 | iOS Audio Session適切設定 |
| App Store審査 | リリース遅延 | プライバシー説明を丁寧に |

---

## 11. 成功指標（MVP）

| 指標 | 目標値 |
|-----|-------|
| 文字起こし遅延 | 発話から2秒以内 |
| 認識精度（日本語） | 80%以上 |
| バッテリー消費 | 60分セッションで20%以下 |
| アプリサイズ | 300MB以下 |
| クラッシュ率 | 1%以下 |

---

## 12. 次のステップ

1. **技術検証（Week 0）**
   - whisper.rn + expo-avの組み合わせ動作確認
   - 日本語認識精度のベンチマーク

2. **プロジェクト作成**
   - `apps/muednote-mobile/` ディレクトリ作成
   - Expo初期化、依存関係設定

3. **API実装**
   - `app/api/muednote/` に新規エンドポイント追加
   - DBマイグレーション作成

---

**作成**: Claude Code
**レビュー待ち**: kimny

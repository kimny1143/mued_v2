Claude Code への指示テンプレート：

```
以下は MUEDnote スマホ版アプリの統合仕様書です。
この文書をもとに、

1. UIプロトタイプ（React Native or Flutter）
2. 音声処理パイプラインの構造化コード
3. API I/F のスタブ
4. DBスキーマのセットアップ
5. 状態管理ロジック

を設計してください。

---

# **MUEDnote（スマホ版）統合仕様書 v1.0**

思考ログ × 音声素材 × セッションタイマー
（Claude Code 実装議論用）

---

## **0. 文書の目的**

この文書は、MUEDnote のスマホ版アプリに必要な
**企画・UX構造・画面遷移図・技術仕様・API設計・DBスキーマ**
をひとつに統合したもの。

Claude Code がそのまま
「UIプロトタイプ → 実装方針 → API → 状態管理 → 音声処理」
まで展開できるレベルの“最初の中心文書”として機能する。

---

# **1. プロダクトコンセプト**

MUEDnote は、“制作中に漏れるすべての思考”を収集し、
**思考ログ（テキスト）** と **音声素材（短尺音声）** に自動再構成するアプリ。

表向きは「ノートアプリ＋休憩タイマー」。
裏側では、常時音声 AI が
**speech / hum / music / noise** を分類し、
必要部分だけログ化する。

クリエイターは作業を止めず、スマホを置くだけでよい。

---

# **2. コア機能（3本柱）**

## **2-1. セッションタイマー（休憩リマインダー）**

・ユーザーが “60分 / 90分 / 120分” で制作時間を設定
・終了時に休憩を促す通知
・セッション中は音声ストリーム処理が裏で走る
・UIの中心はこのタイマー。録音の存在は最小限の表示のみ

---

## **2-2. 音声ストリーム → AI分類 → ログ再構成（ワンストップ処理）**

### ● 音声分類レイヤー

リアルタイムで以下の分類を行う：

| 種類     | 内容        | 処理               |
| ------ | --------- | ---------------- |
| speech | 独り言・推論・説明 | テキスト化して思考ログへ     |
| hum    | 鼻歌・旋律     | 短尺音声として抽出        |
| music  | DAW・外部音   | 基本破棄（設定によりタグ付け可） |
| noise  | 環境音       | 破棄               |

### ● ワンストップ構造

1つの音声ストリーム → 2種類のデータに自動分岐：

1. **思考ログ（テキスト）**
   speech 判定部分のみ ASR → チャンク化 → タイムライン保存候補

2. **音声素材（短尺音声）**
   hum 判定部分のみ切り取り
   5〜30秒を上限にトリミング
   プレビュー可能な素材として扱う

セッション中はすべてローカルキャッシュ。
サーバー送信はユーザー同意後。

---

## **2-3. セッション終了後のレビュー画面**

終了時、以下が一画面に一覧される：

・思考ログ（時系列テキスト）
・鼻歌素材（短尺音声サムネイル＋再生）
・信頼度（AI分類スコア）

ユーザーが選ぶ：

・A：全部保存
・B：テキストのみ保存
・C：音声素材のみ保存
・D：素材を選択して保存
・E：全部破棄

**法的リスク対策として、保存前の明示同意を必須にする。**

---

# **3. 画面遷移図（テキストベース）**

```
[起動画面]
    ↓
[ホーム画面]
    ・セッション開始ボタン
    ・設定（タイマー時間）
    ・過去ログ一覧
    ↓ セッション開始
[セッション画面（最小UI）]
    ・タイマー表示
    ・録音中インジケータ（点灯のみ）
    ・中断ボタン
    ↓ 時間経過 or 終了
[セッションレビュー画面]
    ・思考ログ一覧
    ・音声素材一覧
    ・保存 / 破棄ボタン
    ↓ 保存
[保存完了画面]
    ・MUED DBへ送信結果
    ・ホームへ戻る
    ↓ 戻る
[ホーム画面]
```

---

# **4. 状態遷移（State Machine）**

```
IDLE
  ↓ startSession()
SESSION_RUNNING
  - audioStreamActive = true
  - classifyAudioFrame()
  - appendToLocalBuffers()
  ↓ onTimerEnd()
SESSION_REVIEW
  - displayLogs()
  - userSelectsSaveOptions()
  ↓ save()
SAVING
  - uploadTextLog()
  - uploadAudioChunks()
  ↓ success
FINISHED
  ↓ reset()
IDLE
```

---

# **5. 技術仕様（Claude Code 向け）**

## **5-1. 音声処理パイプライン**

```
Audio Stream →
  Frame Split →
    Feature Extract (MFCC / log-mel) →
      Classifier (speech/hum/music/noise) →
        Branch:
           speech → Whisper ASR → text chunk
           hum    → audio chunk buffer
           music  → ignore or tag
           noise  → discard
```

### 推奨モデル

・Whisper large-v3（ローカル or クラウド）
・補助分類器（CNN or small transformer）で hum/mus/noise 判定

---

## **5-2. 音声保存ポリシー**

・セッション中の音声は **全てローカルキャッシュのみ**
・保存対象は **短尺（5〜30秒）音声素材だけ**
・長尺はテキスト化後破棄（容量対策）
・送信前に必ずユーザー確認

---

## **5-3. API仕様（サーバー側）**

### ● POST /sessions

新規セッションメタ作成

```json
{
  "user_id": "...",
  "duration": 3600,
  "start_timestamp": 1234567890
}
```

### ● POST /logs/text

```json
{
  "session_id": "...",
  "chunks": [
    { "timestamp": 12.5, "text": "コード進行これで行こうか…" }
  ]
}
```

### ● POST /logs/audio

multipart/form-data
送信内容：

```
session_id
timestamp
audio_file (wav/m4a)
confidence
```

### ● GET /sessions/{id}

セッション履歴取得

---

# **6. DBスキーマ案**

### **sessions**

| column       | type      | note      |
| ------------ | --------- | --------- |
| id           | uuid      | PK        |
| user_id      | uuid      | FK        |
| duration_sec | int       | セッション設定時間 |
| started_at   | timestamp |           |
| ended_at     | timestamp |           |
| created_at   | timestamp |           |

### **text_logs**

| column        | type      |
| ------------- | --------- |
| id            | uuid      |
| session_id    | uuid      |
| timestamp_sec | float     |
| text          | text      |
| created_at    | timestamp |

### **audio_chunks**

| column        | type      |
| ------------- | --------- |
| id            | uuid      |
| session_id    | uuid      |
| timestamp_sec | float     |
| file_url      | text      |
| confidence    | float     |
| created_at    | timestamp |

全部 Supabase でも Aurora Serverless でも適応可能なようにしてある。

---

# **7. 実装の優先度（MVP）**

1. セッションタイマー
2. 音声ストリーム取得（ローカル処理）
3. speech 部分のみ ASR → テキスト保存
4. hum 部分のみ切り取り保存
5. セッション終了レビュー
6. DB保存

この順序で進めるのが一番破綻しない。

---

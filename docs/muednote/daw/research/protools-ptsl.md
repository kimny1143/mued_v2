# Pro Tools PTSL SDK PoC レポート

**作成日**: 2025-12-30
**ステータス**: PoC完了（制限事項あり）

---

## 1. 概要

### 1.1 目的

Pro ToolsからDAW操作ログを取得できるか、PTSL (Pro Tools Scripting Library) SDKを使用して検証。

### 1.2 技術スタック

| コンポーネント | 技術 |
|--------------|------|
| DAW | Pro Tools 2025 |
| SDK | PTSL SDK 2025.10 |
| 通信プロトコル | gRPC (TCP) |
| テストクライアント | Python + grpcio |
| ポート | localhost:31416 |

---

## 2. アーキテクチャ

```
┌────────────────────────────────────────────────────────────┐
│                     Mac (ユーザー環境)                      │
│                                                            │
│  ┌──────────────┐    gRPC (TCP)   ┌──────────────────────┐ │
│  │ Pro Tools    │ ◄─────────────► │ テストクライアント    │ │
│  │ (PTSL Server)│   port 31416    │ (Python)             │ │
│  └──────────────┘                 └──────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 2.1 PTSL SDK

Avid提供のPro Tools制御用SDK。gRPC経由でJSON形式のリクエスト/レスポンスをやり取り。

**SDKパス**: `/Users/kimny/Dropbox/_DevProjects/AVID_SDK/PTSL_SDK_CPP.2025.10.0.1232349/`

---

## 3. 実装

### 3.1 Protoファイルからのコード生成

```bash
python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. PTSL.proto
```

### 3.2 リクエスト構造

```python
def create_request(command_id: int, body_json: str = "{}", session_id: str = ""):
    request = PTSL_pb2.Request()
    request.header.command = command_id
    request.header.version = 2025  # Year
    request.header.version_minor = 10  # Month
    if session_id:
        request.header.session_id = session_id
    request.request_body_json = body_json
    return request
```

### 3.3 主要コマンドID

| コマンド | ID | 機能 |
|---------|-----|------|
| RegisterConnection | 70 | 接続登録、セッションID取得 |
| GetTransportState | 59 | トランスポート状態取得 |
| GetRecordMode | 57 | 録音モード取得 |
| GetTrackList | 3 | トラックリスト取得 |
| SubscribeToEvents | 132 | イベント購読 |
| PollEvents | 135 | イベントポーリング |
| GetTrackControlInfo | 148 | **未実装** |
| GetTrackControlBreakpoints | 149 | **未実装** |

---

## 4. 検証結果

### 4.1 動作確認済み機能

| 機能 | コマンドID | 結果 |
|-----|-----------|------|
| **接続登録** | 70 | ✅ セッションID取得成功 |
| **トランスポート状態** | 59 | ✅ 停止/再生/録音を検出 |
| **レコードモード** | 57 | ✅ Normal/Loop/QuickPunch等 |
| **トラックリスト** | 3 | ✅ ID/名前/タイプ取得 |
| **イベント登録** | 132 | ✅ Mute/Solo/RecordEnable |

### 4.2 トランスポート状態

```json
{
  "current_setting": "TS_TransportStopped",
  "possible_settings": [
    "TS_TransportPlaying",
    "TS_TransportStopped",
    "TS_TransportRecording",
    "TS_TransportPlayingHalfSpeed",
    "TS_TransportRecordingHalfSpeed",
    ...
  ]
}
```

### 4.3 トラックリスト

```
- Click 4b: TT_Audio
- Audio 1: TT_Audio
- Inst 1: TT_Instrument
- MIDI 1: TT_Midi
```

### 4.4 利用可能なイベント

| イベントID | 説明 |
|-----------|------|
| EId_SessionOpened | セッション開始 |
| EId_SessionClosed | セッション終了 |
| EId_TrackMuteStateChanged | ミュート状態変化 |
| EId_TrackSoloStateChanged | ソロ状態変化 |
| EId_TrackRecordEnabledStateChanged | 録音有効状態変化 |
| EId_TrackInputMonitorStateChanged | 入力モニター状態変化 |

---

## 5. 重大な制限事項

### 5.1 フェーダー/ボリューム値の取得不可

```
[6] Getting track volume info...
    Status: 4
    Error: "PT_UnsupportedCommand", "Not yet implemented"

[7] Getting track volume value (breakpoints)...
    Status: 4
    Error: "PT_UnsupportedCommand", "Not yet implemented"
```

**Avid SDK 2025.10 時点で `GetTrackControlInfo` / `GetTrackControlBreakpoints` は未実装。**

### 5.2 プラグインパラメータの取得不可

- PTSL SDKにはプラグインパラメータを読み取るAPIが存在しない
- EUCONプロトコルにはあるが、SDKは非公開

### 5.3 HUI経由の代替案

| 機能 | HUI対応 |
|-----|---------|
| フェーダー/Pan | ✅ 取得可能 |
| プラグインパラメータ | ⚠️ 限定的（Avid標準のみ） |
| サードパーティプラグイン | ❌ 非対応 |

参考: [MIDIKit HUI Protocol](https://github.com/orchetect/MIDIKit)

---

## 6. Ableton vs Pro Tools 比較

| 機能 | Ableton (OSC) | Pro Tools (PTSL) |
|-----|---------------|------------------|
| **フェーダー/ボリューム** | ✅ リアルタイム取得 | ❌ SDK未実装 |
| **EQ/Compパラメータ** | ✅ ポーリングで取得 | ❌ SDK未実装 |
| **トランスポート状態** | ✅ | ✅ |
| **トラックMute/Solo** | ✅ リスナー | ✅ イベント |
| **通信プロトコル** | OSC (UDP) | gRPC (TCP) |

---

## 7. 結論

### 7.1 取得可能

- ✅ トランスポート状態監視（停止/再生/録音）
- ✅ トラック状態変化検出（Mute/Solo/RecordEnable）
- ✅ トラックリスト
- ✅ MIDI演奏情報（IAC Driver経由 - 別ドキュメント参照）

### 7.2 取得不可能（SDK制限）

- ❌ フェーダー/ボリューム値の読み取り
- ❌ プラグインパラメータの読み取り
- ❌ Pan/EQ/Comp等のミキサー操作ログ

### 7.3 総評

**Pro Toolsは演奏情報（MIDI）とトラック状態は取得可能だが、ミキシング操作のログ取得には不向き。**

また、Pro Toolsユーザー（プロエンジニア）は自身のミックステクニックをログ化されることへの抵抗感がある可能性があり、ビジネス的にもターゲット外と考えられる。

---

## 8. ファイル構成

```
scripts/protools-poc/
├── PTSL.proto           # コピー元: AVID_SDK/.../Source/PTSL.proto
├── PTSL_pb2.py          # 生成されたProtobufコード
├── PTSL_pb2_grpc.py     # 生成されたgRPCコード
└── ptsl_test.py         # テストクライアント
```

---

## 9. 参考資料

- AVID PTSL SDK 2025.10: `/Users/kimny/Dropbox/_DevProjects/AVID_SDK/PTSL_SDK_CPP.2025.10.0.1232349/`
- [HUI Protocol Specification (Reverse Engineered)](https://theagemanblog.wordpress.com/wp-content/uploads/2015/10/hui.pdf)
- [MIDIKit HUI Support](https://github.com/orchetect/MIDIKit/issues/136)

---

## 変更履歴

| 日付 | 内容 |
|-----|------|
| 2025-12-30 | 初版作成（PTSL PoC完了） |

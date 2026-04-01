---
name: daw-osc
description: DAW連携（OSC）の設定、AbletonOSC、Protokol、OSCプロトコル。DAW、Ableton、OSC、Open Sound Control関連の作業時に使用。
---

# DAW OSC 連携 (MUEDnote)

## 概要

MUEDnoteはDAW（Ableton Live）からのパラメータ変更をOSC経由で受信し、セッションログとして保存する。

---

## AbletonOSC

### 基本情報
- **リポジトリ**: https://github.com/ideoforms/AbletonOSC
- **要件**: Ableton Live 11以上
- **受信ポート**: 11000（コマンドを受け取る）
- **送信ポート**: 11001（レスポンス/イベントを送る）

### インストール手順

1. リポジトリをダウンロード
2. フォルダ名を `AbletonOSC-master` → `AbletonOSC` にリネーム
3. 以下にコピー:
   - **macOS**: `/Users/[username]/Music/Ableton/User Library/Remote Scripts/`
   - **Windows**: `\Users\[username]\Documents\Ableton\User Library\Remote Scripts`
4. Ableton Live を再起動
5. `Preferences > Link / Tempo / MIDI` → Control Surface で「AbletonOSC」を選択
6. 成功時: `AbletonOSC: Listening for OSC on port 11000`

### 重要なOSCアドレス

```
# クエリ系（レスポンスを返す）
/live/song/get/tempo              # テンポ取得
/live/song/get/track_names        # トラック名一覧
/live/track/get/name              # 特定トラック名

# リスナー系（変更を監視）
/live/device/start_listen/parameter/value   # パラメータ変更監視開始
/live/device/stop_listen/parameter/value    # パラメータ変更監視停止

# レスポンス形式
/live/song/get/tempo → [120.0]    # BPM値
/live/device/parameter/value → [track_id, device_id, param_id, value]
```

### 動作モード

AbletonOSCは**パッシブ**設計：
- 自動でイベントを送信しない
- クライアントからのリクエストに応答
- listener を開始すると変更時にイベント送信

---

## Protokol（OSCモニター）

### 設定手順

1. https://hexler.net/protokol からダウンロード
2. OSCタブを選択
3. **Enabled**: ON
4. **Port**: `11001`（AbletonOSCの送信ポート）
5. **Options**:
   - ✓ Receive
   - ✓ Timestamp

### 代替ツール

| ツール | ライセンス | URL |
|--------|-----------|-----|
| OSC Shark | MIT (無料) | https://github.com/hypebeast/OSCShark |
| OSC Data Monitor | Processing製 | https://github.com/kasperkamperman/OSCDataMonitor |

---

## Node.js での OSC 実装

### ライブラリ選択

| ライブラリ | 特徴 |
|-----------|------|
| `osc-js` | ブラウザ/Node両対応、WebSocket対応 |
| `osc.js` | 高機能、UDP/Serial/WebSocket |
| `node-osc` | シンプル、UDP特化 |

### 基本実装パターン

```typescript
import OSC from 'osc-js';

// UDP受信設定
const osc = new OSC({
  plugin: new OSC.DatagramPlugin({
    open: { port: 11001 }  // AbletonOSCからの受信
  })
});

osc.on('*', (message) => {
  console.log(message.address, message.args);
});

osc.open();

// コマンド送信（port 11000へ）
const sendOsc = new OSC({
  plugin: new OSC.DatagramPlugin({
    send: { host: '127.0.0.1', port: 11000 }
  })
});

sendOsc.send(new OSC.Message('/live/song/get/tempo'));
```

---

## デバウンス戦略

パラメータ変更は高頻度で発生するため、デバウンスが必須。

```typescript
// キー: track_id + device_id + param_id
// 値: 最新の値 + タイムスタンプ
const debounceMap = new Map<string, { value: number; timer: NodeJS.Timeout }>();

function processParameterChange(trackId: number, deviceId: number, paramId: number, value: number) {
  const key = `${trackId}:${deviceId}:${paramId}`;

  const existing = debounceMap.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    // 500ms後に最終値を送信
    sendToApi({ trackId, deviceId, paramId, value });
    debounceMap.delete(key);
  }, 500);

  debounceMap.set(key, { value, timer });
}
```

---

## 関連ファイル

| ファイル | 用途 |
|---------|------|
| `scripts/daw-hub/` | OSC受信CLIツール |
| `app/api/muednote/daw-log/route.ts` | DAWログAPI |
| `db/schema/muednote-daw-logs.ts` | Drizzleスキーマ |

## 参考資料

- [AbletonOSC GitHub](https://github.com/ideoforms/AbletonOSC)
- [osc-js npm](https://www.npmjs.com/package/osc-js)
- [OSC仕様](http://opensoundcontrol.org/spec-1_0)

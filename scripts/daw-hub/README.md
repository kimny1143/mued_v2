# MUEDnote DAW Hub

Ableton Live のパラメータ変更を OSC 経由でキャプチャし、MUEDnote API に送信する CLI ツール。

## 前提条件

1. **Ableton Live** (v10以降)
2. **AbletonOSC** Max for Live デバイス
   - https://github.com/ideoforms/AbletonOSC からダウンロード
   - Master トラックに配置
3. **Node.js** v18以降

## セットアップ

### 1. AbletonOSC の設定

1. AbletonOSC.amxd を `~/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/` に配置
2. Ableton Live を起動
3. Master トラックに AbletonOSC デバイスを追加
4. デフォルトポート設定:
   - Send Port: 11000
   - Receive Port: 11001

### 2. DAW Hub の起動

```bash
# 開発モード（ローカルAPI）
cd scripts/daw-hub
npx tsx index.ts

# 環境変数で本番APIを指定
DAW_HUB_API_URL=https://mued.jp/api/muednote/daw-log \
DAW_HUB_API_KEY=your_api_key \
npx tsx index.ts
```

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `DAW_HUB_API_URL` | API エンドポイント | `http://localhost:3000/api/muednote/daw-log` |
| `DAW_HUB_API_KEY` | API 認証キー | `dev_daw_key_kimny`（開発のみ） |

## 動作仕様

### キャプチャ対象

- **トラックボリューム**: 各トラックのボリュームフェーダー
- **トラックパン**: 各トラックのパン
- **デバイスパラメータ**: EQ、コンプ等のプラグインパラメータ

### デバウンス

- パラメータ変更は 500ms デバウンスされます
- 連続した操作の最終値のみが記録されます

### バッチ送信

- ログは 5 秒間バッファリングされてバッチ送信されます
- 最大 100 件/バッチ
- 失敗時は 3 回までリトライ（exponential backoff）

## 出力例

```
╔════════════════════════════════════════╗
║       DAW Hub - MUEDnote Logger        ║
╚════════════════════════════════════════╝

API URL: http://localhost:3000/api/muednote/daw-log
Batch interval: 5000ms
Debounce: 500ms

OSC listening on port 11001
Connecting...

Detected 8 tracks
  Track 0: 2 devices
  Track 1: 1 devices

────────────────────────────────────────
Ready! Adjust parameters in Ableton Live
Ctrl+C to exit
────────────────────────────────────────

[LOG] 20:30:15 | Track:0 Device:-1 Param:0 → -3.1 dB
[LOG] 20:30:16 | Track:0 Device:0 Param:5 → 500 Hz
[BATCH] Sending 2 logs... OK (total: 2)
```

## トラブルシューティング

### Port 11001 is in use

Protokol 等の他の OSC リスナーが起動している場合に発生します。
他のアプリケーションを終了してから再度実行してください。

### API error 401

API キーが無効または未設定です。
`DAW_HUB_API_KEY` 環境変数を確認してください。

### AbletonOSC が応答しない

1. Ableton Live が起動しているか確認
2. AbletonOSC デバイスが Master トラックに配置されているか確認
3. ポート設定が正しいか確認（Send: 11000, Receive: 11001）

## ライセンス

MIT

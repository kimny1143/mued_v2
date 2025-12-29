# Ableton Live OSC PoC レポート

**作成日**: 2025-12-29
**更新日**: 2025-12-30
**ステータス**: PoC完了

---

## 1. 概要

### 1.1 目的

MUEDnoteモバイルアプリの練習セッションと、Ableton Liveでの操作ログを連携させ、セッション振り返り時にDAWでの作業内容を確認できるようにする。

### 1.2 技術スタック

| コンポーネント | 技術 |
|--------------|------|
| DAW | Ableton Live |
| 通信プロトコル | OSC (UDP) |
| OSCブリッジ | [AbletonOSC](https://github.com/ideoforms/AbletonOSC) |
| クライアント | MUEDnote Hub (Swift macOS) |
| OSCライブラリ | [OSCKit](https://github.com/orchetect/OSCKit) |

---

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     Mac (ユーザー環境)                        │
│                                                             │
│  ┌──────────────┐    OSC (UDP)    ┌──────────────────────┐  │
│  │ Ableton Live │ ◄─────────────► │ MUEDnote Hub         │  │
│  │ + AbletonOSC │    port 11000   │ (Swift macOS App)    │  │
│  └──────────────┘    port 11001   │                      │  │
│                                   │ - OSC送受信          │  │
│                                   │ - ポーリング検出     │  │
│                                   │ - 変化検出           │  │
│                                   └──────────┬───────────┘  │
└──────────────────────────────────────────────┼──────────────┘
                                               │ HTTP POST
                                               ▼
                                    ┌──────────────────────┐
                                    │ MUED API Server      │
                                    │ POST /api/muednote/  │
                                    │      daw-log         │
                                    └──────────────────────┘
```

### 2.1 AbletonOSC

Ableton LiveのPython API (Live Object Model) をOSC経由で公開するMax for Liveデバイス。

**主要エンドポイント:**

| OSCパス | 機能 |
|--------|------|
| `/live/song/get/tempo` | テンポ取得 |
| `/live/song/get/is_playing` | 再生状態 |
| `/live/song/get/is_recording` | 録音状態 |
| `/live/track/get/volume` | トラックボリューム |
| `/live/track/get/panning` | トラックパン |
| `/live/device/get/parameters` | デバイスパラメータ一覧 |
| `/live/device/get/parameter/value` | パラメータ値 |

---

## 3. 実装方式：ポーリング + 変化検出

### 3.1 背景

AbletonOSCのリスナー機能（`start_listen`）はVolume/Panでは動作するが、デバイスパラメータでは初期値のみ返し、リアルタイム更新が発火しない問題を発見。

### 3.2 解決策

200msごとのポーリングで値を取得し、前回値と比較して変化を検出する方式を採用。

```swift
// ポーリング間隔
private let pollingIntervalMs: Int = 200

// 変化検出ロジック
let oldValue = paramValueCache[key]
let hasChanged = (oldValue == nil) || (abs(oldValue! - value) > 0.001)
if hasChanged && oldValue != nil {
    pendingValueChanges.insert(key)
}
```

### 3.3 主要コンポーネント

| ファイル | 役割 |
|---------|------|
| `OSCReceiverService.swift` | OSC送受信、ポーリング、変化検出 |
| `MenuBarView.swift` | メニューバーUI |
| `SettingsView.swift` | 設定画面（API URL、認証） |

---

## 4. 検証結果

### 4.1 エフェクトプラグイン

| デバイス | タイプ | パラメータ数 | 検出結果 |
|---------|--------|------------|---------|
| **EQ Eight** | Ableton標準 | 84 | ✅ Band Freq/Gain検出 |
| **Glue Compressor** | Ableton標準 | 17 | ✅ Threshold等検出 |
| **FabFilter Pro-Q4** | サードパーティAU | 3* | ✅ Gain/Q検出（完全動作） |

*FabFilter Pro-Q4は1バンド使用時に3パラメータ（On/Off, Gain, Q）が公開され、すべて正常に検出できた。

**結論：サードパーティエフェクトプラグインは正常に動作する。**

### 4.2 インストゥルメントプラグイン

| デバイス | タイプ | パラメータ数 | 検出結果 |
|---------|--------|------------|---------|
| **Analog** | Ableton標準シンセ | 172 | ✅ On/Off, Volume等検出 |
| **Pianoteq 8** | サードパーティAU | 1 | ⚠️ On/Offのみ |

**サードパーティAUインストゥルメントの制限**:
Pianoteq 8（AU版）はAbleton Live APIからOn/Offパラメータのみ公開される。これはAbleton側の仕様であり、内部パラメータ（Voicing, Tuning等）にはアクセスできない。

### 4.3 トラックパラメータ

| パラメータ | 検出方式 | 結果 |
|-----------|---------|------|
| Volume | リスナー | ✅ リアルタイム検出 |
| Pan | リスナー | ✅ リアルタイム検出 |

### 4.4 パフォーマンス

| 指標 | 結果 |
|-----|------|
| DAWへの影響 | なし（体感できる遅延・負荷なし） |
| ログサイズ（テスト中） | 12MB / 105,000行 |
| ポーリング間隔 | 200ms |

---

## 5. 制限事項

### 5.1 AbletonOSCの制限

| 制限 | 詳細 |
|-----|------|
| リスナー不発火 | デバイスパラメータの`start_listen`が初期値のみ返す |
| サードパーティプラグイン（エフェクト） | 公開パラメータ数が制限される場合あり |
| サードパーティプラグイン（インストゥルメント） | On/Offのみ公開される場合が多い |

### 5.2 実装制限

| 制限 | 現在値 | 改善案 |
|-----|-------|-------|
| 監視パラメータ数/デバイス | 8個 | 16〜32に増加 |
| 監視トラック数 | 10 | 必要に応じて増加 |
| デバッグログ | 有効 | 本番では無効化 |

---

## 6. 本番化に向けた改善点

### 6.1 高優先度

| 項目 | 内容 |
|-----|------|
| API送信実装 | OSCログを実際のMUED APIへPOST |
| 収録状態監視 | `/live/song/get/is_recording`で収録中判定 |
| デバッグログ無効化 | `#if DEBUG`でラップ |

### 6.2 中優先度

| 項目 | 内容 |
|-----|------|
| maxParamsPerDevice増加 | 8 → 16〜32 |
| ログローテーション | ファイルサイズ制限 |
| 非同期I/O | DispatchQueueでバックグラウンド処理 |
| デバイス名取得 | パラメータ名と合わせて表示 |

---

## 7. 結論

**OSC PoC成功**

- ✅ Ableton標準エフェクト（EQ Eight, Glue Compressor）のパラメータ検出
- ✅ サードパーティエフェクト（FabFilter Pro-Q4）のパラメータ検出
- ✅ Ableton標準インストゥルメント（Analog）のパラメータ検出
- ✅ トラックVolume/Panのリアルタイム検出
- ✅ ポーリング方式による安定したパラメータ監視
- ✅ DAWパフォーマンスへの影響なし

**エフェクトプラグイン**については、Ableton標準・サードパーティ共にフル対応可能であり、ミキシング作業のログ取得という主要ユースケースは十分に満たせる。

---

## 8. 参考資料

- [AbletonOSC GitHub](https://github.com/ideoforms/AbletonOSC)
- [OSCKit (Swift)](https://github.com/orchetect/OSCKit)
- [Ableton Live Object Model](https://docs.cycling74.com/max8/vignettes/live_object_model)

---

## 変更履歴

| 日付 | 内容 |
|-----|------|
| 2025-12-29 | 初版作成（OSC PoC完了） |
| 2025-12-30 | ドキュメント分割 |
